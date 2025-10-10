# 阶段1: AI服务架构设计

## 📋 概述

**阶段**: 阶段1 - 核心AI服务迁移  
**状态**: 🚧 进行中  
**开始时间**: 2025-10-10  
**预计时间**: 7-10天

---

## 🎯 目标

将前端AI服务迁移到后端API，实现：
1. ✅ 统一的AI服务接口
2. ✅ 多AI提供商支持（OpenAI, Claude, Deepseek, Ollama）
3. ✅ 流式和非流式响应
4. ✅ 对话历史管理
5. ✅ 速率限制和错误处理
6. ✅ 前端适配器模式

---

## 🏗️ 架构设计

### 1. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Frontend                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  IPC Handlers (保持接口不变)                          │   │
│  │  - ai-process-message                                 │   │
│  │  - ai-chat-stream                                     │   │
│  │  - ai-analyze-content                                 │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                           │
│  ┌────────────────▼─────────────────────────────────────┐   │
│  │  AI Service Adapter (新增)                            │   │
│  │  - 配置开关: USE_BACKEND_AI                           │   │
│  │  - 新实现: 调用后端API                                │   │
│  │  - 旧实现: 调用legacy/ai.ts                           │   │
│  └────────────────┬─────────────────────────────────────┘   │
└───────────────────┼──────────────────────────────────────────┘
                    │ HTTP/SSE
┌───────────────────▼──────────────────────────────────────────┐
│                   Backend API (FastAPI)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes (/api/v1/ai/)                             │   │
│  │  - POST /chat          (标准对话)                     │   │
│  │  - POST /chat/stream   (流式对话)                     │   │
│  │  - POST /analyze       (内容分析)                     │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                           │
│  ┌────────────────▼─────────────────────────────────────┐   │
│  │  AI Service Manager (服务管理器)                      │   │
│  │  - 提供商选择                                         │   │
│  │  - 负载均衡                                           │   │
│  │  - 故障转移                                           │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                           │
│  ┌────────────────▼─────────────────────────────────────┐   │
│  │  AI Providers (多提供商支持)                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │   │
│  │  │ OpenAI   │ │ Claude   │ │ Deepseek │ │ Ollama  │ │   │
│  │  │ Provider │ │ Provider │ │ Provider │ │Provider │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 2. 模块结构

```
backend-service/app/services/ai/
├── __init__.py
├── base.py                    # 基础AI提供商接口
├── manager.py                 # AI服务管理器
├── providers/
│   ├── __init__.py
│   ├── openai_provider.py     # OpenAI提供商
│   ├── claude_provider.py     # Claude提供商
│   ├── deepseek_provider.py   # Deepseek提供商
│   └── ollama_provider.py     # Ollama提供商
├── models.py                  # 数据模型
└── utils.py                   # 工具函数

backend-service/app/api/v1/
├── __init__.py
└── ai.py                      # AI API路由

frontend/src/services/adapters/
├── ai-adapter.ts              # AI服务适配器
└── types.ts                   # 类型定义
```

### 3. 数据流

#### 3.1 标准对话流程
```
1. 用户输入 → IPC Handler (ai-process-message)
2. IPC Handler → AI Adapter
3. AI Adapter 检查配置开关 (USE_BACKEND_AI)
4. 如果启用后端:
   a. AI Adapter → HTTP POST /api/v1/ai/chat
   b. API Route → AI Service Manager
   c. Manager → 选择Provider (OpenAI/Claude/Deepseek/Ollama)
   d. Provider → 调用AI API
   e. Provider → 返回响应
   f. Manager → 格式化响应
   g. API Route → 返回JSON
   h. AI Adapter → 解析响应
   i. IPC Handler → 返回给渲染进程
5. 如果禁用后端:
   a. AI Adapter → Legacy AI Service
   b. Legacy Service → 直接调用AI API
   c. Legacy Service → 返回响应
```

#### 3.2 流式对话流程
```
1. 用户输入 → IPC Handler (ai-chat-stream)
2. IPC Handler → AI Adapter
3. AI Adapter → HTTP POST /api/v1/ai/chat/stream
4. API Route → AI Service Manager
5. Manager → Provider (streaming mode)
6. Provider → 生成SSE流
7. API Route → 转发SSE流
8. AI Adapter → 解析SSE事件
9. AI Adapter → 通过IPC发送增量更新
10. 渲染进程 → 实时显示
```

---

## 📦 核心组件设计

### 1. AI Provider Base Class

```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any, AsyncIterator

class AIProviderBase(ABC):
    """AI提供商基类"""
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, str]],
        **options
    ) -> Dict[str, Any]:
        """标准对话"""
        pass
    
    @abstractmethod
    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        **options
    ) -> AsyncIterator[str]:
        """流式对话"""
        pass
    
    @abstractmethod
    async def analyze(
        self,
        content: str,
        analysis_type: str,
        **options
    ) -> Dict[str, Any]:
        """内容分析"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """健康检查"""
        pass
```

### 2. AI Service Manager

