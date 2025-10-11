"""
模型配置相关的 Pydantic schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class ModelConfigSchema(BaseModel):
    """单个模型配置"""
    model_config = {"protected_namespaces": ()}  # 允许 model_ 前缀

    model_name: str = Field(..., description="模型名称")
    base_url: str = Field(default="http://localhost:11434", description="API地址")
    api_key: Optional[str] = Field(default="", description="API密钥(如果需要)")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="温度参数")
    max_tokens: int = Field(default=2000, ge=1, le=32000, description="最大token数")
    timeout: int = Field(default=60, ge=10, le=300, description="超时时间(秒)")


class ScenarioConfigSchema(BaseModel):
    """场景配置"""
    scenario: str = Field(..., description="场景名称")
    config: ModelConfigSchema = Field(..., description="模型配置")


class AllConfigsResponse(BaseModel):
    """所有配置响应"""
    configs: Dict[str, ModelConfigSchema] = Field(..., description="所有场景的配置")
    scenarios: List[str] = Field(..., description="支持的场景列表")


class ModelTestRequest(BaseModel):
    """模型测试请求"""
    model_name: str = Field(..., description="模型名称")
    base_url: str = Field(default="http://localhost:11434", description="API地址")
    api_key: Optional[str] = Field(default="", description="API密钥")
    timeout: int = Field(default=10, ge=5, le=60, description="测试超时时间(秒)")


class ModelTestResponse(BaseModel):
    """模型测试响应"""
    model_config = {"protected_namespaces": ()}  # 允许 model_ 前缀

    success: bool = Field(..., description="测试是否成功")
    message: str = Field(..., description="测试结果消息")
    model_info: Optional[Dict[str, Any]] = Field(default=None, description="模型信息")
    error: Optional[str] = Field(default=None, description="错误信息")


class UpdateConfigRequest(BaseModel):
    """更新配置请求"""
    scenario: str = Field(..., description="场景名称")
    config: ModelConfigSchema = Field(..., description="新的模型配置")


class UpdateConfigResponse(BaseModel):
    """更新配置响应"""
    success: bool = Field(..., description="更新是否成功")
    message: str = Field(..., description="更新结果消息")
    config: Optional[ModelConfigSchema] = Field(default=None, description="更新后的配置")

