import os
import logging
import time
from pathlib import Path
from threading import Lock
from typing import Callable

from dotenv import load_dotenv
from groq import Groq

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

GROQ_MODEL_FAST = os.getenv("GROQ_MODEL_FAST", "llama-3.1-8b-instant")
logger = logging.getLogger(__name__)


def _normalize_key(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = value.strip()
    return cleaned or None


def _discover_groq_api_keys() -> list[str]:
    keys: list[str] = []

    primary_key = _normalize_key(os.getenv("GROQ_API_KEY"))
    if primary_key:
        keys.append(primary_key)

    numbered_keys: list[tuple[int, str]] = []
    for name, value in os.environ.items():
        if not name.startswith("GROQ_API_KEY_"):
            continue

        suffix = name.removeprefix("GROQ_API_KEY_")
        if not suffix.isdigit():
            continue

        normalized_value = _normalize_key(value)
        if normalized_value is None:
            continue

        numbered_keys.append((int(suffix), normalized_value))

    for _, key in sorted(numbered_keys, key=lambda item: item[0]):
        if key not in keys:
            keys.append(key)

    return keys


def _is_retryable_groq_error(exc: Exception) -> bool:
    status_code = getattr(exc, "status_code", None)
    if status_code == 429:
        return True

    response = getattr(exc, "response", None)
    if getattr(response, "status_code", None) == 429:
        return True

    message = str(exc).lower()
    return any(
        marker in message
        for marker in (
            "429",
            "too many requests",
            "rate_limit_exceeded",
            "quota_exceeded",
        )
    )


class _GroqCompletionsProxy:
    def __init__(self, pool: "GroqClientPool"):
        self._pool = pool

    def create(self, **kwargs):
        return self._pool.create(**kwargs)


class _GroqChatProxy:
    def __init__(self, pool: "GroqClientPool"):
        self._pool = pool

    @property
    def completions(self):
        return _GroqCompletionsProxy(self._pool)


class GroqRotatingClient:
    def __init__(self, pool: "GroqClientPool"):
        self._pool = pool

    @property
    def chat(self):
        return _GroqChatProxy(self._pool)

    def __getattr__(self, attribute_name):
        return getattr(self._pool.current_client(), attribute_name)


class GroqClientPool:
    def __init__(
        self,
        api_keys: list[str] | None = None,
        *,
        cooldown_seconds: int = 60,
        time_fn: Callable[[], float] | None = None,
    ):
        self._api_keys = api_keys if api_keys is not None else _discover_groq_api_keys()
        self._client_cache: dict[str, Groq] = {}
        self._cooldown_until: dict[str, float] = {}
        self._cooldown_seconds = cooldown_seconds
        self._time_fn = time_fn or time.monotonic
        self._lock = Lock()

    def _now(self) -> float:
        return self._time_fn()

    def _current_key(self) -> str:
        if not self._api_keys:
            raise RuntimeError(
                "No GROQ_API_KEY configured. Set GROQ_API_KEY and optional GROQ_API_KEY_1, GROQ_API_KEY_2, ..."
            )

        available_keys = self._available_keys()
        if available_keys:
            return available_keys[0]

        return self._api_keys[0]

    def current_client(self) -> Groq:
        current_key = self._current_key()
        with self._lock:
            if current_key not in self._client_cache:
                self._client_cache[current_key] = Groq(api_key=current_key)
            return self._client_cache[current_key]

    def _client_for_key(self, api_key: str) -> Groq:
        with self._lock:
            if api_key not in self._client_cache:
                self._client_cache[api_key] = Groq(api_key=api_key)
            return self._client_cache[api_key]

    def _available_keys(self) -> list[str]:
        if not self._api_keys:
            return []

        now = self._now()
        return [
            api_key
            for api_key in self._api_keys
            if self._cooldown_until.get(api_key, 0.0) <= now
        ]

    def _mark_cooldown(self, api_key: str, exc: Exception) -> None:
        cooldown_until = self._now() + self._cooldown_seconds
        with self._lock:
            self._cooldown_until[api_key] = cooldown_until

        logger.warning(
            "Groq key rate limited; rotating to the next available key",
            extra={
                "groq_api_key": api_key,
                "groq_cooldown_seconds": self._cooldown_seconds,
                "groq_cooldown_until": cooldown_until,
                "groq_error": exc.__class__.__name__,
            },
        )

    def _release_cooldown(self, api_key: str) -> None:
        with self._lock:
            self._cooldown_until.pop(api_key, None)

    def create(self, **kwargs):
        last_error: Exception | None = None
        available_keys = self._available_keys()

        if not available_keys:
            raise RuntimeError("No Groq API keys are currently available; all configured keys are cooling down.")

        for api_key in available_keys:
            client = self._client_for_key(api_key)
            try:
                result = client.chat.completions.create(**kwargs)
            except Exception as exc:
                if _is_retryable_groq_error(exc):
                    last_error = exc
                    self._mark_cooldown(api_key, exc)
                    continue
                raise

            self._release_cooldown(api_key)
            return result

        if last_error is not None:
            logger.warning(
                "Groq request failed across all available keys after retries",
                extra={"groq_retryable_error": last_error.__class__.__name__},
            )
            raise last_error

        raise RuntimeError("No Groq API keys are available.")


_GROQ_CLIENT_POOL: GroqRotatingClient | None = None


def get_groq_client(*, refresh: bool = False) -> GroqRotatingClient:
    global _GROQ_CLIENT_POOL

    if refresh or _GROQ_CLIENT_POOL is None:
        _GROQ_CLIENT_POOL = GroqRotatingClient(GroqClientPool())

    return _GROQ_CLIENT_POOL