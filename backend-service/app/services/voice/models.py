"""
语音服务数据模型
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class STTRequest(BaseModel):
    """语音识别请求 (Speech-to-Text)"""

    audio_data: str = Field(..., description="Base64编码的音频数据")
    language: str = Field(default="zh", description="语言代码")
    model: Optional[str] = Field(None, description="使用的模型")
    audio_mime: Optional[str] = Field(default=None, description="音频MIME类型，如 audio/webm, audio/wav, audio/mpeg")


class STTResult(BaseModel):
    """语音识别结果"""

    text: str = Field(..., description="识别的文本")
    confidence: float = Field(..., description="置信度", ge=0.0, le=1.0)
    language: str = Field(..., description="检测到的语言")
    segments: list[Dict[str, Any]] = Field(
        default_factory=list, description="分段信息"
    )


class STTResponse(BaseModel):
    """语音识别响应"""

    success: bool = Field(..., description="是否成功")
    result: Optional[STTResult] = Field(None, description="识别结果")
    error: Optional[str] = Field(None, description="错误信息")
    model_used: Optional[str] = Field(None, description="使用的模型")
    processing_time_ms: Optional[float] = Field(None, description="处理时间(毫秒)")


class TTSRequest(BaseModel):
    """语音合成请求 (Text-to-Speech)"""

    text: str = Field(..., description="要合成的文本")
    language: str = Field(default="zh", description="语言代码")
    voice: Optional[str] = Field(None, description="语音类型")
    speed: float = Field(default=1.0, description="语速", ge=0.5, le=2.0)
    pitch: float = Field(default=1.0, description="音调", ge=0.5, le=2.0)
    model: Optional[str] = Field(None, description="使用的模型")


class TTSResult(BaseModel):
    """语音合成结果"""

    audio_data: str = Field(..., description="Base64编码的音频数据")
    format: str = Field(..., description="音频格式")
    duration_ms: float = Field(..., description="音频时长(毫秒)")


class TTSResponse(BaseModel):
    """语音合成响应"""

    success: bool = Field(..., description="是否成功")
    result: Optional[TTSResult] = Field(None, description="合成结果")
    error: Optional[str] = Field(None, description="错误信息")
    model_used: Optional[str] = Field(None, description="使用的模型")
    processing_time_ms: Optional[float] = Field(None, description="处理时间(毫秒)")
