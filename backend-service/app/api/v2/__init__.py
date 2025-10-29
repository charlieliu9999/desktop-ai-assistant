"""
API v2 路由模块（最小集，Phase 1）
"""
from fastapi import APIRouter

from . import ai, registry, vision, voice, agent

router = APIRouter(prefix="/v2")

router.include_router(ai.router, tags=["AI"])
router.include_router(registry.router, tags=["Registry"])
router.include_router(vision.router, tags=["Vision"])
router.include_router(voice.router, tags=["Voice"])
router.include_router(agent.router, tags=["Agent"])

__all__ = ["router"]

