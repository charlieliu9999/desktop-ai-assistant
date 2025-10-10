"""
患者信息服务数据模型
"""

from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


class PatientInfo(BaseModel):
    """患者信息"""
    name: str = Field(..., description="患者姓名")
    age: Optional[int] = Field(None, description="年龄", ge=0, le=150)
    gender: Optional[Literal["男", "女", "未知"]] = Field(None, description="性别")
    patient_id: Optional[str] = Field(None, description="患者ID/病历号")
    department: Optional[str] = Field(None, description="科室")
    chief_complaint: Optional[str] = Field(None, description="主诉")
    diagnosis: Optional[str] = Field(None, description="诊断")
    medical_history: Optional[str] = Field(None, description="病史")
    confidence: float = Field(0.0, description="提取置信度", ge=0.0, le=1.0)


class OCRResult(BaseModel):
    """OCR识别结果"""
    text: str = Field(..., description="识别的文本")
    confidence: float = Field(..., description="识别置信度", ge=0.0, le=1.0)
    bounds: Optional[Dict[str, float]] = Field(None, description="文本边界框")
    words: Optional[List[Dict[str, Any]]] = Field(None, description="单词列表")
    lines: Optional[List[Dict[str, Any]]] = Field(None, description="行列表")


class ExtractionRequest(BaseModel):
    """患者信息提取请求"""
    text: Optional[str] = Field(None, description="待提取的文本")
    image_base64: Optional[str] = Field(None, description="Base64编码的图片")
    use_ai: bool = Field(True, description="是否使用AI辅助提取")
    min_confidence: float = Field(0.6, description="最小置信度阈值", ge=0.0, le=1.0)


class ExtractionResponse(BaseModel):
    """患者信息提取响应"""
    patient_info: PatientInfo = Field(..., description="提取的患者信息")
    extraction_method: Literal["ai", "rules", "hybrid"] = Field(..., description="提取方法")
    processing_time_ms: float = Field(..., description="处理时间(毫秒)")


class ValidationResult(BaseModel):
    """验证结果"""
    valid: bool = Field(..., description="是否有效")
    errors: List[str] = Field(default_factory=list, description="错误列表")
    warnings: List[str] = Field(default_factory=list, description="警告列表")

