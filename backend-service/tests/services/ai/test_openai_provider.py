"""
OpenAI Provider单元测试
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.ai.providers.openai_provider import OpenAIProvider
from app.services.ai.models import ProviderConfig, Message, ChatOptions


@pytest.fixture
def provider_config():
    """创建测试用的提供商配置"""
    return ProviderConfig(
        name="openai",
        api_key="test-api-key",
        api_base="https://api.openai.com/v1",
        model="gpt-4",
        timeout=30.0,
        max_retries=3,
    )


@pytest.fixture
def openai_provider(provider_config):
    """创建OpenAI提供商实例"""
    return OpenAIProvider(provider_config)


class TestOpenAIProvider:
    """OpenAI Provider测试类"""

    @pytest.mark.asyncio
    async def test_chat_success(self, openai_provider):
        """测试标准对话成功"""
        # Mock OpenAI client
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    role="assistant",
                    content="Hello! How can I help you?"
                )
            )
        ]
        mock_response.usage = MagicMock(
            prompt_tokens=10,
            completion_tokens=8,
            total_tokens=18
        )
        mock_response.model = "gpt-4"

        with patch.object(
            openai_provider.client.chat.completions,
            'create',
            new_callable=AsyncMock,
            return_value=mock_response
        ):
            messages = [Message(role="user", content="Hello")]
            response = await openai_provider.chat(messages)

            assert response.message.role == "assistant"
            assert response.message.content == "Hello! How can I help you?"
            assert response.usage.total_tokens == 18
            assert response.model == "gpt-4"

    @pytest.mark.asyncio
    async def test_chat_with_options(self, openai_provider):
        """测试带选项的对话"""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    role="assistant",
                    content="Test response"
                )
            )
        ]
        mock_response.usage = MagicMock(
            prompt_tokens=5,
            completion_tokens=3,
            total_tokens=8
        )
        mock_response.model = "gpt-3.5-turbo"

        with patch.object(
            openai_provider.client.chat.completions,
            'create',
            new_callable=AsyncMock,
            return_value=mock_response
        ) as mock_create:
            messages = [Message(role="user", content="Test")]
            options = ChatOptions(
                model="gpt-3.5-turbo",
                temperature=0.5,
                max_tokens=100
            )
            response = await openai_provider.chat(messages, options)

            # 验证调用参数
            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs['model'] == "gpt-3.5-turbo"
            assert call_kwargs['temperature'] == 0.5
            assert call_kwargs['max_tokens'] == 100

            assert response.message.content == "Test response"

    @pytest.mark.asyncio
    async def test_chat_error_handling(self, openai_provider):
        """测试对话错误处理"""
        with patch.object(
            openai_provider.client.chat.completions,
            'create',
            new_callable=AsyncMock,
            side_effect=Exception("API Error")
        ):
            messages = [Message(role="user", content="Test")]

            with pytest.raises(Exception) as exc_info:
                await openai_provider.chat(messages)

            assert "API Error" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_chat_stream_success(self, openai_provider):
        """测试流式对话成功"""
        # Mock streaming response
        mock_chunk1 = MagicMock()
        mock_chunk1.choices = [
            MagicMock(
                delta=MagicMock(content="Hello"),
                finish_reason=None
            )
        ]

        mock_chunk2 = MagicMock()
        mock_chunk2.choices = [
            MagicMock(
                delta=MagicMock(content=" World"),
                finish_reason=None
            )
        ]

        mock_chunk3 = MagicMock()
        mock_chunk3.choices = [
            MagicMock(
                delta=MagicMock(content="!"),
                finish_reason="stop"
            )
        ]
        mock_chunk3.usage = MagicMock(
            prompt_tokens=5,
            completion_tokens=3,
            total_tokens=8
        )

        async def mock_stream():
            yield mock_chunk1
            yield mock_chunk2
            yield mock_chunk3

        with patch.object(
            openai_provider.client.chat.completions,
            'create',
            new_callable=AsyncMock,
            return_value=mock_stream()
        ):
            messages = [Message(role="user", content="Test")]
            chunks = []

            async for chunk in openai_provider.chat_stream(messages):
                chunks.append(chunk)

            assert len(chunks) == 4  # start + 3 chunks
            assert chunks[0].type == "start"
            assert chunks[1].content == "Hello"
            assert chunks[2].content == " World"
            assert chunks[3].type == "done"

    @pytest.mark.asyncio
    async def test_analyze_success(self, openai_provider):
        """测试内容分析成功"""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    role="assistant",
                    content='{"name": "张三", "age": 30}'
                )
            )
        ]
        mock_response.usage = MagicMock(
            prompt_tokens=20,
            completion_tokens=10,
            total_tokens=30
        )
        mock_response.model = "gpt-4"

        with patch.object(
            openai_provider.client.chat.completions,
            'create',
            new_callable=AsyncMock,
            return_value=mock_response
        ):
            content = "患者姓名：张三，年龄：30岁"
            result = await openai_provider.analyze(
                content,
                "patient_info",
                extract_fields=["name", "age"]
            )

            assert result.analysis_type == "patient_info"
            assert result.extracted_data["name"] == "张三"
            assert result.extracted_data["age"] == 30
            assert result.confidence > 0

    @pytest.mark.asyncio
    async def test_analyze_with_invalid_json(self, openai_provider):
        """测试分析返回无效JSON"""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    role="assistant",
                    content="This is not JSON"
                )
            )
        ]
        mock_response.usage = MagicMock(
            prompt_tokens=10,
            completion_tokens=5,
            total_tokens=15
        )
        mock_response.model = "gpt-4"

        with patch.object(
            openai_provider.client.chat.completions,
            'create',
            new_callable=AsyncMock,
            return_value=mock_response
        ):
            content = "Test content"
            result = await openai_provider.analyze(content, "test")

            # 应该返回原始文本
            assert result.raw_response == "This is not JSON"
            assert result.confidence == 0.0

    @pytest.mark.asyncio
    async def test_health_check_success(self, openai_provider):
        """测试健康检查成功"""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    role="assistant",
                    content="OK"
                )
            )
        ]

        with patch.object(
            openai_provider.client.chat.completions,
            'create',
            new_callable=AsyncMock,
            return_value=mock_response
        ):
            health = await openai_provider.health_check()

            assert health.is_healthy is True
            assert health.provider_name == "openai"
            assert health.response_time_ms > 0

    @pytest.mark.asyncio
    async def test_health_check_failure(self, openai_provider):
        """测试健康检查失败"""
        with patch.object(
            openai_provider.client.chat.completions,
            'create',
            new_callable=AsyncMock,
            side_effect=Exception("Connection failed")
        ):
            health = await openai_provider.health_check()

            assert health.is_healthy is False
            assert "Connection failed" in health.error_message