```python
class AIServiceManager:
    """AI服务管理器"""
    
    def __init__(self):
        self.providers: Dict[str, AIProviderBase] = {}
        self.default_provider: str = "openai"
        self.fallback_providers: List[str] = ["deepseek", "ollama"]
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        provider: str = None,
        **options
    ) -> Dict[str, Any]:
        """对话 - 支持故障转移"""
        provider_name = provider or self.default_provider
        
        try:
            provider_instance = self.providers[provider_name]
            return await provider_instance.chat(messages, **options)
        except Exception as e:
            # 故障转移
            for fallback in self.fallback_providers:
                if fallback != provider_name:
                    try:
                        provider_instance = self.providers[fallback]
                        return await provider_instance.chat(messages, **options)
                    except:
                        continue
            raise e
```

### 3. API Routes

```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional

router = APIRouter(prefix="/api/v1/ai", tags=["AI"])

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    provider: Optional[str] = None
    options: Optional[Dict[str, Any]] = {}

class ChatResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    meta: Dict[str, Any]

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """标准对话"""
    result = await ai_manager.chat(
        messages=request.messages,
        provider=request.provider,
        **request.options
    )
    return ChatResponse(
        success=True,
        data=result,
        meta={"request_id": generate_id(), "timestamp": now()}
    )

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """流式对话"""
    async def generate():
        async for chunk in ai_manager.chat_stream(
            messages=request.messages,
            provider=request.provider,
            **request.options
        ):
            yield f"data: {json.dumps(chunk)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )
```

### 4. Frontend AI Adapter

```typescript
export class AIServiceAdapter {
  private useBackend: boolean;
  private apiClient: APIClient;
  private legacyService: AIService;
  
  constructor() {
    this.useBackend = FEATURE_FLAGS.USE_BACKEND_AI;
    this.apiClient = new APIClient();
    this.legacyService = new AIService(config, logger);
  }
  
  async processMessage(message: string): Promise<string> {
    if (this.useBackend) {
      const response = await this.apiClient.post('/api/v1/ai/chat', {
        messages: [{ role: 'user', content: message }]
      });
      return response.data.message.content;
    } else {
      return this.legacyService.processMessage(message);
    }
  }
  
  async *chatStream(message: string): AsyncIterator<string> {
    if (this.useBackend) {
      const eventSource = new EventSource('/api/v1/ai/chat/stream');
      // ... SSE处理
    } else {
      yield* this.legacyService.chatStream(message);
    }
  }
}
```

---

## 🔧 配置管理

### 后端配置 (.env)

```bash
# AI服务配置
AI_DEFAULT_PROVIDER=openai
AI_FALLBACK_PROVIDERS=deepseek,ollama

# OpenAI
OPENAI_API_KEY=sk-xxx
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# Claude
CLAUDE_API_KEY=sk-ant-xxx
CLAUDE_MODEL=claude-3-sonnet

# Deepseek
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# Ollama
OLLAMA_API_BASE=http://localhost:11434
OLLAMA_MODEL=llama2
```

### 前端配置

```typescript
export const FEATURE_FLAGS = {
  USE_BACKEND_AI: true,  // 启用后端AI服务
};

export const AI_CONFIG = {
  backendUrl: 'http://localhost:8010',
  timeout: 30000,
  retryAttempts: 3,
};
```

---

## ✅ 接口兼容性保证

### IPC接口 (不变)

```typescript
// 保持现有签名
ipcMain.handle('ai-process-message', async (_, message: string) => {
  const adapter = new AIServiceAdapter();
  return adapter.processMessage(message);
});

ipcMain.handle('ai-chat-stream', async (_, message: string) => {
  const adapter = new AIServiceAdapter();
  return adapter.chatStream(message);
});

ipcMain.handle('ai-analyze-content', async (_, content: string, type: string) => {
  const adapter = new AIServiceAdapter();
  return adapter.analyzeContent(content, type);
});
```

---

## 📊 性能指标

### 目标
- 响应时间: <2秒 (标准模式)
- 首字节时间: <500ms (流式模式)
- 并发支持: 100+ 请求/秒
- 可用性: 99.9%

### 监控
- Prometheus指标收集
- 响应时间分布
- 错误率统计
- 提供商健康状态

---

## 🧪 测试策略

### 单元测试
- AI Provider实现测试
- Manager逻辑测试
- API路由测试
- 前端Adapter测试

### 集成测试
- 端到端对话流程
- 流式响应测试
- 故障转移测试
- 性能压力测试

### 覆盖率目标
- 后端: >80%
- 前端: >70%

---

## 📝 下一步

1. ✅ 实现AI Provider Base Class
2. ✅ 实现OpenAI Provider
3. ✅ 实现AI Service Manager
4. ✅ 创建API Routes
5. ✅ 实现前端Adapter
6. ✅ 更新IPC Handlers
7. ✅ 编写测试
8. ✅ 功能验证

---

**创建时间**: 2025-10-10  
**状态**: 🚧 进行中

