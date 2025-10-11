"""
推荐相关的Pydantic schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class RecommendationRequest(BaseModel):
    """生成推荐请求schema"""
    model_config = ConfigDict(protected_namespaces=())  # 允许 model_ 前缀

    patient_id: str = Field(..., description="患者ID")
    chief_complaint: str = Field(..., description="主诉")
    medical_history: Optional[str] = Field(None, description="病史")
    physical_examination: Optional[str] = Field(None, description="体格检查")


class RecommendationItem(BaseModel):
    """单个推荐项schema"""
    id: int
    exam_title: str = Field(..., description="检查项目名称")
    exam_type: Optional[str] = Field(None, description="检查类型")
    body_part: Optional[str] = Field(None, description="检查部位")
    priority: Optional[str] = Field(None, description="优先级")
    reason: Optional[str] = Field(None, description="推荐理由")
    urgency: Optional[str] = Field(None, description="紧急程度")
    estimated_cost: Optional[str] = Field(None, description="预估费用")
    ai_confidence: Optional[float] = Field(None, description="AI置信度")
    created_at: datetime
    
    class Config:
        from_attributes = True


class RecommendationResponse(BaseModel):
    """推荐响应schema"""
    success: bool
    visit_id: int
    recommendations: List[RecommendationItem]


class FeedbackRequest(BaseModel):
    """反馈请求schema"""
    recommendation_id: int = Field(..., description="推荐记录ID")
    feedback_type: str = Field(..., description="反馈类型(helpful/not-helpful)")
    comment: Optional[str] = Field(None, description="反馈评论")


class FeedbackResponse(BaseModel):
    """反馈响应schema"""
    success: bool
    message: str

