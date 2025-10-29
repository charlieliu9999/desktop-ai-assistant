# OpenSpec 修订计划

**日期**: 2025-10-29  
**基于**: AUDIT_REPORT_2025-10-29.md + OPTIMIZATION_RECOMMENDATIONS_2025-10-29.md  
**目标**: 分阶段修复问题，实现v2 API

---

## 总体时间线

| 阶段 | 时间 | 工作量 | 关键里程碑 |
|------|------|--------|-----------|
| 阶段1：紧急修复 | 1-2周 | 40-80小时 | v1响应统一、敏感数据保护 |
| 阶段2：v2骨架 | 2-3周 | 80-120小时 | v2基础端点可用 |
| 阶段3：性能和可靠性 | 2-3周 | 80-120小时 | 限流、缓存、重试完成 |
| 阶段4：业务域完善 | 3-4周 | 120-160小时 | 所有v2端点完整实现 |
| 阶段5：前端适配 | 2-3周 | 80-120小时 | 前端完全切换到v2 |
| **总计** | **10-15周** | **400-600小时** | **v2全面上线** |

---

## 阶段1：紧急修复（P0问题）

**时间**: 1-2周  
**工作量**: 40-80小时  
**优先级**: P0 - 必须立即执行

### 1.1 统一v1响应结构

**目标**: 修复健康检查端点的响应格式不一致问题

**任务清单**:
- [ ] 创建统一的`HealthResponse`模型（4小时）
  - 文件: `backend-service/app/models/health.py`
  - 包含: `ServiceHealth`, `HealthResponse`
  
- [ ] 修改AI健康检查端点（2小时）
  - 文件: `backend-service/app/api/v1/ai.py`
  - 修改: `GET /health` 返回统一格式
  
- [ ] 修改Vision健康检查端点（2小时）
  - 文件: `backend-service/app/api/v1/vision.py`
  - 修改: `GET /health` 返回统一格式
  
- [ ] 修改Voice健康检查端点（2小时）
  - 文件: `backend-service/app/api/v1/voice.py`
  - 修改: `GET /health` 返回统一格式
  
- [ ] 修改Agent健康检查端点（2小时）
  - 文件: `backend-service/app/api/v1/agent.py`
  - 修改: `GET /health` 返回统一格式
  
- [ ] 添加向后兼容警告头（2小时）
  - 添加: `X-Deprecated-Fields`, `X-Sunset`
  
- [ ] 测试所有健康检查端点（4小时）
  - 验证响应格式一致性
  - 验证向后兼容性

**验收标准**:
- ✅ 所有健康检查端点返回 `{success, data: {services: {...}}, meta}`
- ✅ 响应头包含 `X-Deprecated-Fields` 警告
- ✅ 前端可以正常解析新格式
- ✅ 测试覆盖率 ≥ 90%

---

### 1.2 实现敏感字段遮蔽

**目标**: 防止配置API泄漏API key等敏感信息

**任务清单**:
- [ ] 创建敏感字段遮蔽工具（4小时）
  - 文件: `backend-service/app/core/security.py`
  - 函数: `is_sensitive_field()`, `mask_value()`, `mask_sensitive_data()`
  
- [ ] 修改配置API（2小时）
  - 文件: `backend-service/app/api/v1/config_api.py`
  - 应用遮蔽到 `GET /config` 和 `GET /config/{key}`
  
- [ ] 在日志中应用遮蔽（2小时）
  - 文件: `backend-service/app/main.py`
  - 添加日志过滤器
  
- [ ] 测试遮蔽功能（2小时）
  - 验证API key被正确遮蔽
  - 验证日志中不包含敏感信息

**验收标准**:
- ✅ 配置API返回的API key格式为 `sk-p...xyz`
- ✅ 日志中不包含完整的API key
- ✅ 遮蔽逻辑支持多种命名风格（api_key, apiKey, API_KEY）
- ✅ 测试覆盖率 ≥ 95%

---

### 1.3 实现request_id中间件

**目标**: 为所有请求自动生成request_id，支持分布式追踪

**任务清单**:
- [ ] 创建request_id中间件（4小时）
  - 文件: `backend-service/app/middleware/request_id.py`
  - 类: `RequestIDMiddleware`
  - 函数: `get_request_id()`
  
