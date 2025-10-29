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

## Cross-Cutting Conventions (Phase 1 pragmatic)
- Envelope：`{ success, data?, error?, meta }`；错误 `error={code,message,details?}`。
- Health：`data.services = {name:{healthy,available,...}}`（逐域引入）。
- Pagination：暂不强制；仅在需要的大列表端点引入（Phase 2+）。
- Streaming (SSE)：`type=chunk|end|error`；Phase 1 仅 AI chat 流标准化。
- Strict JSON Policy：`strict_json`（必须）；Phase 1 仅要求输出为可解析 JSON 对象；`json_schema` 作为可选透传；严禁回退/硬编码。
- Observability：结构化日志（含 request_id）；指标/trace 后续增强。

## Performance & Resilience
- Phase 1：连接池与超时；必要时提供有限重试（Provider 级）
- Phase 2+：并发限流、只读缓存、熔断/隔离
- 大请求：限制大小并返回 `validation_error`；建议使用 URL 传输（分段上传后续评估）

## Security
- Key 管理：优先环境变量或后端受控配置，不在前端透出；敏感字段全链路遮蔽。
- 错误泄漏：对上游错误隐藏细节，写入日志/metrics；对用户返回标准 `upstream_error`。
- 审计字段：`meta` 可带 `request_id`，并写日志与追踪。

## Migration Strategy
- 并行：v1 保持；/v2 逐域上线；前端提供开关。
- 文档：映射表与迁移指南；废弃节奏公告。
- 测试：新增 v2 全量测试；保持覆盖率；金丝雀分阶段发布。
