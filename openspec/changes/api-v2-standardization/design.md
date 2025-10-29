## Context
v1 在不同域（ai/vision/voice/agent/registry/tools）存在响应/错误/健康检查不统一的问题；严格 JSON 输出策略在视觉与表单识别流中使用，但缺少标准化描述；SSE 的事件帧结构不一；分页方案散落。目标是在不破坏 v1 的情况下，提供 v2 路由与一致的接口规范，利于后续 Provider/Model/场景扩展与前端对接。

## Goals / Non-Goals
- Goals
  - 统一 v2 响应包、错误负载、分页、健康检查、SSE 事件帧
  - 统一 `strict_json` 和 `json_schema` 策略，杜绝任何硬编码/回退结果
  - 明确 Provider/Model/场景解析流程与各域的一致化查询参数
  - 提供 v1→v2 的端点映射与废弃节奏
- Non-Goals
  - 不立即删除 v1；不一次性重写服务层逻辑，优先复用现有服务
  - 不引入新的外部依赖（除非必要）

## API Envelope
- Response
  - `success: boolean`
  - `data?: any`
  - `error?: { code: string; message: string; details?: any }`
  - `meta: { timestamp: ISOString; version: string; request_id?: string; processing_time_ms?: number }`
- Errors（示例）
  - `validation_error`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `rate_limited`, `timeout`, `provider_unavailable`, `upstream_error`, `bad_gateway`, `no_result`

## Health
- 统一：`GET /v2/{domain}/health` → `{ success, data: { services: { [name]: { healthy, available, ... } } }, meta }`

## Pagination
- 标准：`data = { items: [], page: number, page_size: number, total: number }`

## Streaming (SSE)
- 媒体类型：`text/event-stream`
- 帧结构（JSON 序列化后作为 data 行传输）：
  - 成功片段：`{ type: "chunk", data: { content, usage? }, meta? }`
  - 结束：`{ type: "end", data?: { usage? }, meta? }`
  - 错误：`{ type: "error", error: { code, message, details? }, meta? }`

## Strict JSON Policy
- 请求参数：`strict_json?: boolean`, `json_schema?: string`（JSON Schema v2020-12 / 简化版）
- 若 `strict_json = true` 且抽取失败：返回 200 + `{ success:false, error:{ code:"no_result", message }, meta }`
- 不允许任何硬编码/回退内容在成功路径出现

## Versioning
- 路径优先：`/v2/...`
- 预留：`X-API-Version: 2` 可协商（不强制）
- 废弃策略：v1 保持半年稳定期；文档提供映射表与迁移指南

## Endpoint Plan (Mapping)
- AI
  - `POST /v2/ai/chat`（非流式）
  - `POST /v2/ai/chat/stream`（SSE）
  - `POST /v2/ai/analyze`
  - `GET /v2/ai/providers`（`data.providers[]` = { id/name, kind, base_url, capabilities, enabled, models? })
  - `GET /v2/ai/models`（`data.providers[]` = { id/name, models: string[] }）
  - `GET /v2/ai/health`
  - Query 一致化：`provider?`, `scene?`, `page?`, `page_size?`
- Vision
  - `POST /v2/vision/ocr`
  - `POST /v2/vision/understand`（支持 `source: { type: 'url'|'base64', data: string, mime?: string }`）
  - `POST /v2/vision/analyze-medical`
  - `POST /v2/vision/extract-text`（支持 strict_json/json_schema）
  - `GET /v2/vision/models`, `GET /v2/vision/health`
- Voice
  - `POST /v2/voice/stt`（支持 `audio: { type: 'url'|'base64', data: string, mime?: string }`）
  - `POST /v2/voice/tts`
  - `GET /v2/voice/models`, `GET /v2/voice/health`
- Agent
  - `POST /v2/agent/login`, `GET /v2/agent/workflows`
  - `POST /v2/agent/invoke`（SSE）
  - `POST /v2/agent/stop`, `GET /v2/agent/health`, `GET /v2/agent/config`
- Registry
  - `GET/POST/PUT/DELETE /v2/registry/providers`
  - `GET/POST/PUT/DELETE /v2/registry/models`
  - `GET /v2/registry/providers/{pid}/health`
  - `GET /v2/registry/models/{mid}/health`
- Config
  - `GET /v2/config`, `GET/PUT /v2/config/{key}`, `POST /v2/config/validate`
- Tools
  - `GET /v2/tools/search?q=...&provider=duckduckgo|serpapi&max_results=...`

## Security & Limits
- Header 透传与 API Key 管理保持现状（settings/env 与运行期 config），在 v2 文档化
- 超时/重试策略保持 provider 级别；返回统一错误码

## Migration Notes
- v1 与 v2 并行；首先实现 v2 的只读/查看类端点与 AI Chat 基本能力，再逐步扩展
- 为前端提供 feature flag 切换与环境配置开关

