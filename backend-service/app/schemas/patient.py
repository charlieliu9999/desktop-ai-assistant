"""
患者相关的Pydantic schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PatientBase(BaseModel):
    """患者基础schema"""
    patient_id: str = Field(..., description="患者ID")
    name: str = Field(..., description="姓名")
    gender: Optional[str] = Field(None, description="性别")
    age: Optional[int] = Field(None, description="年龄")
    phone: Optional[str] = Field(None, description="电话")
    id_card: Optional[str] = Field(None, description="身份证号")


class PatientCreate(PatientBase):
    """创建患者schema"""
    pass


class PatientUpdate(BaseModel):
    """更新患者schema"""
    name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    id_card: Optional[str] = None


class PatientResponse(PatientBase):
    """患者响应schema"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

