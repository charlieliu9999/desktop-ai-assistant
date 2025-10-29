# API v2 规范（草案）

本文件描述 `/v2` 路由的统一规范：响应包、错误负载、健康检查、分页、SSE 流式事件、严格 JSON 策略等。v1 将保持兼容；v2 逐步完善并提供迁移指南。

## 统一响应包
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2025-10-29T00:00:00.000Z",
    "version": "2.0.0",
    "request_id": "...",
    "processing_time_ms": 12.3
  }
}
```

失败：
```json
{
  "success": false,
  "error": { "code": "validation_error", "message": "...", "details": {} },
  "meta": { "timestamp": "...", "version": "2.0.0" }
}
```

## 错误码（示例）
- `validation_error` | `unauthorized` | `forbidden` | `not_found` | `conflict`
- `rate_limited` | `timeout` | `provider_unavailable` | `upstream_error` | `bad_gateway`
- `no_result`（严格 JSON 抽取失败时返回，不回退/不硬编码）

## 健康检查
`GET /v2/{domain}/health`：
```json
{
  "success": true,
  "data": {
    "services": {
      "stt": { "healthy": true, "available": true },
      "tts": { "healthy": false, "available": true }
    }
  },
  "meta": {"timestamp": "...", "version": "2.0.0"}
}
```

## 分页
统一：
```json
{
  "success": true,
  "data": {
    "items": [...],
    "page": 1,
    "page_size": 20,
    "total": 123
  },
  "meta": {"timestamp": "...", "version": "2.0.0"}
}
```

## SSE（流式）
`text/event-stream`，每个 data 帧为 JSON：
- 片段：`{"type":"chunk","data":{...},"meta":{...}}`
- 结束：`{"type":"end","data":{...},"meta":{...}}`
- 错误：`{"type":"error","error":{"code":"...","message":"..."},"meta":{...}}`

## 严格 JSON 策略
- 请求：`strict_json?: boolean`, `json_schema?: string`
- 若 `strict_json=true` 且无法抽取：返回 `success:false, error.code="no_result"`；不返回任何硬编码内容。

## 端点概览

### AI
- `POST /v2/ai/chat` | `POST /v2/ai/chat/stream`
- `POST /v2/ai/analyze`
- `GET /v2/ai/providers` | `GET /v2/ai/models` | `GET /v2/ai/health`
请求参数：`provider?`, `scene?`；统一 `options`（如 `model`, `max_tokens`, `temperature`...）。

### Vision
- `POST /v2/vision/ocr`
- `POST /v2/vision/understand`
- `POST /v2/vision/analyze-medical`
- `POST /v2/vision/extract-text`
- `GET /v2/vision/models` | `GET /v2/vision/health`
图像输入统一：`source: { type: 'url'|'base64', data: string, mime?: string }`

### Voice
- `POST /v2/voice/stt`
- `POST /v2/voice/tts`
- `GET /v2/voice/models` | `GET /v2/voice/health`
音频输入统一：`audio: { type: 'url'|'base64', data: string, mime?: string }`

### Agent
- `POST /v2/agent/login` | `GET /v2/agent/workflows`
- `POST /v2/agent/invoke`（SSE） | `POST /v2/agent/stop`
- `GET /v2/agent/health` | `GET /v2/agent/config`

### Registry
- `GET/POST/PUT/DELETE /v2/registry/providers`
- `GET/POST/PUT/DELETE /v2/registry/models`
- 健康：`GET /v2/registry/providers/{pid}/health` | `GET /v2/registry/models/{mid}/health`

### Config
- `GET /v2/config` | `GET/PUT /v2/config/{key}` | `POST /v2/config/validate`

### Tools
- `GET /v2/tools/search?q=...&provider=duckduckgo|serpapi&max_results=...`
返回：`data.results[]`（title/url/snippet），错误统一：`missing_api_key` 等。

## 迁移指南（v1 → v2）
- 健康检查字段：从根部 `services` 迁移到 `data.services`
- 列表/分页：统一为 `data.items/page/page_size/total`
- SSE：统一事件帧 JSON 结构
- 严格 JSON：新增 `json_schema` 与失败 `no_result` 定义

