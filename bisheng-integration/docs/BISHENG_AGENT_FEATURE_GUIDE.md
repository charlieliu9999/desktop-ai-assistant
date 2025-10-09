# Bisheng 智能体功能完整指南

## 📋 目录

1. [功能概述](#功能概述)
2. [架构设计](#架构设计)
3. [核心功能](#核心功能)
4. [代码结构](#代码结构)
5. [API 接口](#api-接口)
6. [使用指南](#使用指南)
7. [故障排查](#故障排查)

---

## 功能概述

Desktop AI Assistant 集成了 Bisheng 智能体平台，提供完整的智能体对话功能。

### 主要特性

✅ **智能体列表管理**
- 从 Bisheng 平台获取智能体列表
- 支持搜索和筛选
- 显示智能体详细信息

✅ **智能体对话**
- 支持流式对话（SSE）
- 自动启动工作流（显示欢迎语）
- 会话状态管理
- 支持停止工作流

✅ **双模式支持**
- **API 模式**: 直接调用 Bisheng API，完全控制
- **iframe 模式**: 嵌入 Bisheng Web UI

✅ **会话管理**
- 多个智能体独立会话
- 切换智能体时保留对话历史
- 自动保存会话状态

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop AI Assistant                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ AgentService │  │  AgentList   │  │  AgentChat   │      │
│  │   (Page)     │  │ (Component)  │  │ (Component)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│         └──────────────────┴──────────────────┘               │
│                            │                                  │
│                   ┌────────▼────────┐                        │
│                   │ agentSessionStore│                        │
│                   │    (Zustand)     │                        │
│                   └────────┬────────┘                        │
│                            │                                  │
├────────────────────────────┼──────────────────────────────────┤
│                   Electron IPC                                │
├────────────────────────────┼──────────────────────────────────┤
│                   ┌────────▼────────┐                        │
│                   │ BishengService  │                        │
│                   │  (Main Process) │                        │
│                   └────────┬────────┘                        │
│                            │                                  │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ Bisheng Platform│
                    │   (Backend)     │
                    └─────────────────┘
```

### 数据流

```
用户操作 → UI 组件 → Store → IPC → BishengService → Bisheng API
                                                            │
                                                            ▼
                                                      SSE Stream
                                                            │
                                                            ▼
BishengService → IPC Events → UI 组件 → Store → 更新界面
```

---

## 核心功能

### 1. 智能体列表

**组件**: `src/renderer/components/AgentList.tsx`

**功能**:
- 获取智能体列表
- 搜索智能体
- 选择智能体
- 折叠/展开列表

**关键代码**:

```typescript
const AgentList: React.FC<AgentListProps> = ({
  onSelectAgent,
  selectedAgent,
  isCollapsed,
  onToggleCollapse
}) => {
  const [agents, setAgents] = useState<BishengWorkflow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 加载智能体列表
  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    const workflows = await window.electronAPI.bisheng.getWorkflows(100, 1);
    setAgents(workflows);
  };

  // 搜索过滤
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-80'} ...`}>
      {/* 搜索框 */}
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="搜索智能体..."
      />
      
      {/* 智能体列表 */}
      {filteredAgents.map(agent => (
        <button
          key={agent.id}
          onClick={() => onSelectAgent(agent)}
          className={selectedAgent?.id === agent.id ? 'active' : ''}
        >
          {agent.name}
        </button>
      ))}
    </div>
  );
};
```

---

### 2. 智能体对话

**组件**: `src/renderer/components/AgentChat.tsx`

**功能**:
- 自动启动工作流（显示欢迎语）
- 发送消息
- 接收流式响应
- 停止工作流
- 会话状态管理

**关键代码**:

```typescript
const AgentChat: React.FC<AgentChatProps> = ({ workflow }) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // 从 Store 获取会话
  const { getSession, updateSession, addMessage } = useAgentSessionStore();
  const session = getSession(workflow.id, workflow.name);
  const messages = session.messages;
  const sessionId = session.sessionId;
  const messageId = session.messageId;
  const inputNodeId = session.inputNodeId;

  // 自动启动工作流
  useEffect(() => {
    if (session.messages.length === 0 && !session.isAutoStarted) {
      autoStartWorkflow();
    }
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [workflow.id]);

  // 自动启动工作流
  const autoStartWorkflow = async () => {
    setIsProcessing(true);
    
    const { streamId } = await window.electronAPI.bisheng.invokeWorkflow(
      workflow.id,
      { user_input: '' },
      true
    );

    // 注册事件监听器
    const offChunk = window.electronAPI.bisheng.onStreamChunk(handleChunk);
    const offEnd = window.electronAPI.bisheng.onStreamEnd(handleEnd);

    cleanupRef.current = () => {
      offChunk();
      offEnd();
    };
  };

  // 发送消息
  const handleSendMessage = async () => {
    const { streamId } = await window.electronAPI.bisheng.invokeWorkflow(
      workflow.id,
      { user_input: inputText },
      true,
      sessionId,
      messageId,
      inputNodeId
    );

    // 注册事件监听器...
  };

  // 停止工作流
  const handleStopWorkflow = async () => {
    await window.electronAPI.bisheng.stopWorkflow(workflow.id, sessionId);
    
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    setIsProcessing(false);
  };

  return (
    <div>
      {/* 消息列表 */}
      {messages.map(message => (
        <div key={message.id}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      ))}

      {/* 输入框 */}
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        disabled={isProcessing}
      />

      {/* 停止/发送按钮 */}
      {isProcessing ? (
        <button onClick={handleStopWorkflow}>停止</button>
      ) : (
        <button onClick={handleSendMessage}>发送</button>
      )}
    </div>
  );
};
```

---

### 3. 会话管理

**Store**: `src/renderer/store/agentSessionStore.ts`

**功能**:
- 管理多个智能体的会话状态
- 保存消息历史
- 保存会话参数（sessionId, messageId, inputNodeId）

**数据结构**:

```typescript
interface AgentSession {
  workflowId: string;           // 工作流 ID
  workflowName: string;         // 工作流名称
  sessionId: string | null;     // 会话 ID
  messageId: string | null;     // 消息 ID
  inputNodeId: string | null;   // 输入节点 ID
  messages: BishengMessage[];   // 消息列表
  lastUpdate: number;           // 最后更新时间
  isActive: boolean;            // 是否活跃
  isAutoStarted: boolean;       // 是否已自动启动
}

interface BishengMessage {
  id: string;                   // 消息 ID
  role: 'user' | 'assistant';   // 角色
  content: string;              // 内容
  timestamp: number;            // 时间戳
  type: 'text' | 'stream' | 'error'; // 类型
}
```

**关键方法**:

```typescript
const useAgentSessionStore = create<AgentSessionState>((set, get) => ({
  sessions: new Map(),

  // 获取会话
  getSession: (workflowId, workflowName) => {
    const sessions = get().sessions;
    if (!sessions.has(workflowId)) {
      // 创建新会话
      const newSession: AgentSession = {
        workflowId,
        workflowName,
        sessionId: null,
        messageId: null,
        inputNodeId: null,
        messages: [],
        lastUpdate: Date.now(),
        isActive: false,
        isAutoStarted: false,
      };
      sessions.set(workflowId, newSession);
    }
    return sessions.get(workflowId)!;
  },

  // 更新会话
  updateSession: (workflowId, updates) => {
    const sessions = get().sessions;
    const session = sessions.get(workflowId);
    if (session) {
      sessions.set(workflowId, {
        ...session,
        ...updates,
        lastUpdate: Date.now(),
      });
      set({ sessions: new Map(sessions) });
    }
  },

  // 添加消息
  addMessage: (workflowId, message) => {
    const sessions = get().sessions;
    const session = sessions.get(workflowId);
    if (session) {
      session.messages.push(message);
      session.lastUpdate = Date.now();
      set({ sessions: new Map(sessions) });
    }
  },

  // 更新消息
  updateMessage: (workflowId, messageId, content) => {
    const sessions = get().sessions;
    const session = sessions.get(workflowId);
    if (session) {
      const message = session.messages.find(m => m.id === messageId);
      if (message) {
        message.content = content;
        session.lastUpdate = Date.now();
        set({ sessions: new Map(sessions) });
      }
    }
  },
}));
```

---

### 4. Bisheng 服务

**服务**: `src/services/bisheng.ts`

**功能**:
- 登录认证
- 获取工作流列表
- 调用工作流
- 停止工作流
- 处理 SSE 流

**关键方法**:

```typescript
export class BishengService {
  private config: BishengConfig;
  private logger: Logger;

  // 登录
  async login(username: string, password: string): Promise<LoginResult> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: username, password }),
    });
    
    const data = await response.json();
    return {
      token: data.access_token,
      expiry: Date.now() + 24 * 60 * 60 * 1000,
    };
  }

  // 获取工作流列表
  async getWorkflows(pageSize = 10, pageNum = 1): Promise<BishengWorkflow[]> {
    const response = await fetch(
      `${this.config.baseUrl}/api/v1/workflow/list?page_size=${pageSize}&page_num=${pageNum}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      }
    );
    
    const result = await response.json();
    return result.data.data || [];
  }

  // 调用工作流
  async invokeWorkflow(
    workflowId: string,
    input: Record<string, any>,
    stream: boolean = true,
    sessionId?: string,
    messageId?: string,
    inputNodeId?: string
  ): Promise<ReadableStream> {
    const body: any = {
      workflow_id: workflowId,
      stream: stream,
    };

    if (sessionId && inputNodeId) {
      body.session_id = sessionId;
      body.message_id = messageId ? parseInt(messageId, 10) : 0;
      body.input = { [inputNodeId]: input };
    }

    const response = await fetch(`${this.config.baseUrl}/api/v2/workflow/invoke`, {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    return response.body!;
  }

  // 停止工作流
  async stopWorkflow(workflowId: string, sessionId: string): Promise<void> {
    await fetch(`${this.config.baseUrl}/api/v2/workflow/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.accessToken}`,
      },
      body: JSON.stringify({
        workflow_id: workflowId,
        session_id: sessionId,
      }),
    });
  }
}
```

---

## 代码结构

```
desktop-ai-assistant/
├── src/
│   ├── main/                          # 主进程
│   │   ├── main.ts                    # 主进程入口，注册 IPC 处理器
│   │   └── preload.ts                 # 预加载脚本，暴露 API
│   │
│   ├── renderer/                      # 渲染进程
│   │   ├── pages/
│   │   │   └── AgentService.tsx       # 智能体服务主页面
│   │   │
│   │   ├── components/
│   │   │   ├── AgentList.tsx          # 智能体列表组件
│   │   │   ├── AgentChat.tsx          # 智能体对话组件（API 模式）
│   │   │   └── AgentIframe.tsx        # 智能体 iframe 组件
│   │   │
│   │   └── store/
│   │       └── agentSessionStore.ts   # 会话管理 Store
│   │
│   ├── services/
│   │   └── bisheng.ts                 # Bisheng 服务类
│   │
│   └── shared/
│       └── types.ts                   # 类型定义
│
└── docs/                              # 文档
    ├── BISHENG_AGENT_FEATURE_GUIDE.md # 本文档
    ├── WORKFLOW_IMPROVEMENTS.md        # 功能改进说明
    └── EVENT_LISTENER_FIX.md          # 事件监听器修复说明
```

---

## API 接口

### Bisheng Platform API

#### 1. 登录

```
POST /api/v1/login
```

**请求**:
```json
{
  "user_name": "admin",
  "password": "password"
}
```

**响应**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### 2. 获取工作流列表

```
GET /api/v1/workflow/list?page_size=10&page_num=1
```

**响应**:
```json
{
  "data": {
    "data": [
      {
        "id": "e3f2330b3ab84082b1c7e336bc1018d5",
        "name": "CT 检查推荐智能体",
        "description": "根据患者信息推荐 CT 检查项目"
      }
    ]
  }
}
```

#### 3. 调用工作流（首次）

```
POST /api/v2/workflow/invoke
```

**请求**:
```json
{
  "workflow_id": "e3f2330b3ab84082b1c7e336bc1018d5",
  "stream": true
}
```

**响应**: SSE 流

```
data: {"session_id":"xxx_async_task_id","data":{"event":"guide_word","message":"你好！我是 CT 检查推荐智能体..."}}

data: {"session_id":"xxx_async_task_id","data":{"event":"input","node_id":"input_e1758","message_id":"1"}}
```

#### 4. 调用工作流（继续对话）

```
POST /api/v2/workflow/invoke
```

**请求**:
```json
{
  "workflow_id": "e3f2330b3ab84082b1c7e336bc1018d5",
  "stream": true,
  "session_id": "xxx_async_task_id",
  "message_id": 1,
  "input": {
    "input_e1758": {
      "user_input": "肝脏平扫的参数"
    }
  }
}
```

#### 5. 停止工作流

```
POST /api/v2/workflow/stop
```

**请求**:
```json
{
  "workflow_id": "e3f2330b3ab84082b1c7e336bc1018d5",
  "session_id": "xxx_async_task_id"
}
```

---

## 使用指南

### 配置 Bisheng 服务

1. 打开设置页面
2. 配置 Bisheng 服务地址（例如：`http://localhost:3001`）
3. 输入用户名和密码
4. 选择模式（API 或 iframe）
5. 保存配置

### 使用智能体

1. 进入智能体服务页面
2. 从左侧列表选择智能体
3. 自动显示欢迎语
4. 输入消息并发送
5. 查看流式响应
6. 可以随时点击"停止"按钮中断

### 切换智能体

1. 点击左侧列表中的其他智能体
2. 之前的对话历史自动保留
3. 新智能体自动启动并显示欢迎语

---

## 故障排查

### 问题 1: 无法获取智能体列表

**症状**: 列表为空或显示错误

**解决方法**:
1. 检查 Bisheng 服务是否运行
2. 检查服务地址配置是否正确
3. 检查是否已登录（Access Token 是否有效）
4. 查看控制台错误日志

### 问题 2: 发送消息后无响应

**症状**: 一直显示加载状态，没有收到回复

**解决方法**:
1. 检查控制台是否有 `buffer is not defined` 错误
2. 检查是否收到 SSE 事件（查看 `[DEBUG]` 日志）
3. 检查 `sessionId`、`messageId`、`inputNodeId` 是否正确
4. 尝试点击"停止"按钮，然后重新发送

### 问题 3: 切换智能体后无法对话

**症状**: 切换智能体后，新智能体无法响应

**解决方法**:
1. 检查事件监听器是否正确清理（查看 `[Cleanup]` 日志）
2. 刷新页面重试
3. 检查是否有多个 streamId 的事件混淆

### 问题 4: 停止按钮无效

**症状**: 点击停止按钮后，工作流仍在运行

**解决方法**:
1. 检查 `sessionId` 是否存在
2. 检查停止接口是否返回成功
3. 查看控制台错误日志
4. 刷新页面重试

---

## 总结

Bisheng 智能体功能提供了完整的智能体对话体验，包括：

✅ 智能体列表管理
✅ 流式对话
✅ 自动启动工作流
✅ 会话状态管理
✅ 停止工作流
✅ 双模式支持

通过合理的架构设计和状态管理，实现了稳定、高效的智能体对话功能。

