"""
API v1 路由模块
"""
from fastapi import APIRouter

from . import ai

# 创建v1路由器
router = APIRouter(prefix="/v1")

# 注册子路由
router.include_router(ai.router, tags=["AI"])

# 导入其他子路由（后续添加）
# from . import agent, vision, voice

__all__ = ["router"]

