"""
模型与路由配置文件管理（JSON 持久化）
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from loguru import logger
import json
import os


DEFAULT_PATH = os.path.join(os.path.dirname(__file__), 'models.json')


class ScenarioConfig(BaseModel):
    selected_provider: Optional[str] = None
    selected_model: Optional[str] = None
    base_url: Optional[str] = None
    available: List[str] = Field(default_factory=list)


class VoiceConfigModel(BaseModel):
    stt: ScenarioConfig = Field(default_factory=ScenarioConfig)
    tts: ScenarioConfig = Field(default_factory=ScenarioConfig)


class WebSearchConfigModel(BaseModel):
    routing: Optional[str] = None  # inherit|frontend|backend
    provider: Optional[str] = None
    available: List[str] = Field(default_factory=lambda: ['duckduckgo','bing','google','serpapi','custom'])
    apiKey: Optional[str] = None
    engineId: Optional[str] = None


class RoutingConfig(BaseModel):
    global_mode: Optional[str] = None  # frontend|backend
    ai_image: Optional[str] = None     # inherit|frontend|backend
    ai_recommend: Optional[str] = None
    one_click: Optional[str] = None
    web_search: Optional[str] = None


class ModelsConfig(BaseModel):
    lock: bool = False
    routing: RoutingConfig = Field(default_factory=RoutingConfig)
    provider_bases: Dict[str, str] = Field(default_factory=dict)  # e.g. {"openai": "https://api.openai.com/v1", "deepseek": "https://api.deepseek.com"}
    # 场景模型
    ai_chat: ScenarioConfig = Field(default_factory=ScenarioConfig)
    screen_recognition: ScenarioConfig = Field(default_factory=ScenarioConfig)
    diagnosis_suggestion: ScenarioConfig = Field(default_factory=ScenarioConfig)
    exam_recommendation: ScenarioConfig = Field(default_factory=ScenarioConfig)
    medication_recommendation: ScenarioConfig = Field(default_factory=ScenarioConfig)
    voice: VoiceConfigModel = Field(default_factory=VoiceConfigModel)
    web_search: WebSearchConfigModel = Field(default_factory=WebSearchConfigModel)


def load_config(path: str = DEFAULT_PATH) -> ModelsConfig:
    try:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return ModelsConfig(**data)
    except Exception as e:
        logger.warning(f"Failed to load models config: {e}")
    # 如果文件不存在，基于 settings 构造一个初始配置
    try:
        from app.config import settings
        cfg = ModelsConfig()
        # provider bases from settings
        bases = {}
        if getattr(settings, 'OPENAI_API_BASE', None):
            bases['openai'] = settings.OPENAI_API_BASE
        if getattr(settings, 'DEEPSEEK_API_BASE', None):
            bases['deepseek'] = settings.DEEPSEEK_API_BASE
        bases.setdefault('local', f"{getattr(settings, 'LOCAL_AI_ENDPOINT', 'http://127.0.0.1:11434')}/v1")
        cfg.provider_bases = bases
        # ai_chat scenario from settings
        cfg.ai_chat.selected_provider = 'openai' if getattr(settings, 'OPENAI_API_KEY', '') else ('deepseek' if getattr(settings, 'DEEPSEEK_API_KEY','') else 'local')
        cfg.ai_chat.selected_model = getattr(settings, 'AI_CHAT_MODEL', getattr(settings, 'OPENAI_MODEL', 'gpt-4'))
        cfg.ai_chat.base_url = cfg.provider_bases.get(cfg.ai_chat.selected_provider)
        # screen recognition
        cfg.screen_recognition.selected_provider = 'local'
        cfg.screen_recognition.selected_model = getattr(settings, 'SCREEN_RECOGNITION_MODEL', 'qwen2.5vl:latest')
        cfg.screen_recognition.base_url = getattr(settings, 'SCREEN_RECOGNITION_BASE_URL', getattr(settings, 'LOCAL_AI_ENDPOINT','http://127.0.0.1:11434'))
        # diagnosis/exam/medication
        cfg.diagnosis_suggestion.selected_provider = 'local'
        cfg.diagnosis_suggestion.selected_model = getattr(settings, 'DIAGNOSIS_SUGGESTION_MODEL', 'qwen2.5:32b')
        cfg.diagnosis_suggestion.base_url = getattr(settings, 'DIAGNOSIS_SUGGESTION_BASE_URL', getattr(settings, 'LOCAL_AI_ENDPOINT','http://127.0.0.1:11434'))
        cfg.exam_recommendation.selected_provider = 'local'
        cfg.exam_recommendation.selected_model = getattr(settings, 'EXAM_RECOMMENDATION_MODEL', 'qwen2.5:32b')
        cfg.exam_recommendation.base_url = getattr(settings, 'EXAM_RECOMMENDATION_BASE_URL', getattr(settings, 'LOCAL_AI_ENDPOINT','http://127.0.0.1:11434'))
        cfg.medication_recommendation.selected_provider = 'local'
        cfg.medication_recommendation.selected_model = getattr(settings, 'MEDICATION_RECOMMENDATION_MODEL', 'qwen2.5:32b')
        cfg.medication_recommendation.base_url = getattr(settings, 'MEDICATION_RECOMMENDATION_BASE_URL', getattr(settings, 'LOCAL_AI_ENDPOINT','http://127.0.0.1:11434'))
        # voice defaults
        cfg.voice.stt.selected_model = getattr(settings, 'WHISPER_MODEL', 'whisper-large-v3')
        cfg.voice.tts.selected_model = 'tts-1'
        return cfg
    except Exception as e:
        logger.warning(f"Failed to build initial models config from settings: {e}")
        return ModelsConfig()


def save_config(cfg: ModelsConfig, path: str = DEFAULT_PATH):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(cfg.model_dump(), f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Failed to save models config: {e}")


def apply_to_settings(cfg: ModelsConfig):
    """将所选模型应用到运行时 settings（不写 .env）"""
    from app.config import settings
    # 锁
    try:
        setattr(settings, 'FRONTEND_MODEL_EDIT_LOCK', bool(cfg.lock))
    except Exception:
        pass

    # Provider base overrides
    try:
        bases = cfg.provider_bases or {}
        if 'OPENAI_API_BASE' in dir(settings) and bases.get('openai'):
            setattr(settings, 'OPENAI_API_BASE', bases.get('openai'))
        if 'DEEPSEEK_API_BASE' in dir(settings) and bases.get('deepseek'):
            setattr(settings, 'DEEPSEEK_API_BASE', bases.get('deepseek'))
    except Exception as e:
        logger.warning(f"apply provider bases error: {e}")

    # 场景模型
    try:
        if cfg.ai_chat.selected_model:
            setattr(settings, 'AI_CHAT_MODEL', cfg.ai_chat.selected_model)
        if cfg.ai_chat.base_url:
            setattr(settings, 'AI_CHAT_BASE_URL', cfg.ai_chat.base_url)

        if cfg.screen_recognition.selected_model:
            setattr(settings, 'SCREEN_RECOGNITION_MODEL', cfg.screen_recognition.selected_model)
        if cfg.screen_recognition.base_url:
            setattr(settings, 'SCREEN_RECOGNITION_BASE_URL', cfg.screen_recognition.base_url)

        if cfg.diagnosis_suggestion.selected_model:
            setattr(settings, 'DIAGNOSIS_SUGGESTION_MODEL', cfg.diagnosis_suggestion.selected_model)
        if cfg.diagnosis_suggestion.base_url:
            setattr(settings, 'DIAGNOSIS_SUGGESTION_BASE_URL', cfg.diagnosis_suggestion.base_url)

        if cfg.exam_recommendation.selected_model:
            setattr(settings, 'EXAM_RECOMMENDATION_MODEL', cfg.exam_recommendation.selected_model)
        if cfg.exam_recommendation.base_url:
            setattr(settings, 'EXAM_RECOMMENDATION_BASE_URL', cfg.exam_recommendation.base_url)

        if cfg.medication_recommendation.selected_model:
            setattr(settings, 'MEDICATION_RECOMMENDATION_MODEL', cfg.medication_recommendation.selected_model)
        if cfg.medication_recommendation.base_url:
            setattr(settings, 'MEDICATION_RECOMMENDATION_BASE_URL', cfg.medication_recommendation.base_url)
    except Exception as e:
        logger.warning(f"apply_to_settings scenario models error: {e}")
