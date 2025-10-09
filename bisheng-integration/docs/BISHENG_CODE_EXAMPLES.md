# Bisheng 智能体功能代码示例

## 📋 目录

1. [智能体列表组件](#智能体列表组件)
2. [智能体对话组件](#智能体对话组件)
3. [会话管理 Store](#会话管理-store)
4. [Bisheng 服务](#bisheng-服务)
5. [IPC 通信](#ipc-通信)
6. [类型定义](#类型定义)

---

## 智能体列表组件

**文件**: `src/renderer/components/AgentList.tsx`

### 完整示例

```typescript
import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Bot } from 'lucide-react';
import type { BishengWorkflow } from '../../shared/types';

interface AgentListProps {
  onSelectAgent: (agent: BishengWorkflow) => void;
  selectedAgent?: BishengWorkflow;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const AgentList: React.FC<AgentListProps> = ({
  onSelectAgent,
  selectedAgent,
  isCollapsed,
  onToggleCollapse
}) => {
  const [agents, setAgents] = useState<BishengWorkflow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 加载智能体列表
  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const workflows = await window.electronAPI.bisheng.getWorkflows(100, 1);
      setAgents(workflows);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 搜索过滤
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-80'} border-r transition-all duration-300`}>
      {/* 标题栏 */}
      <div className="p-4 border-b flex items-center justify-between">
        {!isCollapsed && <h2 className="text-lg font-semibold">智能体列表</h2>}
        <button onClick={onToggleCollapse}>
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* 搜索框 */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索智能体..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* 智能体列表 */}
          <div className="overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">加载中...</div>
            ) : filteredAgents.length === 0 ? (
              <div className="p-4 text-center text-gray-500">没有找到智能体</div>
            ) : (
              filteredAgents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => onSelectAgent(agent)}
                  className={`w-full p-4 text-left hover:bg-gray-100 transition-colors ${
                    selectedAgent?.id === agent.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Bot className="w-5 h-5 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{agent.name}</h3>
                      {agent.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AgentList;
```

---

## 智能体对话组件

**文件**: `src/renderer/components/AgentChat.tsx`

### 核心功能代码

#### 1. 组件初始化

```typescript
const AgentChat: React.FC<AgentChatProps> = ({ workflow }) => {
  // 状态管理
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // 会话管理
  const {
    getSession,
    updateSession,
    addMessage: addMessageToStore,
    updateMessage: updateMessageInStore,
    setActiveWorkflow
  } = useAgentSessionStore();

  const session = getSession(workflow.id, workflow.name);
  const messages = session.messages;
  const sessionId = session.sessionId;
  const messageId = session.messageId;
  const inputNodeId = session.inputNodeId;

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 工作流变化时处理
  useEffect(() => {
    // 清理之前的监听器
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    setActiveWorkflow(workflow.id);

    // 自动启动
    if (session.messages.length === 0 && !session.isAutoStarted) {
      autoStartWorkflow();
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [workflow.id]);
};
```

#### 2. 自动启动工作流

```typescript
const autoStartWorkflow = async () => {
  console.log('[AUTO-START] Starting workflow');
  setIsProcessing(true);

  // 创建助手消息占位符
  const assistantMessage: BishengMessage = {
    id: `msg-${Date.now()}-assistant`,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    type: 'stream',
  };
  addMessageToStore(workflow.id, assistantMessage);

  // 标记为已自动启动
  updateSession(workflow.id, { isAutoStarted: true });

  // 清理之前的监听器
  if (cleanupRef.current) {
    cleanupRef.current();
    cleanupRef.current = null;
  }

  let assistantContent = '';

  try {
    // 调用工作流（不传递用户输入）
    const { streamId } = await window.electronAPI.bisheng.invokeWorkflow(
      workflow.id,
      { user_input: '' },
      true
    );

    // 处理 SSE 事件
    const handleStreamChunk = (e: { streamId: string; chunk: string }) => {
      if (e.streamId !== streamId) return;

      const lines = e.chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const event = JSON.parse(line.substring(6));

        // 保存 session_id
        if (event.session_id && !sessionId) {
          updateSession(workflow.id, { sessionId: event.session_id });
        }

        // 处理不同事件类型
        if (event.data?.event === 'guide_word') {
          assistantContent += event.data.message;
          updateMessageInStore(workflow.id, assistantMessage.id, assistantContent);
        } else if (event.data?.event === 'input') {
          updateSession(workflow.id, {
            messageId: event.data.message_id,
            inputNodeId: event.data.node_id,
          });
        }
      }
    };

    const handleStreamEnd = (e: { streamId: string; success: boolean }) => {
      if (e.streamId !== streamId) return;
      
      setIsProcessing(false);
      
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };

    // 注册监听器
    const offChunk = window.electronAPI.bisheng.onStreamChunk(handleStreamChunk);
    const offEnd = window.electronAPI.bisheng.onStreamEnd(handleStreamEnd);

    cleanupRef.current = () => {
      offChunk();
      offEnd();
    };

  } catch (error) {
    console.error('[AUTO-START] Error:', error);
    setError('自动启动失败');
    setIsProcessing(false);
  }
};
```

#### 3. 发送消息

```typescript
const handleSendMessage = async () => {
  if (!inputText.trim() || isProcessing) return;

  const currentInput = inputText;
  setInputText('');
  setIsProcessing(true);

  // 添加用户消息
  const userMessage: BishengMessage = {
    id: `msg-${Date.now()}-user`,
    role: 'user',
    content: currentInput,
    timestamp: Date.now(),
    type: 'text',
  };
  addMessageToStore(workflow.id, userMessage);

  // 添加助手消息占位符
  const assistantMessage: BishengMessage = {
    id: `msg-${Date.now()}-assistant`,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    type: 'stream',
  };
  addMessageToStore(workflow.id, assistantMessage);

  // 清理之前的监听器
  if (cleanupRef.current) {
    cleanupRef.current();
    cleanupRef.current = null;
  }

  let assistantContent = '';
  let buffer = '';

  try {
    // 调用工作流
    const { streamId } = await window.electronAPI.bisheng.invokeWorkflow(
      workflow.id,
      { user_input: currentInput },
      true,
      sessionId || undefined,
      messageId || undefined,
      inputNodeId || undefined
    );

    // 处理 SSE chunk
    const offChunk = window.electronAPI.bisheng.onStreamChunk(({ streamId: id, chunk }) => {
      if (id !== streamId) return;

      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const event = JSON.parse(line.substring(6));

        // 更新 session_id
        if (event.session_id && !sessionId) {
          updateSession(workflow.id, { sessionId: event.session_id });
        }

        // 处理流式消息
        if (event.data?.event === 'stream_msg' && event.data.status === 'stream') {
          assistantContent += event.data.message || '';
          updateMessageInStore(workflow.id, assistantMessage.id, assistantContent);
        }

        // 处理输入事件
        if (event.data?.event === 'input') {
          updateSession(workflow.id, {
            messageId: event.data.message_id,
            inputNodeId: event.data.node_id,
          });
        }
      }
    });

    // 处理流结束
    const offEnd = window.electronAPI.bisheng.onStreamEnd(({ streamId: id, success }) => {
      if (id !== streamId) return;

      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      setIsProcessing(false);
      inputRef.current?.focus();
    });

    cleanupRef.current = () => {
      offChunk();
      offEnd();
    };

  } catch (error) {
    console.error('Failed to send message:', error);
    setError('发送消息失败');
    setIsProcessing(false);
  }
};
```

#### 4. 停止工作流

```typescript
const handleStopWorkflow = async () => {
  if (!sessionId) {
    console.warn('[STOP] No sessionId available');
    return;
  }

  try {
    await window.electronAPI.bisheng.stopWorkflow(workflow.id, sessionId);
    
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    setIsProcessing(false);
    setError(null);
    inputRef.current?.focus();
    
  } catch (error) {
    console.error('[STOP] Failed:', error);
    setError('停止工作流失败');
  }
};
```

---

## 会话管理 Store

**文件**: `src/renderer/store/agentSessionStore.ts`

```typescript
import { create } from 'zustand';

interface BishengMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type: 'text' | 'stream' | 'error';
}

interface AgentSession {
  workflowId: string;
  workflowName: string;
  sessionId: string | null;
  messageId: string | null;
  inputNodeId: string | null;
  messages: BishengMessage[];
  lastUpdate: number;
  isActive: boolean;
  isAutoStarted: boolean;
}

interface AgentSessionState {
  sessions: Map<string, AgentSession>;
  
  getSession: (workflowId: string, workflowName: string) => AgentSession;
  updateSession: (workflowId: string, updates: Partial<AgentSession>) => void;
  addMessage: (workflowId: string, message: BishengMessage) => void;
  updateMessage: (workflowId: string, messageId: string, content: string) => void;
  setActiveWorkflow: (workflowId: string) => void;
}

export const useAgentSessionStore = create<AgentSessionState>((set, get) => ({
  sessions: new Map(),

  getSession: (workflowId, workflowName) => {
    const sessions = get().sessions;
    if (!sessions.has(workflowId)) {
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
      set({ sessions: new Map(sessions) });
    }
    return sessions.get(workflowId)!;
  },

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

  addMessage: (workflowId, message) => {
    const sessions = get().sessions;
    const session = sessions.get(workflowId);
    if (session) {
      session.messages.push(message);
      session.lastUpdate = Date.now();
      set({ sessions: new Map(sessions) });
    }
  },

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

  setActiveWorkflow: (workflowId) => {
    const sessions = get().sessions;
    sessions.forEach((session, id) => {
      session.isActive = id === workflowId;
    });
    set({ sessions: new Map(sessions) });
  },
}));
```

---

## Bisheng 服务

**文件**: `src/services/bisheng.ts`

### 关键方法

```typescript
export class BishengService {
  private config: BishengConfig;
  private logger: Logger;

  constructor(config: BishengConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  // 登录
  async login(username: string, password: string): Promise<LoginResult> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: username, password }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      token: data.access_token,
      expiry: Date.now() + 24 * 60 * 60 * 1000,
    };
  }

  // 获取工作流列表
  async getWorkflows(pageSize = 10, pageNum = 1): Promise<BishengWorkflow[]> {
    const url = `${this.config.baseUrl}/api/v1/workflow/list?page_size=${pageSize}&page_num=${pageNum}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Get workflows failed: ${response.status}`);
    }

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

    if (!response.ok) {
      throw new Error(`Invoke workflow failed: ${response.status}`);
    }

    return response.body!;
  }

  // 停止工作流
  async stopWorkflow(workflowId: string, sessionId: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/v2/workflow/stop`, {
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

    if (!response.ok) {
      throw new Error(`Stop workflow failed: ${response.status}`);
    }
  }
}
```

---

## IPC 通信

### Preload Script

**文件**: `src/main/preload.ts`

```typescript
const electronAPI = {
  bisheng: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke('bisheng-login', username, password),
    
    getWorkflows: (pageSize?: number, pageNum?: number) =>
      ipcRenderer.invoke('bisheng-get-workflows', pageSize, pageNum),
    
    invokeWorkflow: (
      workflowId: string,
      input: any,
      stream?: boolean,
      sessionId?: string,
      messageId?: string,
      inputNodeId?: string
    ) =>
      ipcRenderer.invoke('bisheng-invoke-workflow', workflowId, input, stream, sessionId, messageId, inputNodeId),
    
    stopWorkflow: (workflowId: string, sessionId: string) =>
      ipcRenderer.invoke('bisheng-stop-workflow', workflowId, sessionId),
    
    onStreamStart: (callback: (e: { streamId: string }) => void) =>
      eventManager.addListener('bisheng-stream-start', callback),
    
    onStreamChunk: (callback: (e: { streamId: string; chunk: string }) => void) =>
      eventManager.addListener('bisheng-stream-chunk', callback),
    
    onStreamEnd: (callback: (e: { streamId: string; success: boolean }) => void) =>
      eventManager.addListener('bisheng-stream-end', callback),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

### Main Process

**文件**: `src/main/main.ts`

```typescript
// 调用工作流
ipcMain.handle('bisheng-invoke-workflow', async (
  event,
  workflowId: string,
  input: Record<string, any>,
  stream: boolean = true,
  sessionId?: string,
  messageId?: string,
  inputNodeId?: string
) => {
  const streamId = `bisheng-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const webContents = event.sender;

  try {
    const readableStream = await this.bishengService.invokeWorkflow(
      workflowId,
      input,
      stream,
      sessionId,
      messageId,
      inputNodeId
    );

    // 发送流开始事件
    webContents.send('bisheng-stream-start', { streamId, workflowId });

    // 读取流并转发
    const reader = readableStream.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      webContents.send('bisheng-stream-chunk', { streamId, chunk });
    }

    webContents.send('bisheng-stream-end', { streamId, success: true });

  } catch (error) {
    webContents.send('bisheng-stream-end', {
      streamId,
      success: false,
      error: error.message,
    });
  }

  return { streamId };
});

// 停止工作流
ipcMain.handle('bisheng-stop-workflow', async (
  event,
  workflowId: string,
  sessionId: string
) => {
  await this.bishengService.stopWorkflow(workflowId, sessionId);
});
```

---

## 类型定义

**文件**: `src/shared/types.ts`

```typescript
export interface BishengWorkflow {
  id: string;
  name: string;
  description?: string;
  user_id?: number;
  create_time?: string;
  update_time?: string;
}

export interface BishengConfig {
  enabled: boolean;
  baseUrl: string;
  accessToken?: string;
  tokenExpiry?: number;
  mode: 'api' | 'iframe';
  username?: string;
  password?: string;
  autoLogin?: boolean;
}

export interface BishengMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type: 'text' | 'stream' | 'error';
}

export interface BishengSession {
  workflowId: string;
  workflowName: string;
  sessionId: string | null;
  messageId: string | null;
  inputNodeId: string | null;
  messages: BishengMessage[];
  lastUpdate: number;
  isActive: boolean;
  isAutoStarted: boolean;
}
```

---

这些代码示例展示了 Bisheng 智能体功能的核心实现，可以作为开发和维护的参考。

