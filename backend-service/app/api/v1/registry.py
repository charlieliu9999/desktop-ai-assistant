"""
模型与Provider注册中心（只读API，后续可扩展写接口与健康测试）。
"""
from fastapi import APIRouter, HTTPException, Path
from loguru import logger

from typing import Optional
import os
import httpx

from app.registry import load_registry
from app.registry.models import RegistryData, Provider, ModelInfo
from app.registry.store import save_registry


router = APIRouter(prefix="/registry")


@router.get("/providers")
async def list_providers():
    try:
        reg = load_registry()
        return {"success": True, "data": [p.model_dump() for p in reg.providers]}
    except Exception as e:
        logger.error(f"list_providers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def list_models():
    try:
        reg = load_registry()
        return {"success": True, "data": [m.model_dump() for m in reg.models]}
    except Exception as e:
        logger.error(f"list_models error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/providers/{pid}/health")
async def provider_health(pid: str = Path(..., description="Provider ID")):
    try:
        reg = load_registry()
        prov: Optional[Provider] = next((p for p in reg.providers if p.id == pid), None)
        if not prov:
            raise HTTPException(status_code=404, detail="provider_not_found")

        ok = False
        latency_ms: Optional[float] = None
        # Simple connectivity checks
        import time
        start = time.time()
        headers = {}
        # prefer env, fallback to settings
        api_key = None
        if prov.auth and prov.auth.type == "env" and prov.auth.env_key:
            api_key = os.getenv(prov.auth.env_key, "")
        if not api_key:
            try:
                from app.config import settings
                if prov.kind == "openai" and getattr(settings, 'OPENAI_API_KEY', ''):
                    api_key = settings.OPENAI_API_KEY
                elif prov.kind == "deepseek" and getattr(settings, 'DEEPSEEK_API_KEY', ''):
                    api_key = settings.DEEPSEEK_API_KEY
            except Exception:
                pass
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                if prov.kind == "ollama" and prov.base_url.endswith("/v1"):
                    base = prov.base_url[: -3]
                    resp = await client.get(f"{base}/api/tags")
                    ok = resp.status_code == 200
                else:
                    resp = await client.get(f"{prov.base_url}/models", headers=headers)
                    ok = resp.status_code == 200
        except Exception as e:
            logger.warning(f"provider_health request error: {e}")
            ok = False
        latency_ms = (time.time() - start) * 1000.0

        return {"success": True, "data": {"healthy": ok, "latency_ms": latency_ms}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"provider_health error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{mid}/health")
async def model_health(mid: str = Path(..., description="Model ID")):
    try:
        reg = load_registry()
        m: Optional[ModelInfo] = next((x for x in reg.models if x.id == mid), None)
        if not m:
            raise HTTPException(status_code=404, detail="model_not_found")
        prov: Optional[Provider] = next((p for p in reg.providers if p.id == m.provider_id), None)
        if not prov:
            raise HTTPException(status_code=404, detail="provider_not_found")

        # Strategy:
        # - For Ollama: verify model presence via /api/tags (compat list)
        # - For OpenAI-compatible APIs: perform a minimal chat.completions call with the model
        headers = {}
        api_key = None
        if prov.auth and prov.auth.type == "env" and prov.auth.env_key:
            api_key = os.getenv(prov.auth.env_key, "")
        if not api_key:
            try:
                from app.config import settings
                if prov.kind == "openai" and getattr(settings, 'OPENAI_API_KEY', ''):
                    api_key = settings.OPENAI_API_KEY
                elif prov.kind == "deepseek" and getattr(settings, 'DEEPSEEK_API_KEY', ''):
                    api_key = settings.DEEPSEEK_API_KEY
            except Exception:
                pass
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        import httpx
        healthy = False
        detail = None

        if prov.kind == "ollama" and prov.base_url.endswith("/v1"):
            base = prov.base_url[: -3]
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(f"{base}/api/tags")
                if resp.status_code == 200:
                    tags = resp.json().get("models", [])
                    names = [t.get("name") for t in tags if t.get("name")]
                    healthy = m.name in names
                else:
                    detail = f"http_{resp.status_code}"
        else:
            # Minimal chat test; if modality is VL, send an image_url+text content
            if m.modality == 'vl':
                body = {
                    "model": m.name,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "image_url", "image_url": {"url": "https://img.alicdn.com/imgextra/i1/O1CN01gDEY8M1W114Hi3XcN_!!6000000002727-0-tps-1024-406.jpg"}},
                                {"type": "text", "text": "测试"}
                            ]
                        }
                    ],
                    "max_tokens": 5,
                }
            else:
                body = {
                    "model": m.name,
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 5,
                }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(f"{prov.base_url}/chat/completions", headers={"Content-Type": "application/json", **headers}, json=body)
                healthy = resp.status_code == 200
                if not healthy:
                    try:
                        detail = resp.text
                    except Exception:
                        detail = f"http_{resp.status_code}"

        return {"success": True, "data": {"healthy": healthy, "model": m.name, "provider": prov.id, "detail": detail}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"model_health error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Write APIs (minimal)
@router.post("/providers")
async def add_provider(payload: dict):
    try:
        reg = load_registry()
        p = Provider(**payload)
        # upsert by id
        reg.providers = [x for x in reg.providers if x.id != p.id] + [p]
        save_registry(reg)
        return {"success": True}
    except Exception as e:
        logger.error(f"add_provider error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/providers/{pid}")
async def update_provider(pid: str, payload: dict):
    try:
        reg = load_registry()
        found = False
        new_list = []
        for x in reg.providers:
            if x.id == pid:
                data = x.model_dump()
                data.update(payload or {})
                new_list.append(Provider(**data))
                found = True
            else:
                new_list.append(x)
        if not found:
            raise HTTPException(status_code=404, detail="provider_not_found")
        reg.providers = new_list
        save_registry(reg)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"update_provider error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/providers/{pid}")
async def delete_provider(pid: str):
    try:
        reg = load_registry()
        before = len(reg.providers)
        reg.providers = [x for x in reg.providers if x.id != pid]
        if len(reg.providers) == before:
            raise HTTPException(status_code=404, detail="provider_not_found")
        save_registry(reg)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"delete_provider error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models")
async def add_model(payload: dict):
    try:
        reg = load_registry()
        m = ModelInfo(**payload)
        reg.models = [x for x in reg.models if x.id != m.id] + [m]
        save_registry(reg)
        return {"success": True}
    except Exception as e:
        logger.error(f"add_model error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/models/{mid}")
async def update_model(mid: str, payload: dict):
    try:
        reg = load_registry()
        found = False
        new_list = []
        for x in reg.models:
            if x.id == mid:
                data = x.model_dump()
                data.update(payload or {})
                new_list.append(ModelInfo(**data))
                found = True
            else:
                new_list.append(x)
        if not found:
            raise HTTPException(status_code=404, detail="model_not_found")
        reg.models = new_list
        save_registry(reg)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"update_model error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/models/{mid}")
async def delete_model(mid: str):
    try:
        reg = load_registry()
        before = len(reg.models)
        reg.models = [x for x in reg.models if x.id != mid]
        if len(reg.models) == before:
            raise HTTPException(status_code=404, detail="model_not_found")
        save_registry(reg)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"delete_model error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
