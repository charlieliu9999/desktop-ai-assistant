# 桌面AI助手服务架构重构方案

## 文档版本
- **版本**: v1.0
- **日期**: 2025-10-10
- **状态**: 待审核

---

## 一、现状分析

### 1.1 当前服务架构概览

#### 前端服务 (Electron Renderer/Main Process)
位于 `desktop-ai-assistant/src/services/`

| 服务名称 | 文件 | 运行位置 | 主要功能 | 依赖 |
|---------|------|---------|---------|------|
| AI对话服务 | ai.ts | Renderer | OpenAI/Claude API调用 | OpenAI SDK |
| 患者信息提取 | patient-info-extractor.ts | Renderer | OCR文本提取患者信息 | 后端API (部分) |
| 截图服务 | screenshot.ts | Main | 屏幕截图、窗口捕获 | Electron API |
| 语音服务 | voice.ts | Renderer | 语音识别、语音合成 | Web Speech API |
| 语音识别管理 | voice-recognition.ts | Renderer | 多模型语音识别 | Browser/Whisper/FunASR |
| Bisheng智能体 | bisheng.ts | Main | 智能体平台集成 | HTTP Proxy |
| 医疗系统集成 | medical-integration.ts | Main | RIS/PACS/HIS对接 | HTTP Client |
| 桌面识别 | desktop-recognition.ts | Main | OCR文字识别 | Tesseract.js |
| 网络搜索 | web-search.ts | Renderer | Google/Bing搜索 | HTTP Client |
| 配置管理 | config.ts | Main | 应用配置存储 | electron-store |
| 聊天持久化 | chat-persistence.ts | Main | 对话历史存储 | File System |
| 快捷键管理 | shortcut.ts | Main | 全局快捷键 | Electron API |
| 健康检查 | service-health-checker.ts | Main | 服务状态监控 | - |

#### 后端服务 (FastAPI)
位于 `desktop-ai-assistant/backend-service/`

| API路由 | 文件 | 功能 | 状态 |
|--------|------|------|------|
| /api/patients | patients.py | 患者管理 | ✅ 已实现 |
| /api/recommendations | recommendations.py | 智能推荐 | ✅ 已实现 |
| /api/ai | ai_chat.py | AI问答 | ✅ 已实现 |
| /api/local-ai | local_ai.py | 本地AI服务 | ✅ 已实现 |
| /api/model-config | model_config.py | 模型配置 | ✅ 已实现 |
| /api/patient-extraction | patient_extraction.py | 患者信息提取 | ✅ 已实现 |
| /api/bisheng | bisheng.py | Bisheng集成 | ✅ 已实现 |

### 1.2 架构问题分析

#### 问题1: 服务分散，职责不清
- **现象**: AI对话、OCR识别、患者提取等业务逻辑分散在前端
- **影响**: 
  - 前端代码臃肿，维护困难
  - 业务逻辑与UI耦合
  - 难以进行单元测试
  - 无法复用服务能力

#### 问题2: API密钥暴露风险
- **现象**: OpenAI/Claude API密钥存储在前端配置
- **影响**: 
  - 安全风险高
  - 密钥可能被提取
  - 无法统一管理API调用

#### 问题3: 缺乏统一的服务管理
- **现象**: 每个服务独立初始化和管理
- **影响**: 
  - 服务状态难以监控
  - 错误处理不统一
  - 缺乏服务降级和熔断机制

#### 问题4: 性能和资源问题
- **现象**: 大模型调用、OCR处理在前端执行
- **影响**: 
  - 占用前端资源
  - 影响UI响应性
  - 无法利用服务器GPU加速

#### 问题5: 扩展性受限
- **现象**: 新增AI模型或服务需要修改前端代码
- **影响**: 
  - 发布周期长
  - 无法动态配置
  - 难以支持多租户

### 1.3 已有基础设施

#### 优势
1. ✅ 后端FastAPI框架已搭建
2. ✅ 已实现部分API（患者提取、AI推荐）
3. ✅ 已有多场景模型配置系统
4. ✅ 已有AI服务管理器（local/cloud/hybrid模式）
5. ✅ 已有健康检查机制
6. ✅ 已有日志系统（Loguru）
7. ✅ 已有CORS配置

#### 待完善
1. ❌ 缺少语音服务API
2. ❌ 缺少OCR服务API
3. ❌ 缺少网络搜索API
4. ❌ 缺少统一的API网关
5. ❌ 缺少服务编排能力
6. ❌ 缺少用户认证和权限管理
7. ❌ 缺少服务监控和告警

