# 调整后的实施计划

## 文档信息
- **版本**: v1.1 (调整版)
- **日期**: 2025-10-10
- **状态**: 执行中

---

## 一、确认的参数

### 1.1 资源和时间
- ✅ **人员配置**: 不限制（根据需要灵活调配）
- ✅ **时间安排**: 不限制（质量优先，不赶工期）
- ✅ **阶段顺序**: 由AI助手根据技术依赖和风险评估决定

### 1.2 技术栈
- ✅ **后端框架**: FastAPI
- ✅ **部署方案**: Docker
- ✅ **数据库**: PostgreSQL（新建，不保留现有数据）

### 1.3 必须保留的资产
1. **服务接口定义** - API接口签名、IPC通信接口
2. **配置方法** - 配置项、配置结构、环境变量
3. **前端设计** - UI组件、页面布局、交互流程
4. **业务逻辑** - 核心功能行为、用户使用习惯

---

## 二、调整后的实施顺序

基于技术依赖和风险评估，调整后的最优实施顺序：

### 优先级评估矩阵

| 阶段 | 技术依赖 | 业务价值 | 风险等级 | 优先级 |
|------|---------|---------|---------|--------|
| 阶段0: 准备工作 | 无 | 基础 | 低 | P0 (必须) |
| 阶段1: 核心AI服务 | 低 | 高 | 中 | P1 (最高) |
| 阶段2: 患者信息服务 | 依赖AI+OCR | 高 | 中 | P2 (高) |
| 阶段3: OCR服务 | 低 | 中 | 低 | P3 (中) |
| 阶段4: 配置管理 | 低 | 高 | 低 | P4 (中) |
| 阶段5: 智能体集成 | 低 | 中 | 低 | P5 (中低) |
| 阶段6: 语音服务 | 低 | 中 | 高 | P6 (低) |
| 阶段7: 医疗系统集成 | 低 | 低 | 中 | P7 (低) |
| 阶段8: 优化和上线 | 依赖所有 | 高 | 低 | P8 (最后) |

### 调整理由

1. **阶段1优先**: AI服务是核心，其他服务依赖它
2. **阶段2提前**: 患者信息提取是高价值业务功能
3. **阶段4提前**: 配置管理是基础设施，越早越好
4. **阶段6延后**: 语音服务技术复杂度高，风险大
5. **阶段7延后**: 医疗系统集成业务价值相对较低

---

## 三、详细实施计划

### 阶段0: 准备工作 ✅ 当前阶段

#### 目标
搭建完善的开发基础设施，为后续开发提供坚实基础。

#### 任务清单

##### 0.1 项目结构优化
- [ ] 创建后端服务目录结构
  ```
  backend-service/
  ├── app/
  │   ├── api/v1/          # API路由
  │   ├── services/        # 业务服务
  │   ├── core/            # 核心组件(认证、限流等)
  │   ├── models/          # 数据模型
  │   ├── schemas/         # Pydantic schemas
  │   └── utils/           # 工具函数
  ├── tests/               # 测试
  ├── alembic/             # 数据库迁移
  ├── docker/              # Docker配置
  └── scripts/             # 脚本
  ```
- [ ] 创建前端适配器目录结构
  ```
  src/services/
  ├── adapters/            # 服务适配器
  │   ├── ai-adapter.ts
  │   ├── ocr-adapter.ts
  │   └── ...
  ├── api-client.ts        # 统一API客户端
  └── legacy/              # 旧实现(保留)
  ```

##### 0.2 依赖管理
- [ ] 更新backend-service/requirements.txt
  ```python
  # 新增依赖
  python-multipart==0.0.6      # 文件上传
  slowapi==0.1.9               # 限流
  circuitbreaker==1.4.0        # 熔断
  prometheus-client==0.19.0    # 监控
  pytesseract==0.3.10          # OCR
  Pillow==10.1.0               # 图像处理
  ```
- [ ] 更新desktop-ai-assistant/package.json
  ```json
  {
    "dependencies": {
      "axios": "^1.6.2",        // HTTP客户端
      "eventemitter3": "^5.0.1" // 事件管理
    }
  }
  ```

##### 0.3 开发环境配置
- [ ] 创建Docker Compose配置
  ```yaml
  # docker-compose.dev.yml
  services:
    backend:
      build: ./backend-service
      ports: ["8010:8010"]
      volumes: ["./backend-service:/app"]
      environment:
        - DEBUG=true
    
    postgres:
      image: postgres:15
      environment:
        - POSTGRES_DB=medical_ai
        - POSTGRES_USER=dev
        - POSTGRES_PASSWORD=dev123
    
    redis:
      image: redis:7-alpine
  ```
