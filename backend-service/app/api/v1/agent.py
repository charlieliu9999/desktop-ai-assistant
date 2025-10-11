"""
智能体API路由
"""
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from typing import Optional, List
from pydantic import BaseModel

from app.services.agent import (
    AgentWorkflow,
    AgentInvokeRequest,
    AgentResponse,
    AgentHealthStatus,
    LoginResponse,
)

router = APIRouter(prefix="/agent", tags=["agent"])

# 全局智能体管理器（将在main.py中初始化）
agent_manager = None


def set_agent_manager(manager):
    """设置智能体管理器"""
    global agent_manager
    agent_manager = manager


class LoginRequest(BaseModel):
    """登录请求"""
    username: str
    password: str


class ConfigResponse(BaseModel):
    """配置响应"""
    enabled: bool
    base_url: str
    mode: str


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    登录Bisheng平台
    
    Args:
        request: 登录请求
        
    Returns:
        登录响应
    """
    if not agent_manager:
        raise HTTPException(status_code=503, detail="智能体服务未初始化")
    
    service = agent_manager.get_service("bisheng")
    if not service:
        raise HTTPException(status_code=503, detail="Bisheng服务未注册")
    
    result = await service.login(request.username, request.password)
    return result


@router.get("/workflows", response_model=List[AgentWorkflow])
async def get_workflows(
    page_size: int = 50,
    page_num: int = 1,
    authorization: Optional[str] = Header(None)
):
    """
    获取工作流列表
    
    Args:
        page_size: 每页数量
        page_num: 页码
        authorization: 授权令牌
        
    Returns:
        工作流列表
    """
    if not agent_manager:
        raise HTTPException(status_code=503, detail="智能体服务未初始化")
    
    # 提取token
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    
    workflows = await agent_manager.get_workflows(
        service_name="bisheng",
        page_size=page_size,
        page_num=page_num,
        token=token
    )
    
    return workflows


@router.post("/invoke")
async def invoke_workflow(
    request: AgentInvokeRequest,
    authorization: Optional[str] = Header(None)
):
    """
    调用工作流（流式响应）
    
    Args:
        request: 调用请求
        authorization: 授权令牌
        
    Returns:
        SSE事件流
    """
    if not agent_manager:
        raise HTTPException(status_code=503, detail="智能体服务未初始化")
    
    # 提取token
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    
    async def event_generator():
        async for chunk in agent_manager.invoke(
            service_name="bisheng",
            request=request,
            token=token
        ):
            yield chunk
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )


@router.post("/stop", response_model=AgentResponse)
async def stop_workflow(
    workflow_id: str,
    session_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    停止工作流
    
    Args:
        workflow_id: 工作流ID
        session_id: 会话ID
        authorization: 授权令牌
        
    Returns:
        响应结果
    """
    if not agent_manager:
        raise HTTPException(status_code=503, detail="智能体服务未初始化")
    
    # 提取token
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    
    success = await agent_manager.stop(
        service_name="bisheng",
        workflow_id=workflow_id,
        session_id=session_id,
        token=token
    )
    
    return AgentResponse(
        success=success,
        data={"workflow_id": workflow_id, "session_id": session_id}
    )


@router.get("/health")
async def health_check():
    """
    健康检查
    
    Returns:
        健康状态
    """
    if not agent_manager:
        return {
            "success": False,
            "services": {},
            "error": "智能体服务未初始化"
        }
    
    health_status = await agent_manager.get_health()
    
    # 转换为字典格式
    services = {}
    for name, status in health_status.items():
        services[name] = {
            "healthy": status.healthy,
            "connected": status.connected,
            "authenticated": status.authenticated,
            "last_check": status.last_check.isoformat(),
            "error": status.error
        }
    
    all_healthy = all(s.healthy for s in health_status.values())
    
    return {
        "success": all_healthy,
        "services": services
    }


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """
    获取配置
    
    Returns:
        配置信息
    """
    if not agent_manager:
        raise HTTPException(status_code=503, detail="智能体服务未初始化")
    
    service = agent_manager.get_service("bisheng")
    if not service:
        raise HTTPException(status_code=503, detail="Bisheng服务未注册")
    
    return ConfigResponse(
        enabled=service.config.enabled,
        base_url=service.config.base_url,
        mode=service.config.mode
    )

