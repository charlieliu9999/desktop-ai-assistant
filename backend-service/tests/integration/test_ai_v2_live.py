"""
v2 AI API 实际外部服务集成测试（需真实 OPENAI_API_KEY）。

说明：
- 仅当检测到环境变量 OPENAI_API_KEY 时才会运行，否则自动跳过。
- 使用 FastAPI TestClient 直接调用后端 /v2/ai/* 端点，触发真实上游调用。

运行示例：
- OPENAI_API_KEY=sk-*** .venv/bin/pytest -m integration -q
"""
import os
import pytest

from typing import Optional

def _settings_openai_key() -> Optional[str]:
    try:
        from app.config import settings
        return getattr(settings, 'OPENAI_API_KEY', '') or None
    except Exception:
        return None


pytestmark = pytest.mark.integration


def _require_openai_key():
    if os.getenv("OPENAI_API_KEY") or _settings_openai_key():
        return
    pytest.skip("缺少 OPENAI_API_KEY（.env 或环境变量），跳过 v2 AI 实际集成测试")


def _client_ctx():
    from app.main import app
    from fastapi.testclient import TestClient
    return TestClient(app)


def test_v2_ai_chat_live():
    _require_openai_key()
    with _client_ctx() as client:
        resp = client.post(
            "/v2/ai/chat",
            json={
                "messages": [{"role": "user", "content": "Say 'ok' and nothing else."}],
            },
            timeout=30,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        assert data.get("data", {}).get("message", {}).get("content")


def test_v2_ai_chat_stream_live():
    _require_openai_key()
    with _client_ctx() as client:
        resp = client.post(
            "/v2/ai/chat/stream",
            json={
                "messages": [{"role": "user", "content": "Reply 'ok'"}],
            },
            timeout=60,
        )
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")
        content = resp.text
        assert "data:" in content
        assert ("'type': 'chunk'" in content) or ("'type': 'end'" in content)


def test_v2_ai_health_live():
    _require_openai_key()
    with _client_ctx() as client:
        resp = client.get("/v2/ai/health", timeout=30)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        services = data.get("data", {}).get("services", {})
        assert isinstance(services, dict)
        assert "openai" in services
