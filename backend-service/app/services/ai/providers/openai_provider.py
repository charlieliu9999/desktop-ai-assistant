"""
OpenAI提供商实现
"""
import time
from typing import List, AsyncIterator, Optional
from datetime import datetime
from openai import AsyncOpenAI
from loguru import logger

from ..base import AIProviderBase
from ..models import (
    Message,
    ChatOptions,
    ChatResponse,
    StreamChunk,
    AnalyzeResponse,
    ProviderConfig,
    ProviderHealth,
    Usage,
)


class OpenAIProvider(AIProviderBase):
    """OpenAI提供商"""

    def __init__(self, config: ProviderConfig):
        """
        初始化OpenAI提供商

        Args:
            config: 提供商配置
        """
        super().__init__(config)
        self.client = AsyncOpenAI(
            api_key=config.api_key,
            base_url=config.api_base,
            timeout=config.timeout,
            max_retries=config.max_retries,
        )
        logger.info(f"OpenAI provider initialized with model: {config.model}")

    async def chat(
        self, messages: List[Message], options: Optional[ChatOptions] = None
    ) -> ChatResponse:
        """
        标准对话

        Args:
            messages: 消息列表
            options: 对话选项

        Returns:
            对话响应
        """
        try:
            opts = options or ChatOptions()
            model = opts.model or self.config.model

            logger.info(f"OpenAI chat request with model: {model}")

            # 转换消息格式
            openai_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

            # 调用OpenAI API
            response = await self.client.chat.completions.create(
                model=model,
                messages=openai_messages,
                temperature=opts.temperature,
                max_tokens=opts.max_tokens,
                top_p=opts.top_p,
                frequency_penalty=opts.frequency_penalty,
                presence_penalty=opts.presence_penalty,
            )

            # 解析响应
            choice = response.choices[0]
            usage_data = response.usage

            return ChatResponse(
                message=Message(
                    role=choice.message.role, content=choice.message.content or ""
                ),
                usage=Usage(
                    prompt_tokens=usage_data.prompt_tokens,
                    completion_tokens=usage_data.completion_tokens,
                    total_tokens=usage_data.total_tokens,
                ),
                model=response.model,
                finish_reason=choice.finish_reason,
                provider=self.name,
            )

        except Exception as e:
            logger.error(f"OpenAI chat error: {e}")
            raise

    async def chat_stream(
        self, messages: List[Message], options: Optional[ChatOptions] = None
    ) -> AsyncIterator[StreamChunk]:
        """
        流式对话

        Args:
            messages: 消息列表
            options: 对话选项

        Yields:
            流式响应块
        """
        try:
            opts = options or ChatOptions()
            model = opts.model or self.config.model

            logger.info(f"OpenAI stream chat request with model: {model}")

            # 转换消息格式
            openai_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

            # 发送开始事件
            yield StreamChunk(type="start", request_id=f"req_{int(time.time())}")

            # 调用OpenAI流式API
            stream = await self.client.chat.completions.create(
                model=model,
                messages=openai_messages,
                temperature=opts.temperature,
                max_tokens=opts.max_tokens,
                top_p=opts.top_p,
                frequency_penalty=opts.frequency_penalty,
                presence_penalty=opts.presence_penalty,
                stream=True,
            )

            # 流式返回
            total_content = ""
            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        total_content += delta.content
                        yield StreamChunk(type="chunk", content=delta.content)

            # 发送完成事件
            # 注意: 流式模式下OpenAI不返回usage，这里使用估算值
            estimated_tokens = len(total_content) // 4  # 粗略估算
            yield StreamChunk(
                type="done",
                usage=Usage(
                    prompt_tokens=estimated_tokens,
                    completion_tokens=estimated_tokens,
                    total_tokens=estimated_tokens * 2,
                ),
            )

        except Exception as e:
            logger.error(f"OpenAI stream chat error: {e}")
            yield StreamChunk(type="error", error=str(e))

    async def analyze(
        self,
        content: str,
        analysis_type: str,
        extract_fields: Optional[List[str]] = None,
        options: Optional[ChatOptions] = None,
    ) -> AnalyzeResponse:
        """
        内容分析

        Args:
            content: 要分析的内容
            analysis_type: 分析类型
            extract_fields: 要提取的字段
            options: 对话选项

        Returns:
            分析响应
        """
        try:
            logger.info(f"OpenAI analyze request, type: {analysis_type}")

            # 构建提示词
            system_prompt = self._build_system_prompt(analysis_type)
            user_prompt = self._build_analysis_prompt(content, analysis_type, extract_fields)

            # 调用chat接口
            messages = [
                Message(role="system", content=system_prompt),
                Message(role="user", content=user_prompt),
            ]

            response = await self.chat(messages, options)

            # 提取JSON数据
            extracted_data = self._extract_json_from_response(response.message.content)

            # 计算置信度
            confidence = self._calculate_confidence(extracted_data)

            return AnalyzeResponse(
                analysis_type=analysis_type,
                extracted_data=extracted_data,
                confidence=confidence,
                raw_response=response.message.content,
                provider=self.name,
            )

        except Exception as e:
            logger.error(f"OpenAI analyze error: {e}")
            raise

    async def health_check(self) -> ProviderHealth:
        """
        健康检查

        Returns:
            健康状态
        """
        try:
            start_time = time.time()

            # 发送简单的测试请求
            messages = [Message(role="user", content="Hello")]
            await self.chat(messages, ChatOptions(max_tokens=10))

            latency_ms = (time.time() - start_time) * 1000

            return ProviderHealth(
                name=self.name,
                healthy=True,
                latency_ms=latency_ms,
                last_check=datetime.now(),
            )

        except Exception as e:
            logger.error(f"OpenAI health check failed: {e}")
            return ProviderHealth(
                name=self.name,
                healthy=False,
                latency_ms=None,
                last_check=datetime.now(),
                error=str(e),
            )

