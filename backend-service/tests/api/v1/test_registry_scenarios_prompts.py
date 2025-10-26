import os
import uuid


def test_registry_list_and_health(client):
    # list providers/models from seed files
    r = client.get("/v1/registry/providers")
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    providers = data.get("data")
    assert isinstance(providers, list) and len(providers) >= 1

    r = client.get("/v1/registry/models")
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    models = data.get("data")
    assert isinstance(models, list) and len(models) >= 1

    # health endpoints should respond (healthy may be False in CI)
    r = client.get("/v1/registry/providers/local/health")
    assert r.status_code == 200
    assert "data" in r.json()

    r = client.get("/v1/registry/models/stt-whisper-large-v3/health")
    assert r.status_code == 200


def test_registry_crud_provider_model(client):
    pid = f"prov-{uuid.uuid4().hex[:6]}"
    mid = f"model-{uuid.uuid4().hex[:6]}"

    # add provider
    payload = {
        "id": pid,
        "name": "Mock Provider",
        "kind": "custom",
        "base_url": "http://127.0.0.1:9999",
        "enabled": True,
        "capabilities": ["llm"],
        "auth": {"type": "none"},
        "headers": {},
    }
    r = client.post("/v1/registry/providers", json=payload)
    assert r.status_code == 200 and r.json().get("success") is True

    # update provider
    r = client.put(f"/v1/registry/providers/{pid}", json={"enabled": False})
    assert r.status_code == 200

    # add model
    m = {
        "id": mid,
        "name": "mock-llm",
        "provider_id": pid,
        "modality": "llm",
        "enabled": True,
        "default_params": {"temperature": 0.5},
        "tags": ["test"],
    }
    r = client.post("/v1/registry/models", json=m)
    assert r.status_code == 200

    # update model
    r = client.put(f"/v1/registry/models/{mid}", json={"enabled": False})
    assert r.status_code == 200

    # delete model and provider
    r = client.delete(f"/v1/registry/models/{mid}")
    assert r.status_code == 200
    r = client.delete(f"/v1/registry/providers/{pid}")
    assert r.status_code == 200


def test_scenarios_crud(client):
    # list existing
    r = client.get("/v1/scenarios")
    assert r.status_code == 200 and r.json().get("success") is True

    name = f"scene-{uuid.uuid4().hex[:6]}"
    s = {
        "name": name,
        "modality": "llm",
        "model_id": "chat-openai-gpt4o-mini",
        "param_overrides": {"temperature": 0.6},
        "prompt_id": "ai_chat_default",
        "prompt_version": "1.0.0",
    }
    r = client.post("/v1/scenarios", json=s)
    assert r.status_code == 200

    r = client.put(f"/v1/scenarios/{name}", json={"param_overrides": {"temperature": 0.55}})
    assert r.status_code == 200

    r = client.delete(f"/v1/scenarios/{name}")
    assert r.status_code == 200


def test_prompts_crud(client):
    pid = f"prompt-{uuid.uuid4().hex[:6]}"
    p = {
        "id": pid,
        "name": "临时提示词",
        "scene": "ai_chat",
        "versions": [
            {"version": "0.1.0", "language": "zh-CN", "system": "测试系统提示"}
        ],
        "active_version": "0.1.0",
    }
    r = client.post("/v1/prompts", json=p)
    assert r.status_code == 200 and r.json().get("success") is True

    r = client.get(f"/v1/prompts/{pid}")
    assert r.status_code == 200 and r.json().get("success") is True

    v = {"version": "0.2.0", "language": "zh-CN", "system": "新版系统提示"}
    r = client.post(f"/v1/prompts/{pid}/versions", json=v)
    assert r.status_code == 200

    r = client.post(f"/v1/prompts/{pid}/publish", params={"version": "0.2.0"})
    assert r.status_code == 200