- [ ] 注册中间件（1小时）
  - 文件: `backend-service/app/main.py`
  - 在CORS之后添加
  
- [ ] 配置日志包含request_id（2小时）
  - 修改日志格式
  - 添加ContextVar支持
  
- [ ] 在所有API响应中包含request_id（4小时）
  - 修改所有端点的meta字段
  - 使用 `get_request_id()` 自动获取
  
- [ ] 测试request_id传播（2小时）
  - 验证请求头 → ContextVar → 响应头
  - 验证日志包含request_id

**验收标准**:
- ✅ 所有请求自动生成request_id
- ✅ 响应头包含 `X-Request-ID`
- ✅ 日志包含request_id字段
- ✅ 支持客户端传入request_id
- ✅ 测试覆盖率 ≥ 90%

---

### 1.4 实现并发限流保护

**目标**: 防止服务被打垮，保护上游Provider

**任务清单**:
- [ ] 创建限流器（8小时）
  - 文件: `backend-service/app/core/rate_limiter.py`
  - 类: `RateLimiter`
  - 功能: 全局并发、Provider并发、速率限制
  
- [ ] 在AI端点应用限流（2小时）
  - 文件: `backend-service/app/api/v1/ai.py`
  - 端点: `/chat`, `/chat/stream`, `/analyze`
  
- [ ] 在Vision端点应用限流（2小时）
  - 文件: `backend-service/app/api/v1/vision.py`
  - 端点: `/understand`, `/ocr`, `/extract-text`
  
- [ ] 在Voice端点应用限流（2小时）
  - 文件: `backend-service/app/api/v1/voice.py`
  - 端点: `/stt`, `/tts`
  
- [ ] 配置限流参数（2小时）
  - 文件: `backend-service/app/config.py`
  - 添加: `MAX_CONCURRENT`, `MAX_PER_MINUTE`, `PROVIDER_MAX_CONCURRENT`
  
- [ ] 测试限流功能（4小时）
  - 验证并发限制
  - 验证速率限制
  - 验证429错误响应

**验收标准**:
- ✅ 全局并发限制生效（默认100）
- ✅ Provider并发限制生效（默认10）
- ✅ 速率限制生效（默认1000/分钟）
- ✅ 超限返回429错误
- ✅ 测试覆盖率 ≥ 85%

---

### 1.5 审查并修复严格JSON策略

**目标**: 确保Vision服务的严格JSON实现完整且正确

**任务清单**:
- [ ] 添加jsonschema依赖（1小时）
  - 文件: `backend-service/requirements.txt`
  - 添加: `jsonschema>=4.20.0`
  
- [ ] 创建JSON验证器（6小时）
  - 文件: `backend-service/app/core/json_validator.py`
  - 类: `StrictJSONValidator`
  - 预定义schema: `patient_info_v1`
  
- [ ] 在Vision端点应用验证（4小时）
  - 文件: `backend-service/app/api/v1/vision.py`
  - 端点: `/understand`, `/extract-text`
  - 验证strict_json参数
  
- [ ] 审查Vision服务实现（4小时）
  - 文件: `backend-service/app/services/vision_service.py`
  - 确保没有回退逻辑
  - 确保没有硬编码默认值
  
- [ ] 统一no_result错误码（2小时）
  - 文件: `backend-service/app/core/errors.py`
  - 添加: `NoResultError`
  
- [ ] 测试严格JSON功能（4小时）
  - 验证成功场景
  - 验证失败返回no_result（HTTP 200）
  - 验证schema验证

**验收标准**:
- ✅ 严格JSON失败返回 `{success: false, error: {code: "no_result", ...}}`
- ✅ HTTP状态码为200（不是400或500）
- ✅ 没有回退到OCR+LLM
- ✅ 没有硬编码默认值
- ✅ 测试覆盖率 ≥ 90%

---

## 阶段2：v2骨架实现

**时间**: 2-3周  
**工作量**: 80-120小时  
**优先级**: P0 - 阻塞后续工作

### 2.1 创建v2目录结构

