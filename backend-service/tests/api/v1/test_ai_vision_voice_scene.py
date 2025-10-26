import asyncio

from app.services.ai.models import ChatResponse, Usage, Message


def test_ai_chat_scene_injection_and_response(client, monkeypatch):
    captured = {"messages": None}

    async def fake_chat(messages, provider=None, options=None):
        captured["messages"] = messages
        return ChatResponse(
            message=Message(role="assistant", content="OK"),
            usage=Usage(prompt_tokens=1, completion_tokens=1, total_tokens=2),
            model=options.model if options and options.model else "fake-model",
            finish_reason="stop",
            provider="fake",
        )

    # patch ai_manager.chat used by /v1/ai
    from app.api.v1 import ai as ai_api

    monkeypatch.setattr(ai_api.ai_manager, "chat", fake_chat)

    payload = {"messages": [{"role": "user", "content": "你好"}]}
    r = client.post("/v1/ai/chat?scene=ai_chat", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body.get("success") is True

    # assert scene injected a system prompt as first message
    msgs = captured["messages"]
    assert msgs and msgs[0]["role"] == "system"
    assert "医疗AI助手" in msgs[0]["content"] or "提取" in msgs[0]["content"] or "建议" in msgs[0]["content"]


def test_ai_chat_stream_scene(client, monkeypatch):
    async def fake_stream(messages, provider=None, options=None):
        # simple async generator
        class AG:
            async def __aiter__(self_inner):
                yield type("C", (), {"type": "start", "json": lambda self: "{\"type\":\"start\"}"})()
                yield type("C", (), {"type": "chunk", "content": "A", "json": lambda self: "{\"type\":\"chunk\",\"content\":\"A\"}"})()
                yield type("C", (), {"type": "done", "json": lambda self: "{\"type\":\"done\"}"})()

        return AG()

    from app.api.v1 import ai as ai_api

    monkeypatch.setattr(ai_api.ai_manager, "chat_stream", fake_stream)

    payload = {"messages": [{"role": "user", "content": "hi"}]}
    r = client.post("/v1/ai/chat/stream?scene=ai_chat", json=payload)
    assert r.status_code == 200
    # SSE streaming; just ensure endpoint responds


def test_vision_understand_scene(client, monkeypatch):
    from app.api.v1 import vision as v_api
    from app.services.vision.models import VisionResponse, VisionResult

    async def fake_understand(req):
        # ensure injection took place
        assert req.model is not None
        assert any(kw in req.prompt for kw in ["稳健提取", "结构化JSON", "医疗"])
        return VisionResponse(success=True, result=VisionResult(description="OK", confidence=0.9, details={}), model_used=req.model)

    monkeypatch.setattr(v_api, "vision_service", type("S", (), {"understand": fake_understand})())

    payload = {"image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "prompt": "请分析"}
    r = client.post("/v1/vision/understand?scene=screen_recognition", json=payload)
    assert r.status_code == 200
    assert r.json().get("success") is True


def test_voice_scenes(client, monkeypatch):
    from app.api.v1 import voice as voice_api
    from app.services.voice.models import STTResponse, STTResult, TTSResponse, TTSResult

    async def fake_stt(req):
        assert req.model in ("large-v3", None)  # scene injects large-v3
        return STTResponse(success=True, result=STTResult(text="ok", confidence=0.9, language=req.language, segments=[]), model_used=req.model)

    async def fake_tts(req):
        assert req.model in ("tts-1", None)
        return TTSResponse(success=True, result=TTSResult(audio_data="bW9jaw==", format="wav", duration_ms=10), model_used=req.model)

    monkeypatch.setattr(voice_api, "stt_service", type("S", (), {"recognize": fake_stt})())
    monkeypatch.setattr(voice_api, "tts_service", type("T", (), {"synthesize": fake_tts})())

    # STT
    stt_req = {"audio_data": "bW9jaw==", "language": "zh"}
    r = client.post("/v1/voice/stt?scene=voice_stt", json=stt_req)
    assert r.status_code == 200 and r.json().get("success") is True

    # TTS
    tts_req = {"text": "你好"}
    r = client.post("/v1/voice/tts?scene=voice_tts", json=tts_req)
    assert r.status_code == 200 and r.json().get("success") is True


def test_health_endpoints(client):
    # top-level health
    r = client.get("/health")
    assert r.status_code == 200
    r = client.get("/health/detailed")
    assert r.status_code == 200
    # domain health
    r = client.get("/v1/ai/health")
    assert r.status_code == 200
    r = client.get("/v1/vision/health")
    assert r.status_code == 200
    r = client.get("/v1/voice/health")
    assert r.status_code == 200

