## 1. Planning & Alignment
- [ ] 1.1 审阅提案并确认范围与优先级
- [ ] 1.2 评审设计稿（Envelope/Health/SSE/Strict JSON/分页/错误码）
- [ ] 1.3 与前端确认迁移节奏与开关

## 2. Backend — Add /v2 Routers (Phase 1 Minimal)
- [x] 2.1 新建 `app/api/v2/__init__.py` 与最小域路由：`ai`、`registry`、`vision`（understand）、`voice`（models, health）、`agent`（health）
- [x] 2.2 统一响应包装 `APIResponse`
- [x] 2.3 AI SSE 事件结构统一（仅 chat/stream）
- [x] 2.4 Vision 严格 JSON：仅要求有效 JSON 对象；`json_schema` 为可选透传；失败返回 `no_result`
- [x] 2.5 Registry 只读列表（providers/models），CRUD 留待后续

## 3. Tests — Backend
- [x] 3.1 新增 v2 端点单测（Phase 1 覆盖的域）
- [x] 3.2 AI 流式用例（SSE：chunk/end/error）
- [x] 3.3 Vision 严格 JSON 失败路径（返回 `no_result`）
- [x] 3.4 覆盖率 ≥ 80%，不破坏 v1 现有测试（当前 84%）

## 4. Documentation
- [ ] 4.1 新增 `docs/api-v2.md`（总览、错误码、示例、迁移表）
- [ ] 4.2 更新 `README_API.md` 链接与简要说明
- [ ] 4.3 在 OpenSpec 记录映射与废弃策略

## 5. Frontend (after backend ready)
- [ ] 5.1 增加配置开关选择 v2
- [ ] 5.2 AI v2 对接（非流式+流式）；统一 SSE 解析
- [ ] 5.3 Vision 严格 JSON 错误展现；取消任何回退/硬编码
- [ ] 5.4 前端单测适配（新增 v2 用例）

## 6. Release & Migration
- [ ] 6.1 提供 v1→v2 迁移指南
- [ ] 6.2 标注 v1 废弃时间线
- [ ] 6.3 归档变更（OpenSpec archive）
