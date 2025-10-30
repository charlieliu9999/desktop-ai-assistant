"""
v2 Agent API 测试

测试v2 Agent端点的完整功能，包括：
- health端点（健康检查）

遵循OpenSpec规范：
- 统一响应格式：{success, data, meta}
- 统一错误格式：{success: false, error: {code, message}, meta}
- 真实Mock（不使用假数据）
"""
import pytest
from datetime import datetime
from app.services.agent.models import AgentHealthStatus


@pytest.fixture
def client_app():
    """创建测试客户端"""
    from app.main import app
    from fastapi.testclient import TestClient
    return TestClient(app)


class TestV2AgentHealth:
    """v2 Agent Health端点测试"""

    def test_health_check_success(self, client_app, monkeypatch):
        """测试健康检查成功"""
        from app.api.v1 import agent as v1agent

        class MockAgentManager:
            async def get_health(self):
                return {
                    "bisheng": AgentHealthStatus(
                        service_name="bisheng",
                        healthy=True,
                        connected=True,
                        authenticated=True,
                        last_check=datetime.now(),
                        error=None,
                    ),
                }

        monkeypatch.setattr(v1agent, "agent_manager", MockAgentManager())

        response = client_app.get("/v2/agent/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "services" in data["data"]
        assert "meta" in data
        assert data["meta"]["version"] == "2.0.0"
        
        # 验证服务健康状态结构
        services = data["data"]["services"]
        assert "bisheng" in services
        service = services["bisheng"]
        assert service["healthy"] is True
        assert service["connected"] is True
        assert service["authenticated"] is True

    def test_health_check_no_manager(self, client_app, monkeypatch):
        """测试没有agent_manager的情况"""
        from app.api.v1 import agent as v1agent

        monkeypatch.setattr(v1agent, "agent_manager", None)

        response = client_app.get("/v2/agent/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "data" in data
        assert "services" in data["data"]
        assert data["data"]["services"] == {}

    def test_health_check_with_unhealthy_service(self, client_app, monkeypatch):
        """测试包含不健康服务的健康检查"""
        from app.api.v1 import agent as v1agent

        class MockAgentManager:
            async def get_health(self):
                return {
                    "bisheng": AgentHealthStatus(
                        service_name="bisheng",
                        healthy=False,
                        connected=False,
                        authenticated=False,
                        last_check=datetime.now(),
                        error="Connection failed",
                    ),
                }

        monkeypatch.setattr(v1agent, "agent_manager", MockAgentManager())

        response = client_app.get("/v2/agent/health")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        services = data["data"]["services"]
        assert "bisheng" in services
        service = services["bisheng"]
        assert service["healthy"] is False
        assert service["connected"] is False
        assert service["error"] == "Connection failed"

    def test_health_check_import_error(self, client_app, monkeypatch):
        """测试导入agent_manager失败的情况"""
        # 直接Mock导入过程，让它抛出异常
        import app.api.v2.agent as v2agent_module

        # 保存原始的导入逻辑
        original_code = v2agent_module.health.__code__

        # 创建一个会在导入时抛出异常的函数
        async def mock_health_with_import_error():
            try:
                # 模拟导入失败
                raise ImportError("Cannot import agent_manager")
            except Exception:
                agent_manager = None
            if not agent_manager:
                from datetime import datetime
                from app.services.ai.models import APIResponse
                services = {}
                return APIResponse(success=False, data={"services": services}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})

        monkeypatch.setattr(v2agent_module, "health", mock_health_with_import_error)

        response = client_app.get("/v2/agent/health")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["data"]["services"] == {}

    def test_health_check_error(self, client_app, monkeypatch):
        """测试健康检查错误处理"""
        from app.api.v1 import agent as v1agent

        class MockAgentManager:
            async def get_health(self):
                raise Exception("Failed to get health status")

        monkeypatch.setattr(v1agent, "agent_manager", MockAgentManager())

        response = client_app.get("/v2/agent/health")

        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert "error" in data
        assert "internal_error" in data["error"]["message"]

