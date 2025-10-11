"""
智能体管理器测试
"""
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.agent import AgentManager, BishengService, BishengConfig, AgentInvokeRequest


@pytest.fixture
def agent_manager():
    """创建智能体管理器实例"""
    return AgentManager()


@pytest.fixture
def mock_bisheng_service():
    """创建Mock Bisheng服务"""
    service = MagicMock(spec=BishengService)
    service.get_workflows = AsyncMock(return_value=[])
    service.invoke_workflow = AsyncMock()
    service.stop_workflow = AsyncMock(return_value=True)
    service.health_check = AsyncMock()
    return service


def test_agent_manager_initialization(agent_manager):
    """测试智能体管理器初始化"""
    assert len(agent_manager.services) == 0


def test_register_service(agent_manager, mock_bisheng_service):
    """测试注册服务"""
    agent_manager.register_service("bisheng", mock_bisheng_service)
    
    assert "bisheng" in agent_manager.services
    assert agent_manager.get_service("bisheng") == mock_bisheng_service


def test_get_service_not_found(agent_manager):
    """测试获取不存在的服务"""
    service = agent_manager.get_service("nonexistent")
    assert service is None


@pytest.mark.asyncio
async def test_get_workflows(agent_manager, mock_bisheng_service):
    """测试获取工作流列表"""
    from app.services.agent import AgentWorkflow
    
    mock_workflows = [
        AgentWorkflow(id="1", name="工作流1"),
        AgentWorkflow(id="2", name="工作流2")
    ]
    mock_bisheng_service.get_workflows.return_value = mock_workflows
    
    agent_manager.register_service("bisheng", mock_bisheng_service)
    
    workflows = await agent_manager.get_workflows("bisheng", page_size=10, page_num=1)
    
    assert len(workflows) == 2
    assert workflows[0].id == "1"
    mock_bisheng_service.get_workflows.assert_called_once()


@pytest.mark.asyncio
async def test_get_workflows_service_not_found(agent_manager):
    """测试获取工作流列表服务不存在"""
    workflows = await agent_manager.get_workflows("nonexistent")
    assert len(workflows) == 0


@pytest.mark.asyncio
async def test_stop_workflow(agent_manager, mock_bisheng_service):
    """测试停止工作流"""
    agent_manager.register_service("bisheng", mock_bisheng_service)
    
    result = await agent_manager.stop("bisheng", "workflow_1", "session_1")
    
    assert result is True
    mock_bisheng_service.stop_workflow.assert_called_once_with("workflow_1", "session_1", None)


@pytest.mark.asyncio
async def test_get_health(agent_manager, mock_bisheng_service):
    """测试获取健康状态"""
    from app.services.agent import AgentHealthStatus
    from datetime import datetime
    
    mock_health = AgentHealthStatus(
        service_name="bisheng",
        healthy=True,
        connected=True,
        authenticated=True,
        last_check=datetime.now()
    )
    mock_bisheng_service.health_check.return_value = mock_health
    
    agent_manager.register_service("bisheng", mock_bisheng_service)
    
    health_status = await agent_manager.get_health()
    
    assert "bisheng" in health_status
    assert health_status["bisheng"].healthy is True


def test_list_services(agent_manager, mock_bisheng_service):
    """测试列出所有服务"""
    agent_manager.register_service("bisheng", mock_bisheng_service)
    agent_manager.register_service("test", mock_bisheng_service)
    
    services = agent_manager.list_services()
    
    assert len(services) == 2
    assert "bisheng" in services
    assert "test" in services