**任务清单**:
- [ ] 创建v2 API目录（2小时）
  ```
  backend-service/app/api/v2/
  ├── __init__.py
  ├── dependencies.py
  ├── ai.py
  ├── vision.py
  ├── voice.py
  ├── agent.py
  ├── registry.py
  ├── config.py
  └── tools.py
  ```

- [ ] 创建v2模型目录（2小时）
  ```
  backend-service/app/models/v2/
  ├── __init__.py
  ├── common.py      # Envelope, Error, Meta
  ├── ai.py
  ├── vision.py
  ├── voice.py
  ├── agent.py
  ├── registry.py
  ├── config.py
  └── tools.py
  ```

- [ ] 创建v2测试目录（2小时）
  ```
  backend-service/tests/api/v2/
  ├── __init__.py
  ├── test_ai.py
  ├── test_vision.py
  └── ...
  ```

**验收标准**:
- ✅ 目录结构符合规范
- ✅ 所有__init__.py文件存在
- ✅ 导入路径正确

---

### 2.2 实现统一响应模型

**任务清单**:
- [ ] 创建通用模型（8小时）
  - 文件: `backend-service/app/models/v2/common.py`
  - 模型: `Meta`, `Error`, `Envelope[T]`
  - 模型: `PaginationMeta`, `HealthResponse`
  
- [ ] 创建SSE事件模型（4小时）
  - 文件: `backend-service/app/models/v2/sse.py`
  - 模型: `SSEEvent`
  - 方法: `to_sse_format()`
  
- [ ] 测试模型序列化（4小时）
  - 验证Pydantic v2兼容性
  - 验证JSON序列化
  - 验证泛型支持

**验收标准**:
- ✅ Envelope支持泛型
- ✅ Meta包含timestamp、version、request_id
- ✅ Error包含code、message、details
- ✅ 测试覆盖率 ≥ 95%

---

### 2.3 实现各域基础端点

**任务清单**:

#### AI域（8小时）
- [ ] 创建AI模型
  - 文件: `backend-service/app/models/v2/ai.py`
  - 模型: `ChatRequest`, `ChatResponse`, `AnalyzeRequest`, `AnalyzeResponse`
  
- [ ] 实现AI端点
  - 文件: `backend-service/app/api/v2/ai.py`
  - 端点: `POST /chat`, `POST /chat/stream`, `POST /analyze`, `GET /health`
  
- [ ] 测试AI端点（4小时）

#### Vision域（8小时）
- [ ] 创建Vision模型
  - 文件: `backend-service/app/models/v2/vision.py`
  - 模型: `UnderstandRequest`, `OCRRequest`, `ExtractRequest`
  
- [ ] 实现Vision端点
  - 文件: `backend-service/app/api/v2/vision.py`
  - 端点: `POST /understand`, `POST /ocr`, `POST /extract-text`, `GET /health`
  
- [ ] 测试Vision端点（4小时）

#### Voice域（8小时）
- [ ] 创建Voice模型
  - 文件: `backend-service/app/models/v2/voice.py`
  - 模型: `STTRequest`, `TTSRequest`
  
- [ ] 实现Voice端点
  - 文件: `backend-service/app/api/v2/voice.py`
  - 端点: `POST /stt`, `POST /tts`, `GET /health`
  
- [ ] 测试Voice端点（4小时）

#### Agent域（8小时）
- [ ] 创建Agent模型
  - 文件: `backend-service/app/models/v2/agent.py`
  - 模型: `LoginRequest`, `InvokeRequest`
  
- [ ] 实现Agent端点
  - 文件: `backend-service/app/api/v2/agent.py`
  - 端点: `POST /login`, `POST /invoke`, `GET /workflows`, `GET /health`
  
- [ ] 测试Agent端点（4小时）

#### Registry域（6小时）
- [ ] 创建Registry模型
  - 文件: `backend-service/app/models/v2/registry.py`
  - 模型: `Provider`, `Model`
  
- [ ] 实现Registry端点
  - 文件: `backend-service/app/api/v2/registry.py`
  - 端点: `GET /providers`, `GET /models`, `GET /health`
  
- [ ] 测试Registry端点（3小时）

