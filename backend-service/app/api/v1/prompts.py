"""
提示词库（只读API + 预览）。
"""
from fastapi import APIRouter, HTTPException
from loguru import logger

from typing import Optional
from app.registry import list_prompts, load_prompt_by_id
from app.registry.models import Prompt, PromptVersion
from app.registry.store import save_prompt


router = APIRouter(prefix="/prompts")


@router.get("")
async def list_prompt_ids():
    try:
        return {"success": True, "data": list_prompts()}
    except Exception as e:
        logger.error(f"list_prompt_ids error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{prompt_id}")
async def get_prompt(prompt_id: str):
    try:
        p = load_prompt_by_id(prompt_id)
        if not p:
            raise HTTPException(status_code=404, detail="prompt_not_found")
        return {"success": True, "data": p.model_dump()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_prompt error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_prompt(payload: dict):
    try:
        p = Prompt(**payload)
        save_prompt(p)
        return {"success": True}
    except Exception as e:
        logger.error(f"create_prompt error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{prompt_id}/versions")
async def add_version(prompt_id: str, payload: dict):
    try:
        p = load_prompt_by_id(prompt_id)
        if not p:
            raise HTTPException(status_code=404, detail="prompt_not_found")
        v = PromptVersion(**payload)
        p.versions = [x for x in p.versions if x.version != v.version] + [v]
        if not p.active_version:
            p.active_version = v.version
        save_prompt(p)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"add_version error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{prompt_id}/publish")
async def publish_version(prompt_id: str, version: str):
    try:
        p = load_prompt_by_id(prompt_id)
        if not p:
            raise HTTPException(status_code=404, detail="prompt_not_found")
        if not any(x.version == version for x in p.versions):
            raise HTTPException(status_code=404, detail="version_not_found")
        p.active_version = version
        save_prompt(p)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"publish_version error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
