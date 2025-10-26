def test_config_models_and_flags(client):
    # get models config
    r = client.get("/v1/config/models")
    assert r.status_code == 200

    # update (round-trip minimal)
    cfg = r.json().get("data") or {}
    assert isinstance(cfg, dict)
    r2 = client.put("/v1/config/models", json=cfg)
    assert r2.status_code == 200 and r2.json().get("success") is True

    # flags get/put
    r = client.get("/v1/config/flags")
    assert r.status_code == 200
    flags = r.json().get("data") or {}
    r2 = client.put("/v1/config/flags", json={"model_lock": bool(flags.get("model_lock", False))})
    assert r2.status_code == 200 and r2.json().get("success") is True

