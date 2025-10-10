"""
API v1 路由模块
"""
from fastapi import APIRouter

from . import ai, patient

# 创建v1路由器
router = APIRouter(prefix="/v1")

# 注册子路由
router.include_router(ai.router, tags=["AI"])
router.include_router(patient.router, tags=["Patient"])

# 导入其他子路由（后续添加）
# from . import ocr, voice, config

__all__ = ["router"]

