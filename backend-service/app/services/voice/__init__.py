"""
语音服务模块

提供语音识别和语音合成功能
"""
from .models import (
    STTRequest,
    STTResponse,
    TTSRequest,
    TTSResponse,
)
from .stt_service import STTService
from .tts_service import TTSService

__all__ = [
    "STTRequest",
    "STTResponse",
    "TTSRequest",
    "TTSResponse",
    "STTService",
    "TTSService",
]

