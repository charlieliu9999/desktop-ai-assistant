"""
API v2 - AI 最小端点
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from loguru import logger

from app.services.ai import ai_manager, ChatRequest, APIResponse


router = APIRouter(prefix="/ai")


@router.post("/chat", response_model=APIResponse)
async def chat(request: ChatRequest):
    try:
        if not request.messages:
            raise HTTPException(status_code=400, detail="messages_empty")
        resp = await ai_manager.chat(messages=request.messages, provider=request.provider, options=request.options)
        return APIResponse(
            success=True,
            data={
                "message": resp.message.model_dump(),
                "usage": resp.usage.model_dump(),
                "model": resp.model,
                "finish_reason": resp.finish_reason,
                "provider": resp.provider,
            },
            meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"v2/ai/chat error: {e}")
        raise HTTPException(status_code=500, detail="upstream_error")


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="messages_empty")

    async def generate():
        try:
            stream = ai_manager.chat_stream(messages=request.messages, provider=request.provider, options=request.options)
            async for chunk in stream:
                frame = {"type": "chunk", "data": {"content": chunk.content or ""}, "meta": {}}
                yield f"data: {frame}\n\n"
            end = {"type": "end", "data": {}, "meta": {}}
            yield f"data: {end}\n\n"
        except Exception as e:
            err = {"type": "error", "error": {"code": "upstream_error", "message": str(e)}, "meta": {}}
            yield f"data: {err}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/providers", response_model=APIResponse)
async def list_providers():
    try:
        names = list(ai_manager.providers.keys())
        providers = [
            {
                "name": n,
                "is_default": (n == ai_manager.default_provider),
                "is_available": True,
            }
            for n in names
        ]
        return APIResponse(success=True, data={"providers": providers}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except Exception as e:
        logger.error(f"v2/ai/providers error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")


@router.get("/models", response_model=APIResponse)
async def list_models():
    """按 provider 聚合模型（来源 registry，如果无则空数组）。"""
    try:
        from app.registry.store import load_registry

        reg = load_registry()
        providers = []
        for p in reg.providers:
            if not getattr(p, "enabled", True):
                continue
            models = [m.name for m in reg.models if m.provider_id == p.id and m.modality == "llm" and getattr(m, "enabled", True)]
            providers.append({"name": p.id, "base_url": p.base_url, "models": models})
        return APIResponse(success=True, data={"providers": providers}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except Exception as e:
        logger.error(f"v2/ai/models error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")


@router.get("/health", response_model=APIResponse)
async def health():
    try:
        health_status = await ai_manager.get_all_providers_health()
        services = {}
        for name, st in health_status.items():
            d = st.model_dump() if hasattr(st, "model_dump") else st.dict()
            services[name] = {
                "healthy": d.get("healthy", False),
                "available": True,
                "latency_ms": d.get("latency_ms"),
                "last_check": d.get("last_check"),
                "error": d.get("error"),
            }
        return APIResponse(success=True, data={"services": services}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except Exception as e:
        logger.error(f"v2/ai/health error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")

