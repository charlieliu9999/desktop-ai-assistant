"""
Ollama 提供商实现（使用 /api/generate 接口）

说明：Ollama 的 OpenAI 兼容端点在某些环境未启用；
本提供商直接调用 {origin}/api/generate，实现标准非流式对话。
"""
from __future__ import annotations

import time
from typing import List, Optional
from datetime import datetime
import httpx
from loguru import logger

from ..base import AIProviderBase
from ..models import (
    Message,
    ChatOptions,
    ChatResponse,
    AnalyzeResponse,
    ProviderConfig,
    ProviderHealth,
    Usage,
)


class OllamaProvider(AIProviderBase):
    """Ollama 提供商（/api/generate）"""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        logger.info(f"Ollama provider initialized with model: {config.model}")

    def _origin(self) -> str:
        base = (self.config.api_base or "http://localhost:11434").rstrip("/")
        # 去掉 /v1 等路径，取 origin
        try:
            from urllib.parse import urlparse
            p = urlparse(base)
            return f"{p.scheme}://{p.netloc}"
        except Exception:
            return base

    async def chat(self, messages: List[Message], options: Optional[ChatOptions] = None) -> ChatResponse:
        try:
            opts = options or ChatOptions()
            model = opts.model or self.config.model

            # 合并消息为单一 prompt（简单 role 前缀）
            parts = []
            for m in messages:
                prefix = m.role
                parts.append(f"[{prefix}]\n{m.content}")
            prompt = "\n\n".join(parts)

            body = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": opts.temperature,
                    "num_predict": opts.max_tokens,
                },
            }

            url = f"{self._origin()}/api/generate"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers={"Content-Type": "application/json"}, json=body)
                resp.raise_for_status()
                data = resp.json()
                content = data.get("response") or data.get("message") or ""

            # 估算用量
            total_tokens = max(1, len(content) // 4)
            return ChatResponse(
                message=Message(role="assistant", content=content),
                usage=Usage(prompt_tokens=total_tokens, completion_tokens=total_tokens, total_tokens=total_tokens * 2),
                model=model,
                finish_reason="stop",
                provider=self.name,
            )
        except Exception as e:
            logger.error(f"Ollama chat error: {e}")
            raise

    async def chat_stream(self, messages: List[Message], options: Optional[ChatOptions] = None):
        """简易流式：一次性产出全部内容为一个 chunk。"""
        try:
            # 发送开始事件
            import time as _t
            yield {"type": "start", "request_id": f"req_{int(_t.time())}"}
            resp = await self.chat(messages, options)
            if resp and resp.message and resp.message.content:
                yield {"type": "chunk", "content": resp.message.content}
            yield {
                "type": "done",
                "usage": {
                    "prompt_tokens": resp.usage.prompt_tokens,
                    "completion_tokens": resp.usage.completion_tokens,
                    "total_tokens": resp.usage.total_tokens,
                },
            }
        except Exception as e:
            yield {"type": "error", "error": str(e)}

    async def analyze(
        self,
        content: str,
        analysis_type: str,
        extract_fields: Optional[List[str]] = None,
        options: Optional[ChatOptions] = None,
    ) -> AnalyzeResponse:
        # 复用 chat，返回简单封装
        resp = await self.chat([Message(role="user", content=content)], options)
        return AnalyzeResponse(
            analysis_type=analysis_type,
            extracted_data={"text": resp.message.content},
            confidence=0.0,
            raw_response=resp.message.content,
            provider=self.name,
        )

    async def health_check(self) -> ProviderHealth:
        try:
            start = time.time()
            url = f"{self._origin()}/api/tags"
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(url)
                healthy = r.status_code == 200
            latency_ms = (time.time() - start) * 1000.0
            return ProviderHealth(name=self.name, healthy=healthy, latency_ms=latency_ms, last_check=datetime.now())
        except Exception as e:
            logger.error(f"Ollama health check failed: {e}")
            return ProviderHealth(name=self.name, healthy=False, latency_ms=None, last_check=datetime.now())
