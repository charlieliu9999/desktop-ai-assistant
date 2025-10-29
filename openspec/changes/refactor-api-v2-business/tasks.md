## 1. Alignment & Review
- [ ] 1.1 评审业务域模型与通用约定（Envelope/Errors/Health/Pagination/SSE/Strict JSON）
- [ ] 1.2 明确禁用回退/硬编码的边界与异常返回规范
- [ ] 1.3 前端/后端/产品对齐迁移节奏与开关

## 2. Backend — v2 路由与骨架（Phase 1）
- [ ] 2.1 新建 `app/api/v2` 目录与最小域路由：AI（chat/chat/stream）、Registry（providers/models：GET）、Vision（understand with strict_json minimal）、Voice（models/health）、Agent（health）
- [ ] 2.2 统一响应与错误包装（APIResponse）
- [ ] 2.3 AI 流式事件统一（chunk/end/error），其他域挪到后续
- [ ] 2.4 Vision `strict_json`：仅要求 JSON 对象；`json_schema` 透传，不做校验
- [ ] 2.5 Registry CRUD 暂缓（仅只读），后续按需要引入

## 3. Services & Performance（Phase 1）
- [ ] 3.1 Provider 连接池与超时；有限重试（必要时）
- [ ] 3.2 结构化日志（请求级 request_id）

## 4. Tests
- [ ] 4.1 v2 端点单测（AI/Vision/Voice/Agent/Registry/Config/Tools）
- [ ] 4.2 流式（SSE）用例（chunk/end/error）
- [ ] 4.3 严格 JSON 失败用例（no_result）
- [ ] 4.4 健康检查/分页/错误码一致性测试
- [ ] 4.5 覆盖率 ≥ 80%，不破坏 v1

## 5. Documentation & Migration
- [ ] 5.1 扩充 `docs/api-v2.md` 的业务章节与示例
- [ ] 5.2 新增迁移指南与映射表
- [ ] 5.3 README_API.md 链接与导航更新

## 6. Rollout
- [ ] 6.1 按域启用 v2（金丝雀）
- [ ] 6.2 收集指标与错误，迭代修正
- [ ] 6.3 公告废弃时间线
