"""
就诊记录数据模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Visit(Base):
    """就诊记录表"""
    __tablename__ = "visits"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, comment="患者ID")
    visit_date = Column(DateTime, default=datetime.utcnow, nullable=False, comment="就诊日期")
    chief_complaint = Column(Text, comment="主诉")
    medical_history = Column(Text, comment="病史")
    physical_examination = Column(Text, comment="体格检查")
    diagnosis = Column(Text, comment="诊断")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
    
    # 关联关系
    patient = relationship("Patient", back_populates="visits")
    recommendations = relationship("Recommendation", back_populates="visit", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Visit(id={self.id}, patient_id={self.patient_id}, visit_date={self.visit_date})>"

