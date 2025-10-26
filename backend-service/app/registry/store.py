from __future__ import annotations

import json
import os
from typing import List, Optional
from loguru import logger

from .models import RegistryData, ScenariosData, Prompt


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CONFIG_DIR = os.path.join(BASE_DIR, "config")
PROMPTS_DIR = os.path.join(CONFIG_DIR, "prompts")


def _ensure_dirs():
    os.makedirs(CONFIG_DIR, exist_ok=True)
    os.makedirs(PROMPTS_DIR, exist_ok=True)


def _read_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_registry() -> RegistryData:
    """加载 providers/models 注册配置。如果不存在，返回空结构。"""
    _ensure_dirs()
    path = os.path.join(CONFIG_DIR, "registry.json")
    if not os.path.exists(path):
        logger.warning("registry.json not found; using empty registry")
        return RegistryData()
    try:
        data = _read_json(path)
        return RegistryData(**data)
    except Exception as e:
        logger.error(f"Failed to load registry.json: {e}")
        return RegistryData()


def load_scenarios() -> ScenariosData:
    """加载场景配置。如果不存在，返回空结构。"""
    _ensure_dirs()
    path = os.path.join(CONFIG_DIR, "scenarios.json")
    if not os.path.exists(path):
        logger.warning("scenarios.json not found; using empty scenarios")
        return ScenariosData()
    try:
        data = _read_json(path)
        return ScenariosData(**data)
    except Exception as e:
        logger.error(f"Failed to load scenarios.json: {e}")
        return ScenariosData()


def list_prompts() -> List[str]:
    """列出 prompts 目录中的 prompt id（去掉扩展名）。"""
    _ensure_dirs()
    ids: List[str] = []
    for name in os.listdir(PROMPTS_DIR):
        if name.endswith(".json"):
            ids.append(os.path.splitext(name)[0])
    return sorted(ids)


def load_prompt_by_id(prompt_id: str) -> Optional[Prompt]:
    """加载指定 prompt。"""
    _ensure_dirs()
    path = os.path.join(PROMPTS_DIR, f"{prompt_id}.json")
    if not os.path.exists(path):
        return None
    try:
        data = _read_json(path)
        return Prompt(**data)
    except Exception as e:
        logger.error(f"Failed to load prompt {prompt_id}: {e}")
        return None


def save_registry(reg: RegistryData) -> None:
    """保存 registry.json。"""
    _ensure_dirs()
    path = os.path.join(CONFIG_DIR, "registry.json")
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(reg.model_dump(), f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Failed to save registry.json: {e}")
        raise


def save_scenarios(scs: ScenariosData) -> None:
    """保存 scenarios.json。"""
    _ensure_dirs()
    path = os.path.join(CONFIG_DIR, "scenarios.json")
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(scs.model_dump(), f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Failed to save scenarios.json: {e}")
        raise


def save_prompt(p: Prompt) -> None:
    """保存单个 prompt 文件。"""
    _ensure_dirs()
    path = os.path.join(PROMPTS_DIR, f"{p.id}.json")
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(p.model_dump(), f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Failed to save prompt {p.id}: {e}")
        raise
