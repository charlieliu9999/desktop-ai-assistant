"""
API v1 路由模块
"""
from fastapi import APIRouter

from . import ai, vision, voice, agent

# 创建v1路由器
router = APIRouter(prefix="/v1")

# 注册子路由
router.include_router(ai.router, tags=["AI"])
router.include_router(vision.router, tags=["Vision"])
router.include_router(voice.router, tags=["Voice"])
router.include_router(agent.router, tags=["Agent"])

__all__ = ["router"]