#### Config域（6小时）
- [ ] 创建Config模型
  - 文件: `backend-service/app/models/v2/config.py`
  - 模型: `ConfigItem`
  
- [ ] 实现Config端点
  - 文件: `backend-service/app/api/v2/config.py`
  - 端点: `GET /`, `GET /{key}`, `GET /health`
  - 应用敏感字段遮蔽
  
- [ ] 测试Config端点（3小时）

#### Tools域（6小时）
- [ ] 创建Tools模型
  - 文件: `backend-service/app/models/v2/tools.py`
  - 模型: `SearchRequest`, `SearchResponse`
  
- [ ] 实现Tools端点
  - 文件: `backend-service/app/api/v2/tools.py`
  - 端点: `POST /search`, `GET /health`
  
- [ ] 测试Tools端点（3小时）

**验收标准**:
- ✅ 所有端点返回统一的Envelope格式
- ✅ 所有端点包含request_id
- ✅ 所有健康检查端点格式一致
- ✅ 测试覆盖率 ≥ 80%

---

### 2.4 挂载v2路由

**任务清单**:
- [ ] 创建v2路由器（2小时）
  - 文件: `backend-service/app/api/v2/__init__.py`
  - 聚合所有子路由
  
- [ ] 在main.py中挂载（2小时）
  - 文件: `backend-service/app/main.py`
  - 添加: `app.include_router(v2.router, prefix="/api/v2")`
  
- [ ] 添加版本协商中间件（4小时）
  - 支持URL路径、Accept头、X-API-Version头
  
- [ ] 测试路由（2小时）
  - 验证v1和v2并存
  - 验证版本协商

**验收标准**:
- ✅ `/api/v1` 和 `/api/v2` 都可访问
- ✅ 版本协商正确
- ✅ 响应头包含 `X-API-Version`

---

### 2.5 更新文档

**任务清单**:
- [ ] 更新API文档（4小时）
  - 文件: `docs/API_V2.md`
  - 包含所有端点定义
  
- [ ] 更新迁移指南（4小时）
  - 文件: `docs/MIGRATION_V1_TO_V2.md`
  - 包含差异对比和迁移步骤
  
- [ ] 更新OpenAPI规范（4小时）
  - FastAPI自动生成
  - 验证Swagger UI

**验收标准**:
- ✅ 文档完整且准确
- ✅ Swagger UI可访问
- ✅ 示例代码可运行

---

## 阶段3：性能和可靠性

**时间**: 2-3周  
**工作量**: 80-120小时  
**优先级**: P1 - 生产必需

### 3.1 实现HTTP连接池

**任务清单**:
- [ ] 创建HTTP客户端管理器（8小时）
  - 文件: `backend-service/app/core/http_client.py`
  - 类: `HTTPClientManager`
  - 配置: 连接池、超时、HTTP/2
  
- [ ] 在所有Provider中使用（8小时）
  - 修改: `OpenAIProvider`, `DeepseekProvider`, `OllamaProvider`, `DashScopeProvider`
  - 替换独立的httpx.AsyncClient
  
- [ ] 在应用生命周期中管理（2小时）
  - 文件: `backend-service/app/main.py`
  - 启动时初始化，关闭时清理
  
- [ ] 测试连接池（4小时）
  - 验证连接复用
  - 验证并发性能

**验收标准**:
- ✅ 所有HTTP请求使用全局连接池
- ✅ 连接数限制生效
- ✅ 性能提升 ≥ 30%
- ✅ 测试覆盖率 ≥ 85%

---

### 3.2 实现统一的超时和重试

**任务清单**:
- [ ] 创建重试装饰器（8小时）
  - 文件: `backend-service/app/core/retry.py`
  - 函数: `with_retry()`
  - 策略: 指数退避、随机抖动
  
- [ ] 在Provider中应用（8小时）
  - 为所有Provider方法添加@with_retry
  
- [ ] 配置超时参数（2小时）
  - 文件: `backend-service/app/config.py`
  - 添加: `HTTP_TIMEOUT`, `MAX_RETRIES`, `RETRY_DELAY`
  
- [ ] 测试重试逻辑（4小时）
  - 验证可重试错误
  - 验证不可重试错误
  - 验证指数退避

