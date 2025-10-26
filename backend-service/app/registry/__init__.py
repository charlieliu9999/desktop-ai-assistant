"""
统一的 Provider/Model 注册中心、场景与提示词解析。

约定：
- 配置文件位于 `backend-service/config/`
- registry.json: providers/models 只读（后续可扩展写接口）
- scenarios.json: 场景绑定（模型引用、参数覆盖、提示词引用）
- prompts/*.json: 提示词库（版本化）
"""

from .models import (
    Modality,
    ProviderKind,
    AuthConfig,
    Provider,
    ModelInfo,
    RegistryData,
    Scenario,
    ScenariosData,
    PromptVersion,
    Prompt,
)

from .store import (
    load_registry,
    load_scenarios,
    list_prompts,
    load_prompt_by_id,
)

from .resolver import (
    ResolvedCall,
    resolve_scene_for_ai,
    apply_resolution_to_chat_request,
)

__all__ = [
    "Modality",
    "ProviderKind",
    "AuthConfig",
    "Provider",
    "ModelInfo",
    "RegistryData",
    "Scenario",
    "ScenariosData",
    "PromptVersion",
    "Prompt",
    "load_registry",
    "load_scenarios",
    "list_prompts",
    "load_prompt_by_id",
    "ResolvedCall",
    "resolve_scene_for_ai",
    "apply_resolution_to_chat_request",
]

