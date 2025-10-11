"""
用户反馈数据模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Feedback(Base):
    """用户反馈表"""
    __tablename__ = "feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    recommendation_id = Column(Integer, ForeignKey("recommendations.id"), nullable=False, comment="推荐记录ID")
    feedback_type = Column(String(20), nullable=False, comment="反馈类型(helpful/not-helpful)")
    comment = Column(Text, comment="反馈评论")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    
    # 关联关系
    recommendation = relationship("Recommendation", back_populates="feedbacks")
    
    def __repr__(self):
        return f"<Feedback(id={self.id}, recommendation_id={self.recommendation_id}, type={self.feedback_type})>"

