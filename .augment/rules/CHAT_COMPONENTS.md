# 对话组件开发规则

**版本**: 1.0.0  
**日期**: 2025-10-09  
**适用范围**: 所有对话相关组件

---

## 📋 目录

1. [核心原则](#核心原则)
2. [组件接口规范](#组件接口规范)
3. [状态管理规范](#状态管理规范)
4. [样式规范](#样式规范)
5. [代码示例](#代码示例)
6. [最佳实践](#最佳实践)
7. [代码审查清单](#代码审查清单)

---

## 核心原则

### 1. 统一接口

所有对话组件**必须**实现统一的接口，确保可互换性和可维护性。

### 2. 状态集中管理

使用Zustand Store统一管理对话状态，**禁止**使用多套状态管理方案。

### 3. 样式一致性

遵循玻璃效果样式规范（参考 `docs/GLASS_STYLE_GUIDE.md`），确保视觉一致性。

### 4. 性能优先

长对话场景下必须保持流畅，使用虚拟滚动、防抖节流等优化手段。

### 5. 可访问性

支持键盘操作、屏幕阅读器，遵循WCAG 2.1 AA标准。

---

## 组件接口规范

### 基础Props接口

所有对话组件**必须**接受以下Props：

```typescript
interface BaseChatProps {
  /**
   * 会话ID，用于区分不同的对话会话
   * 必需，用于状态管理和持久化
   */
  sessionId: string;
  
  /**
   * 会话名称，显示在头部
   * 可选，默认为"对话"
   */
  sessionName?: string;
  
  /**
   * 自定义类名
   * 可选，用于外部样式覆盖
   */
  className?: string;
  
  /**
   * 是否启用持久化
   * 可选，默认为true
   */
  enablePersistence?: boolean;
  
  /**
   * 是否启用智能建议
   * 可选，默认为false
   */
  enableSuggestions?: boolean;
  
  /**
   * 自定义配置
   * 可选，用于扩展功能
   */
  config?: ChatConfig;
}
```

### 扩展Props接口

特定场景的对话组件可以扩展基础接口：

```typescript
// AI助手对话
interface AIChatProps extends BaseChatProps {
  /**
   * AI模型配置
   */
  modelConfig?: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  
  /**
   * 是否启用联网搜索
   */
  enableWebSearch?: boolean;
}

// 医疗对话
interface MedicalChatProps extends BaseChatProps {
  /**
   * 患者信息
   */
  patientInfo?: PatientInfo;
  
  /**
   * 是否自动启动流程
   */
  autoStart?: boolean;
}

// 智能体对话
interface AgentChatProps extends BaseChatProps {
  /**
   * 工作流配置
   */
  workflow: BishengWorkflow;
  
  /**
   * 是否自动启动工作流
   */
  autoStartWorkflow?: boolean;
}
```

---

## 状态管理规范

### 统一使用Zustand Store

**必须**使用统一的`useChatStore`管理对话状态，**禁止**使用以下方式：

❌ **错误示例**：
```typescript
// 不要使用 useState 管理消息列表
const [messages, setMessages] = useState<Message[]>([]);

// 不要使用 sessionStorage 直接存储
sessionStorage.setItem('chatMessages', JSON.stringify(messages));

// 不要创建多个独立的 Store
const useAIChatStore = create(...);
const useMedicalChatStore = create(...);
```

✅ **正确示例**：
```typescript
// 使用统一的 Store
import { useChatStore } from '@/stores/chatStore';

const MyChat: React.FC<BaseChatProps> = ({ sessionId }) => {
  const { 
    getSession, 
    addMessage, 
    updateMessage,
    setLoading 
  } = useChatStore();
  
  const session = getSession(sessionId);
  const messages = session.messages;
  
  // ...
};
```

### Store接口定义

```typescript
interface ChatStore {
  // 会话管理
  sessions: Map<string, ChatSession>;
  activeSessionId: string | null;
  
  /**
   * 获取或创建会话
   */
  getSession: (sessionId: string, sessionName?: string) => ChatSession;
  
  /**
   * 更新会话状态
   */
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  
  /**
   * 添加消息
   */
  addMessage: (sessionId: string, message: Message) => void;
  
  /**
   * 更新消息内容（用于流式输出）
   */
  updateMessage: (sessionId: string, messageId: string, content: string) => void;
  
  /**
   * 删除消息
   */
  deleteMessage: (sessionId: string, messageId: string) => void;
  
  /**
   * 清空会话
   */
  clearSession: (sessionId: string) => void;
  
  /**
   * 设置加载状态
   */
  setLoading: (sessionId: string, loading: boolean) => void;
  
  /**
   * 设置错误信息
   */
  setError: (sessionId: string, error: string | null) => void;
  
  /**
   * 设置智能建议
   */
  setSuggestions: (sessionId: string, suggestions: string[]) => void;
  
  /**
   * 切换活跃会话
   */
  setActiveSession: (sessionId: string) => void;
  
  /**
   * 持久化到本地存储
   */
  persistSession: (sessionId: string) => void;
  
  /**
   * 从本地存储恢复
   */
  restoreSession: (sessionId: string) => void;
}
```

### 数据模型

```typescript
interface Message {
  id: string;                    // 唯一标识，格式: msg-{timestamp}-{random}
  sessionId: string;             // 所属会话ID
  role: 'user' | 'assistant' | 'system';
  content: string;               // 消息内容
  timestamp: number;             // Unix时间戳（毫秒）
  type?: 'text' | 'stream' | 'error'; // 消息类型
  attachments?: Attachment[];    // 附件列表
  metadata?: Record<string, any>; // 扩展元数据
}

interface ChatSession {
  id: string;                    // 会话ID
  name: string;                  // 会话名称
  messages: Message[];           // 消息列表
  isLoading: boolean;            // 是否正在加载
  error: string | null;          // 错误信息
  suggestions: string[];         // 智能建议列表
  lastUpdate: number;            // 最后更新时间
  isActive: boolean;             // 是否为活跃会话
  metadata?: Record<string, any>; // 扩展元数据
}

interface Attachment {
  type: 'image' | 'file';
  name: string;
  url: string;                   // dataURL 或 文件路径
  size?: number;                 // 文件大小（字节）
  mimeType?: string;             // MIME类型
}
```

---

## 样式规范

### 遵循玻璃效果规范

**必须**遵循 `docs/GLASS_STYLE_GUIDE.md` 中的样式规范。

### 消息气泡样式

```typescript
// 用户消息
const userMessageClass = `
  ml-auto max-w-[80%] 
  bg-blue-600 dark:bg-blue-700 
  text-white 
  rounded-2xl rounded-tr-sm 
  px-4 py-2
`;

// 助手消息
const assistantMessageClass = `
  mr-auto max-w-[80%] 
  glass 
  text-gray-900 dark:text-gray-100 
  rounded-2xl rounded-tl-sm 
  px-4 py-2
`;

// 系统消息
const systemMessageClass = `
  mx-auto max-w-[60%] 
  bg-yellow-50 dark:bg-yellow-900/20 
  text-yellow-800 dark:text-yellow-200 
  rounded-lg 
  px-3 py-1.5 
  text-sm
`;
```

### 输入框样式

```typescript
const inputClass = `
  w-full 
  glass 
  border border-gray-200 dark:border-gray-700 
  rounded-lg 
  px-4 py-2 
  min-h-[44px] max-h-[120px] 
  resize-none 
  focus:ring-2 focus:ring-primary focus:outline-none
  transition-all
`;
```

### 按钮样式

```typescript
// 主要按钮（发送）
const primaryButtonClass = `
  px-4 py-2 
  bg-primary text-primary-foreground 
  rounded-lg 
  hover:bg-primary/90 
  disabled:opacity-50 disabled:cursor-not-allowed 
  transition-colors
`;

// 次要按钮（操作按钮）
const secondaryButtonClass = `
  p-2 
  rounded-lg 
  hover:glass 
  transition-all
`;
```

### 禁止的样式写法

❌ **错误示例**：
```typescript
// 不要使用冗余的 dark:glass-dark
<div className="glass dark:glass-dark">

// 不要使用旧的语义化类名
<div className="glass-header">
<div className="glass-effect">
<div className="glass-card">

// 不要硬编码颜色值
<div style={{ backgroundColor: '#1a1a1a' }}>
```

✅ **正确示例**：
```typescript
// 使用统一的 .glass 类
<div className="glass">

// 使用 Tailwind 颜色变量
<div className="bg-background text-foreground">

// 使用 CSS 变量
<div style={{ backgroundColor: 'var(--background)' }}>
```

---

## 代码示例

### 基础对话组件模板

```typescript
import React, { useRef, useEffect } from 'react';
import { Send, Loader2, StopCircle } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useConfigStore } from '@/stores/configStore';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestionBar } from './SuggestionBar';

interface MyChatProps extends BaseChatProps {
  // 扩展Props
}

export const MyChat: React.FC<MyChatProps> = ({
  sessionId,
  sessionName = '对话',
  className = '',
  enablePersistence = true,
  enableSuggestions = false,
  config,
}) => {
  const { config: globalConfig } = useConfigStore();
  const {
    getSession,
    addMessage,
    updateMessage,
    setLoading,
    setError,
    persistSession,
    restoreSession,
  } = useChatStore();

  const session = getSession(sessionId, sessionName);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 恢复会话
  useEffect(() => {
    if (enablePersistence) {
      restoreSession(sessionId);
    }
  }, [sessionId, enablePersistence]);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  // 持久化
  useEffect(() => {
    if (enablePersistence) {
      persistSession(sessionId);
    }
  }, [session.messages, sessionId, enablePersistence]);

  // 发送消息
  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!content.trim() || session.isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      role: 'user',
      content,
      timestamp: Date.now(),
      type: 'text',
      attachments: attachments?.map(f => ({
        type: f.type.startsWith('image/') ? 'image' : 'file',
        name: f.name,
        url: URL.createObjectURL(f),
        size: f.size,
        mimeType: f.type,
      })),
    };

    addMessage(sessionId, userMessage);
    setLoading(sessionId, true);
    setError(sessionId, null);

    // 创建助手消息占位符
    const assistantMessageId = `msg-${Date.now()}-assistant`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      sessionId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      type: 'stream',
    };

    addMessage(sessionId, assistantMessage);

    // 创建 AbortController
    abortControllerRef.current = new AbortController();

    try {
      // 调用AI服务（流式）
      await streamResponse(content, {
        signal: abortControllerRef.current.signal,
        onChunk: (chunk: string) => {
          updateMessage(sessionId, assistantMessageId, chunk);
        },
        onComplete: () => {
          setLoading(sessionId, false);
          // 生成智能建议
          if (enableSuggestions) {
            generateSuggestions(sessionId);
          }
        },
        onError: (error: Error) => {
          setError(sessionId, error.message);
          setLoading(sessionId, false);
        },
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError(sessionId, error.message);
      }
      setLoading(sessionId, false);
    }
  };

  // 停止生成
  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
    setLoading(sessionId, false);
  };

  const isGlass = globalConfig.theme === 'glass' || globalConfig.windows?.main?.glassEffect?.enabled;

  return (
    <div className={`flex flex-col h-full ${isGlass ? 'bg-transparent' : 'bg-background'} ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold">{session.name}</h2>
          <p className="text-sm text-muted-foreground">
            {session.messages.length} 条消息
          </p>
        </div>
        <button
          onClick={() => clearSession(sessionId)}
          className="p-2 rounded-lg hover:glass transition-all"
          title="清空对话"
        >
          清空
        </button>
      </div>

      {/* 消息列表 */}
      <MessageList
        messages={session.messages}
        isLoading={session.isLoading}
        error={session.error}
      />
      <div ref={messagesEndRef} />

      {/* 智能建议 */}
      {enableSuggestions && session.suggestions.length > 0 && (
        <SuggestionBar
          suggestions={session.suggestions}
          onSelect={(suggestion) => handleSendMessage(suggestion)}
        />
      )}

      {/* 输入区 */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={session.isLoading}
        placeholder="输入消息..."
        showStopButton={session.isLoading}
        onStop={handleStopGeneration}
      />
    </div>
  );
};
```

---

## 最佳实践

### 1. 消息ID生成

**必须**使用以下格式生成唯一ID：

```typescript
const generateMessageId = (role: 'user' | 'assistant' | 'system') => {
  return `msg-${Date.now()}-${role}-${Math.random().toString(36).slice(2, 6)}`;
};
```

### 2. 流式输出处理

```typescript
const handleStreamResponse = async (
  content: string,
  options: {
    signal: AbortSignal;
    onChunk: (chunk: string) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
  }
) => {
  let accumulated = '';
  
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content }),
      signal: options.signal,
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      accumulated += chunk;
      options.onChunk(accumulated);
    }

    options.onComplete();
  } catch (error) {
    if (error.name !== 'AbortError') {
      options.onError(error);
    }
  }
};
```

### 3. 错误处理

```typescript
const handleError = (error: Error, sessionId: string) => {
  const { setError } = useChatStore.getState();
  
  // 网络错误
  if (error.message.includes('fetch')) {
    setError(sessionId, '网络连接失败，请检查网络设置');
    return;
  }
  
  // 超时错误
  if (error.message.includes('timeout')) {
    setError(sessionId, '请求超时，请稍后重试');
    return;
  }
  
  // API限流
  if (error.message.includes('rate limit')) {
    setError(sessionId, 'API调用频率过高，请稍后再试');
    return;
  }
  
  // 通用错误
  setError(sessionId, `发生错误: ${error.message}`);
};
```

### 4. 性能优化

```typescript
// 使用 React.memo 避免不必要的重渲染
export const MessageItem = React.memo<MessageItemProps>(({ message }) => {
  // ...
});

// 使用 useMemo 缓存计算结果
const formattedMessages = useMemo(() => {
  return messages.map(msg => ({
    ...msg,
    formattedTime: formatTime(msg.timestamp),
  }));
}, [messages]);

// 使用 useCallback 缓存回调函数
const handleCopy = useCallback((content: string) => {
  navigator.clipboard.writeText(content);
  toast.success('已复制');
}, []);
```

---

## 代码审查清单

在提交代码前，请确认：

### 接口规范
- [ ] 组件实现了 `BaseChatProps` 接口
- [ ] Props类型定义完整且正确
- [ ] 使用了TypeScript严格模式

### 状态管理
- [ ] 使用统一的 `useChatStore`
- [ ] 没有使用 `useState` 管理消息列表
- [ ] 没有直接操作 `sessionStorage` 或 `localStorage`
- [ ] 正确实现了持久化逻辑

### 样式规范
- [ ] 使用 `.glass` 类而非旧的语义化类名
- [ ] 没有使用冗余的 `dark:glass-dark`
- [ ] 遵循了消息气泡样式规范
- [ ] 使用了Tailwind CSS变量而非硬编码颜色

### 功能完整性
- [ ] 实现了基础交互（输入、发送、显示）
- [ ] 实现了流式输出控制
- [ ] 实现了停止生成功能
- [ ] 实现了自动滚动
- [ ] 实现了错误处理

### 性能优化
- [ ] 使用了 `React.memo` 优化组件
- [ ] 使用了 `useMemo` 和 `useCallback`
- [ ] 长列表使用了虚拟滚动（>100条消息）
- [ ] 输入框使用了防抖

### 可访问性
- [ ] 添加了ARIA标签
- [ ] 支持键盘操作
- [ ] 按钮有明确的 `title` 属性
- [ ] 表单元素有关联的 `label`

### 代码质量
- [ ] 没有console.log（除非必要）
- [ ] 没有TODO注释
- [ ] 变量命名清晰
- [ ] 函数职责单一
- [ ] 添加了必要的注释

---

**维护者**: 桌面AI助手开发团队  
**更新日期**: 2025-10-09