---

## 二、重构目标

### 2.1 核心目标
1. **前后端分离**: 将业务逻辑从前端迁移到后端
2. **服务统一**: 建立统一的API服务层
3. **安全增强**: API密钥和敏感数据后端管理
4. **性能优化**: 利用服务器资源处理计算密集任务
5. **可扩展性**: 支持动态配置和服务扩展

### 2.2 非功能性目标
1. **高可用**: 服务降级、熔断、重试机制
2. **可观测**: 完善的日志、监控、追踪
3. **易维护**: 清晰的代码结构和文档
4. **向后兼容**: 渐进式迁移，不影响现有功能

---

## 三、重构方案设计

### 3.1 目标架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Desktop App                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Main Process │  │   Renderer   │  │   Preload    │      │
│  │              │  │              │  │              │      │
│  │ - 窗口管理   │  │ - UI组件     │  │ - IPC Bridge │      │
│  │ - 系统集成   │  │ - 状态管理   │  │ - API Client │      │
│  │ - 快捷键     │  │ - 用户交互   │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
│         └─────────────────┴─────────────────┘              │
│                           │                                │
└───────────────────────────┼────────────────────────────────┘
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API Gateway                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Unified API Service Layer                │  │
│  │  - 认证/授权  - 限流  - 日志  - 监控  - 熔断         │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                │
│  ┌────────────┬───────────┼───────────┬──────────────┐    │
│  ▼            ▼           ▼           ▼              ▼    │
│ ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐    │
│ │ AI   │  │ OCR  │  │Voice │  │Search│  │ Medical  │    │
│ │Service│  │Service│  │Service│  │Service│  │Integration│    │
│ └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └────┬─────┘    │
│    │         │         │         │           │          │
│    ▼         ▼         ▼         ▼           ▼          │
│ ┌──────────────────────────────────────────────────────┐  │
│ │           Service Infrastructure Layer               │  │
│ │  - 配置管理  - 缓存  - 队列  - 存储  - 日志          │  │
│ └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ OpenAI   │  │ Ollama   │  │ Bisheng  │  │ RIS/PACS │   │
│  │   API    │  │  Local   │  │ Platform │  │   HIS    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 服务迁移规划

#### 第一阶段: 核心AI服务迁移 (优先级: 高)
**目标**: 将AI对话、患者信息提取迁移到后端

| 服务 | 迁移内容 | 新API端点 | 保留前端 |
|------|---------|----------|---------|
| AI对话 | OpenAI/Claude调用 | POST /api/ai/chat | 状态管理、UI |
| AI对话流式 | 流式响应 | POST /api/ai/chat/stream | WebSocket处理 |
| 患者提取 | 图像识别+信息提取 | POST /api/patient/extract | 图像预处理 |
| 智能推荐 | 检查/用药/诊断推荐 | POST /api/recommendations/generate | 结果展示 |

#### 第二阶段: OCR和图像服务 (优先级: 高)
**目标**: 统一图像处理能力

| 服务 | 迁移内容 | 新API端点 | 保留前端 |
|------|---------|----------|---------|
| OCR识别 | Tesseract.js处理 | POST /api/ocr/recognize | 图像采集 |
| 桌面识别 | 屏幕内容分析 | POST /api/desktop/analyze | 截图触发 |
| 图像压缩 | 图像预处理 | POST /api/image/compress | - |

#### 第三阶段: 语音服务 (优先级: 中)
**目标**: 提供统一的语音能力

| 服务 | 迁移内容 | 新API端点 | 保留前端 |
|------|---------|----------|---------|
| 语音识别 | Whisper/FunASR | POST /api/voice/recognize | 音频采集 |
| 语音合成 | TTS服务 | POST /api/voice/synthesize | 音频播放 |
| 语音唤醒 | 关键词检测 | WebSocket /api/voice/wakeword | 本地检测 |

#### 第四阶段: 智能体和集成服务 (优先级: 中)
**目标**: 统一外部服务集成

