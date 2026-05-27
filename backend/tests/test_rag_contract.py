import json
import requests

BASE = "http://127.0.0.1:8000"


def test_rag_contract():
    resp = requests.post(f"{BASE}/rag", json={"text": "Contract test: how to connect?"}, timeout=45)
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
    r = requests.post(f"{BASE}/rag/stream", json={"text": "Contract test: streaming"}, stream=True, timeout=60)
    final = None
    try:
        for line in r.iter_lines(decode_unicode=True):
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if obj.get('type') == 'done':
                final = obj.get('response')
                break
    finally:
        try:
            r.close()
        except Exception:
            pass

    assert final is not None, "No final 'done' payload received from stream"
    assert 'sources' in final and isinstance(final['sources'], list)
    for s in final['sources']:
        assert isinstance(s, dict)
        assert 'chunk' in s and isinstance(s['chunk'], str)
        assert 'score' in s
        assert 'doc_title' in s
        assert 'doc_url' in s
