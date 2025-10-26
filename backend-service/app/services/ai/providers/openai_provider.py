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

    @staticmethod
    def _extract_text(content) -> str:
        """
        将OpenAI兼容的content字段统一转换为字符串。

        DashScope 等兼容服务可能返回 list[dict] 结构，需手动拼接。
        """
        if content is None:
            return ""
        if isinstance(content, str):
            return content
        if isinstance(content, (list, tuple)):
            parts: list[str] = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict):
                    text_value = item.get("text") or item.get("content") or ""
                    if isinstance(text_value, str):
                        parts.append(text_value)
                    elif isinstance(text_value, (list, tuple)):
                        parts.append(OpenAIProvider._extract_text(text_value))
                else:
                    parts.append(str(item))
            return "".join(parts)
        return str(content)

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
            max_tokens = self._resolve_max_tokens(opts)

            logger.info(
                "OpenAI chat request with model: %s, max_tokens=%s",
                model,
                max_tokens,
            )

            # 转换消息格式
            openai_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

            # 调用OpenAI API
            response = await self.client.chat.completions.create(
                model=model,
                messages=openai_messages,
                temperature=opts.temperature,
                max_tokens=max_tokens,
                top_p=opts.top_p,
                frequency_penalty=opts.frequency_penalty,
                presence_penalty=opts.presence_penalty,
            )

            # 解析响应
            choice = response.choices[0]
            usage_data = response.usage

            return ChatResponse(
                message=Message(
                    role=choice.message.role,
                    content=self._extract_text(choice.message.content),
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
            max_tokens = self._resolve_max_tokens(opts)

            logger.info(
                "OpenAI stream chat request with model: %s, max_tokens=%s",
                model,
                max_tokens,
            )

            # 转换消息格式
            openai_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

            # 发送开始事件
            yield StreamChunk(type="start", request_id=f"req_{int(time.time())}")

            # 调用OpenAI流式API
            stream = await self.client.chat.completions.create(
                model=model,
                messages=openai_messages,
                temperature=opts.temperature,
                max_tokens=max_tokens,
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
                    text_piece = self._extract_text(getattr(delta, "content", ""))
                    if text_piece:
                        total_content += text_piece
                        yield StreamChunk(type="chunk", content=text_piece)

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

    def _resolve_max_tokens(self, opts: ChatOptions) -> int | None:
        """
        规范化 max_tokens，避免触发各家提供商的范围限制。
        DashScope (Qwen) 与 Deepseek 均限定在 8192 以内。
        """
        raw_value = opts.max_tokens if opts and opts.max_tokens is not None else self.config.max_tokens

        if raw_value is None:
            return None

        try:
            value = int(raw_value)
        except (TypeError, ValueError):
            logger.warning(
                "Invalid max_tokens value %r, fallback to provider default %s",
                raw_value,
                self.config.max_tokens,
            )
            value = int(self.config.max_tokens or 1024)

        if value <= 0:
            logger.warning(
                "max_tokens (%s) must be positive, fallback to provider default %s",
                value,
                self.config.max_tokens,
            )
            value = int(self.config.max_tokens or 1024)

        provider_name = (self.config.name or "").lower()
        model_name = (opts.model or self.config.model or "").lower()

        # 针对 DashScope/Qwen 与 Deepseek 的已知上限做兜底限制
        if "qwen" in model_name or provider_name in ("dashscope", "ali", "aliyun"):
            limit = 8192
        elif provider_name in ("deepseek",):
            limit = 8192
        else:
            # 其他 OpenAI 兼容提供商默认保留调用值
            limit = None

        if limit is not None and value > limit:
            logger.warning(
                "max_tokens %s exceeds provider limit %s for %s, clamping to safe range",
                value,
                limit,
                provider_name or model_name,
            )
            value = limit

        return value

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
