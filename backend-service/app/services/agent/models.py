"""
智能体服务数据模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class BishengConfig(BaseModel):
    """Bisheng配置"""
    enabled: bool = Field(True, description="是否启用")
    base_url: str = Field(..., description="Bisheng API地址")
    frontend_url: str = Field(..., description="Bisheng前端地址")
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")
    access_token: Optional[str] = Field(None, description="访问令牌")
    token_expiry: Optional[int] = Field(None, description="令牌过期时间")
    mode: str = Field("api", description="接入模式: api | iframe")
    timeout: int = Field(30, description="超时时间(秒)")
    retry_attempts: int = Field(3, description="重试次数")


class AgentWorkflow(BaseModel):
    """智能体工作流"""
    id: str = Field(..., description="工作流ID")
    name: str = Field(..., description="工作流名称")
    description: Optional[str] = Field(None, description="描述")
    status: Optional[str] = Field(None, description="状态")
    create_time: Optional[str] = Field(None, description="创建时间")
    update_time: Optional[str] = Field(None, description="更新时间")


class AgentInvokeRequest(BaseModel):
    """智能体调用请求"""
    workflow_id: str = Field(..., description="工作流ID")
    input: Dict[str, Any] = Field(..., description="输入数据")
    stream: bool = Field(True, description="是否流式响应")
    session_id: Optional[str] = Field(None, description="会话ID")
    message_id: Optional[str] = Field(None, description="消息ID")
    input_node_id: Optional[str] = Field(None, description="输入节点ID")


class AgentResponse(BaseModel):
    """智能体响应"""
    success: bool = Field(..., description="是否成功")
    data: Optional[Any] = Field(None, description="响应数据")
    error: Optional[str] = Field(None, description="错误信息")
    meta: Optional[Dict[str, Any]] = Field(None, description="元数据")


class AgentHealthStatus(BaseModel):
    """智能体健康状态"""
    service_name: str = Field(..., description="服务名称")
    healthy: bool = Field(..., description="是否健康")
    connected: bool = Field(..., description="是否连接")
    authenticated: bool = Field(..., description="是否已认证")
    last_check: datetime = Field(..., description="最后检查时间")
    error: Optional[str] = Field(None, description="错误信息")


class LoginResponse(BaseModel):
    """登录响应"""
    success: bool = Field(..., description="是否成功")
    token: Optional[str] = Field(None, description="访问令牌")
    expiry: Optional[int] = Field(None, description="过期时间")
    error: Optional[str] = Field(None, description="错误信息")

