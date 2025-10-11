"""
Deepseek提供商实现
"""
from loguru import logger

from .openai_provider import OpenAIProvider
from ..models import ProviderConfig


class DeepseekProvider(OpenAIProvider):
    """
    Deepseek提供商
    
    Deepseek使用OpenAI兼容的API，因此继承OpenAIProvider
    """

    def __init__(self, config: ProviderConfig):
        """
        初始化Deepseek提供商

        Args:
            config: 提供商配置
        """
        super().__init__(config)
        logger.info(f"Deepseek provider initialized with model: {config.model}")

