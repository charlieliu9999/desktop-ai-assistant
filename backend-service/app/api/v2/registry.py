"""
API v2 - Registry 读写（最小实现）
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.services.ai.models import APIResponse
from app.registry import load_registry
from app.registry.models import Provider, ModelInfo
from app.registry.store import save_registry
from app.config import settings


router = APIRouter(prefix="/registry")


def _writable_guard():
    # 最小安全：仅在 DEBUG 模式允许写入（生产按需扩展鉴权）
    if not getattr(settings, "DEBUG", False):
        raise HTTPException(status_code=403, detail="registry_write_disabled")


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


@router.post("/providers", response_model=APIResponse)
async def upsert_provider(payload: dict):
    """新增/更新 Provider（按 id upsert）。仅 DEBUG 模式可用。"""
    _writable_guard()
    try:
        incoming = Provider(**payload)
        reg = load_registry()
        found = False
        for idx, p in enumerate(reg.providers):
            if p.id == incoming.id:
                reg.providers[idx] = incoming
                found = True
                break
        if not found:
            reg.providers.append(incoming)
        save_registry(reg)
        return APIResponse(success=True, data=incoming.model_dump(), meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"v2/registry/providers upsert error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")


@router.delete("/providers/{provider_id}", response_model=APIResponse)
async def delete_provider(provider_id: str):
    """删除 Provider。若仍有关联模型，则返回 400。仅 DEBUG 模式可用。"""
    _writable_guard()
    try:
        reg = load_registry()
        if any(m.provider_id == provider_id for m in reg.models):
            raise HTTPException(status_code=400, detail="provider_in_use")
        new_providers = [p for p in reg.providers if p.id != provider_id]
        if len(new_providers) == len(reg.providers):
            # 不存在也视为成功（幂等）
            return APIResponse(success=True, data={"deleted": False}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
        reg.providers = new_providers
        save_registry(reg)
        return APIResponse(success=True, data={"deleted": True, "id": provider_id}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"v2/registry/providers delete error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")


@router.post("/models", response_model=APIResponse)
async def upsert_model(payload: dict):
    """新增/更新 Model（按 id upsert）。要求 provider 存在。仅 DEBUG 模式可用。"""
    _writable_guard()
    try:
        incoming = ModelInfo(**payload)
        reg = load_registry()
        if not any(p.id == incoming.provider_id for p in reg.providers):
            raise HTTPException(status_code=400, detail="provider_not_found")
        found = False
        for idx, m in enumerate(reg.models):
            if m.id == incoming.id:
                reg.models[idx] = incoming
                found = True
                break
        if not found:
            reg.models.append(incoming)
        save_registry(reg)
        return APIResponse(success=True, data=incoming.model_dump(), meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"v2/registry/models upsert error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")


@router.delete("/models/{model_id}", response_model=APIResponse)
async def delete_model(model_id: str):
    """删除 Model（幂等）。仅 DEBUG 模式可用。"""
    _writable_guard()
    try:
        reg = load_registry()
        new_models = [m for m in reg.models if m.id != model_id]
        deleted = len(new_models) != len(reg.models)
        reg.models = new_models
        save_registry(reg)
        return APIResponse(success=True, data={"deleted": deleted, "id": model_id}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"v2/registry/models delete error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")