- [ ] 创建环境变量模板
  ```bash
  # backend-service/.env.example
  APP_ENV=development
  DEBUG=true
  DATABASE_URL=postgresql://dev:dev123@localhost:5432/medical_ai
  REDIS_URL=redis://localhost:6379/0
  
  # AI模型配置
  OPENAI_API_KEY=your_key_here
  DEEPSEEK_API_KEY=your_key_here
  ```

##### 0.4 代码质量工具
- [ ] 配置Python代码质量工具
  ```toml
  # backend-service/pyproject.toml
  [tool.black]
  line-length = 100
  
  [tool.mypy]
  python_version = "3.11"
  strict = true
  
  [tool.pytest.ini_options]
  testpaths = ["tests"]
  ```
- [ ] 配置pre-commit hooks
  ```yaml
  # .pre-commit-config.yaml
  repos:
    - repo: https://github.com/psf/black
      hooks:
        - id: black
    - repo: https://github.com/pycqa/flake8
      hooks:
        - id: flake8
  ```

##### 0.5 API文档配置
- [ ] 配置Swagger UI主题
- [ ] 添加API示例和说明
- [ ] 创建Postman Collection模板

##### 0.6 测试框架搭建
- [ ] 配置pytest
  ```python
  # backend-service/tests/conftest.py
  import pytest
  from fastapi.testclient import TestClient
  from app.main import app
  
  @pytest.fixture
  def client():
      return TestClient(app)
  
  @pytest.fixture
  def db_session():
      # 创建测试数据库会话
      pass
  ```
- [ ] 创建Mock服务
  ```python
  # backend-service/tests/mocks/ai_mock.py
  class MockOpenAIClient:
      def chat_completion(self, messages):
          return {"content": "Mock response"}
  ```

##### 0.7 CI/CD配置
- [ ] 创建GitHub Actions工作流
  ```yaml
  # .github/workflows/backend-test.yml
  name: Backend Tests
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - name: Run tests
          run: |
            cd backend-service
            pip install -r requirements.txt
            pytest
  ```

#### 验收标准
- ✅ 项目结构清晰，目录规范
- ✅ 开发环境可一键启动（docker-compose up）
- ✅ 代码质量工具配置完成
- ✅ 测试框架可正常运行
- ✅ CI/CD流水线配置完成

#### 预计时间
**3-5天**（质量优先，不赶工期）

---

### 阶段1: 核心AI服务迁移

#### 目标
将AI对话、内容分析等核心AI功能迁移到后端，建立统一的AI服务层。

#### 为什么优先
1. **核心业务**: AI服务是整个系统的核心
2. **技术依赖**: 其他服务（患者提取、推荐）依赖AI服务
3. **安全风险**: API密钥暴露问题最严重
4. **业务价值**: 用户最常用的功能

#### 任务清单

##### 1.1 AI服务基础架构
- [ ] 创建AI服务模块
  ```python
  # app/services/ai/chat_service.py
  class ChatService:
      def __init__(self, model_manager):
          self.model_manager = model_manager
      
      async def chat(self, messages, options):
          model = self.model_manager.get_model("chat")
          return await model.generate(messages, options)
  ```
- [ ] 创建模型管理器
  ```python
  # app/services/ai/model_manager.py
  class ModelManager:
      def __init__(self):
          self.providers = {}
          self.load_providers()
      
      def get_model(self, scenario):
          # 根据场景返回合适的模型
          pass
  ```
- [ ] 创建提供商工厂
  ```python
  # app/services/ai/provider_factory.py
  class ProviderFactory:
      @staticmethod
      def create(provider_type, config):
          if provider_type == "openai":
              return OpenAIProvider(config)
          elif provider_type == "ollama":
              return OllamaProvider(config)
          # ...
  ```

##### 1.2 实现多提供商支持
- [ ] OpenAI提供商
  ```python
  # app/services/ai/providers/openai_provider.py
  class OpenAIProvider:
      async def generate(self, messages, options):
          # 调用OpenAI API
          pass
  ```
- [ ] Ollama提供商
- [ ] Deepseek提供商
- [ ] Claude提供商

##### 1.3 实现API端点
- [ ] POST /api/v1/ai/chat - 标准对话
  ```python
  @router.post("/chat")
  async def chat(request: ChatRequest):
      response = await chat_service.chat(
          messages=request.messages,
          options=request.options
      )
      return {"success": True, "data": response}
  ```
- [ ] POST /api/v1/ai/chat/stream - 流式对话
  ```python
  @router.post("/chat/stream")
  async def chat_stream(request: ChatRequest):
      async def generate():
          async for chunk in chat_service.chat_stream(request.messages):
              yield f"data: {json.dumps(chunk)}\n\n"
      return StreamingResponse(generate(), media_type="text/event-stream")
  ```
- [ ] POST /api/v1/ai/analyze - 内容分析