**验收标准**:
- ✅ 临时故障自动重试
- ✅ 最大重试3次
- ✅ 指数退避生效
- ✅ 测试覆盖率 ≥ 90%

---

### 3.3 实现缓存机制

**任务清单**:
- [ ] 创建缓存管理器（8小时）
  - 文件: `backend-service/app/core/cache.py`
  - 类: `SimpleCache`
  - 装饰器: `@cached()`
  
- [ ] 在GET端点应用缓存（8小时）
  - 健康检查: 30秒
  - Provider列表: 5分钟
  - 模型列表: 5分钟
  - 配置: 1分钟
  
- [ ] 实现缓存失效（4小时）
  - 定期清理过期缓存
  - 手动清除缓存API
  
- [ ] 测试缓存功能（4小时）
  - 验证缓存命中
  - 验证TTL过期
  - 验证缓存清除

**验收标准**:
- ✅ 缓存命中率 ≥ 60%
- ✅ 响应时间减少 ≥ 50%
- ✅ 过期缓存自动清理
- ✅ 测试覆盖率 ≥ 85%

---

### 3.4 实现熔断器（可选）

**任务清单**:
- [ ] 配置circuitbreaker库（4小时）
  - 已在requirements.txt中
  - 配置: 失败阈值、恢复时间
  
- [ ] 在Provider中应用（8小时）
  - 为每个Provider添加熔断器
  
- [ ] 测试熔断功能（4小时）
  - 验证熔断触发
  - 验证自动恢复

**验收标准**:
- ✅ Provider故障时熔断
- ✅ 恢复时间后自动重试
- ✅ 测试覆盖率 ≥ 80%

---

## 阶段4：业务域完善

**时间**: 3-4周  
**工作量**: 120-160小时  
**优先级**: P1 - 功能完整性

### 4.1 补充详细规范

**任务清单**:
- [ ] 更新AI域规范（8小时）
  - 文件: `openspec/changes/refactor-api-v2-business/specs/ai/spec.md`
  - 补充: 详细schema、错误码、性能要求
  
- [ ] 更新Vision域规范（8小时）
  - 文件: `openspec/changes/refactor-api-v2-business/specs/vision/spec.md`
  - 补充: 图像格式、大小限制、OCR语言
  
- [ ] 更新Voice域规范（8小时）
  - 文件: `openspec/changes/refactor-api-v2-business/specs/voice/spec.md`
  - 补充: 音频格式、采样率、语言代码
  
- [ ] 更新Agent域规范（8小时）
  - 文件: `openspec/changes/refactor-api-v2-business/specs/agent/spec.md`
  - 补充: 工作流定义、SSE事件
  
- [ ] 更新Registry/Config/Tools规范（8小时）
  - 补充详细定义

**验收标准**:
- ✅ 所有规范包含详细schema
- ✅ 所有规范包含完整错误码列表
- ✅ 所有规范包含性能和安全要求

---

### 4.2 实现完整的v2端点

**任务清单**:
- [ ] 实现AI域完整功能（20小时）
  - 场景注入
  - 多模型支持
  - 流式输出优化
  
- [ ] 实现Vision域完整功能（20小时）
  - 多种图像格式支持
  - OCR多语言支持
  - 严格JSON完整实现
  
- [ ] 实现Voice域完整功能（15小时）
  - 多种音频格式支持
  - TTS音色/语速控制
  
- [ ] 实现Agent域完整功能（15小时）
  - 工作流管理
  - SSE流式调用
  - 配置管理
  
- [ ] 实现Registry/Config/Tools完整功能（10小时）

**验收标准**:
- ✅ 所有端点功能完整
- ✅ 所有端点符合规范
- ✅ 测试覆盖率 ≥ 85%

---

## 阶段5：前端适配

**时间**: 2-3周  
**工作量**: 80-120小时  
**优先级**: P1 - 用户体验

### 5.1 创建v2 API客户端

**任务清单**:
- [ ] 创建APIClient类（8小时）
  - 文件: `src/services/api-client.ts`
  - 支持v1和v2
  
