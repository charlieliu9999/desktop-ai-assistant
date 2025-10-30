# 测试规范

**版本**: 1.0.0  
**日期**: 2025-10-29  
**状态**: 强制执行

---

## 📋 目录

1. [核心原则](#核心原则)
2. [测试覆盖率要求](#测试覆盖率要求)
3. [测试文件组织](#测试文件组织)
4. [测试编写规范](#测试编写规范)
5. [Mock和Monkeypatch规范](#mock和monkeypatch规范)
6. [断言规范](#断言规范)
7. [测试示例](#测试示例)

---

## 核心原则

### 1. 真实性原则（严格执行）

- ❌ **禁止**使用假数据或模拟数据作为测试结果
- ❌ **禁止**硬编码预期结果
- ✅ **必须**使用真实的API调用和真实的服务响应
- ✅ **必须**使用Mock/Monkeypatch模拟外部依赖（如AI Provider、Bisheng服务），但Mock的行为必须符合真实服务的行为规范

**示例**：

```python
# ❌ 错误：硬编码假数据
def test_chat():
    response = {"message": "fake response"}
    assert response["message"] == "fake response"

# ✅ 正确：使用真实Mock
def test_chat(client, monkeypatch):
    async def fake_chat(messages, provider=None, options=None):
        # Mock返回符合真实ChatResponse结构的数据
        return ChatResponse(
            message=Message(role="assistant", content="Hello!"),
            usage=Usage(prompt_tokens=10, completion_tokens=20, total_tokens=30),
            model="gpt-4",
            finish_reason="stop",
            provider="openai",
        )
    
    monkeypatch.setattr(ai_manager, "chat", fake_chat)
    response = client.post("/v2/ai/chat", json={"messages": [...]})
    assert response.status_code == 200
```

### 2. 不回退原则

- ❌ **禁止**为了通过测试而降低代码质量
- ❌ **禁止**为了通过测试而移除已有功能
- ❌ **禁止**为了通过测试而放宽验证逻辑
- ✅ **必须**通过补充测试用例来提升覆盖率
- ✅ **必须**修复代码缺陷而非修改测试期望

### 3. 完整性原则

- ✅ 测试正常路径（happy path）
- ✅ 测试错误路径（error handling）
- ✅ 测试边界条件（edge cases）
- ✅ 测试参数验证（validation）
- ✅ 测试并发场景（如果适用）

---

## 测试覆盖率要求

### 总体要求

- **最低覆盖率**: ≥80%
- **推荐覆盖率**: ≥90%
- **关键模块覆盖率**: 100%（如错误处理、安全验证）

### 覆盖率计算

```bash
# 运行测试并生成覆盖率报告
cd backend-service
source venv/bin/activate
pytest --cov=app --cov-report=term-missing --cov-report=html

# 查看HTML报告
open htmlcov/index.html
```

### 覆盖率门禁

在`pytest.ini`中配置：

```ini
[pytest]
addopts = --cov=app --cov-fail-under=80
```

---

## 测试文件组织

### 目录结构

```
backend-service/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── ai.py
│   │   │   └── vision.py
│   │   └── v2/
│   │       ├── ai.py
│   │       └── vision.py
│   └── services/
│       ├── ai/
│       └── vision/
└── tests/
    ├── api/
    │   ├── v1/
    │   │   ├── test_ai.py
    │   │   └── test_vision.py
    │   └── v2/
    │       ├── test_ai_v2.py
    │       └── test_vision_v2.py
    └── services/
        ├── ai/
        └── vision/
```

### 命名规范

- **测试文件**: `test_<module_name>.py`
- **测试类**: `Test<FeatureName>`（可选，用于组织相关测试）
- **测试函数**: `test_<scenario>_<expected_behavior>`

**示例**：

```python
# tests/api/v2/test_ai_v2.py

class TestV2AIChat:
    """v2 AI Chat端点测试"""
    
    def test_chat_success(self, client, monkeypatch):
        """测试标准对话成功"""
        pass
    
    def test_chat_empty_messages(self, client):
        """测试空消息列表"""
        pass
    
    def test_chat_upstream_error(self, client, monkeypatch):
        """测试上游服务错误"""
        pass
```

---

## 测试编写规范

### AAA模式（Arrange-Act-Assert）

所有测试必须遵循AAA模式：

```python
def test_feature_scenario(client, monkeypatch):
    # Arrange - 准备测试数据和环境
    request_data = {
        "messages": [{"role": "user", "content": "Hello"}],
        "provider": "openai",
    }
    
    async def fake_chat(messages, provider=None, options=None):
        return ChatResponse(...)
    
    monkeypatch.setattr(ai_manager, "chat", fake_chat)
    
    # Act - 执行被测试的操作
    response = client.post("/v2/ai/chat", json=request_data)
    
    # Assert - 验证结果
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert "meta" in data
```

### 测试隔离

- 每个测试必须独立，不依赖其他测试的执行顺序
- 使用`pytest` fixtures确保测试环境的一致性
- 避免使用全局状态

### 测试文档

每个测试函数必须包含docstring，说明测试目的：

```python
def test_chat_with_provider(self, client, monkeypatch):
    """测试指定提供商的对话
    
    验证：
    1. 请求中指定provider参数
    2. 响应中返回正确的provider
    3. 调用ai_manager.chat时传递了provider参数
    """
    pass
```

---

## Mock和Monkeypatch规范

### 使用Monkeypatch

优先使用`pytest`的`monkeypatch` fixture：

```python
def test_feature(client, monkeypatch):
    from app.services.ai import ai_manager
    
    async def fake_chat(messages, provider=None, options=None):
        return ChatResponse(...)
    
    monkeypatch.setattr(ai_manager, "chat", fake_chat)
```

### Mock对象必须实现完整接口

Mock对象必须包括`self`参数（如果是实例方法）：

```python
# ❌ 错误：缺少self参数
async def fake_understand(req):
    return VisionResponse(...)

# ✅ 正确：完整的Mock类
class MockVisionService:
    async def understand(self, req):
        return VisionResponse(...)

monkeypatch.setattr(v1vision, "vision_service", MockVisionService())
```

### Mock返回值必须符合真实结构

```python
# ✅ 正确：使用真实的Pydantic模型
async def fake_chat(messages, provider=None, options=None):
    return ChatResponse(
        message=Message(role="assistant", content="Hello!"),
        usage=Usage(prompt_tokens=10, completion_tokens=20, total_tokens=30),
        model="gpt-4",
        finish_reason="stop",
        provider="openai",
    )
```

---

## 断言规范

### 验证统一响应格式

所有v2 API测试必须验证统一响应格式：

```python
def test_api_v2_response(client):
    response = client.post("/v2/ai/chat", json={...})
    
    assert response.status_code == 200
    data = response.json()
    
    # 验证统一响应格式
    assert "success" in data
    assert "data" in data or "error" in data
    assert "meta" in data
    
    # 验证meta字段
    assert "timestamp" in data["meta"]
    assert "version" in data["meta"]
    assert data["meta"]["version"] == "2.0.0"
```

### 验证错误响应格式

```python
def test_api_v2_error(client):
    response = client.post("/v2/ai/chat", json={"messages": []})
    
    assert response.status_code == 400
    data = response.json()
    
    # 验证统一错误格式
    assert data["success"] is False
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]
    assert "meta" in data
```

---

## 测试示例

### 完整的v2 API测试示例

```python
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
from app.services.ai.models import Message, ChatResponse, Usage


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
                message=Message(role="assistant", content="Hello!"),
                usage=Usage(prompt_tokens=10, completion_tokens=20, total_tokens=30),
                model="gpt-4",
                finish_reason="stop",
                provider="openai",
            )

        monkeypatch.setattr(ai_manager, "chat", fake_chat)

        response = client_app.post("/v2/ai/chat", json={
            "messages": [{"role": "user", "content": "Hello"}],
            "provider": "openai",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["message"]["content"] == "Hello!"
        assert data["data"]["usage"]["total_tokens"] == 30
        assert data["meta"]["version"] == "2.0.0"

    def test_chat_empty_messages(self, client_app):
        """测试空消息列表"""
        response = client_app.post("/v2/ai/chat", json={"messages": []})

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "error" in data
        assert "messages_empty" in data["error"]["message"]
```

---

**维护者**: 桌面AI助手开发团队  
**更新日期**: 2025-10-29