| 服务 | 迁移内容 | 新API端点 | 保留前端 |
|------|---------|----------|---------|
| Bisheng集成 | 工作流调用 | POST /api/bisheng/invoke | iframe展示 |
| 医疗系统集成 | RIS/PACS/HIS | GET /api/medical/* | 数据展示 |
| 网络搜索 | Google/Bing | POST /api/search/web | 结果展示 |

#### 第五阶段: 配置和管理服务 (优先级: 低)
**目标**: 集中配置管理

| 服务 | 迁移内容 | 新API端点 | 保留前端 |
|------|---------|----------|---------|
| 配置管理 | 用户配置 | GET/PUT /api/config/* | 本地缓存 |
| 聊天持久化 | 对话历史 | GET/POST /api/chat/history | 本地缓存 |
| 健康检查 | 服务状态 | GET /api/health/* | 状态展示 |

### 3.3 新旧架构对比

#### 旧架构 (当前)
```typescript
// 前端直接调用OpenAI
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${apiKey}` }, // ❌ 密钥暴露
  body: JSON.stringify({ messages })
});
```

#### 新架构 (目标)
```typescript
// 前端调用后端API
const response = await fetch('http://localhost:8010/api/ai/chat', {
  headers: { 'Authorization': `Bearer ${userToken}` }, // ✅ 用户令牌
  body: JSON.stringify({ messages })
});
```

---

## 四、技术方案

### 4.1 后端技术栈

#### 核心框架
- **FastAPI 0.109+**: 高性能异步Web框架
- **Uvicorn**: ASGI服务器
- **Pydantic**: 数据验证和序列化

#### 数据存储
- **PostgreSQL 15+**: 主数据库（患者、配置、历史）
- **Redis 7+**: 缓存和会话存储
- **MinIO/S3**: 对象存储（图像、音频）

#### AI/ML服务
- **OpenAI SDK**: 云端大模型
- **Ollama**: 本地大模型
- **Tesseract**: OCR引擎
- **Whisper**: 语音识别
- **Deepseek API**: 医疗推荐

#### 服务治理
- **Celery**: 异步任务队列
- **APScheduler**: 定时任务
- **Circuit Breaker**: 熔断器
- **Rate Limiter**: 限流器

### 4.2 API设计规范

#### RESTful API设计
```
POST   /api/v1/ai/chat                    # AI对话
POST   /api/v1/ai/chat/stream             # 流式对话
POST   /api/v1/ocr/recognize              # OCR识别
POST   /api/v1/voice/recognize            # 语音识别
POST   /api/v1/voice/synthesize           # 语音合成
POST   /api/v1/patient/extract            # 患者信息提取
POST   /api/v1/recommendations/generate   # 生成推荐
GET    /api/v1/config/{key}               # 获取配置
PUT    /api/v1/config/{key}               # 更新配置
GET    /api/v1/health                     # 健康检查
```

#### WebSocket API设计
```
WS     /api/v1/ws/ai/chat                 # 实时对话
WS     /api/v1/ws/voice/stream            # 语音流
WS     /api/v1/ws/notifications           # 通知推送
```

#### 统一响应格式
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2025-10-10T12:00:00Z",
  "request_id": "uuid"
}
```

### 4.3 前端适配方案

#### API客户端封装
```typescript
// desktop-ai-assistant/src/services/api-client.ts
class APIClient {
  private baseURL = 'http://localhost:8010/api/v1';
  private token: string | null = null;

  async request(endpoint: string, options: RequestOptions) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return this.handleResponse(response);
  }

  // AI服务
  async chatCompletion(messages: Message[]) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages })
    });
  }

  // OCR服务
  async recognizeText(imageData: string) {
    return this.request('/ocr/recognize', {
      method: 'POST',
      body: JSON.stringify({ image_data: imageData })
    });
  }
}
```

#### 服务适配器模式
```typescript
// desktop-ai-assistant/src/services/ai-adapter.ts
export class AIServiceAdapter {
  private useBackend: boolean = true; // 配置开关
  private legacyService: AIService;
  private apiClient: APIClient;

  async processMessage(message: string): Promise<string> {
    if (this.useBackend) {
      // 新实现：调用后端API
      const response = await this.apiClient.chatCompletion([
        { role: 'user', content: message }
      ]);
      return response.data.content;
    } else {
      // 旧实现：前端直接调用
      return this.legacyService.processMessage(message);
    }
  }
}
```

### 4.4 配置管理方案

#### 后端配置系统
```python
# backend-service/app/config.py
class Settings(BaseSettings):
    # 服务配置
    APP_NAME: str = "AI医疗助手后端服务"
    APP_VERSION: str = "2.0.0"
    
    # AI模型配置（支持动态配置）
    AI_MODELS: Dict[str, ModelConfig] = {
        "chat": {
            "provider": "openai",  # openai | ollama | deepseek
            "model": "gpt-4",
            "base_url": "https://api.openai.com/v1",
            "api_key": "${OPENAI_API_KEY}",
            "temperature": 0.7,
            "max_tokens": 2000
        },
        "vision": {
            "provider": "ollama",
            "model": "qwen2.5vl:latest",
            "base_url": "http://localhost:11434",
            "temperature": 0.1
        }
    }
    
    # 服务开关
    FEATURES: Dict[str, bool] = {
        "ai_chat": True,
        "ocr": True,
        "voice": True,
        "bisheng": True,
        "medical_integration": True
    }
```

#### 前端配置同步
```typescript
// 前端从后端获取配置
const config = await apiClient.getConfig();
```

---

## 五、实施计划

### 5.1 分阶段路线图

#### 阶段0: 准备工作 (1周)
- [ ] 完善后端项目结构
- [ ] 建立API文档规范
- [ ] 搭建测试环境
- [ ] 制定代码规范

#### 阶段1: 核心AI服务迁移 (2周)
- [ ] 实现AI对话API
- [ ] 实现流式响应
- [ ] 实现患者信息提取API
- [ ] 前端适配器开发
- [ ] 单元测试和集成测试

#### 阶段2: OCR和图像服务 (1.5周)
- [ ] 实现OCR识别API
- [ ] 实现图像预处理API
- [ ] 实现桌面识别API
- [ ] 前端适配
- [ ] 测试验证

#### 阶段3: 语音服务 (2周)
- [ ] 实现语音识别API
- [ ] 实现语音合成API
- [ ] WebSocket实时通信
- [ ] 前端适配
- [ ] 性能优化

#### 阶段4: 智能体和集成服务 (1.5周)
- [ ] 完善Bisheng集成API
- [ ] 实现医疗系统集成API
- [ ] 实现网络搜索API
- [ ] 前端适配
- [ ] 测试验证

#### 阶段5: 配置和管理服务 (1周)
- [ ] 实现配置管理API
- [ ] 实现聊天历史API
- [ ] 实现健康检查API
- [ ] 前端适配
- [ ] 完整测试

#### 阶段6: 优化和上线 (1周)
- [ ] 性能优化
- [ ] 安全加固
- [ ] 文档完善
- [ ] 生产部署
- [ ] 监控告警

**总计**: 约10周

### 5.2 风险评估

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| API性能不足 | 高 | 中 | 缓存、异步处理、CDN |
| 服务不稳定 | 高 | 中 | 熔断、降级、重试 |
| 数据迁移问题 | 中 | 低 | 渐进式迁移、双写 |
| 前端兼容性 | 中 | 中 | 适配器模式、开关控制 |
| 安全漏洞 | 高 | 低 | 安全审计、渗透测试 |

### 5.3 测试策略

#### 单元测试
- 后端服务单元测试覆盖率 > 80%
- 前端适配器单元测试

#### 集成测试
- API端到端测试
- 前后端集成测试

#### 性能测试
- 压力测试（1000并发）
- 响应时间 < 500ms (P95)

#### 安全测试
- API安全扫描
- 渗透测试

---

## 六、关键技术决策

### 6.1 为什么选择FastAPI？
- ✅ 高性能（基于Starlette和Pydantic）
- ✅ 原生异步支持
- ✅ 自动生成API文档
- ✅ 类型安全
- ✅ 已有基础设施

### 6.2 为什么采用渐进式迁移？
- ✅ 降低风险
- ✅ 保证业务连续性
- ✅ 便于回滚
- ✅ 团队学习曲线平滑

### 6.3 为什么使用适配器模式？
- ✅ 新旧实现隔离
- ✅ 支持配置切换
- ✅ 便于A/B测试
- ✅ 降低耦合

### 6.4 为什么需要API网关？
- ✅ 统一认证授权
- ✅ 限流和熔断
- ✅ 日志和监控
- ✅ 协议转换

---

## 七、附录

### 7.1 参考文档
- [FastAPI官方文档](https://fastapi.tiangolo.com/)
- [Electron IPC通信](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [微服务架构模式](https://microservices.io/patterns/)

### 7.2 相关Issue
- 待创建

### 7.3 变更历史
| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|---------|
| v1.0 | 2025-10-10 | AI Assistant | 初始版本 |

---

**下一步**: 请审核本方案，确认后将创建详细的任务清单和实施文档。

