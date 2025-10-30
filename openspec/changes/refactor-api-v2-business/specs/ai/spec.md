## ADDED Requirements

### Requirement: AI Chat (Non-stream)
`POST /v2/ai/chat` SHALL accept messages, optional provider, scene, and options.

#### Scenario: Basic chat
- WHEN user sends messages with provider/model
- THEN return assistant message, usage, model, finish_reason in `data`.

### Requirement: AI Chat (Stream)
`POST /v2/ai/chat/stream` SHALL stream SSE with unified frames.

#### Scenario: Streaming chunks
- WHEN streaming
- THEN emit multiple `{type:"chunk"}` frames and a final `{type:"end"}`.

### Requirement: AI Analyze
`POST /v2/ai/analyze` SHALL support content analysis with `analysis_type` and `extract_fields?`.

#### Scenario: Analyze text
- WHEN content and analysis_type provided
- THEN return `extracted_data`, `confidence`, and `provider`.

### Requirement: Provider & Models
`GET /v2/ai/providers|models` SHALL return provider-grouped models and health status via registry.

#### Scenario: List providers
- WHEN listing providers
- THEN `data.providers[]` contains id/kind/base_url/capabilities/enabled/models? fields.

### Requirement: Scenes
Scene resolution SHALL allow injecting system prompt/model/param overrides.

#### Scenario: Scene injection
- WHEN `scene=ai_chat`
- THEN prepend system prompt and override `options` as specified.

---

## 测试示例

### v2 AI Chat测试

```python
def test_chat_success(client, monkeypatch):
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

    response = client.post("/v2/ai/chat", json={
        "messages": [{"role": "user", "content": "Hello"}],
        "provider": "openai",
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["message"]["content"] == "Hello!"
    assert data["meta"]["version"] == "2.0.0"
```

### v2 AI Stream测试

```python
@pytest.mark.asyncio
async def test_chat_stream_success(client, monkeypatch):
    """测试流式对话成功"""
    from app.services.ai import ai_manager

    async def fake_stream(messages, provider=None, options=None):
        chunks = ["Hello", " ", "World"]
        for chunk in chunks:
            yield StreamChunk(type="chunk", content=chunk)

    monkeypatch.setattr(ai_manager, "chat_stream", fake_stream)

    response = client.post("/v2/ai/chat/stream", json={
        "messages": [{"role": "user", "content": "Hello"}],
    })

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
    assert "'type': 'chunk'" in response.text
    assert "'type': 'end'" in response.text
```

### 错误处理测试

```python
def test_chat_empty_messages(client):
    """测试空消息列表"""
    response = client.post("/v2/ai/chat", json={"messages": []})

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert "messages_empty" in data["error"]["message"]
```

完整测试示例请参考：`backend-service/tests/api/v2/test_ai_v2.py`

