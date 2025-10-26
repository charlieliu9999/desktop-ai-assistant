# Frontend E2E Smoke Report
Generated: 2025-10-15T06:56:14.547Z
Backend origin: http://127.0.0.1:8010


## /health
```json
{
  "status": "healthy",
  "version": "2.0.0"
}
```
Status: 200, Time: 43ms


## /v1/ai/chat (openai:gpt-4o-mini, scene=ai_chat)
[2551ms] status=200
```json
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "Hello! How can I assist you today?",
      "name": null
    },
    "usage": {
      "prompt_tokens": 53,
      "completion_tokens": 9,
      "total_tokens": 62
    },
    "model": "gpt-4o-mini-2024-07-18",
    "finish_reason": "stop",
    "provider": "openai"
  },
  "error": null,
  "meta": {
    "request_id": "5a83e19f-770e-4a44-8860-1c4cee8edd94",
    "timestamp": "2025-10-15T14:56:17.139167",
    "processing_time_ms": 2546.156,
    "version": "1.1.0"
  }
}
```


## /v1/ai/chat (deepseek:deepseek-chat, scene=ai_chat)
[2650ms] status=200
```json
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "Hello! 我是您的医疗AI助手。请问有什么可以帮您？请描述您遇到的健康相关问题或需要了解的信息，我会尽力提供参考建议和",
      "name": null
    },
    "usage": {
      "prompt_tokens": 34,
      "completion_tokens": 32,
      "total_tokens": 66
    },
    "model": "deepseek-chat",
    "finish_reason": "length",
    "provider": "deepseek"
  },
  "error": null,
  "meta": {
    "request_id": "41c357fa-2477-48eb-8063-f3938d456637",
    "timestamp": "2025-10-15T14:56:19.791498",
    "processing_time_ms": 2646.777,
    "version": "1.1.0"
  }
}
```


## /v1/ai/chat (dashscope:qwen3-max, scene=ai_chat_aliyun)
[975ms] status=200
```json
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "Hello! How can I assist you today? Please note that while I can provide general health information and guidance, I cannot offer medical diagnoses or replace professional healthcare advice",
      "name": null
    },
    "usage": {
      "prompt_tokens": 45,
      "completion_tokens": 32,
      "total_tokens": 77
    },
    "model": "qwen3-max",
    "finish_reason": "length",
    "provider": "dashscope"
  },
  "error": null,
  "meta": {
    "request_id": "eee0bb0b-ee91-468c-89ac-60db67247a98",
    "timestamp": "2025-10-15T14:56:20.766047",
    "processing_time_ms": 971.253,
    "version": "1.1.0"
  }
}
```


## /v1/ai/chat (local:qwen2.5:32b, scene=ai_chat)
[4870ms] status=200
```json
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "Hello! How can I assist you today? If you have any questions about health or wellness, feel free to ask. Please remember that my responses are general in",
      "name": null
    },
    "usage": {
      "prompt_tokens": 38,
      "completion_tokens": 38,
      "total_tokens": 76
    },
    "model": "qwen2.5:32b",
    "finish_reason": "stop",
    "provider": "local"
  },
  "error": null,
  "meta": {
    "request_id": "a14b5952-d358-4c8c-b607-d6475fc7c6eb",
    "timestamp": "2025-10-15T14:56:25.634545",
    "processing_time_ms": 4863.637,
    "version": "1.1.0"
  }
}
```


## /v1/vision/understand (dashscope, scene=screen_recognition_aliyun, file=patient_info_sample.png)
[8265ms] status=200
✅ Success
```json
{
  "description_length": 762,
  "has_structured": false,
  "structured_data": null
}
```


## /v1/voice/stt (OpenAI Whisper API)
[4343ms] status=200
```json
{
  "success": true,
  "result": {
    "text": "今天是什么天气?",
    "confidence": 0.9,
    "language": "zh",
    "segments": []
  },
  "error": null,
  "model_used": "whisper-1",
  "processing_time_ms": 4336.523056030273
}
```


## /v1/agent/workflows (不带token)
[40ms] status=200
✅ Success - Found 0 workflows
```json
{
  "workflow_count": 0
}
```


---

## Test Summary

- Health: ✅
- AI Chat: 4/4 passed
- Vision: 1/1 passed
- Voice STT: ✅
- Agent: ✅