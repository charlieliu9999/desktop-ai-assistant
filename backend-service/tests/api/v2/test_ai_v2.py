"""
v2 AI API 测试

测试v2 AI端点的完整功能，包括：
- chat端点（标准对话）
- chat/stream端点（流式对话）
- providers端点（提供商列表）
- models端点（模型列表）
- health端点（健康检查）

遵循OpenSpec规范：
- 统一响应格式：{success, data, meta}
- 统一错误格式：{success: false, error: {code, message}, meta}
- 真实Mock（不使用假数据）
"""
import pytest
from unittest.mock import AsyncMock
from app.services.ai.models import Message, ChatOptions, ChatResponse, Usage, StreamChunk, ProviderHealth
from datetime import datetime


@pytest.fixture
def client_app():
    """创建测试客户端"""
    from app.main import app
    from fastapi.testclient import TestClient
    return TestClient(app)


class TestV2AIChat:
    """v2 AI Chat端点测试"""

    def test_chat_success(self, client_app, monkeypatch):
        """测试标准对话成功"""
        from app.services.ai import ai_manager

        async def fake_chat(messages, provider=None, options=None):
            return ChatResponse(
                message=Message(role="assistant", content="Hello! How can I help you?"),
                usage=Usage(prompt_tokens=10, completion_tokens=20, total_tokens=30),
                model=(options.model if options and options.model else "gpt-4"),
                finish_reason="stop",
                provider=provider or "openai",
            )

        monkeypatch.setattr(ai_manager, "chat", fake_chat)

        # Act
        response = client_app.post("/v2/ai/chat", json={
            "messages": [{"role": "user", "content": "Hello"}],
            "provider": "openai",
            "options": {"model": "gpt-4", "temperature": 0.7}
        })

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "meta" in data
        assert data["data"]["message"]["content"] == "Hello! How can I help you?"
        assert data["data"]["usage"]["total_tokens"] == 30
        assert data["data"]["provider"] == "openai"
        assert data["meta"]["version"] == "2.0.0"

    def test_chat_empty_messages(self, client_app):
        """测试空消息列表"""
        response = client_app.post("/v2/ai/chat", json={
            "messages": [],
        })

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "error" in data
        assert "messages_empty" in data["error"]["message"]

    def test_chat_with_provider(self, client_app, monkeypatch):
        """测试指定提供商"""
        from app.services.ai import ai_manager

        async def fake_chat(messages, provider=None, options=None):
            return ChatResponse(
                message=Message(role="assistant", content="Response from specific provider"),
                usage=Usage(prompt_tokens=5, completion_tokens=10, total_tokens=15),
                model="claude-3",
                finish_reason="stop",
                provider=provider or "anthropic",
            )

        monkeypatch.setattr(ai_manager, "chat", fake_chat)

        response = client_app.post("/v2/ai/chat", json={
            "messages": [{"role": "user", "content": "Test"}],
            "provider": "anthropic",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["provider"] == "anthropic"

    def test_chat_upstream_error(self, client_app, monkeypatch):
        """测试上游服务错误"""
        from app.services.ai import ai_manager

        async def fake_chat(messages, provider=None, options=None):
            raise Exception("Upstream service unavailable")

        monkeypatch.setattr(ai_manager, "chat", fake_chat)

        response = client_app.post("/v2/ai/chat", json={
            "messages": [{"role": "user", "content": "Test"}],
        })

        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert "error" in data
        assert "upstream_error" in data["error"]["message"]


class TestV2AIStream:
    """v2 AI Stream端点测试"""

    @pytest.mark.asyncio
    async def test_chat_stream_success(self, client_app, monkeypatch):
        """测试流式对话成功"""
        from app.services.ai import ai_manager

        async def fake_stream(messages, provider=None, options=None):
            """模拟流式响应"""
            chunks = ["Hello", " ", "World", "!"]
            for chunk in chunks:
                yield StreamChunk(type="chunk", content=chunk)

        monkeypatch.setattr(ai_manager, "chat_stream", fake_stream)

        response = client_app.post("/v2/ai/chat/stream", json={
            "messages": [{"role": "user", "content": "Hello"}],
        })

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

        # 验证流式响应内容
        content = response.text
        assert "data:" in content
        assert "'type': 'chunk'" in content  # Python dict使用单引号
        assert "'type': 'end'" in content

    def test_chat_stream_empty_messages(self, client_app):
        """测试流式对话空消息"""
        response = client_app.post("/v2/ai/chat/stream", json={
            "messages": [],
        })

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False

    @pytest.mark.asyncio
    async def test_chat_stream_error(self, client_app, monkeypatch):
        """测试流式对话错误处理"""
        from app.services.ai import ai_manager

        async def fake_stream(messages, provider=None, options=None):
            """模拟流式响应中的错误"""
            yield StreamChunk(type="chunk", content="Hello")
            raise Exception("Stream error occurred")

        monkeypatch.setattr(ai_manager, "chat_stream", fake_stream)

        response = client_app.post("/v2/ai/chat/stream", json={
            "messages": [{"role": "user", "content": "Hello"}],
        })

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

        # 验证错误被包含在流式响应中
        content = response.text
        assert "data:" in content
        assert "'type': 'error'" in content
        assert "upstream_error" in content


class TestV2AIProviders:
    """v2 AI Providers端点测试"""

    def test_list_providers_success(self, client_app):
        """测试获取提供商列表成功"""
        response = client_app.get("/v2/ai/providers")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "providers" in data["data"]
        assert isinstance(data["data"]["providers"], list)
        assert "meta" in data
        assert data["meta"]["version"] == "2.0.0"

        # 验证提供商结构
        if len(data["data"]["providers"]) > 0:
            provider = data["data"]["providers"][0]
            assert "name" in provider
            assert "is_default" in provider
            assert "is_available" in provider

    def test_list_providers_error(self, client_app, monkeypatch):
        """测试获取提供商列表错误处理"""
        from app.services.ai import ai_manager

        # Mock ai_manager.providers.keys() to raise an exception
        class FakeProviders:
            def keys(self):
                raise Exception("Failed to get providers")

        monkeypatch.setattr(ai_manager, "providers", FakeProviders())

        response = client_app.get("/v2/ai/providers")

        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert "error" in data
        assert "internal_error" in data["error"]["message"]


class TestV2AIModels:
    """v2 AI Models端点测试"""

    def test_list_models_success(self, client_app):
        """测试获取模型列表成功"""
        response = client_app.get("/v2/ai/models")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "providers" in data["data"]
        assert isinstance(data["data"]["providers"], list)
        assert "meta" in data
        assert data["meta"]["version"] == "2.0.0"

        # 验证提供商和模型结构
        if len(data["data"]["providers"]) > 0:
            provider = data["data"]["providers"][0]
            assert "name" in provider
            assert "base_url" in provider
            assert "models" in provider
            assert isinstance(provider["models"], list)

    def test_list_models_with_disabled_provider(self, client_app, monkeypatch):
        """测试获取模型列表时过滤禁用的提供商"""
        from app.registry.models import RegistryData, Provider, ModelInfo

        def fake_load_registry():
            # 创建一个包含禁用提供商的RegistryData
            enabled_provider = Provider(
                id="openai",
                name="OpenAI",
                kind="openai",
                base_url="https://api.openai.com/v1",
                enabled=True,
            )
            disabled_provider = Provider(
                id="disabled",
                name="Disabled Provider",
                kind="custom",
                base_url="https://disabled.com",
                enabled=False,
            )
            model1 = ModelInfo(
                id="gpt-4",
                name="gpt-4",
                provider_id="openai",
                modality="llm",
                enabled=True,
            )
            return RegistryData(
                providers=[enabled_provider, disabled_provider],
                models=[model1],
            )

        import app.registry.store
        monkeypatch.setattr(app.registry.store, "load_registry", fake_load_registry)

        response = client_app.get("/v2/ai/models")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # 验证只返回启用的提供商
        providers = data["data"]["providers"]
        provider_names = [p["name"] for p in providers]
        assert "openai" in provider_names
        assert "disabled" not in provider_names

    def test_list_models_error(self, client_app, monkeypatch):
        """测试获取模型列表错误处理"""
        # Mock load_registry to raise an exception
        def fake_load_registry():
            raise Exception("Failed to load registry")

        import app.registry.store
        monkeypatch.setattr(app.registry.store, "load_registry", fake_load_registry)

        response = client_app.get("/v2/ai/models")

        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert "error" in data
        assert "internal_error" in data["error"]["message"]


class TestV2AIHealth:
    """v2 AI Health端点测试"""

    def test_health_check_success(self, client_app, monkeypatch):
        """测试健康检查成功"""
        from app.services.ai import ai_manager

        async def fake_health():
            return {
                "openai": ProviderHealth(
                    name="openai",
                    healthy=True,
                    latency_ms=100.0,
                    last_check=datetime.now(),
                ),
                "anthropic": ProviderHealth(
                    name="anthropic",
                    healthy=True,
                    latency_ms=150.0,
                    last_check=datetime.now(),
                ),
            }

        monkeypatch.setattr(ai_manager, "get_all_providers_health", fake_health)

        response = client_app.get("/v2/ai/health")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "services" in data["data"]
        assert isinstance(data["data"]["services"], dict)

        # 验证服务健康状态结构
        services = data["data"]["services"]
        if "openai" in services:
            service = services["openai"]
            assert "healthy" in service
            assert "available" in service
            assert "latency_ms" in service

    def test_health_check_with_unhealthy_service(self, client_app, monkeypatch):
        """测试包含不健康服务的健康检查"""
        from app.services.ai import ai_manager

        async def fake_health():
            return {
                "openai": ProviderHealth(
                    name="openai",
                    healthy=True,
                    latency_ms=100.0,
                    last_check=datetime.now(),
                ),
                "failed_provider": ProviderHealth(
                    name="failed_provider",
                    healthy=False,
                    latency_ms=None,
                    last_check=datetime.now(),
                    error="Connection timeout",
                ),
            }

        monkeypatch.setattr(ai_manager, "get_all_providers_health", fake_health)

        response = client_app.get("/v2/ai/health")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        services = data["data"]["services"]
        assert "openai" in services
        assert services["openai"]["healthy"] is True
        assert "failed_provider" in services
        assert services["failed_provider"]["healthy"] is False
        assert services["failed_provider"]["error"] == "Connection timeout"

    def test_health_check_error(self, client_app, monkeypatch):
        """测试健康检查错误处理"""
        from app.services.ai import ai_manager

        async def fake_health():
            raise Exception("Failed to check health")

        monkeypatch.setattr(ai_manager, "get_all_providers_health", fake_health)

        response = client_app.get("/v2/ai/health")

        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert "error" in data
        assert "internal_error" in data["error"]["message"]