- [ ] 创建各域适配器（16小时）
  - `ai-adapter-v2.ts`
  - `vision-adapter-v2.ts`
  - `voice-adapter-v2.ts`
  - `agent-adapter-v2.ts`
  
- [ ] 测试API客户端（8小时）

**验收标准**:
- ✅ 支持v1和v2切换
- ✅ 统一错误处理
- ✅ 测试覆盖率 ≥ 80%

---

### 5.2 添加配置开关

**任务清单**:
- [ ] 添加API版本配置（4小时）
  - 文件: `src/stores/configStore.ts`
  - 字段: `apiVersion: '1' | '2'`
  
- [ ] 添加UI开关（4小时）
  - 设置页面添加版本切换
  
- [ ] 测试版本切换（4小时）

**验收标准**:
- ✅ 可以动态切换v1/v2
- ✅ 切换后立即生效

---

### 5.3 迁移前端组件

**任务清单**:
- [ ] 迁移AI对话组件（8小时）
- [ ] 迁移Vision组件（8小时）
- [ ] 迁移Voice组件（8小时）
- [ ] 迁移Agent组件（8小时）
- [ ] 测试所有组件（16小时）

**验收标准**:
- ✅ 所有组件支持v2
- ✅ 功能完整
- ✅ 测试覆盖率 ≥ 75%

---

## 需要修订的文档列表

### 高优先级（阶段1-2）

1. **`openspec/changes/api-v2-standardization/tasks.md`**
   - 更新任务状态
   - 添加阶段1-2的具体任务
   
2. **`openspec/changes/refactor-api-v2-business/tasks.md`**
   - 更新任务状态
   - 添加各域实现任务
   
3. **`openspec/changes/refactor-api-v2-business/specs/common/spec.md`**
   - 补充详细的错误码列表
   - 补充meta字段定义
   - 补充性能要求

4. **`backend-service/README.md`**
   - 添加v2 API说明
   - 更新开发指南

### 中优先级（阶段3-4）

5. **`openspec/changes/refactor-api-v2-business/specs/ai/spec.md`**
   - 补充详细schema
   - 补充ChatOptions完整字段
   - 补充场景注入规范

6. **`openspec/changes/refactor-api-v2-business/specs/vision/spec.md`**
   - 补充图像格式定义
   - 补充大小限制
   - 补充OCR语言列表

7. **`openspec/changes/refactor-api-v2-business/specs/voice/spec.md`**
   - 补充音频格式定义
   - 补充语言代码标准
   - 补充TTS参数

8. **`openspec/changes/refactor-api-v2-business/specs/agent/spec.md`**
   - 补充工作流定义
   - 补充SSE事件详细结构

9. **`openspec/changes/refactor-api-v2-business/specs/registry/spec.md`**
   - 补充Provider/Model schema

10. **`openspec/changes/refactor-api-v2-business/specs/config/spec.md`**
    - 补充敏感字段遮蔽规范

11. **`openspec/changes/refactor-api-v2-business/specs/tools/spec.md`**
    - 补充搜索参数定义

### 低优先级（阶段5）

12. **`docs/API_V2.md`** (新建)
    - v2 API完整文档

13. **`docs/MIGRATION_V1_TO_V2.md`** (新建)
    - 迁移指南

14. **`frontend/README.md`**
    - 更新v2适配说明

---

## 风险和依赖

### 风险

1. **时间风险**: 工作量估算可能不准确
   - 缓解: 每周评审进度，及时调整

2. **技术风险**: v2实现可能遇到未预见的问题
   - 缓解: 分阶段实施，及时反馈

3. **兼容性风险**: v1和v2并存可能导致冲突
   - 缓解: 充分测试，版本隔离

### 依赖

1. **阶段2依赖阶段1**: v2实现依赖基础设施完善
2. **阶段3依赖阶段2**: 性能优化依赖v2骨架
3. **阶段5依赖阶段4**: 前端适配依赖后端完成

---

## 下一步行动

1. **立即执行**: 启动阶段1紧急修复
2. **本周内**: 完成1.1-1.3任务
3. **下周**: 完成1.4-1.5任务，启动阶段2
4. **每周评审**: 检查进度，调整计划

---

**维护者**: 桌面AI助手开发团队  
**更新日期**: 2025-10-29

