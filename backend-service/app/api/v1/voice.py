"""
语音服务API路由
"""
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.services.voice import (
    STTRequest,
    STTResponse,
    TTSRequest,
    TTSResponse,
    STTService,
    TTSService,
)

router = APIRouter(prefix="/voice")

# 全局服务实例（将在main.py中初始化）
stt_service: STTService = None  # type: ignore
tts_service: TTSService = None  # type: ignore


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(request: STTRequest):
    """
    语音识别 (Speech-to-Text)

    将语音转换为文字

    Args:
        request: 语音识别请求

    Returns:
        语音识别响应
    """
    try:
        if not stt_service:
            raise HTTPException(status_code=503, detail="语音识别服务未初始化")

        response = await stt_service.recognize(request)

        if not response.success:
            raise HTTPException(status_code=500, detail=response.error)

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"语音识别失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """
    语音合成 (Text-to-Speech)

    将文字转换为语音

    Args:
        request: 语音合成请求

    Returns:
        语音合成响应
    """
    try:
        if not tts_service:
            raise HTTPException(status_code=503, detail="语音合成服务未初始化")

        response = await tts_service.synthesize(request)

        if not response.success:
            raise HTTPException(status_code=500, detail=response.error)

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"语音合成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """
    健康检查

    Returns:
        健康状态
    """
    try:
        stt_healthy = await stt_service.health_check() if stt_service else False
        tts_healthy = await tts_service.health_check() if tts_service else False

        return {
            "success": True,
            "services": {
                "stt": {"healthy": stt_healthy, "available": stt_service is not None},
                "tts": {"healthy": tts_healthy, "available": tts_service is not None},
            },
        }

    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

