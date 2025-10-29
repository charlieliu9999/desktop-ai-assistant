## Why
从业务视角全面梳理并重构 API，以解决以下问题：
- 端点设计与业务边界不一致，缺少统一的领域模型与资源命名。
- 跨域（AI/Vision/Voice/Agent/Registry/Tools/Config）的响应结构、错误码、健康检查、分页、流式协议不统一。
- 严格 JSON 输出策略没有统一描述，存在历史回退/硬编码风险（项目明确禁止）。
- 性能与可靠性：缺少一致的限流、缓存、并发/超时/重试策略和统一的观测性标准。

## What Changes
- 定义 v2 业务域 API 方案与标准（与 `api-v2-standardization` 结构化规范互补）：
  - 领域与资源建模：AI 对话/分析、视觉理解/OCR/结构化提取、语音 STT/TTS、智能体、Provider/Model 注册中心、工具、运行期配置。
  - 统一约定（Envelope/Errors/Health/Pagination/SSE/Strict JSON）。
  - 业务流程与场景：模型选择、场景注入、严格 JSON 失败处理、Agent 流式编排、搜索工具注入等。
  - 性能/可靠性：限流、缓存（只在无副作用端点）、连接池、并发上限、超时与重试、熔断与隔离、幂等设计。
  - 安全/合规：敏感字段遮蔽、密钥管理、最小化暴露、错误泄漏防护、审计字段。
- 输出完整的变更任务清单（分阶段可增量落地），并保持 v1 兼容与迁移策略。

## Impact
- 受影响能力：AI、Vision、Voice、Agent、Registry、Config、Tools。
- 受影响代码：`backend-service/app/api/*`、`services/*`、`tests/*`、`docs/*`、前端 API 客户端与设置面板。

## Approval & Rollout
- 先文档评审和确认，再分阶段实施；v1 保持稳定，v2 渐进替换。

