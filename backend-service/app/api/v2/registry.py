"""
API v2 - Registry 只读列表
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.services.ai.models import APIResponse
from app.registry import load_registry


router = APIRouter(prefix="/registry")


@router.get("/providers", response_model=APIResponse)
async def providers():
    try:
        reg = load_registry()
        data = [p.model_dump() for p in reg.providers]
        return APIResponse(success=True, data=data, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except Exception as e:
        logger.error(f"v2/registry/providers error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")


@router.get("/models", response_model=APIResponse)
async def models():
    try:
        reg = load_registry()
        data = [m.model_dump() for m in reg.models]
        return APIResponse(success=True, data=data, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except Exception as e:
        logger.error(f"v2/registry/models error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")

