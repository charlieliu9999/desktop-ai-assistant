from __future__ import annotations

from typing import Optional, Dict, Any
from pydantic import BaseModel
from loguru import logger

from .store import load_registry, load_scenarios, load_prompt_by_id
from .models import Prompt
from app.services.ai.models import ChatOptions, Message, ChatRequest


class ResolvedCall(BaseModel):
    provider_base: str
    provider_id: str
    model_name: str
    merged_params: Dict[str, Any]
    system_prompt: Optional[str] = None
    prompt_id: Optional[str] = None
    prompt_version: Optional[str] = None


def _pick_prompt_text(prompt: Optional[Prompt], version: Optional[str]) -> Optional[str]:
    if not prompt or not prompt.versions:
        return None
    target = None
    if version:
        for v in prompt.versions:
            if v.version == version:
                target = v
                break
    if target is None:
        # fallback to active or first
        if prompt.active_version:
            for v in prompt.versions:
                if v.version == prompt.active_version:
                    target = v
                    break
        if target is None:
            target = prompt.versions[0]
    return target.system if target else None


def resolve_scene_for_ai(scene_name: str) -> ResolvedCall:
    """解析场景为可直接用于 AI 对话的配置。"""
    reg = load_registry()
    scs = load_scenarios()

    scenario = next((s for s in scs.scenarios if s.name == scene_name), None)
    if not scenario:
        raise ValueError(f"Unknown scene: {scene_name}")

    model = next((m for m in reg.models if m.id == scenario.model_id and m.enabled), None)
    if not model:
        raise ValueError(f"Model not found/disabled for scene: {scene_name}")

    prov = next((p for p in reg.providers if p.id == model.provider_id and p.enabled), None)
    if not prov:
        raise ValueError(f"Provider not found/disabled for scene: {scene_name}")

    # merge params: model.defaults <- scenario.overrides
    merged = dict(model.default_params or {})
    merged.update(scenario.param_overrides or {})

    # prompt
    system = None
    if scenario.prompt_id:
        prompt = load_prompt_by_id(scenario.prompt_id)
        system = _pick_prompt_text(prompt, scenario.prompt_version)

    return ResolvedCall(
        provider_base=prov.base_url,
        provider_id=prov.id,
        model_name=model.name,
        merged_params=merged,
        system_prompt=system,
        prompt_id=scenario.prompt_id,
        prompt_version=scenario.prompt_version,
    )


def apply_resolution_to_chat_request(req: ChatRequest, rc: ResolvedCall) -> ChatRequest:
    """将解析结果应用到 ChatRequest：
    - 注入 system prompt（放在最前）
    - 覆盖 options 中的常用参数（若未显式提供）
    - 设置 options.model

    重要: 如果用户指定了provider,则不使用场景配置的model,
    让AI服务使用该provider的默认模型
    """
    messages = list(req.messages)
    if rc.system_prompt:
        # 若已有 system，则在最前面追加统一的系统提示
        messages = [Message(role="system", content=rc.system_prompt)] + messages

    opts = req.options or ChatOptions()

    # 关键修复: 只有在用户没有指定provider时,才使用场景配置的model
    # 如果用户指定了provider,则不设置model,让AI服务使用该provider的默认模型
    if not opts.model and not req.provider:
        opts.model = rc.model_name

    # 常用参数
    if "temperature" in rc.merged_params and (opts.temperature is None or opts.temperature == 0.7):
        try:
            opts.temperature = float(rc.merged_params.get("temperature"))
        except Exception:
            pass
    if "max_tokens" in rc.merged_params and (opts.max_tokens is None or opts.max_tokens == 2000):
        try:
            opts.max_tokens = int(rc.merged_params.get("max_tokens"))
        except Exception:
            pass

    # 若未指定 provider，按场景解析设置 provider（与模型来源一致）
    provider = req.provider or None
    if provider is None:
        provider = getattr(rc, "provider_id", None)

    return ChatRequest(messages=messages, provider=provider, options=opts)
