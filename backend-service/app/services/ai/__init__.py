"""
AI服务模块
"""
from .base import AIProviderBase
from .manager import AIServiceManager, ai_manager
from .models import (
    Message,
    ChatOptions,
    ChatResponse,
    StreamChunk,
    AnalyzeRequest,
    AnalyzeResponse,
    ProviderConfig,
    ProviderHealth,
    ChatRequest,
    APIResponse,
    Usage,
)
from .providers import OpenAIProvider, DeepseekProvider

__all__ = [
    "AIProviderBase",
    "AIServiceManager",
    "ai_manager",
    "Message",
    "ChatOptions",
    "ChatResponse",
    "StreamChunk",
    "AnalyzeRequest",
    "AnalyzeResponse",
    "ProviderConfig",
    "ProviderHealth",
    "ChatRequest",
    "APIResponse",
    "Usage",
    "OpenAIProvider",
    "DeepseekProvider",
]

