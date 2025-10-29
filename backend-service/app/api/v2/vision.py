"""
API v2 - Vision（Phase 1：understand 最小 strict_json）
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.services.ai.models import APIResponse


router = APIRouter(prefix="/vision")


@router.post("/understand", response_model=APIResponse)
async def understand(payload: dict):
    """最小实现：接收 { source: {type:'base64'|'url', data, mime?}, prompt, strict_json?, json_schema?, provider?, model? }"""
    try:
        source = (payload or {}).get("source") or {}
        prompt = (payload or {}).get("prompt") or ""
        strict_json = bool((payload or {}).get("strict_json", False))
        provider = (payload or {}).get("provider")
        model = (payload or {}).get("model")
        if not prompt:
            raise HTTPException(status_code=400, detail="validation_error: missing prompt")
        if not isinstance(source, dict) or not source.get("data"):
            raise HTTPException(status_code=400, detail="validation_error: missing source.data")

        # 将输入适配到 v1 的 VisionRequest
        image_data = source.get("data")
        image_mime = source.get("mime")
        from app.services.vision.models import VisionRequest
        from app.api.v1.vision import vision_service  # 复用现有服务实例

        if not vision_service:
            raise HTTPException(status_code=503, detail="vision_unavailable")

        req = VisionRequest(
            image_data=image_data,
            image_mime=image_mime,
            prompt=prompt,
            model=model,
            provider=provider,
            strict_json=strict_json,
        )
        resp = await vision_service.understand(req)

        if strict_json and not resp.success:
            # Phase 1：strict_json 失败时返回 no_result
            return APIResponse(success=False, error={"code": "no_result", "message": resp.error or "no_result"}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})

        data = None
        if resp.success and resp.result:
            data = {
                "description": resp.result.description,
                "confidence": resp.result.confidence,
                "details": resp.result.details,
                "structured": getattr(resp.result, "structured", None),
                "model_used": resp.model_used,
            }
        elif not resp.success:
            return APIResponse(success=False, error={"code": "upstream_error", "message": resp.error or "fail"}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})

        return APIResponse(success=True, data=data, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"v2/vision/understand error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")

