"""
API v1 路由模块
"""
from fastapi import APIRouter

from . import ai, vision, voice, agent, config_flags, tools, config_models_api, registry, scenarios, prompts, config_api
from . import patient_extraction as patient_extraction

# 创建v1路由器
router = APIRouter(prefix="/v1")

# 注册子路由
router.include_router(ai.router, tags=["AI"])
router.include_router(vision.router, tags=["Vision"])
router.include_router(voice.router, tags=["Voice"])
router.include_router(agent.router, tags=["Agent"])
router.include_router(config_flags.router, tags=["Config"])
router.include_router(tools.router, tags=["Tools"])
router.include_router(config_models_api.router, tags=["Config"])
router.include_router(config_api.router, tags=["Config"])
router.include_router(registry.router, tags=["Registry"])
router.include_router(scenarios.router, tags=["Scenarios"])
router.include_router(prompts.router, tags=["Prompts"])
router.include_router(patient_extraction.router, tags=["PatientExtraction"])

__all__ = ["router"]
