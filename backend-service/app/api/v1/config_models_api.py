"""
模型配置文件 API
"""
from fastapi import APIRouter, HTTPException
from loguru import logger
from app.config_models import load_config, save_config, apply_to_settings, ModelsConfig

router = APIRouter(prefix="/config")


@router.get("/models")
async def get_models_config():
    try:
        cfg = load_config()
        return {"success": True, "data": cfg.model_dump()}
    except Exception as e:
        logger.error(f"get_models_config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/models")
async def update_models_config(payload: dict):
    try:
        cfg = ModelsConfig(**payload)
        save_config(cfg)
        apply_to_settings(cfg)
        return {"success": True}
    except Exception as e:
        logger.error(f"update_models_config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

