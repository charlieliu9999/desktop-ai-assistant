"""
患者数据模型
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Patient(Base):
    """患者表"""
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(50), unique=True, nullable=False, index=True, comment="患者ID")
    name = Column(String(100), nullable=False, comment="姓名")
    gender = Column(String(10), comment="性别")
    age = Column(Integer, comment="年龄")
    phone = Column(String(20), comment="电话")
    id_card = Column(String(20), comment="身份证号")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
    
    # 关联关系
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Patient(id={self.id}, patient_id={self.patient_id}, name={self.name})>"

