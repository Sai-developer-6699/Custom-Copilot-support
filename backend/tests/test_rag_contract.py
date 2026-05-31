import json
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add parent directory to sys.path to find main.py
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import app

client = TestClient(app)


def test_rag_contract():
    resp = client.post("/rag", json={"text": "Contract test: how to connect?"})
    assert resp.status_code == 200, f"Unexpected status {resp.status_code}: {resp.text}"
    data = resp.json()

    assert 'sources' in data and isinstance(data['sources'], list)
    for s in data['sources']:
        assert isinstance(s, dict), f"source entry not object: {s}"
        assert 'chunk' in s and isinstance(s['chunk'], str)
        assert 'score' in s
        assert 'doc_title' in s
        assert 'doc_url' in s


def test_rag_stream_contract():
    with client.stream("POST", "/rag/stream", json={"text": "Contract test: streaming"}) as r:
        assert r.status_code == 200, f"Unexpected status {r.status_code}"
        final = None
        for line in r.iter_lines():
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if obj.get('type') == 'done':
                final = obj.get('response')
                break

    assert final is not None, "No final 'done' payload received from stream"
    assert 'sources' in final and isinstance(final['sources'], list)
    for s in final['sources']:
        assert isinstance(s, dict)
        assert 'chunk' in s and isinstance(s['chunk'], str)
        assert 'score' in s
        assert 'doc_title' in s
        assert 'doc_url' in s

