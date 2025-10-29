## 1. Alignment & Review
- [ ] 1.1 评审业务域模型与通用约定（Envelope/Errors/Health/Pagination/SSE/Strict JSON）
- [ ] 1.2 明确禁用回退/硬编码的边界与异常返回规范
- [ ] 1.3 前端/后端/产品对齐迁移节奏与开关

## 2. Backend — v2 路由与骨架
- [ ] 2.1 新建 `app/api/v2/*` 路由（ai/vision/voice/agent/registry/config/tools）
- [ ] 2.2 统一响应与错误包装（复用/扩展 APIResponse）
- [ ] 2.3 健康检查与分页统一实现
- [ ] 2.4 SSE 事件结构统一（chunk/end/error）
- [ ] 2.5 `strict_json` 与 `json_schema` 落地（视觉/AI 需严格）
- [ ] 2.6 Provider/Model 列表/CRUD 与健康检查在 v2 复刻并统一字段

## 3. Services & Performance
- [ ] 3.1 Provider 连接池、超时、重试与隔离（OpenAI 兼容与 Ollama）
- [ ] 3.2 GET/健康检查只读缓存（短 TTL，可关闭）
- [ ] 3.3 并发与速率限制策略（域内与全局）
- [ ] 3.4 结构化日志与指标（请求级 request_id 与 trace id 透传）

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

