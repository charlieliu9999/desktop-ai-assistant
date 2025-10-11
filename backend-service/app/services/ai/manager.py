"""
AI服务管理器
"""
from typing import List, Dict, Optional, AsyncIterator
from loguru import logger

from .base import AIProviderBase
from .models import (
    Message,
    ChatOptions,
    ChatResponse,
    StreamChunk,
    AnalyzeResponse,
    ProviderConfig,
    ProviderHealth,
)
from .providers import OpenAIProvider, DeepseekProvider


class AIServiceManager:
    """AI服务管理器"""

    def __init__(self):
        """初始化AI服务管理器"""
        self.providers: Dict[str, AIProviderBase] = {}
        self.default_provider: Optional[str] = None
        self.fallback_providers: List[str] = []
        logger.info("AI Service Manager initialized")

    def register_provider(
        self, name: str, provider: AIProviderBase, is_default: bool = False
    ):
        """
        注册提供商

        Args:
            name: 提供商名称
            provider: 提供商实例
            is_default: 是否为默认提供商
        """
        self.providers[name] = provider
        logger.info(f"Registered AI provider: {name}")

        if is_default or not self.default_provider:
            self.default_provider = name
            logger.info(f"Set default provider: {name}")

    def set_fallback_providers(self, providers: List[str]):
        """
        设置故障转移提供商列表

        Args:
            providers: 提供商名称列表
        """
        self.fallback_providers = providers
        logger.info(f"Set fallback providers: {providers}")

    async def chat(
        self,
        messages: List[Message],
        provider: Optional[str] = None,
        options: Optional[ChatOptions] = None,
    ) -> ChatResponse:
        """
        对话 - 支持故障转移

        Args:
            messages: 消息列表
            provider: 指定提供商（可选）
            options: 对话选项

        Returns:
            对话响应

        Raises:
            Exception: 所有提供商都失败时抛出异常
        """
        provider_name = provider or self.default_provider

        if not provider_name:
            raise ValueError("No provider specified and no default provider set")

        # 尝试主提供商
        try:
            provider_instance = self.providers.get(provider_name)
            if not provider_instance:
                raise ValueError(f"Provider not found: {provider_name}")

            logger.info(f"Using provider: {provider_name}")
            return await provider_instance.chat(messages, options)

        except Exception as e:
            logger.error(f"Provider {provider_name} failed: {e}")

            # 如果指定了提供商，不进行故障转移
            if provider:
                raise

            # 尝试故障转移
            for fallback_name in self.fallback_providers:
                if fallback_name == provider_name:
                    continue

                try:
                    fallback_provider = self.providers.get(fallback_name)
                    if not fallback_provider:
                        continue

                    # 检查健康状态
                    if not await fallback_provider.is_healthy():
                        logger.warning(f"Fallback provider {fallback_name} is unhealthy, skipping")
                        continue

                    logger.info(f"Falling back to provider: {fallback_name}")
                    return await fallback_provider.chat(messages, options)

                except Exception as fallback_error:
                    logger.error(f"Fallback provider {fallback_name} failed: {fallback_error}")
                    continue

            # 所有提供商都失败
            raise Exception(f"All providers failed. Last error: {e}")

    async def chat_stream(
        self,
        messages: List[Message],
        provider: Optional[str] = None,
        options: Optional[ChatOptions] = None,
    ) -> AsyncIterator[StreamChunk]:
        """
        流式对话

        Args:
            messages: 消息列表
            provider: 指定提供商（可选）
            options: 对话选项

        Yields:
            流式响应块

        Raises:
            Exception: 提供商失败时抛出异常
        """
        provider_name = provider or self.default_provider

        if not provider_name:
            raise ValueError("No provider specified and no default provider set")

        provider_instance = self.providers.get(provider_name)
        if not provider_instance:
            raise ValueError(f"Provider not found: {provider_name}")

        logger.info(f"Using provider for streaming: {provider_name}")

        async for chunk in provider_instance.chat_stream(messages, options):
            yield chunk

    async def analyze(
        self,
        content: str,
        analysis_type: str,
        extract_fields: Optional[List[str]] = None,
        provider: Optional[str] = None,
        options: Optional[ChatOptions] = None,
    ) -> AnalyzeResponse:
        """
        内容分析 - 支持故障转移

        Args:
            content: 要分析的内容
            analysis_type: 分析类型
            extract_fields: 要提取的字段
            provider: 指定提供商（可选）
            options: 对话选项

        Returns:
            分析响应

        Raises:
            Exception: 所有提供商都失败时抛出异常
        """
        provider_name = provider or self.default_provider

        if not provider_name:
            raise ValueError("No provider specified and no default provider set")

        # 尝试主提供商
        try:
            provider_instance = self.providers.get(provider_name)
            if not provider_instance:
                raise ValueError(f"Provider not found: {provider_name}")

            logger.info(f"Using provider for analysis: {provider_name}")
            return await provider_instance.analyze(content, analysis_type, extract_fields, options)

        except Exception as e:
            logger.error(f"Provider {provider_name} analysis failed: {e}")

            # 如果指定了提供商，不进行故障转移
            if provider:
                raise

            # 尝试故障转移
            for fallback_name in self.fallback_providers:
                if fallback_name == provider_name:
                    continue

                try:
                    fallback_provider = self.providers.get(fallback_name)
                    if not fallback_provider:
                        continue

                    if not await fallback_provider.is_healthy():
                        logger.warning(f"Fallback provider {fallback_name} is unhealthy, skipping")
                        continue

                    logger.info(f"Falling back to provider for analysis: {fallback_name}")
                    return await fallback_provider.analyze(
                        content, analysis_type, extract_fields, options
                    )

                except Exception as fallback_error:
                    logger.error(f"Fallback provider {fallback_name} analysis failed: {fallback_error}")
                    continue

            # 所有提供商都失败
            raise Exception(f"All providers failed for analysis. Last error: {e}")

    async def get_provider_health(self, provider_name: str) -> ProviderHealth:
        """
        获取提供商健康状态

        Args:
            provider_name: 提供商名称

        Returns:
            健康状态

        Raises:
            ValueError: 提供商不存在时抛出异常
        """
        provider = self.providers.get(provider_name)
        if not provider:
            raise ValueError(f"Provider not found: {provider_name}")

        return await provider.health_check()

    async def get_all_providers_health(self) -> Dict[str, ProviderHealth]:
        """
        获取所有提供商健康状态

        Returns:
            提供商健康状态字典
        """
        health_status = {}
        for name, provider in self.providers.items():
            try:
                health_status[name] = await provider.health_check()
            except Exception as e:
                logger.error(f"Failed to check health for {name}: {e}")
                from datetime import datetime

                health_status[name] = ProviderHealth(
                    name=name,
                    healthy=False,
                    latency_ms=None,
                    last_check=datetime.now(),
                    error=str(e),
                )

        return health_status

    def list_providers(self) -> List[str]:
        """
        列出所有已注册的提供商

        Returns:
            提供商名称列表
        """
        return list(self.providers.keys())


# 全局AI服务管理器实例
ai_manager = AIServiceManager()

