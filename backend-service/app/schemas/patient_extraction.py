"""
患者信息提取相关的 Pydantic schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class PatientExtractionRequest(BaseModel):
    """患者信息提取请求"""
    image_data: str = Field(..., description="Base64编码的图像数据")
    prompt_template: str = Field(default="medical_patient_info", description="提示词模板类型")


class PatientExtractionResponse(BaseModel):
    """患者信息提取响应"""
    success: bool = Field(..., description="提取是否成功")
    patient_info: Optional[Dict[str, Any]] = Field(default=None, description="提取的患者信息")
    error: Optional[str] = Field(default=None, description="错误信息")


class RecommendationGenerationRequest(BaseModel):
    """推荐生成请求"""
    patient_name: str = Field(..., description="患者姓名")
    gender: str = Field(..., description="性别")
    age: int = Field(..., ge=0, le=150, description="年龄")
    chief_complaint: str = Field(..., description="主诉")
    medical_history: str = Field(default="", description="病史")
    recommendation_types: List[str] = Field(
        default=["exam"],
        description="推荐类型列表: exam(检查), medication(用药), diagnosis(诊断)"
    )


class RecommendationItem(BaseModel):
    """单个推荐项"""
    model_config = {"protected_namespaces": ()}  # 允许 model_ 前缀
    
    title: str = Field(..., description="推荐标题")
    type: str = Field(..., description="推荐类型: exam/medication/diagnosis")
    details: Dict[str, Any] = Field(..., description="推荐详情")
    confidence: float = Field(..., ge=0.0, le=1.0, description="置信度")


class RecommendationGenerationResponse(BaseModel):
    """推荐生成响应"""
    success: bool = Field(..., description="生成是否成功")
    recommendations: Dict[str, List[Dict[str, Any]]] = Field(
        default={},
        description="推荐结果,按类型分组: {exam: [...], medication: [...], diagnosis: [...]}"
    )
    error: Optional[str] = Field(default=None, description="错误信息")

