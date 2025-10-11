"""
AI服务数据模型
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime


class Message(BaseModel):
    """消息模型"""
    role: Literal["system", "user", "assistant"] = Field(..., description="角色")
    content: str = Field(..., description="内容")
    name: Optional[str] = Field(None, description="名称")


class ChatOptions(BaseModel):
    """对话选项"""
    model: Optional[str] = Field(None, description="模型名称")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="温度")
    max_tokens: Optional[int] = Field(2000, gt=0, description="最大token数")
    top_p: Optional[float] = Field(1.0, ge=0.0, le=1.0, description="Top P")
    frequency_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0, description="频率惩罚")
    presence_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0, description="存在惩罚")
    stream: bool = Field(False, description="是否流式响应")


class Usage(BaseModel):
    """Token使用统计"""
    prompt_tokens: int = Field(..., description="提示词token数")
    completion_tokens: int = Field(..., description="完成token数")
    total_tokens: int = Field(..., description="总token数")


class ChatResponse(BaseModel):
    """对话响应"""
    message: Message = Field(..., description="AI回复消息")
    usage: Usage = Field(..., description="Token使用统计")
    model: str = Field(..., description="使用的模型")
    finish_reason: str = Field(..., description="完成原因")
    provider: str = Field(..., description="提供商")


class StreamChunk(BaseModel):
    """流式响应块"""
    type: Literal["start", "chunk", "done", "error"] = Field(..., description="块类型")
    content: Optional[str] = Field(None, description="内容")
    usage: Optional[Usage] = Field(None, description="使用统计(仅done时)")
    error: Optional[str] = Field(None, description="错误信息(仅error时)")
    request_id: Optional[str] = Field(None, description="请求ID")


class AnalyzeRequest(BaseModel):
    """内容分析请求"""
    content: str = Field(..., description="要分析的内容")
    analysis_type: Literal["patient_info", "medical_record", "diagnosis", "general"] = Field(
        ..., description="分析类型"
    )
    extract_fields: Optional[List[str]] = Field(None, description="要提取的字段")
    options: Optional[ChatOptions] = Field(default_factory=ChatOptions, description="选项")


class AnalyzeResponse(BaseModel):
    """内容分析响应"""
    analysis_type: str = Field(..., description="分析类型")
    extracted_data: Dict[str, Any] = Field(..., description="提取的数据")
    confidence: float = Field(..., ge=0.0, le=1.0, description="置信度")
    raw_response: str = Field(..., description="原始AI响应")
    provider: str = Field(..., description="提供商")


class ProviderConfig(BaseModel):
    """提供商配置"""
    name: str = Field(..., description="提供商名称")
    api_key: str = Field(..., description="API密钥")
    api_base: str = Field(..., description="API基础URL")
    model: str = Field(..., description="默认模型")
    enabled: bool = Field(True, description="是否启用")
    timeout: int = Field(30, description="超时时间(秒)")
    max_retries: int = Field(3, description="最大重试次数")


class ProviderHealth(BaseModel):
    """提供商健康状态"""
    name: str = Field(..., description="提供商名称")
    healthy: bool = Field(..., description="是否健康")
    latency_ms: Optional[float] = Field(None, description="延迟(毫秒)")
    last_check: datetime = Field(..., description="最后检查时间")
    error: Optional[str] = Field(None, description="错误信息")


class ChatRequest(BaseModel):
    """对话请求"""
    messages: List[Message] = Field(..., description="消息列表")
    provider: Optional[str] = Field(None, description="指定提供商")
    options: Optional[ChatOptions] = Field(default_factory=ChatOptions, description="选项")


class APIResponse(BaseModel):
    """统一API响应格式"""
    success: bool = Field(..., description="是否成功")
    data: Optional[Any] = Field(None, description="数据")
    error: Optional[Dict[str, Any]] = Field(None, description="错误信息")
    meta: Dict[str, Any] = Field(default_factory=dict, description="元数据")

