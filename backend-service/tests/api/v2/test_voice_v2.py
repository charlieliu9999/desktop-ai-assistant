from fastapi.testclient import TestClient


def test_voice_models_and_health_v2(monkeypatch):
    from app.main import app
    client = TestClient(app)

    # health should work even if services are None
    r = client.get("/v2/voice/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") in (True, False)
    assert "services" in data.get("data", {})

    r = client.get("/v2/voice/models")
    assert r.status_code == 200
    assert r.json().get("success") is True

