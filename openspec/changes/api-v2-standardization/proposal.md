## Why
现有 v1 API 在不同域的响应结构存在不一致（如健康检查端点、分页、错误负载等），同时受历史遗留约束，部分端点的参数/返回与业务语义不完全匹配。为确保前后端协作清晰、对外接口稳定、便于新增 Provider/Model/场景扩展，需要推出标准化的 v2 版本：统一结构、明确错误编码、规范流式协议与分页，并提供平滑迁移策略。

## What Changes
- 新增 `/v2` 路由前缀，逐步镜像 v1 能力并统一：
  - 统一响应包结构：`{ success, data?, error?, meta }`
  - 统一错误负载：`error = { code, message, details? }`
  - 统一健康检查返回：`data.services = { name: { healthy, available, ... } }`
  - 统一分页：`data = { items: [], page, page_size, total }`
  - 统一流式协议（SSE）：事件帧 JSON 严格为 `{ type, data?, error?, meta? }`
  - 统一严格 JSON 输出策略：`strict_json` 与 `json_schema`（失败时不回退、不硬编码，返回 `success:false, error.code="no_result"`）
  - 统一模型/Provider 列表结构：`data.providers[]`（含 id/kind/base_url/capabilities/enabled/models）
  - 统一工具端点（如 Web 搜索）返回结构与错误码
- 版本协商：优先采用路径版本（`/v2/...`），同时支持 `X-API-Version: 2` 作为将来的协商扩展（不必选但保留设计位）。
- 迁移与废弃策略：保留 v1（不破坏已有前端与测试），新增 v2，逐步迁移；提供文档化映射表与期限计划。

## Impact
- Affected specs: AI 对话/分析、Vision 视觉、Voice 语音、Agent 智能体、Registry 注册中心、Config 配置、Tools 工具（搜索）。
- Affected code: `backend-service/app/api`（新增 `v2` 路由与模型）、`services/*`（重用服务层）、`tests`（新增 v2 覆盖）、`README_API.md`/`docs`（文档补充）。

## BREAKING (under `/v2` only)
- 健康检查与列表端点的返回字段将统一包装到 `data` 下（v1 保持不变）。
- 部分查询参数重命名以跨域一致（如 `scene`、`page`、`page_size`、`provider`）。

