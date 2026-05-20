# backend/cache.py
"""
Response cache with optional Redis backing.

Design decision:
- SHA-256 hash of normalised query text as cache key
- 1-hour TTL appropriate for support FAQ patterns
- Redis is used when configured; in-memory fallback keeps local dev working

Interview talking point:
"Identical or near-identical queries skip the LLM entirely, and Redis keeps that
speedup durable across restarts and multiple workers."
"""
import hashlib
import json
import os
import time
from typing import Optional

_cache: dict[str, tuple[dict, float]] = {}
_redis_client = None
TTL_SECONDS = 3600  # 1 hour
REDIS_PREFIX = "atlan-ai:response-cache:"


def _normalise(text: str) -> str:
    """Strip whitespace and lowercase so minor variations hit the same cache entry."""
    return " ".join(text.lower().split())


def cache_key(text: str) -> str:
    return hashlib.sha256(_normalise(text).encode()).hexdigest()


def _redis_url() -> str:
    return os.getenv("REDIS_URL", "").strip()


def _redis_enabled() -> bool:
    return bool(_redis_url())


def _redis_key(key: str) -> str:
    return f"{REDIS_PREFIX}{key}"


def _get_redis_client():
    global _redis_client

    if not _redis_enabled():
        return None

    if _redis_client is not None:
        return _redis_client

    try:
        from redis import Redis

        _redis_client = Redis.from_url(
            _redis_url(),
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,
            health_check_interval=30,
        )
        _redis_client.ping()
        return _redis_client
    except Exception as exc:
        print(f"[cache] Redis unavailable, using in-memory fallback: {exc}")
        _redis_client = None
        return None


def _load_from_memory(key: str) -> Optional[dict]:
    if key in _cache:
        result, timestamp = _cache[key]
        if time.time() - timestamp < TTL_SECONDS:
            return result
        del _cache[key]
    return None


def _store_in_memory(key: str, result: dict) -> None:
    _cache[key] = (result, time.time())


def get_cached(text: str) -> Optional[dict]:
    """Return cached result if fresh, else None."""
    key = cache_key(text)

    client = _get_redis_client()
    if client is not None:
        try:
            payload = client.get(_redis_key(key))
            if payload is not None:
                result = json.loads(payload)
                _store_in_memory(key, result)
                return result
        except Exception as exc:
            print(f"[cache] Redis read failed, falling back to memory: {exc}")

    return _load_from_memory(key)


def set_cached(text: str, result: dict) -> None:
    """Store a result in cache."""
    key = cache_key(text)
    _store_in_memory(key, result)

    client = _get_redis_client()
    if client is None:
        return

    try:
        client.setex(_redis_key(key), TTL_SECONDS, json.dumps(result, ensure_ascii=False))
    except Exception as exc:
        print(f"[cache] Redis write failed, kept in-memory copy: {exc}")


def cache_stats() -> dict:
    """Return cache statistics for the /health endpoint."""
    now = time.time()
    active = sum(1 for _, (_, ts) in _cache.items() if now - ts < TTL_SECONDS)

    client = _get_redis_client()
    redis_entries = None
    if client is not None:
        try:
            redis_entries = sum(1 for _ in client.scan_iter(match=f"{REDIS_PREFIX}*"))
        except Exception as exc:
            print(f"[cache] Redis stats unavailable: {exc}")

    return {
        "backend": "redis" if client is not None else "memory",
        "redis_configured": _redis_enabled(),
        "redis_connected": client is not None,
        "total_entries": redis_entries if redis_entries is not None else len(_cache),
        "active_entries": redis_entries if redis_entries is not None else active,
        "ttl_seconds": TTL_SECONDS,
    }


def clear_cache() -> None:
    """Clear all cached entries (useful for testing)."""
    _cache.clear()

    client = _get_redis_client()
    if client is None:
        return

    try:
        keys = list(client.scan_iter(match=f"{REDIS_PREFIX}*"))
        if keys:
            client.delete(*keys)
    except Exception as exc:
        print(f"[cache] Redis clear failed: {exc}")
