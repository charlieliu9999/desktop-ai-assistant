"""
v2 Agent API 实际外部服务集成测试（需真实 Bisheng 服务）。

说明：
- 仅当检测到 BISHENG_BASE_URL 时才会运行，否则自动跳过。
- 若提供 BISHENG_ACCESS_TOKEN，则健康检查将可能显示 authenticated=true。

运行示例：
- BISHENG_BASE_URL=http://127.0.0.1:7860 BISHENG_ACCESS_TOKEN=xxx \
  .venv/bin/pytest -m integration -q
"""
import os
import pytest

from typing import Optional


def _settings_bisheng_base() -> Optional[str]:
    try:
        from app.config import settings
        return getattr(settings, 'BISHENG_BASE_URL', '') or None
    except Exception:
        return None


pytestmark = pytest.mark.integration


def _require_bisheng_base():
    base = os.getenv("BISHENG_BASE_URL") or _settings_bisheng_base()
    if not base:
        pytest.skip("缺少 BISHENG_BASE_URL（.env 或环境变量），跳过 v2 Agent 实际集成测试")
    # 预检可用性，避免误跑
    try:
        import httpx
        with httpx.Client(timeout=3.0) as c:
            r = c.get(f"{base}/health")
            if r.status_code >= 500:
                pytest.skip(f"Bisheng 健康检查失败: HTTP {r.status_code}")
    except Exception:
        pytest.skip("无法连接到 Bisheng 服务，跳过")


def _client_ctx():
    from app.main import app
    from fastapi.testclient import TestClient
    return TestClient(app)


def test_v2_agent_health_live():
    _require_bisheng_base()
    with _client_ctx() as client:
        resp = client.get("/v2/agent/health", timeout=20)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        services = data.get("data", {}).get("services", {})
        assert isinstance(services, dict)
        if "bisheng" in services:
            s = services["bisheng"]
            assert "healthy" in s
            assert "connected" in s
            assert "authenticated" in s
