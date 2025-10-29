# OpenSpec 任务梳理与统一路线图（2025-10-29）

本路线图对当前 OpenSpec 变更进行盘点、合并与增强，形成后端优先、前端跟进的统一任务体系，用于推进 API v2 与整体重构目标。

## 1. 现有变更盘点

- 已归档/可关闭
  - archive/2025-10-26-remove-legacy-api —— 已完成，可保持归档状态。

- 建议合并（合入 v2 Vision/Medical Intake 轨道）
  - fix-desktop-recognition-vl-only-no-dialog —— 与桌面识别/严格 JSON 行为重叠，合并到 “refactor-api-v2-business (Vision)”；随后归档。
  - refactor-ai-image-settings-and-flows —— 与医疗 intake/VL 严格 JSON 行为高度重叠，合并到 “refactor-api-v2-business (Vision)”；随后归档。
  - add-patient-intake-ocr-extraction —— 与 Vision/结构化提取同域，合并到 “refactor-api-v2-business (Vision)”；随后归档。

- 保留但收敛
  - refactor-codebase-cleanup —— 已完成大部分 P0；剩余 3.1.3 Legacy 服务收尾与少量清理，合并到 v2 执行阶段中的“收尾与迁移”子任务；完成后将本变更归档。

- 主线（保留并增强）
  - api-v2-standardization —— 技术结构规范（Envelope/Errors/Health/Pagination/SSE/Strict JSON）。
  - refactor-api-v2-business —— 业务域建模与端到端重构（AI/Vision/Voice/Agent/Registry/Config/Tools）。

## 2. 统一任务体系（按后端/前端节奏）

### Sprint A（后端优先：v2 骨架 + AI 最小集）
- Backend
  - /v2 框架与公共模型（Envelope/Errors/Health/SSE）
  - /v2/ai: chat、chat/stream（统一 SSE 帧）、models、providers、health
  - /v2/registry: providers/models 只读（用于前端下拉列表），后续 CRUD 延伸
  - 基础单测与覆盖率 ≥ 80%
- Frontend
  - v2 开关（设置页），API 客户端适配 AI v2（非流式+流式）
  - SSE 事件解析统一（chunk/end/error）

### Sprint B（后端：Vision/Strict JSON；Voice；性能基础）
- Backend
  - /v2/vision: understand/ocr/extract-text（strict_json + json_schema，失败返回 no_result）
  - /v2/voice: stt/tts、models、health（结构统一）
  - 性能与可靠性：httpx 连接池、超时/重试、GET/健康只读缓存（短 TTL，禁隐私）
- Frontend
  - 桌面识别/患者 Intake 流升级到 v2（严格 JSON，无回退/无硬编码）
  - 语音 STT/TTS 适配 v2

### Sprint C（后端：Agent/Tools/Config；治理增强）
- Backend
  - /v2/agent: login/workflows（分页）/invoke（SSE）/stop/health/config
  - /v2/tools: search（统一结果与错误码、缺 Key 提示）
  - /v2/config: get/get(key)/put(key)/validate；敏感字段遮蔽
  - 并发限流/熔断隔离（Provider 级）与指标/日志字段统一
- Frontend
  - Agent/Tools/Config 切换 v2；前端单测补齐

## 3. 变更合并与归档动作

- 合并到 refactor-api-v2-business（Vision 轨道）：
  - fix-desktop-recognition-vl-only-no-dialog
  - refactor-ai-image-settings-and-flows
  - add-patient-intake-ocr-extraction
- refactor-codebase-cleanup：剩余未完成项并入 “Sprints 收尾与迁移” 后归档。

（执行时序：先在对应 tasks.md 中添加“已合并到 …”标注与链接，然后将原变更移至 archive/）

## 4. 强化要求（适用于 v2 全域）

- 严格禁止回退/硬编码结果；严格 JSON 失败返回 no_result。
- 统一错误码与错误结构；对上游错误隐藏细节、记录内部日志。
- 统一健康检查与分页；SSE 事件帧标准化。
- 性能基线：连接池、超时/重试、只读缓存、并发限流；Provider 级隔离。
- 观测性：结构化日志（request_id/timestamp）、指标与可追踪性。

## 5. 里程碑验收

- M1（Sprint A）：/v2 基础与 AI 完成；前端可切换到 v2（AI）。
- M2（Sprint B）：Vision/Voice 完成；医疗 Intake 严格 JSON 上线。
- M3（Sprint C）：Agent/Tools/Config 完成；性能/观测性达标；发布迁移指南并标注 v1 废弃时间线。

