## Context
业务域需要统一的资源建模与 API 规范，与 `api-v2-standardization` 的技术性结构规范配合，形成“业务 + 结构”一体的 v2 API 方案。本文聚焦业务边界、领域模型、非功能性要求（性能/可靠性/安全），并约束工程落地方式：逐域、增量、可回滚。

## Domain Model Overview
- AI：对话（非流式/流式）、内容分析；`provider`/`model` 与 `scene` 注入；`options` 统一（max_tokens、temperature 等）。
- Vision：OCR、图像理解、医疗分析、文本提取；`source` 输入统一（url/base64 + mime）；`strict_json` + `json_schema`。
- Voice：STT/TTS；`audio` 输入统一（url/base64 + mime）；`language`、`model` 与 `scene`。
- Agent：登录、工作流列表、流式调用与终止；SSE 事件帧统一；隐私与敏感数据遮蔽。
- Registry：Provider/Model 列表/CRUD/健康；与外部 OpenAI 兼容接口/Ollama 的健康/模型探针策略。
- Config：运行期配置读取/校验/局部更新；锁定模式。
- Tools：网络搜索；Provider/Key 管理；速率限制；无副作用缓存。

## Cross-Cutting Conventions
- Envelope：`{ success, data?, error?, meta }`；错误 `error={code,message,details?}`。
- Health：`data.services = {name:{healthy,available,...}}`。
- Pagination：`data={items,page,page_size,total}`。
- Streaming (SSE)：`type=chunk|end|error`，序列化 JSON 放在 `data:` 行。
- Strict JSON Policy：`strict_json` + `json_schema`；失败仅返回 `no_result` 错误（严格禁止回退/硬编码）。
- Idempotency：无副作用 GET/列表端点可缓存；非幂等 POST 提供 `Idempotency-Key` 支持（v2.1 可选）。
- Observability：结构化日志（含 request_id）、指标、trace id 透传，敏感字段遮蔽。

## Performance & Resilience
- 连接池与超时：httpx 连接池、合理超时；Provider 级重试策略（指数退避上限）。
- 并发限流：域内/全局并发上限；拒绝时返回 `rate_limited`。
- 缓存：只针对 GET/列表与只读健康检查可启用（短 TTL）；禁止缓存有副作用或隐私数据端点。
- 熔断与隔离：Provider 层面降级与隔离，错误自动恢复窗口，错误码 `provider_unavailable`。
- 大请求：对图像/音频限制大小 + 返回 `validation_error`；建议使用 URL 传输或分段上传（v2.1）。

## Security
- Key 管理：优先环境变量或后端受控配置，不在前端透出；敏感字段全链路遮蔽。
- 错误泄漏：对上游错误隐藏细节，写入日志/metrics；对用户返回标准 `upstream_error`。
- 审计字段：`meta` 可带 `request_id`，并写日志与追踪。

## Migration Strategy
- 并行：v1 保持；/v2 逐域上线；前端提供开关。
- 文档：映射表与迁移指南；废弃节奏公告。
- 测试：新增 v2 全量测试；保持覆盖率；金丝雀分阶段发布。

