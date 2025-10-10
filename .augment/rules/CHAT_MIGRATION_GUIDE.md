# 对话组件统一管理迁移指南

**版本**: 1.0.0  
**日期**: 2025-10-09  
**目标**: 将现有对话组件迁移到统一的 `useChatStore` 管理方案

---

## 📋 目录

1. [现状分析](#现状分析)
2. [迁移策略](#迁移策略)
3. [桌面识别对话迁移](#桌面识别对话迁移)
4. [智能体对话迁移](#智能体对话迁移)
5. [迁移检查清单](#迁移检查清单)

---

## 现状分析

### 当前实现对比

| 组件 | 状态管理 | 持久化 | 符合规范 |
|------|---------|--------|---------|
| **Chat.tsx** | 自定义 useState | localStorage | ❌ 部分符合 |
| **OneClickDesktopChat.tsx** | 自定义 useState | 手动调用 saveChatMessage | ❌ 不符合 |
| **AgentChat.tsx** | useAgentSessionStore | 无 | ⚠️ 接近但独立 |

### 问题总结

1. **OneClickDesktopChat.tsx**:
   - ❌ 使用 `useState` 管理消息列表
   - ❌ 手动调用 `saveChatMessage` 持久化
   - ❌ 没有使用统一的 Store
   - ❌ 消息格式不符合规范

2. **AgentChat.tsx**:
   - ⚠️ 使用独立的 `useAgentSessionStore`
   - ⚠️ 消息类型为 `BishengMessage`，与规范的 `Message` 不完全一致
   - ✅ Store 架构与规范接近
   - ❌ 没有持久化功能

---

## 迁移策略

### 方案选择

**推荐方案**: 渐进式迁移，保持向后兼容

1. **阶段1**: 迁移 OneClickDesktopChat（优先级高）
2. **阶段2**: 统一 AgentChat 的 Store（可选）
3. **阶段3**: 添加持久化支持

### 统一的 sessionId 规范

```typescript
// 桌面识别对话
sessionId = `desktop-${patientId}` 或 `desktop-${timestamp}`

// 智能体对话
sessionId = `agent-${workflowId}`

// AI助手对话
sessionId = `assistant-global` 或 `assistant-${userId}`
```

---

## 桌面识别对话迁移

### 步骤1: 修改 OneClickDesktopChat.tsx

#### 1.1 导入统一的 Store

```typescript
import { useChatStore } from '../../stores/chatStore';
import type { Message } from '../../types/chat';
```

#### 1.2 替换状态管理

**修改前**:
```typescript
const [msgs, setMsgs] = useState<Msg[]>([]);
const [sessionId, setSessionId] = useState<string>('');

const push = (role: Msg['role'], content: string, id?: string) => {
  const item: Msg = { 
    id: id || `m_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, 
    role, 
    content, 
    created_at: Date.now() 
  };
  setMsgs(prev => [...prev, item]);
  return item.id;
};
```

**修改后**:
```typescript
const { 
  getSession, 
  addMessage, 
  updateMessage,
  clearSession,
  setLoading,
  persistSession 
} = useChatStore();

// 使用患者ID作为sessionId，如果没有则使用临时ID
const currentSessionId = patient?.patient_id 
  ? `desktop-${patient.patient_id}` 
  : `desktop-temp-${Date.now()}`;

const session = getSession(currentSessionId, '桌面识别对话');
const messages = session.messages;

const addMsg = (role: 'user' | 'assistant' | 'system', content: string) => {
  const message: Message = {
    id: `msg-${Date.now()}-${role}-${Math.random().toString(36).slice(2, 6)}`,
    sessionId: currentSessionId,
    role,
    content,
    timestamp: Date.now(),
    type: 'text',
  };
  addMessage(currentSessionId, message);
  return message.id;
};
```

#### 1.3 更新流式输出

**修改前**:
```typescript
const updateById = (id: string, appender: (old: string)=>string) => {
  setMsgs(prev => prev.map(m => m.id === id ? { ...m, content: appender(m.content) } : m));
};
```

**修改后**:
```typescript
const updateMsgContent = (messageId: string, newContent: string) => {
  updateMessage(currentSessionId, messageId, newContent);
};

// 在流式输出中使用
updateMsgContent(assistantMessageId, accumulatedContent);
```

#### 1.4 添加持久化

```typescript
// 在消息更新后自动持久化
useEffect(() => {
  if (session.messages.length > 0) {
    persistSession(currentSessionId);
  }
}, [session.messages, currentSessionId]);
```

#### 1.5 更新清除逻辑

**修改前**:
```typescript
const resetSession = () => {
  setRunning(false);
  setSessionId('');
  setScreenshot('');
  setPatient(null);
  setMsgs([]);
};
```

**修改后**:
```typescript
const resetSession = () => {
  setRunning(false);
  setScreenshot('');
  setPatient(null);
  if (currentSessionId) {
    clearSession(currentSessionId);
  }
};
```

### 步骤2: 更新消息渲染

保持现有的渲染逻辑，只需更新数据源：

```typescript
// 修改前
{msgs.map(m => (
  <div key={m.id}>
    {/* ... */}
  </div>
))}

// 修改后
{messages.map(m => (
  <div key={m.id}>
    {/* ... */}
  </div>
))}
```

### 步骤3: 移除手动持久化调用

删除所有 `saveChatMessage` 的手动调用，因为 Store 会自动处理：

```typescript
// ❌ 删除这些代码
try {
  saveChatMessage({ 
    id: userId, 
    session_id: sessionId || patient.patient_id, 
    role: 'user', 
    content: input.trim(), 
    created_at: Date.now() 
  });
} catch {}
```

---

## 智能体对话迁移

### 选项1: 保持独立 Store（推荐）

**理由**:
- `AgentChat` 有特殊的 Bisheng 会话管理需求（sessionId, messageId, inputNodeId）
- `useAgentSessionStore` 已经很好地实现了会话管理
- 迁移成本高，收益有限

**改进建议**:
1. 添加持久化支持
2. 统一消息类型定义
3. 遵循命名规范

### 选项2: 迁移到统一 Store（可选）

如果要迁移，需要：

1. 扩展 `ChatSession` 接口支持 Bisheng 特有字段：

```typescript
interface ChatSession {
  // ... 现有字段
  metadata?: {
    bisheng?: {
      sessionId: string | null;
      messageId: string | null;
      inputNodeId: string | null;
    };
  };
}
```

2. 修改 AgentChat 使用 useChatStore：

```typescript
const { getSession, addMessage, updateMessage } = useChatStore();
const session = getSession(`agent-${workflow.id}`, workflow.name);

// 访问 Bisheng 特有字段
const bishengMeta = session.metadata?.bisheng;
```

---

## 迁移检查清单

### OneClickDesktopChat 迁移

- [ ] 导入 `useChatStore` 和 `Message` 类型
- [ ] 替换 `useState` 为 `useChatStore`
- [ ] 更新 sessionId 生成逻辑
- [ ] 更新消息添加逻辑
- [ ] 更新流式输出逻辑
- [ ] 添加自动持久化
- [ ] 移除手动 `saveChatMessage` 调用
- [ ] 更新清除会话逻辑
- [ ] 测试基本功能
- [ ] 测试持久化功能
- [ ] 测试会话切换

### AgentChat 改进（如果选择保持独立）

- [ ] 添加持久化支持到 `useAgentSessionStore`
- [ ] 统一消息ID生成格式
- [ ] 添加错误处理
- [ ] 文档更新

---

## 下一步行动

1. **立即执行**: 迁移 OneClickDesktopChat
2. **评估**: 是否需要迁移 AgentChat
3. **测试**: 全面测试迁移后的功能
4. **文档**: 更新开发文档

---

**维护者**: 桌面AI助手开发团队  
**更新日期**: 2025-10-09

