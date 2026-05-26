from types import SimpleNamespace
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import llm_clients


class RetryableGroqError(Exception):
    def __init__(self, message="429 Too Many Requests"):
        super().__init__(message)
        self.status_code = 429


class FakeGroq:
    call_history = []
    behavior = {}

    def __init__(self, api_key=None):
        self.api_key = api_key
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        FakeGroq.call_history.append((self.api_key, kwargs.get("stream", False)))
        behavior = FakeGroq.behavior[self.api_key]
        return behavior(kwargs)


def _fake_response(content: str):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
    )


@pytest.fixture(autouse=True)
def reset_groq_client_pool(monkeypatch):
    FakeGroq.call_history = []
    FakeGroq.behavior = {}
    monkeypatch.setattr(llm_clients, "Groq", FakeGroq)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY_1", raising=False)
    monkeypatch.delenv("GROQ_API_KEY_2", raising=False)
    monkeypatch.delenv("GROQ_API_KEY_10", raising=False)
    llm_clients.get_groq_client(refresh=True)
    yield
    llm_clients.get_groq_client(refresh=True)


def test_discovers_primary_and_numbered_keys_in_order(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "primary")
    monkeypatch.setenv("GROQ_API_KEY_2", "backup-two")
    monkeypatch.setenv("GROQ_API_KEY_1", "backup-one")
    monkeypatch.setenv("GROQ_API_KEY_10", "backup-ten")

    pool = llm_clients.GroqClientPool()

    assert pool._api_keys == ["primary", "backup-one", "backup-two", "backup-ten"]


def test_rotates_to_next_key_after_retryable_failure(monkeypatch):
    fake_now = [0.0]

    def time_fn():
        return fake_now[0]

    pool = llm_clients.GroqClientPool(api_keys=["primary", "backup"], cooldown_seconds=60, time_fn=time_fn)

    FakeGroq.behavior = {
        "primary": lambda kwargs: (_ for _ in ()).throw(RetryableGroqError()),
        "backup": lambda kwargs: _fake_response("backup-ok"),
    }

    response = pool.create(model="test", messages=[])

    assert response.choices[0].message.content == "backup-ok"
    assert FakeGroq.call_history == [("primary", False), ("backup", False)]
    assert pool._cooldown_until["primary"] == 60.0

    second_response = pool.create(model="test", messages=[])
    assert second_response.choices[0].message.content == "backup-ok"
    assert FakeGroq.call_history == [("primary", False), ("backup", False), ("backup", False)]

    fake_now[0] = 61.0
    third_response = pool.create(model="test", messages=[])
    assert third_response.choices[0].message.content == "backup-ok"
    assert FakeGroq.call_history == [
        ("primary", False),
        ("backup", False),
        ("backup", False),
        ("primary", False),
        ("backup", False),
    ]


def test_raises_after_all_keys_are_exhausted(monkeypatch):
    pool = llm_clients.GroqClientPool(api_keys=["primary", "backup"], cooldown_seconds=60, time_fn=lambda: 0.0)

    FakeGroq.behavior = {
        "primary": lambda kwargs: (_ for _ in ()).throw(RetryableGroqError("429 Too Many Requests")),
        "backup": lambda kwargs: (_ for _ in ()).throw(RetryableGroqError("429 Too Many Requests")),
    }

    with pytest.raises(RetryableGroqError):
        pool.create(model="test", messages=[])

    assert FakeGroq.call_history == [("primary", False), ("backup", False)]


def test_does_not_rotate_for_non_retryable_errors(monkeypatch):
    pool = llm_clients.GroqClientPool(api_keys=["primary", "backup"], cooldown_seconds=60, time_fn=lambda: 0.0)

    FakeGroq.behavior = {
        "primary": lambda kwargs: (_ for _ in ()).throw(ValueError("invalid api key")),
        "backup": lambda kwargs: _fake_response("backup-ok"),
    }

    with pytest.raises(ValueError):
        pool.create(model="test", messages=[])

    assert FakeGroq.call_history == [("primary", False)]