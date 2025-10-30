"""
智能体API测试
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch

from app.main import app
from app.services.agent import AgentWorkflow, LoginResponse, AgentHealthStatus
from datetime import datetime


@pytest.fixture
def client():
    """创建测试客户端"""
    return TestClient(app)


@pytest.fixture
def mock_agent_manager():
    """创建Mock智能体管理器"""
    manager = MagicMock()
    
    # Mock get_service
    mock_service = MagicMock()
    mock_service.login = AsyncMock(
        return_value=LoginResponse(
            success=True,
            token="test_token_123",
            expiry=1234567890
        )
    )
    mock_service.config = MagicMock(
        enabled=True,
        base_url="http://localhost:7860",
        mode="api"
    )
    manager.get_service.return_value = mock_service
    
    # Mock get_workflows
    manager.get_workflows = AsyncMock(
        return_value=[
            AgentWorkflow(id="1", name="工作流1"),
            AgentWorkflow(id="2", name="工作流2")
        ]
    )
    
    # Mock stop
    manager.stop = AsyncMock(return_value=True)
    
    # Mock get_health
    manager.get_health = AsyncMock(
        return_value={
            "bisheng": AgentHealthStatus(
                service_name="bisheng",
                healthy=True,
                connected=True,
                authenticated=True,
                last_check=datetime.now()
            )
        }
    )
    
    return manager


def test_login_endpoint(client, mock_agent_manager):
    """测试登录端点"""
    with patch("app.api.v1.agent.agent_manager", mock_agent_manager):
        response = client.post(
            "/v1/agent/login",
            json={"username": "test_user", "password": "test_pass"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["token"] == "test_token_123"


def test_get_workflows_endpoint(client, mock_agent_manager):
    """测试获取工作流列表端点"""
    with patch("app.api.v1.agent.agent_manager", mock_agent_manager):
        response = client.get(
            "/v1/agent/workflows?page_size=10&page_num=1",
            headers={"Authorization": "Bearer test_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "1"
        assert data[0]["name"] == "工作流1"


def test_stop_workflow_endpoint(client, mock_agent_manager):
    """测试停止工作流端点"""
    with patch("app.api.v1.agent.agent_manager", mock_agent_manager):
        response = client.post(
            "/v1/agent/stop?workflow_id=workflow_1&session_id=session_1",
            headers={"Authorization": "Bearer test_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


def test_health_endpoint(client, mock_agent_manager):
    """测试健康检查端点"""
    with patch("app.api.v1.agent.agent_manager", mock_agent_manager):
        response = client.get("/v1/agent/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "bisheng" in data["services"]
        assert data["services"]["bisheng"]["healthy"] is True


def test_get_config_endpoint(client, mock_agent_manager):
    """测试获取配置端点"""
    with patch("app.api.v1.agent.agent_manager", mock_agent_manager):
        response = client.get("/v1/agent/config")
        
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is True
        assert data["base_url"] == "http://localhost:7860"
        assert data["mode"] == "api"


def test_login_endpoint_no_manager(client):
    """测试登录端点无管理器"""
    with patch("app.api.v1.agent.agent_manager", None):
        response = client.post(
            "/v1/agent/login",
            json={"username": "test_user", "password": "test_pass"}
        )
        
        assert response.status_code == 503


def test_health_endpoint_no_manager(client):
    """测试健康检查端点无管理器"""
    with patch("app.api.v1.agent.agent_manager", None):
        response = client.get("/v1/agent/health")
        
        assert response.status_code == 200
        data = response.json()
    assert data["success"] is False
    assert "error" in data


def test_login_endpoint_service_not_registered(client, mock_agent_manager):
    """登录端点在服务未注册时返回 503。"""
    # get_service 返回 None，模拟未注册
    mock_agent_manager.get_service.return_value = None
    from unittest.mock import patch
    with patch("app.api.v1.agent.agent_manager", mock_agent_manager):
        resp = client.post(
            "/v1/agent/login",
            json={"username": "u", "password": "p"},
        )
        assert resp.status_code == 503


def test_get_workflows_no_manager_returns_503(client):
    """工作流列表在智能体管理器未初始化时返回 503。"""
    from unittest.mock import patch
    with patch("app.api.v1.agent.agent_manager", None):
        resp = client.get("/v1/agent/workflows?page_size=5&page_num=1")
        assert resp.status_code == 503


def _fake_invoke_stream():
    """构造一个简单的异步生成器，模拟 SSE 流片段。"""
    async def gen():
        # 这里的内容无需严格是 SSE 格式，目的是触发流式路径
        yield b"chunk-1\n"
        yield b"chunk-2\n"
        yield b"[DONE]\n"
    return gen()


def test_invoke_workflow_stream_success(client, mock_agent_manager):
    """调用工作流端点返回流式响应并可迭代读取。"""
    # manager.invoke 返回一个异步可迭代对象
    mock_agent_manager.invoke = lambda **kwargs: _fake_invoke_stream()
    from unittest.mock import patch
    with patch("app.api.v1.agent.agent_manager", mock_agent_manager):
        payload = {
            "workflow_id": "wf-1",
            "session_id": "sess-1",
            "input": {"q": "hello"},
        }
        with client.stream("POST", "/v1/agent/invoke", json=payload) as resp:
            assert resp.status_code == 200
            assert "text/event-stream" in resp.headers.get("content-type", "")
            chunks = list(resp.iter_text())
            # 确认有多段数据返回
            assert any("chunk-1" in c for c in chunks)
            assert any("[DONE]" in c for c in chunks)


def test_invoke_workflow_no_manager(client):
    """调用工作流在智能体管理器未初始化时返回 503。"""
    from unittest.mock import patch
    with patch("app.api.v1.agent.agent_manager", None):
        payload = {"workflow_id": "wf-1", "session_id": "sess-1", "input": {}}
    resp = client.post("/v1/agent/invoke", json=payload)
    assert resp.status_code == 503


def test_invoke_workflow_with_auth_header_triggers_token_parsing(client, mock_agent_manager):
    """调用工作流端点在带有 Authorization 头时应解析 token。"""
    # 使用与成功流一致的伪流
    mock_agent_manager.invoke = lambda **kwargs: _fake_invoke_stream()
    from unittest.mock import patch
    with patch("app.api.v1.agent.agent_manager", mock_agent_manager):
        payload = {"workflow_id": "wf-2", "session_id": "sess-2", "input": {}}
        with client.stream(
            "POST",
            "/v1/agent/invoke",
            json=payload,
            headers={"Authorization": "Bearer abc.def"},
        ) as resp:
            assert resp.status_code == 200
            list(resp.iter_text())  # 触发消费


def test_stop_workflow_no_manager(client):
    """停止工作流在智能体管理器未初始化时返回 503。"""
    from unittest.mock import patch
    with patch("app.api.v1.agent.agent_manager", None):
        resp = client.post("/v1/agent/stop?workflow_id=wf&session_id=sess")
        assert resp.status_code == 503


def test_get_config_service_not_registered(client, mock_agent_manager):
    """配置端点在服务未注册时返回 503。"""
    mock_agent_manager.get_service.return_value = None
    from unittest.mock import patch
    with patch("app.api.v1.agent.agent_manager", mock_agent_manager):
        resp = client.get("/v1/agent/config")
        assert resp.status_code == 503


def test_get_config_no_manager_returns_503(client):
    """配置端点在智能体管理器未初始化时返回 503。"""
    from unittest.mock import patch
    with patch("app.api.v1.agent.agent_manager", None):
        resp = client.get("/v1/agent/config")
        assert resp.status_code == 503
