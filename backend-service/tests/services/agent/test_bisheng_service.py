"""
Bisheng服务测试
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

from app.services.agent import BishengService, BishengConfig, AgentInvokeRequest


@pytest.fixture
def bisheng_config():
    """创建Bisheng配置"""
    return BishengConfig(
        enabled=True,
        base_url="http://localhost:7860",
        frontend_url="http://localhost:3001",
        username="test_user",
        password="test_pass",
        mode="api",
        timeout=30,
        retry_attempts=3
    )


@pytest.fixture
def bisheng_service(bisheng_config):
    """创建Bisheng服务实例"""
    return BishengService(bisheng_config)


def test_bisheng_service_initialization(bisheng_service, bisheng_config):
    """测试Bisheng服务初始化"""
    assert bisheng_service.config == bisheng_config
    assert bisheng_service.access_token is None
    assert bisheng_service.token_expiry is None


@pytest.mark.asyncio
async def test_login_success(bisheng_service):
    """测试登录成功"""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "access_token": "test_token_123",
        "expiry": 1234567890
    }
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )
        
        result = await bisheng_service.login("test_user", "test_pass")
        
        assert result.success is True
        assert result.token == "test_token_123"
        assert result.expiry == 1234567890
        assert bisheng_service.access_token == "test_token_123"


@pytest.mark.asyncio
async def test_login_failure(bisheng_service):
    """测试登录失败"""
    mock_response = MagicMock()
    mock_response.status_code = 401
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )
        
        result = await bisheng_service.login("wrong_user", "wrong_pass")
        
        assert result.success is False
        assert result.error is not None
        assert "登录失败" in result.error


@pytest.mark.asyncio
async def test_get_workflows_success(bisheng_service):
    """测试获取工作流列表成功"""
    bisheng_service.access_token = "test_token"
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            {
                "id": "workflow_1",
                "name": "测试工作流1",
                "description": "描述1",
                "status": "active"
            },
            {
                "id": "workflow_2",
                "name": "测试工作流2",
                "description": "描述2",
                "status": "active"
            }
        ]
    }
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(
            return_value=mock_response
        )
        
        workflows = await bisheng_service.get_workflows(page_size=10, page_num=1)
        
        assert len(workflows) == 2
        assert workflows[0].id == "workflow_1"
        assert workflows[0].name == "测试工作流1"
        assert workflows[1].id == "workflow_2"


@pytest.mark.asyncio
async def test_get_workflows_no_token(bisheng_service):
    """测试获取工作流列表无令牌"""
    workflows = await bisheng_service.get_workflows()
    assert len(workflows) == 0


@pytest.mark.asyncio
async def test_stop_workflow_success(bisheng_service):
    """测试停止工作流成功"""
    bisheng_service.access_token = "test_token"
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )
        
        result = await bisheng_service.stop_workflow("workflow_1", "session_1")
        
        assert result is True


@pytest.mark.asyncio
async def test_health_check_success(bisheng_service):
    """测试健康检查成功"""
    bisheng_service.access_token = "test_token"
    bisheng_service.token_expiry = 9999999999  # 未来时间
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(
            return_value=mock_response
        )
        
        health = await bisheng_service.health_check()
        
        assert health.service_name == "bisheng"
        assert health.healthy is True
        assert health.connected is True
        assert health.authenticated is True


@pytest.mark.asyncio
async def test_health_check_not_authenticated(bisheng_service):
    """测试健康检查未认证"""
    mock_response = MagicMock()
    mock_response.status_code = 200
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(
            return_value=mock_response
        )
        
        health = await bisheng_service.health_check()
        
        assert health.service_name == "bisheng"
        assert health.healthy is False
        assert health.connected is True
        assert health.authenticated is False

