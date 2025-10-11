"""
视觉服务数据模型
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class OCRRequest(BaseModel):
    """OCR识别请求"""

    image_data: str = Field(..., description="Base64编码的图像数据")
    language: str = Field(default="chi_sim+eng", description="识别语言")
    psm: int = Field(default=3, description="页面分割模式", ge=0, le=13)
    oem: int = Field(default=3, description="OCR引擎模式", ge=0, le=3)


class OCRResult(BaseModel):
    """OCR识别结果"""

    text: str = Field(..., description="识别的文本")
    confidence: float = Field(..., description="置信度", ge=0.0, le=1.0)
    boxes: List[Dict[str, Any]] = Field(
        default_factory=list, description="文本框位置信息"
    )


class OCRResponse(BaseModel):
    """OCR识别响应"""

    success: bool = Field(..., description="是否成功")
    result: Optional[OCRResult] = Field(None, description="识别结果")
    error: Optional[str] = Field(None, description="错误信息")
    processing_time_ms: Optional[float] = Field(None, description="处理时间(毫秒)")


class VisionRequest(BaseModel):
    """视觉理解请求"""

    image_data: str = Field(..., description="Base64编码的图像数据")
    prompt: str = Field(..., description="提示词")
    model: Optional[str] = Field(None, description="使用的模型")
    max_tokens: int = Field(default=1000, description="最大token数", ge=1, le=4000)
    temperature: float = Field(default=0.7, description="温度参数", ge=0.0, le=2.0)


class VisionResult(BaseModel):
    """视觉理解结果"""

    description: str = Field(..., description="图像描述")
    confidence: float = Field(..., description="置信度", ge=0.0, le=1.0)
    details: Dict[str, Any] = Field(default_factory=dict, description="详细信息")


class VisionResponse(BaseModel):
    """视觉理解响应"""

    success: bool = Field(..., description="是否成功")
    result: Optional[VisionResult] = Field(None, description="理解结果")
    error: Optional[str] = Field(None, description="错误信息")
    model_used: Optional[str] = Field(None, description="使用的模型")
    processing_time_ms: Optional[float] = Field(None, description="处理时间(毫秒)")

