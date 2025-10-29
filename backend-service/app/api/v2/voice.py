"""
API v2 - Voice（Phase 1：models/health）
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.services.ai.models import APIResponse


router = APIRouter(prefix="/voice")


@router.get("/models", response_model=APIResponse)
async def list_voice_models():
    try:
        from app.registry.store import load_registry

        reg = load_registry()
        stt = sorted({m.name for m in reg.models if m.modality == "stt" and getattr(m, "enabled", True)})
        tts = sorted({m.name for m in reg.models if m.modality == "tts" and getattr(m, "enabled", True)})
        return APIResponse(success=True, data={"stt": list(stt), "tts": list(tts)}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except Exception as e:
        logger.error(f"v2/voice/models error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")


@router.get("/health", response_model=APIResponse)
async def health():
    try:
        # 复用 v1 的全局服务实例，若不可用则 available=False
        try:
            from app.api.v1.voice import stt_service, tts_service  # type: ignore
        except Exception:
            stt_service = None
            tts_service = None
        stt_healthy = False
        tts_healthy = False
        try:
            stt_healthy = await stt_service.health_check() if stt_service else False
            tts_healthy = await tts_service.health_check() if tts_service else False
        except Exception:
            pass
        services = {
            "stt": {"healthy": stt_healthy, "available": stt_service is not None},
            "tts": {"healthy": tts_healthy, "available": tts_service is not None},
        }
        return APIResponse(success=True, data={"services": services}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except Exception as e:
        logger.error(f"v2/voice/health error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")

