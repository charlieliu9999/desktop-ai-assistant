# 阶段4: 智能体服务集成 - 架构设计

## 📋 设计概述

**目标**: 将Bisheng智能体服务集成到新的后端API架构中  
**时间**: 2025-10-10  
**状态**: 🚀 进行中  

---

## 🎯 核心目标

1. ✅ 将现有的Bisheng API迁移到v1架构
2. ✅ 实现统一的智能体服务接口
3. ✅ 创建前端智能体适配器
4. ✅ 编写完整的测试 (覆盖率80%+)
5. ✅ 功能验证

---

## 📐 架构设计

### 1. 后端服务层

#### 1.1 服务模块结构

```
backend-service/app/services/agent/
├── __init__.py
├── models.py           # 数据模型
├── bisheng_service.py  # Bisheng服务实现
└── agent_manager.py    # 智能体管理器
```

#### 1.2 API路由结构

```
backend-service/app/api/v1/
├── agent.py            # 智能体API路由
```

**API端点设计**:
- `POST /v1/agent/login` - 登录Bisheng平台
- `GET /v1/agent/workflows` - 获取智能体列表
- `POST /v1/agent/invoke` - 调用智能体
- `POST /v1/agent/stop` - 停止智能体
- `GET /v1/agent/health` - 健康检查
- `GET /v1/agent/config` - 获取配置
- `PUT /v1/agent/config` - 更新配置

---

### 2. 前端适配器层

#### 2.1 适配器结构

```
desktop-ai-assistant/src/services/adapters/
├── agent-adapter.ts    # 智能体服务适配器
```

#### 2.2 适配器功能

- 统一的智能体服务接口
- 新旧实现无缝切换
- 自动降级到legacy实现
- 后端连接测试

---

## 📊 数据模型设计

### 1. Bisheng配置模型

```python
class BishengConfig(BaseModel):
    """Bisheng配置"""
    enabled: bool
    base_url: str
    frontend_url: str
    username: str
    password: str
    access_token: Optional[str]
    token_expiry: Optional[int]
    mode: str  # 'api' | 'iframe'
    timeout: int
    retry_attempts: int
```

### 2. 智能体工作流模型

```python
class AgentWorkflow(BaseModel):
    """智能体工作流"""
    id: str
    name: str
    description: Optional[str]
    status: str
    create_time: Optional[str]
    update_time: Optional[str]
```

### 3. 智能体调用请求

```python
class AgentInvokeRequest(BaseModel):
    """智能体调用请求"""
    workflow_id: str
    input: Dict[str, Any]
    stream: bool = True
    session_id: Optional[str]
    message_id: Optional[str]
    input_node_id: Optional[str]
```

### 4. 智能体响应

```python
class AgentResponse(BaseModel):
    """智能体响应"""
    success: bool
    data: Optional[Any]
    error: Optional[str]
    meta: Optional[Dict[str, Any]]
```

---

## 🔄 服务实现

### 1. BishengService

**职责**: 封装Bisheng API调用

**核心方法**:
```python
class BishengService:
    async def login(username: str, password: str) -> LoginResponse
    async def get_workflows(page_size: int, page_num: int, token: str) -> List[AgentWorkflow]
    async def invoke_workflow(request: AgentInvokeRequest, token: str) -> StreamingResponse
    async def stop_workflow(workflow_id: str, session_id: str, token: str) -> bool
    async def health_check() -> HealthStatus
```

### 2. AgentManager

**职责**: 管理智能体服务状态和会话

**核心方法**:
```python
class AgentManager:
    def register_service(name: str, service: BishengService)
    async def get_workflows(service_name: str = "bisheng") -> List[AgentWorkflow]
    async def invoke(service_name: str, request: AgentInvokeRequest) -> StreamingResponse
    async def get_health() -> Dict[str, HealthStatus]
```

---

## 🧪 测试策略

### 1. 后端服务测试

**测试文件**:
- `tests/services/agent/test_bisheng_service.py`
- `tests/services/agent/test_agent_manager.py`
- `tests/api/v1/test_agent.py`

**测试用例**:
1. Bisheng服务测试 (8个)
   - 服务初始化
   - 登录成功
   - 登录失败
   - 获取工作流列表
   - 调用工作流
   - 停止工作流
   - 健康检查
   - 错误处理

2. Agent Manager测试 (6个)
   - 注册服务
   - 获取工作流
   - 调用智能体
   - 健康检查
   - 多服务管理
   - 错误处理

3. API集成测试 (7个)
   - 登录端点
   - 工作流列表端点
   - 调用端点
   - 停止端点
   - 健康检查端点
   - 配置端点
   - 错误处理

**总测试数**: 21个  
**目标覆盖率**: 80%+

---

### 2. 前端适配器测试

**测试文件**:
- `tests/adapters/agent-adapter.test.ts`

**测试用例**:
1. 适配器初始化
2. 后端连接测试
3. 登录功能
4. 获取工作流列表
5. 调用智能体
6. 降级到legacy实现

**总测试数**: 6个

---

## 📝 实现步骤

### 步骤1: 后端服务实现 (4小时)

1. ✅ 创建数据模型 (models.py)
2. ✅ 实现Bisheng服务 (bisheng_service.py)
3. ✅ 实现Agent管理器 (agent_manager.py)
4. ✅ 创建API路由 (v1/agent.py)
5. ✅ 集成到main.py

### 步骤2: 后端测试 (3小时)

1. ✅ 编写服务测试
2. ✅ 编写API测试
3. ✅ 运行测试验证
4. ✅ 确保覆盖率80%+

### 步骤3: 前端适配器 (2小时)

1. ✅ 创建智能体适配器
2. ✅ 实现功能开关
3. ✅ 编写适配器测试

### 步骤4: 功能验证 (1小时)

1. ✅ 启动后端服务
2. ✅ 测试所有API端点
3. ✅ 验证前端适配器
4. ✅ 端到端测试

### 步骤5: 文档和提交 (1小时)

1. ✅ 更新文档
2. ✅ 提交代码
3. ✅ 创建完成报告

**总时间估算**: 11小时

---

## 🎯 成功标准

### 1. 代码质量
- ✅ 所有新代码有类型注解
- ✅ 遵循项目代码规范
- ✅ 无ESLint/Flake8错误

### 2. 测试质量
- ✅ 测试覆盖率80%+
- ✅ 所有测试通过
- ✅ 使用真实配置
- ✅ 不编造测试结果

### 3. 功能完整性
- ✅ 所有API端点工作正常
- ✅ 前端适配器功能完整
- ✅ 错误处理完善
- ✅ 日志记录完整

### 4. 文档完整性
- ✅ API文档完整
- ✅ 代码注释清晰
- ✅ 测试文档完整
- ✅ 使用指南完整

---

## 🔧 技术栈

### 后端
- FastAPI 0.109
- httpx (HTTP客户端)
- Pydantic (数据验证)
- pytest (测试框架)

### 前端
- TypeScript
- Electron IPC
- 适配器模式

---

## 📈 进度跟踪

| 步骤 | 状态 | 完成时间 |
|------|------|---------|
| 架构设计 | ✅ | 2025-10-10 |
| 后端服务实现 | ⏳ | - |
| 后端测试 | ⏳ | - |
| 前端适配器 | ⏳ | - |
| 功能验证 | ⏳ | - |
| 文档和提交 | ⏳ | - |

---

**创建时间**: 2025-10-10  
**设计人**: AI Agent  
**状态**: ✅ 设计完成，开始实现

