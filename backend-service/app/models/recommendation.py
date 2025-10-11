"""
推荐记录数据模型
"""
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Recommendation(Base):
    """推荐记录表"""
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=False, comment="就诊记录ID")
    exam_title = Column(String(200), nullable=False, comment="检查项目名称")
    exam_type = Column(String(50), comment="检查类型(CT/MRI/X-Ray/超声)")
    body_part = Column(String(100), comment="检查部位")
    priority = Column(String(20), comment="优先级(high/medium/low)")
    reason = Column(Text, comment="推荐理由")
    urgency = Column(String(20), comment="紧急程度(急诊/择期)")
    estimated_cost = Column(String(50), comment="预估费用")
    ai_confidence = Column(Float, comment="AI置信度")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    
    # 关联关系
    visit = relationship("Visit", back_populates="recommendations")
    feedbacks = relationship("Feedback", back_populates="recommendation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Recommendation(id={self.id}, exam_title={self.exam_title}, priority={self.priority})>"