##### 1.4 前端适配器开发
- [ ] 创建API客户端
  ```typescript
  // src/services/api-client.ts
  class APIClient {
    private baseURL = 'http://localhost:8010/api/v1';
    
    async chat(messages: Message[]): Promise<ChatResponse> {
      const response = await fetch(`${this.baseURL}/ai/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({messages})
      });
      return response.json();
    }
  }
  ```
- [ ] 创建AI服务适配器
  ```typescript
  // src/services/adapters/ai-adapter.ts
  export class AIServiceAdapter {
    private useBackend = true; // 配置开关
    
    async processMessage(message: string): Promise<string> {
      if (this.useBackend) {
        return this.apiClient.chat([{role: 'user', content: message}]);
      } else {
        return this.legacyService.processMessage(message);
      }
    }
  }
  ```
- [ ] 更新IPC处理器（保持接口不变）
  ```typescript
  // src/main/main.ts
  ipcMain.handle('ai-process-message', async (_, message: string) => {
    // 内部调用后端API，但IPC接口保持不变
    const adapter = new AIServiceAdapter();
    return adapter.processMessage(message);
  });
  ```

##### 1.5 测试
- [ ] 单元测试
  ```python
  # tests/test_ai_service.py
  async def test_chat_service():
      service = ChatService(mock_model_manager)
      response = await service.chat([{"role": "user", "content": "Hello"}])
      assert response["content"] is not None
  ```
- [ ] 集成测试
- [ ] 前端适配器测试

#### 保留的资产
- ✅ IPC接口签名不变: `ai-process-message`
- ✅ 前端调用方式不变: `window.electron.ai.processMessage()`
- ✅ 配置项保持兼容: `ai.provider`, `ai.model`等
- ✅ UI组件不变: Chat组件、SettingsPanel等

#### 验收标准
- ✅ AI对话功能正常
- ✅ 流式响应正常
- ✅ 多模型切换正常
- ✅ 前端调用无感知
- ✅ 测试覆盖率>80%

#### 预计时间
**7-10天**

---

### 阶段2: 患者信息服务增强

#### 目标
增强患者信息提取功能，整合AI视觉模型和OCR，提供统一的患者信息提取API。

#### 为什么第二优先
1. **高业务价值**: 医疗场景的核心功能
2. **依赖AI服务**: 需要阶段1的AI服务支持
3. **已有基础**: 后端已部分实现

#### 任务清单
- [ ] 增强患者提取API
- [ ] 集成视觉模型（Qwen2.5VL）
- [ ] 优化提取算法
- [ ] 前端适配
- [ ] 测试验证

#### 保留的资产
- ✅ 提取字段结构不变
- ✅ 前端调用接口不变
- ✅ UI展示组件不变

#### 预计时间
**5-7天**

---

### 阶段3: OCR服务

#### 目标
将Tesseract OCR迁移到后端，提供统一的文字识别服务。

#### 任务清单
- [ ] 集成Tesseract
- [ ] 实现图像预处理
- [ ] 实现OCR API
- [ ] 前端适配

#### 预计时间
**5-7天**

---

### 阶段4: 配置管理服务

#### 目标
建立统一的配置管理系统，支持动态配置和热更新。

#### 为什么提前
1. **基础设施**: 其他服务都需要配置管理
2. **风险低**: 技术难度不高
3. **价值高**: 提升系统灵活性

#### 任务清单
- [ ] 实现配置服务
- [ ] 实现配置API
- [ ] 前端配置同步
- [ ] 配置热更新

#### 保留的资产
- ✅ 配置项名称不变
- ✅ 配置文件格式兼容
- ✅ 环境变量命名一致

#### 预计时间
**4-6天**

---

### 阶段5-8: 后续阶段

详细计划将在前面阶段完成后制定。

---

## 四、当前行动计划

### 立即开始: 阶段0任务

#### 今天的任务
1. ✅ 推送代码到GitHub
2. ✅ 创建调整后的实施计划
3. [ ] 创建后端服务目录结构
4. [ ] 更新requirements.txt
5. [ ] 创建Docker Compose配置

#### 明天的任务
1. [ ] 配置开发环境
2. [ ] 搭建测试框架
3. [ ] 配置CI/CD

---

## 五、进度跟踪

| 阶段 | 状态 | 开始日期 | 完成日期 | 备注 |
|------|------|---------|---------|------|
| 阶段0 | 🔄 进行中 | 2025-10-10 | - | 准备工作 |
| 阶段1 | ⏳ 待开始 | - | - | 核心AI服务 |
| 阶段2 | ⏳ 待开始 | - | - | 患者信息服务 |
| 阶段3 | ⏳ 待开始 | - | - | OCR服务 |
| 阶段4 | ⏳ 待开始 | - | - | 配置管理 |

---

**下一步**: 开始执行阶段0的具体任务

