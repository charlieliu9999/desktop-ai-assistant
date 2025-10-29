from fastapi.testclient import TestClient
from app.main import app


def test_config_full_and_key(client: TestClient):
    # GET full config
    r = client.get("/v1/config")
    assert r.status_code == 200
    j = r.json()
    assert j.get("success") is True
    data = j.get("data")
    assert isinstance(data, dict)
    assert "APP_NAME" in data
    assert "DEBUG" in data

    # GET single key
    r2 = client.get("/v1/config/DEBUG")
    assert r2.status_code == 200
    j2 = r2.json()
    assert j2.get("success") is True
    assert "DEBUG" in (j2.get("data") or {})

    # PUT single key (toggle DEBUG)
    before = data.get("DEBUG")
    r3 = client.put("/v1/config/DEBUG", json=(not before))
    assert r3.status_code == 200
    j3 = r3.json()
    assert j3.get("success") is True
    # Verify it changed
    r4 = client.get("/v1/config/DEBUG")
    assert r4.status_code == 200
    assert (r4.json().get("data") or {}).get("DEBUG") == (not before)


def test_config_validate(client: TestClient):
    # valid payload
    r = client.post("/v1/config/validate", json={"PORT": 8010})
    assert r.status_code == 200
    j = r.json()
    assert j.get("success") is True
    assert (j.get("data") or {}).get("valid") is True

    # invalid payload (wrong type for PORT)
    r2 = client.post("/v1/config/validate", json={"PORT": "not-a-number"})
    assert r2.status_code == 200
    j2 = r2.json()
    assert j2.get("success") is True
    assert (j2.get("data") or {}).get("valid") is False

