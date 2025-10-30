"""
API v2 - Agent（Phase 1：health）
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.services.ai.models import APIResponse


router = APIRouter(prefix="/agent")


async def health():
    try:
        try:
            from app.api.v1.agent import agent_manager  # type: ignore
        except Exception:
            agent_manager = None
        if not agent_manager:
            services = {}
            return APIResponse(success=False, data={"services": services}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
        health_status = await agent_manager.get_health()
        services = {}
        for name, status in health_status.items():
            services[name] = {
                "healthy": status.healthy,
                "connected": getattr(status, "connected", None),
                "authenticated": getattr(status, "authenticated", None),
                "last_check": status.last_check.isoformat() if getattr(status, "last_check", None) else None,
                "error": status.error,
            }
        return APIResponse(success=True, data={"services": services}, meta={"timestamp": datetime.now().isoformat(), "version": "2.0.0"})
    except Exception as e:
        logger.error(f"v2/agent/health error: {e}")
        raise HTTPException(status_code=500, detail="internal_error")


@router.get("/health", response_model=APIResponse)
async def health_route():
    """路由包装器：动态调用当前模块的 health 函数，支持测试猴补丁。"""
    from app.api.v2 import agent as self_module  # 动态获取当前模块以便 monkeypatch 生效
    return await getattr(self_module, "health")()
