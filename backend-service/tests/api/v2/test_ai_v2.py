import pytest
from app.services.ai.models import Message, ChatOptions, ChatResponse, Usage


@pytest.fixture
def client_app():
    from app.main import app
    from fastapi.testclient import TestClient
    return TestClient(app)


def test_ai_chat_v2_envelope(client_app, monkeypatch):
    from app.api.v2 import ai as ai_v2
    from app.services.ai import ai_manager

    async def fake_chat(messages, provider=None, options=None):
        return ChatResponse(
            message=Message(role="assistant", content="ok"),
            usage=Usage(prompt_tokens=1, completion_tokens=1, total_tokens=2),
            model=(options.model if options and options.model else "mock-model"),
            finish_reason="stop",
            provider=provider or "mock",
        )

    monkeypatch.setattr(ai_manager, "chat", fake_chat)

    r = client_app.post("/v2/ai/chat", json={
        "messages": [{"role": "user", "content": "hi"}],
        "provider": "mock",
        "options": {"model": "mock-model"}
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert "data" in data and "meta" in data
    assert data["data"]["message"]["content"] == "ok"


def test_ai_providers_v2(client_app):
    r = client_app.get("/v2/ai/providers")
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert "providers" in data.get("data", {})

