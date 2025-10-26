from __future__ import annotations

from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


Modality = Literal["llm", "vl", "stt", "tts"]
ProviderKind = Literal["openai", "deepseek", "ollama", "azure_openai", "custom"]


class AuthConfig(BaseModel):
    """认证配置（仅引用，不直接存密钥）"""

    type: Literal["env", "none"] = Field("env", description="认证类型")
    env_key: Optional[str] = Field(None, description="从环境变量读取密钥的键名")


class Provider(BaseModel):
    id: str
    name: str
    kind: ProviderKind
    base_url: str
    enabled: bool = True
    capabilities: List[Modality] = Field(default_factory=list)
    auth: Optional[AuthConfig] = None
    headers: Dict[str, str] = Field(default_factory=dict)


class ModelInfo(BaseModel):
    id: str
    name: str
    provider_id: str
    modality: Modality
    enabled: bool = True
    default_params: Dict[str, Optional[float | int | str]] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)


class RegistryData(BaseModel):
    providers: List[Provider] = Field(default_factory=list)
    models: List[ModelInfo] = Field(default_factory=list)


class Scenario(BaseModel):
    name: str
    modality: Modality
    model_id: str
    param_overrides: Dict[str, Optional[float | int | str]] = Field(default_factory=dict)
    prompt_id: Optional[str] = None
    prompt_version: Optional[str] = None


class ScenariosData(BaseModel):
    scenarios: List[Scenario] = Field(default_factory=list)


class PromptVersion(BaseModel):
    version: str
    language: Optional[str] = None
    system: str = ""
    user_template: Optional[str] = None
    metadata: Dict[str, str] = Field(default_factory=dict)


class Prompt(BaseModel):
    id: str
    name: str
    scene: Optional[str] = None
    versions: List[PromptVersion] = Field(default_factory=list)
    active_version: Optional[str] = None

