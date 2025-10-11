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

