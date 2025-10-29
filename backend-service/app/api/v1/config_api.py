"""
通用配置 API (/v1/config)

提供对运行期 Settings 的读取、单键读取/更新、与整体验证。
不持久化到 .env，仅在进程内更新（与 flags 行为一致）。
"""
from fastapi import APIRouter, HTTPException
from loguru import logger
from typing import Any, Dict
from datetime import datetime
from pydantic import TypeAdapter

from app.config import settings, Settings

router = APIRouter(prefix="/config")


def _now_meta() -> Dict[str, Any]:
    return {"timestamp": datetime.now().isoformat()}


@router.get("")
async def get_full_config():
    """获取完整运行期配置（只读）。"""
    try:
        return {"success": True, "data": settings.model_dump(), "meta": _now_meta()}
    except Exception as e:
        logger.error(f"get_full_config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{key}")
async def get_config_key(key: str):
    """获取单个配置项（顶层键）。未定义键也会返回额外字段（extra='allow'）。"""
    try:
        data = settings.model_dump()
        if key in data:
            return {"success": True, "data": {key: data[key]}, "meta": _now_meta()}
        # 对于额外字段，尝试 getattr 回退
        value = getattr(settings, key, None)
        return {"success": True, "data": {key: value}, "meta": _now_meta()}
    except Exception as e:
        logger.error(f"get_config_key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{key}")
async def update_config_key(key: str, payload: Any):
    """更新单个配置项（顶层键）。不持久化，仅更新进程内 Settings。"""
    try:
        # 若为已知字段，做类型校验/转换；否则直接设置
        field = Settings.model_fields.get(key)
        value = payload
        if field is not None and field.annotation is not None:
            try:
                adapter = TypeAdapter(field.annotation)  # type: ignore[arg-type]
                value = adapter.validate_python(payload)
            except Exception as ve:
                raise HTTPException(status_code=422, detail=f"Invalid value for {key}: {ve}")

        setattr(settings, key, value)
        return {"success": True, "data": {key: getattr(settings, key)}, "meta": _now_meta()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"update_config_key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_config(payload: Dict[str, Any]):
    """验证一组配置项是否与 Settings 类型兼容（不落地）。"""
    try:
        base = settings.model_dump()
        candidate = {**base, **(payload or {})}
        try:
            Settings.model_validate(candidate)  # pydantic v2 校验
            return {"success": True, "data": {"valid": True}, "meta": _now_meta()}
        except Exception as ve:
            return {"success": True, "data": {"valid": False, "error": str(ve)}, "meta": _now_meta()}
    except Exception as e:
        logger.error(f"validate_config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

