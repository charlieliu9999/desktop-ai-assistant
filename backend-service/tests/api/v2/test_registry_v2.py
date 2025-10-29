from fastapi.testclient import TestClient


def test_registry_lists_v2():
    from app.main import app
    client = TestClient(app)
    r = client.get("/v2/registry/providers")
    assert r.status_code == 200
    assert r.json().get("success") is True
    r = client.get("/v2/registry/models")
    assert r.status_code == 200
    assert r.json().get("success") is True

