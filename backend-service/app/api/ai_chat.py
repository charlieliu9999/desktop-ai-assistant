"""
AI问答API路由
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict
from loguru import logger

from app.services.ai_service import ai_service

router = APIRouter()


class ChatRequest(BaseModel):
    """聊天请求"""
    message: str = Field(..., description="用户消息")
    history: List[Dict[str, str]] = Field(default=[], description="对话历史")


class ChatResponse(BaseModel):
    """聊天响应"""
    success: bool
    reply: str
    message: str = ""


class ExtractPatientInfoRequest(BaseModel):
    """提取患者信息请求"""
    text: str = Field(..., description="OCR识别的文本")
    screenshot: str = Field(default="", description="截图的base64数据(可选)")


class ExtractPatientInfoResponse(BaseModel):
    """提取患者信息响应"""
    success: bool
    patient_info: Dict
    message: str = ""


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """AI对话接口"""
    try:
        if not request.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="消息不能为空"
            )

        logger.info(f"收到AI对话请求: {request.message[:50]}...")

        # 调用AI服务
        reply = await ai_service.chat(
            message=request.message,
            history=request.history
        )

        return ChatResponse(
            success=True,
            reply=reply
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI对话失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI对话失败: {str(e)}"
        )


@router.post("/extract-patient-info", response_model=ExtractPatientInfoResponse)
async def extract_patient_info(request: ExtractPatientInfoRequest):
    """从OCR文本中提取患者信息"""
    try:
        if not request.text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OCR文本不能为空"
            )

        logger.info(f"收到患者信息提取请求,文本长度: {len(request.text)}")

        # 调用AI服务提取患者信息
        patient_info = await ai_service.extract_patient_info(request.text)

        return ExtractPatientInfoResponse(
            success=True,
            patient_info=patient_info,
            message="患者信息提取成功"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"提取患者信息失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"提取患者信息失败: {str(e)}"
        )

