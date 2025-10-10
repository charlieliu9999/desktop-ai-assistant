"""
AI API端点测试
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from app.main import app
from app.services.ai.models import (
    Message,
    ChatResponse,
    AnalyzeResponse,
    ProviderHealth,
    Usage,
)


@pytest.fixture
def client():
    """创建测试客户端"""
    return TestClient(app)


@pytest.fixture
def mock_ai_manager():
    """创建Mock AI管理器"""
    manager = MagicMock()

    # Mock chat方法
    manager.chat = AsyncMock(
        return_value=ChatResponse(
            message=Message(role="assistant", content="Test response"),
            model="test-model",
            usage=Usage(prompt_tokens=10, completion_tokens=5, total_tokens=15),
            finish_reason="stop",
            provider="test",
        )
    )

    # Mock analyze方法
    manager.analyze = AsyncMock(
        return_value=AnalyzeResponse(
            analysis_type="test",
            extracted_data={"key": "value"},
            confidence=0.95,
            raw_response="test response",
            provider="test",
        )
    )

    # Mock get_provider_health方法
    manager.get_provider_health = AsyncMock(
        return_value=ProviderHealth(
            name="test",
            healthy=True,
            latency_ms=100.0,
            last_check=datetime.now(),
        )
    )

    # Mock list_providers方法
    manager.list_providers = MagicMock(
        return_value=[
            {
                "name": "openai",
                "is_default": True,
                "is_available": True,
            }
        ]
    )

    return manager


class TestAIAPI:
    """AI API测试类"""

    def test_chat_endpoint(self, client, mock_ai_manager):
        """测试对话端点"""
        with patch("app.api.v1.ai.ai_manager", mock_ai_manager):
            response = client.post(
                "/api/v1/ai/chat",
                json={
                    "messages": [{"role": "user", "content": "Hello"}],
                    "options": {"temperature": 0.7},
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["message"]["content"] == "Test response"
            assert "meta" in data
            assert "request_id" in data["meta"]

    def test_chat_endpoint_with_provider(self, client, mock_ai_manager):
        """测试指定提供商的对话"""
        with patch("app.api.v1.ai.ai_manager", mock_ai_manager):
            response = client.post(
                "/api/v1/ai/chat",
                json={
                    "messages": [{"role": "user", "content": "Hello"}],
                    "provider": "openai",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True

            # 验证调用参数
            call_kwargs = mock_ai_manager.chat.call_args.kwargs
            assert call_kwargs["provider"] == "openai"

    def test_chat_endpoint_validation_error(self, client):
        """测试对话端点验证错误"""
        response = client.post(
            "/api/v1/ai/chat",
            json={
                "messages": [],  # 空消息列表
            },
        )

        assert response.status_code == 422  # Validation error

    def test_chat_endpoint_server_error(self, client, mock_ai_manager):
        """测试对话端点服务器错误"""
        mock_ai_manager.chat = AsyncMock(side_effect=Exception("Server error"))

        with patch("app.api.v1.ai.ai_manager", mock_ai_manager):
            response = client.post(
                "/api/v1/ai/chat",
                json={
                    "messages": [{"role": "user", "content": "Hello"}],
                },
            )

            assert response.status_code == 500
            data = response.json()
            assert data["success"] is False
            assert "error" in data

    def test_analyze_endpoint(self, client, mock_ai_manager):
        """测试分析端点"""
        with patch("app.api.v1.ai.ai_manager", mock_ai_manager):
            response = client.post(
                "/api/v1/ai/analyze",
                json={
                    "content": "Test content",
                    "analysis_type": "test",
                    "extract_fields": ["key"],
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["analysis_type"] == "test"
            assert data["data"]["extracted_data"]["key"] == "value"
            assert data["data"]["confidence"] == 0.95

    def test_analyze_endpoint_with_provider(self, client, mock_ai_manager):
        """测试指定提供商的分析"""
        with patch("app.api.v1.ai.ai_manager", mock_ai_manager):
            response = client.post(
                "/api/v1/ai/analyze",
                json={
                    "content": "Test content",
                    "analysis_type": "test",
                    "provider": "openai",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True

    def test_health_endpoint(self, client, mock_ai_manager):
        """测试健康检查端点"""
        with patch("app.api.v1.ai.ai_manager", mock_ai_manager):
            response = client.get("/api/v1/ai/health?provider=test")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["name"] == "test"
            assert data["data"]["healthy"] is True

    def test_health_endpoint_no_provider(self, client):
        """测试健康检查端点缺少提供商参数"""
        response = client.get("/api/v1/ai/health")

        assert response.status_code == 422  # Validation error

    def test_providers_endpoint(self, client, mock_ai_manager):
        """测试提供商列表端点"""
        with patch("app.api.v1.ai.ai_manager", mock_ai_manager):
            response = client.get("/api/v1/ai/providers")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert len(data["data"]["providers"]) == 1
            assert data["data"]["providers"][0]["name"] == "openai"
            assert data["data"]["providers"][0]["is_default"] is True


class TestStreamingAPI:
    """流式API测试类"""

    @pytest.mark.asyncio
    async def test_chat_stream_endpoint(self, client, mock_ai_manager):
        """测试流式对话端点"""
        from app.services.ai.models import StreamChunk

        # Mock streaming response
        async def mock_stream():
            yield StreamChunk(type="start", request_id="test-123")
            yield StreamChunk(type="chunk", content="Hello")
            yield StreamChunk(type="chunk", content=" World")
            yield StreamChunk(
                type="done",
                usage=Usage(prompt_tokens=5, completion_tokens=2, total_tokens=7),
            )

        mock_ai_manager.chat_stream = AsyncMock(return_value=mock_stream())

        with patch("app.api.v1.ai.ai_manager", mock_ai_manager):
            response = client.post(
                "/api/v1/ai/chat/stream",
                json={
                    "messages": [{"role": "user", "content": "Hello"}],
                    "options": {"stream": True},
                },
            )

            assert response.status_code == 200
            assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

            # 验证SSE格式
            content = response.text
            assert "data:" in content
            assert "start" in content
            assert "Hello" in content
            assert "World" in content
            assert "done" in content


class TestErrorHandling:
    """错误处理测试类"""

    def test_invalid_json(self, client):
        """测试无效JSON"""
        response = client.post(
            "/api/v1/ai/chat",
            data="invalid json",
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 422

    def test_missing_required_fields(self, client):
        """测试缺少必需字段"""
        response = client.post(
            "/api/v1/ai/chat",
            json={},  # 缺少messages字段
        )

        assert response.status_code == 422

    def test_invalid_message_role(self, client):
        """测试无效的消息角色"""
        response = client.post(
            "/api/v1/ai/chat",
            json={
                "messages": [{"role": "invalid", "content": "Hello"}],
            },
        )

        assert response.status_code == 422

    def test_provider_not_found(self, client, mock_ai_manager):
        """测试提供商不存在"""
        mock_ai_manager.chat = AsyncMock(
            side_effect=ValueError("Provider 'nonexistent' not found")
        )

        with patch("app.api.v1.ai.ai_manager", mock_ai_manager):
            response = client.post(
                "/api/v1/ai/chat",
                json={
                    "messages": [{"role": "user", "content": "Hello"}],
                    "provider": "nonexistent",
                },
            )

            assert response.status_code == 500
            data = response.json()
            assert data["success"] is False
            assert "not found" in data["error"]["message"].lower()

