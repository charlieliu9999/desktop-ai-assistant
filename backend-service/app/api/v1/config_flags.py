"""
配置开关（旗标）相关API
"""
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.config import settings

router = APIRouter(prefix="/config")


@router.get("/flags")
async def get_flags():
    """获取运行期配置旗标（只读）"""
    try:
        return {
            "success": True,
            "data": {
                "model_lock": bool(getattr(settings, 'FRONTEND_MODEL_EDIT_LOCK', False)),
            },
            "meta": {"timestamp": __import__('datetime').datetime.now().isoformat()},
        }
    except Exception as e:
        logger.error(f"get_flags error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/flags")
async def update_flags(payload: dict):
    """更新运行期配置旗标（不持久化 .env）"""
    try:
        model_lock = payload.get("model_lock")
        if model_lock is not None:
            setattr(settings, 'FRONTEND_MODEL_EDIT_LOCK', bool(model_lock))
        return {
            "success": True,
            "data": {
                "model_lock": bool(getattr(settings, 'FRONTEND_MODEL_EDIT_LOCK', False)),
            },
            "meta": {"timestamp": __import__('datetime').datetime.now().isoformat()},
        }
    except Exception as e:
        logger.error(f"update_flags error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/model-preset")
async def apply_model_preset(payload: dict):
    """一键应用模型预设（运行期），可同时启用前端编辑锁

    payload 示例：
    {
      "lock": true,
      "ai_chat": {"model_name": "gpt-4o-mini", "base_url": "https://api.openai.com/v1"},
      "screen_recognition": {"model_name": "qwen2.5vl:latest", "base_url": "http://localhost:11434"},
      ...
    }
    """
    from app.config import settings
    try:
        lock = payload.get("lock")
        if lock is not None:
            setattr(settings, 'FRONTEND_MODEL_EDIT_LOCK', bool(lock))

        # 应用场景模型（使用 Settings 上的已知字段）
        mapping = {
            'ai_chat': ('AI_CHAT_MODEL', 'AI_CHAT_BASE_URL'),
            'screen_recognition': ('SCREEN_RECOGNITION_MODEL', 'SCREEN_RECOGNITION_BASE_URL'),
            'diagnosis_suggestion': ('DIAGNOSIS_SUGGESTION_MODEL', 'DIAGNOSIS_SUGGESTION_BASE_URL'),
            'exam_recommendation': ('EXAM_RECOMMENDATION_MODEL', 'EXAM_RECOMMENDATION_BASE_URL'),
            'medication_recommendation': ('MEDICATION_RECOMMENDATION_MODEL', 'MEDICATION_RECOMMENDATION_BASE_URL'),
        }

        for key, (model_field, base_field) in mapping.items():
            if key in payload and isinstance(payload[key], dict):
                conf = payload[key]
                if 'model_name' in conf:
                    setattr(settings, model_field, conf['model_name'])
                if 'base_url' in conf:
                    setattr(settings, base_field, conf['base_url'])

        return {
            "success": True,
            "data": {
                "model_lock": bool(getattr(settings, 'FRONTEND_MODEL_EDIT_LOCK', False)),
            }
        }
    except Exception as e:
        logger.error(f"apply_model_preset error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
