## 1. Planning & Alignment
- [ ] 1.1 审阅提案并确认范围与优先级
- [ ] 1.2 评审设计稿（Envelope/Health/SSE/Strict JSON/分页/错误码）
- [ ] 1.3 与前端确认迁移节奏与开关

## 2. Backend — Add /v2 Routers (Non-breaking)
- [ ] 2.1 新建 `app/api/v2/__init__.py` 与各域路由（ai/vision/voice/agent/registry/config/tools）
- [ ] 2.2 统一响应包装 `APIResponse`（新增 v2 专用模型或复用现有）
- [ ] 2.3 统一健康检查返回（`data.services`）
- [ ] 2.4 统一分页结构（需要分页的列表端点）
- [ ] 2.5 统一流式事件结构（SSE）
- [ ] 2.6 严格 JSON：支持 `strict_json` 与 `json_schema`，失败返回 `no_result`

## 3. Tests — Backend
- [ ] 3.1 新增 v2 端点单测（ai/vision/voice/agent/registry/tools/health/models/providers）
- [ ] 3.2 流式用例（SSE：chunk/end/error）
- [ ] 3.3 严格 JSON 失败路径（返回 `no_result`）
- [ ] 3.4 覆盖率 ≥ 80%，不破坏 v1 现有测试

## 4. Documentation
- [ ] 4.1 新增 `docs/api-v2.md`（总览、错误码、示例、迁移表）
- [ ] 4.2 更新 `README_API.md` 链接与简要说明
- [ ] 4.3 在 OpenSpec 记录映射与废弃策略

## 5. Frontend (after backend ready)
- [ ] 5.1 增加配置开关选择 v2
- [ ] 5.2 调整调用与解析（健康检查/分页/错误码/SSE）
- [ ] 5.3 前端单测适配（不删除 v1 用例，新增 v2 用例）

## 6. Release & Migration
- [ ] 6.1 提供 v1→v2 迁移指南
- [ ] 6.2 标注 v1 废弃时间线
- [ ] 6.3 归档变更（OpenSpec archive）

