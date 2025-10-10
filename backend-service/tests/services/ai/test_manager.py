"""
AI Service Manager单元测试
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.ai.manager import AIServiceManager
from app.services.ai.models import (
    Message,
    ChatOptions,
    ChatResponse,
    ProviderHealth,
    Usage,
)


@pytest.fixture
def ai_manager():
    """创建AI服务管理器实例"""
    return AIServiceManager()


@pytest.fixture
def mock_provider():
    """创建Mock提供商"""
    provider = MagicMock()
    provider.name = "test-provider"
    provider.chat = AsyncMock(
        return_value=ChatResponse(
            message=Message(role="assistant", content="Test response"),
            model="test-model",
            usage=Usage(prompt_tokens=10, completion_tokens=5, total_tokens=15),
            finish_reason="stop",
            provider="test-provider",
        )
    )
    provider.health_check = AsyncMock(
        return_value=ProviderHealth(
            provider_name="test-provider",
            is_healthy=True,
            response_time_ms=100.0,
        )
    )
    return provider


class TestAIServiceManager:
    """AI Service Manager测试类"""

    def test_register_provider(self, ai_manager, mock_provider):
        """测试注册提供商"""
        ai_manager.register_provider("test", mock_provider, is_default=True)

        assert "test" in ai_manager.providers
        assert ai_manager.default_provider == "test"

    def test_register_multiple_providers(self, ai_manager):
        """测试注册多个提供商"""
        provider1 = MagicMock()
        provider1.name = "provider1"

        provider2 = MagicMock()
        provider2.name = "provider2"

        ai_manager.register_provider("p1", provider1, is_default=True)
        ai_manager.register_provider("p2", provider2)

        assert len(ai_manager.providers) == 2
        assert ai_manager.default_provider == "p1"

    def test_set_fallback_providers(self, ai_manager, mock_provider):
        """测试设置故障转移提供商"""
        ai_manager.register_provider("test", mock_provider)
        ai_manager.set_fallback_providers(["test"])

        assert ai_manager.fallback_providers == ["test"]

    @pytest.mark.asyncio
    async def test_chat_with_default_provider(self, ai_manager, mock_provider):
        """测试使用默认提供商对话"""
        ai_manager.register_provider("test", mock_provider, is_default=True)

        messages = [Message(role="user", content="Hello")]
        response = await ai_manager.chat(messages)

        assert response.message.content == "Test response"
        mock_provider.chat.assert_called_once()

    @pytest.mark.asyncio
    async def test_chat_with_specific_provider(self, ai_manager, mock_provider):
        """测试使用指定提供商对话"""
        ai_manager.register_provider("test", mock_provider)

        messages = [Message(role="user", content="Hello")]
        response = await ai_manager.chat(messages, provider="test")

        assert response.message.content == "Test response"
        mock_provider.chat.assert_called_once()

    @pytest.mark.asyncio
    async def test_chat_with_nonexistent_provider(self, ai_manager):
        """测试使用不存在的提供商"""
        messages = [Message(role="user", content="Hello")]

        with pytest.raises(ValueError) as exc_info:
            await ai_manager.chat(messages, provider="nonexistent")

        assert "Provider 'nonexistent' not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_chat_with_failover(self, ai_manager):
        """测试故障转移"""
        # 创建两个提供商
        failing_provider = MagicMock()
        failing_provider.name = "failing"
        failing_provider.chat = AsyncMock(side_effect=Exception("Provider failed"))

        working_provider = MagicMock()
        working_provider.name = "working"
        working_provider.chat = AsyncMock(
            return_value=ChatResponse(
                message=Message(role="assistant", content="Fallback response"),
                model="fallback-model",
                usage=Usage(prompt_tokens=10, completion_tokens=5, total_tokens=15),
                finish_reason="stop",
                provider="working",
            )
        )

        # 注册提供商
        ai_manager.register_provider("failing", failing_provider, is_default=True)
        ai_manager.register_provider("working", working_provider)
        ai_manager.set_fallback_providers(["working"])

        # 执行对话
        messages = [Message(role="user", content="Hello")]
        response = await ai_manager.chat(messages)

        # 验证使用了故障转移
        assert response.message.content == "Fallback response"
        failing_provider.chat.assert_called_once()
        working_provider.chat.assert_called_once()

    @pytest.mark.asyncio
    async def test_chat_all_providers_fail(self, ai_manager):
        """测试所有提供商都失败"""
        failing_provider1 = MagicMock()
        failing_provider1.name = "failing1"
        failing_provider1.chat = AsyncMock(side_effect=Exception("Provider 1 failed"))

        failing_provider2 = MagicMock()
        failing_provider2.name = "failing2"
        failing_provider2.chat = AsyncMock(side_effect=Exception("Provider 2 failed"))

        ai_manager.register_provider("failing1", failing_provider1, is_default=True)
        ai_manager.register_provider("failing2", failing_provider2)
        ai_manager.set_fallback_providers(["failing2"])

        messages = [Message(role="user", content="Hello")]

        with pytest.raises(Exception) as exc_info:
            await ai_manager.chat(messages)

        assert "Provider 2 failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_chat_stream(self, ai_manager):
        """测试流式对话"""
        # 创建Mock提供商
        async def mock_stream():
            from app.services.ai.models import StreamChunk

            yield StreamChunk(type="start", request_id="test-123")
            yield StreamChunk(type="chunk", content="Hello")
            yield StreamChunk(type="chunk", content=" World")
            yield StreamChunk(
                type="done",
                usage=Usage(prompt_tokens=5, completion_tokens=2, total_tokens=7),
            )

        provider = MagicMock()
        provider.name = "test"
        provider.chat_stream = AsyncMock(return_value=mock_stream())

        ai_manager.register_provider("test", provider, is_default=True)

        messages = [Message(role="user", content="Test")]
        chunks = []

        async for chunk in ai_manager.chat_stream(messages):
            chunks.append(chunk)

        assert len(chunks) == 4
        assert chunks[0].type == "start"
        assert chunks[1].content == "Hello"
        assert chunks[2].content == " World"
        assert chunks[3].type == "done"

    @pytest.mark.asyncio
    async def test_analyze(self, ai_manager):
        """测试内容分析"""
        from app.services.ai.models import AnalyzeResponse

        provider = MagicMock()
        provider.name = "test"
        provider.analyze = AsyncMock(
            return_value=AnalyzeResponse(
                analysis_type="test",
                extracted_data={"key": "value"},
                confidence=0.95,
                raw_response="test response",
            )
        )

        ai_manager.register_provider("test", provider, is_default=True)

        result = await ai_manager.analyze("test content", "test")

        assert result.analysis_type == "test"
        assert result.extracted_data["key"] == "value"
        assert result.confidence == 0.95

    @pytest.mark.asyncio
    async def test_get_provider_health(self, ai_manager, mock_provider):
        """测试获取提供商健康状态"""
        ai_manager.register_provider("test", mock_provider)

        health = await ai_manager.get_provider_health("test")

        assert health.provider_name == "test-provider"
        assert health.is_healthy is True
        assert health.response_time_ms == 100.0

    @pytest.mark.asyncio
    async def test_get_all_providers_health(self, ai_manager):
        """测试获取所有提供商健康状态"""
        provider1 = MagicMock()
        provider1.name = "provider1"
        provider1.health_check = AsyncMock(
            return_value=ProviderHealth(
                provider_name="provider1",
                is_healthy=True,
                response_time_ms=100.0,
            )
        )

        provider2 = MagicMock()
        provider2.name = "provider2"
        provider2.health_check = AsyncMock(
            return_value=ProviderHealth(
                provider_name="provider2",
                is_healthy=False,
                error_message="Connection failed",
            )
        )

        ai_manager.register_provider("p1", provider1)
        ai_manager.register_provider("p2", provider2)

        health_list = await ai_manager.get_all_providers_health()

        assert len(health_list) == 2
        assert health_list[0].is_healthy is True
        assert health_list[1].is_healthy is False

    def test_list_providers(self, ai_manager, mock_provider):
        """测试列出所有提供商"""
        ai_manager.register_provider("test", mock_provider, is_default=True)

        providers = ai_manager.list_providers()

        assert len(providers) == 1
        assert providers[0]["name"] == "test"
        assert providers[0]["is_default"] is True

