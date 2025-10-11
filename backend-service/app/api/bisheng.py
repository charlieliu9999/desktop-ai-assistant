"""
Bisheng 智能体平台 API 代理
提供与 Bisheng 平台的集成接口
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from loguru import logger
import httpx
import json

from app.config import settings

router = APIRouter()


class LoginRequest(BaseModel):
    """登录请求"""
    username: str
    password: str


class WorkflowInvokeRequest(BaseModel):
    """工作流调用请求"""
    workflow_id: str
    input: Dict[str, Any]
    stream: Optional[bool] = True
    session_id: Optional[str] = None
    message_id: Optional[str] = None


class BishengConfigUpdate(BaseModel):
    """Bisheng 配置更新"""
    enabled: Optional[bool] = None
    base_url: Optional[str] = None
    frontend_url: Optional[str] = None
    iframe_proxy_port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    mode: Optional[str] = None
    auto_login: Optional[bool] = None
    save_password: Optional[bool] = None
    timeout: Optional[int] = None
    retry_attempts: Optional[int] = None


@router.post("/login")
async def login(request: LoginRequest):
    """
    登录 Bisheng 平台
    
    Args:
        request: 登录请求，包含用户名和密码
        
    Returns:
        包含 access_token 和过期时间的响应
    """
    if not settings.BISHENG_ENABLED:
        raise HTTPException(status_code=503, detail="Bisheng 服务未启用")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.BISHENG_BASE_URL}/api/v1/login",
                json={
                    "username": request.username,
                    "password": request.password
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Bisheng 登录成功: {request.username}")
                return {
                    "success": True,
                    "token": data.get("access_token"),
                    "expiry": data.get("expiry", settings.BISHENG_TOKEN_EXPIRY)
                }
            else:
                logger.error(f"Bisheng 登录失败: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"登录失败: {response.text}"
                )
                
    except httpx.RequestError as e:
        logger.error(f"Bisheng 登录请求错误: {e}")
        raise HTTPException(status_code=503, detail=f"连接 Bisheng 服务失败: {str(e)}")


@router.get("/workflows")
async def get_workflows(
    page_size: Optional[int] = 50,
    page_num: Optional[int] = 1,
    authorization: Optional[str] = None
):
    """
    获取工作流列表
    
    Args:
        page_size: 每页数量
        page_num: 页码
        authorization: Bearer token
        
    Returns:
        工作流列表
    """
    if not settings.BISHENG_ENABLED:
        raise HTTPException(status_code=503, detail="Bisheng 服务未启用")
    
    if not authorization:
        # 尝试使用配置中的 token
        authorization = f"Bearer {settings.BISHENG_ACCESS_TOKEN}" if settings.BISHENG_ACCESS_TOKEN else None
    
    if not authorization:
        raise HTTPException(status_code=401, detail="需要认证")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{settings.BISHENG_BASE_URL}/api/v2/workflows",
                params={
                    "page_size": page_size,
                    "page_num": page_num
                },
                headers={
                    "Authorization": authorization
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"获取工作流列表成功: {len(data.get('data', []))} 个工作流")
                return data
            else:
                logger.error(f"获取工作流列表失败: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"获取工作流列表失败: {response.text}"
                )
                
    except httpx.RequestError as e:
        logger.error(f"获取工作流列表请求错误: {e}")
        raise HTTPException(status_code=503, detail=f"连接 Bisheng 服务失败: {str(e)}")


@router.post("/workflow/invoke")
async def invoke_workflow(request: WorkflowInvokeRequest, authorization: Optional[str] = None):
    """
    调用工作流
    
    Args:
        request: 工作流调用请求
        authorization: Bearer token
        
    Returns:
        工作流执行结果（流式或非流式）
    """
    if not settings.BISHENG_ENABLED:
        raise HTTPException(status_code=503, detail="Bisheng 服务未启用")
    
    if not authorization:
        authorization = f"Bearer {settings.BISHENG_ACCESS_TOKEN}" if settings.BISHENG_ACCESS_TOKEN else None
    
    if not authorization:
        raise HTTPException(status_code=401, detail="需要认证")
    
    try:
        # 构建请求体
        payload = {
            "input": request.input,
            "stream": request.stream
        }
        
        if request.session_id:
            payload["session_id"] = request.session_id
        if request.message_id:
            payload["message_id"] = request.message_id
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            if request.stream:
                # 流式响应
                async def generate():
                    async with client.stream(
                        "POST",
                        f"{settings.BISHENG_BASE_URL}/api/v2/workflow/invoke/{request.workflow_id}",
                        json=payload,
                        headers={
                            "Authorization": authorization,
                            "Content-Type": "application/json"
                        }
                    ) as response:
                        if response.status_code != 200:
                            error_text = await response.aread()
                            logger.error(f"调用工作流失败: {response.status_code} - {error_text}")
                            yield f"data: {json.dumps({'error': error_text.decode()})}\n\n"
                            return
                        
                        async for chunk in response.aiter_bytes():
                            if chunk:
                                yield chunk
                
                return StreamingResponse(
                    generate(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "X-Accel-Buffering": "no"
                    }
                )
            else:
                # 非流式响应
                response = await client.post(
                    f"{settings.BISHENG_BASE_URL}/api/v2/workflow/invoke/{request.workflow_id}",
                    json=payload,
                    headers={
                        "Authorization": authorization,
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    logger.info(f"调用工作流成功: {request.workflow_id}")
                    return response.json()
                else:
                    logger.error(f"调用工作流失败: {response.status_code} - {response.text}")
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"调用工作流失败: {response.text}"
                    )
                    
    except httpx.RequestError as e:
        logger.error(f"调用工作流请求错误: {e}")
        raise HTTPException(status_code=503, detail=f"连接 Bisheng 服务失败: {str(e)}")


@router.get("/config")
async def get_config():
    """
    获取 Bisheng 配置
    
    Returns:
        当前的 Bisheng 配置
    """
    return {
        "enabled": settings.BISHENG_ENABLED,
        "base_url": settings.BISHENG_BASE_URL,
        "frontend_url": settings.BISHENG_FRONTEND_URL,
        "iframe_proxy_port": settings.BISHENG_IFRAME_PROXY_PORT,
        "username": settings.BISHENG_USERNAME,
        "mode": settings.BISHENG_DEFAULT_MODE,
        "token_expiry": settings.BISHENG_TOKEN_EXPIRY,
        # 不返回密码和 token
    }


@router.post("/config")
async def update_config(config: BishengConfigUpdate):
    """
    更新 Bisheng 配置
    
    Args:
        config: 配置更新请求
        
    Returns:
        更新结果
    """
    try:
        # 更新配置（注意：这里只是示例，实际应该持久化到配置文件或数据库）
        if config.enabled is not None:
            settings.BISHENG_ENABLED = config.enabled
        if config.base_url is not None:
            settings.BISHENG_BASE_URL = config.base_url
        if config.frontend_url is not None:
            settings.BISHENG_FRONTEND_URL = config.frontend_url
        if config.iframe_proxy_port is not None:
            settings.BISHENG_IFRAME_PROXY_PORT = config.iframe_proxy_port
        if config.username is not None:
            settings.BISHENG_USERNAME = config.username
        if config.password is not None:
            settings.BISHENG_PASSWORD = config.password
        if config.mode is not None:
            settings.BISHENG_DEFAULT_MODE = config.mode
        
        logger.info("Bisheng 配置已更新")
        return {"success": True, "message": "配置更新成功"}
        
    except Exception as e:
        logger.error(f"更新 Bisheng 配置失败: {e}")
        raise HTTPException(status_code=500, detail=f"更新配置失败: {str(e)}")


@router.get("/status")
async def get_status():
    """
    获取 Bisheng 服务状态
    
    Returns:
        服务状态信息
    """
    status = {
        "enabled": settings.BISHENG_ENABLED,
        "connected": False,
        "authenticated": False
    }
    
    if not settings.BISHENG_ENABLED:
        return status
    
    try:
        # 检查连接
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.BISHENG_BASE_URL}/health")
            status["connected"] = response.status_code == 200
            
        # 检查认证（如果有 token）
        if settings.BISHENG_ACCESS_TOKEN:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{settings.BISHENG_BASE_URL}/api/v2/workflows",
                    params={"page_size": 1, "page_num": 1},
                    headers={"Authorization": f"Bearer {settings.BISHENG_ACCESS_TOKEN}"}
                )
                status["authenticated"] = response.status_code == 200
                
    except Exception as e:
        logger.warning(f"检查 Bisheng 状态失败: {e}")
    
    return status
