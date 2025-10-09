# Bisheng 对话功能事件丢失问题修复

## 问题诊断

### 症状
- ✅ 登录成功
- ✅ 工作流列表获取成功
- ❌ 发送消息后一直显示加载状态，没有显示 AI 回复
- ❌ 浏览器 Console 没有 "Stream started:", "SSE event:", "Stream ended:" 等日志

### 根本原因

**事件监听器注册时机错误**：

在 `AgentChat.tsx` 中，事件监听器是在 `invokeWorkflow` 调用**之后**才注册的：

```typescript
// 错误的顺序
const { streamId } = await window.electronAPI.bisheng.invokeWorkflow(...);  // 1. 先调用
const offStart = window.electronAPI.bisheng.onStreamStart(...);              // 2. 后注册监听器
const offChunk = window.electronAPI.bisheng.onStreamChunk(...);
const offEnd = window.electronAPI.bisheng.onStreamEnd(...);
```

这导致主进程发送的事件在监听器注册之前就已经发送完了，渲染进程无法接收到这些事件。

### 次要问题

**messageId 初始值错误**：

```typescript
const [messageId, setMessageId] = useState<string>('0');  // 错误：'0' 不是有效的 message_id
```

根据 Bisheng API 规范：
- 首次调用工作流时，不应该传递 `messageId`
- 只有在收到 `input` 事件后，才应该使用提取的 `message_id` 继续对话

## 修复内容

### 修复 1: 调整事件监听器注册时机

**文件**: `src/renderer/components/AgentChat.tsx`

**修改前**:
```typescript
// 调用工作流
const { streamId } = await window.electronAPI.bisheng.invokeWorkflow(...);

// 监听事件
const offStart = window.electronAPI.bisheng.onStreamStart(...);
const offChunk = window.electronAPI.bisheng.onStreamChunk(...);
const offEnd = window.electronAPI.bisheng.onStreamEnd(...);
```

**修改后**:
```typescript
let streamId: string | null = null;

// 先注册事件监听器
const offStart = window.electronAPI.bisheng.onStreamStart(...);
const offChunk = window.electronAPI.bisheng.onStreamChunk(...);
const offEnd = window.electronAPI.bisheng.onStreamEnd(...);

// 然后调用工作流
const result = await window.electronAPI.bisheng.invokeWorkflow(...);
streamId = result.streamId;
```

### 修复 2: 修正 sessionId 和 messageId 初始值

**修改前**:
```typescript
const [sessionId, setSessionId] = useState<string>(`session-${Date.now()}`);
const [messageId, setMessageId] = useState<string>('0');
```

**修改后**:
```typescript
const [sessionId, setSessionId] = useState<string | null>(null);
const [messageId, setMessageId] = useState<string | null>(null);
```

**原因**:
- `sessionId` 应该从第一个 SSE 事件中提取，不应该自己生成
- `messageId` 应该从 `input` 事件中提取，首次调用时不传递

### 修复 3: 添加详细的调试日志

添加了以下调试日志：
- `[DEBUG] Registering event listeners...` - 注册监听器
- `[DEBUG] Stream start event received:` - 收到 stream-start 事件
- `[DEBUG] Stream chunk event received:` - 收到 stream-chunk 事件
- `[DEBUG] Stream end event received:` - 收到 stream-end 事件
- `[DEBUG] Calling invokeWorkflow...` - 调用工作流
- `[DEBUG] Workflow invoked, streamId:` - 工作流调用成功
- `[DEBUG] Waiting for stream events...` - 等待事件

## 验证步骤

### 步骤 1: 重新编译和启动

```bash
cd desktop-ai-assistant
npm run build:main
npm run dev
```

### 步骤 2: 测试对话功能

1. 打开应用
2. 进入 Bisheng 测试页面
3. 选择工作流"检查项目推荐"
4. 打开浏览器 DevTools Console
5. 发送消息："你好"

### 步骤 3: 检查日志

**应该看到以下日志顺序**:

```
Invoking workflow {workflowId: "...", sessionId: null, messageId: null, input: "你好"}
[DEBUG] Registering event listeners...
[DEBUG] Calling invokeWorkflow...
[DEBUG] Workflow invoked, streamId: bisheng-...
[DEBUG] Waiting for stream events...
[DEBUG] Stream start event received: bisheng-...
Stream started: bisheng-...
[DEBUG] Stream chunk event received: {streamId: "bisheng-...", chunkLength: 123}
SSE event: guide_question {...}
[DEBUG] Stream chunk event received: {streamId: "bisheng-...", chunkLength: 456}
SSE event: input {...}
Setting session_id: 543b4e9c81024fd08bb64ac53994a27e_async_task_id
Setting message_id: 421
[DEBUG] Stream end event received: {streamId: "bisheng-...", success: true}
Stream ended: {success: true}
```

### 步骤 4: 验证 UI 显示

**预期结果**:
- 用户消息立即显示
- 显示"正在处理"状态
- 显示助手消息："工作流已准备就绪，请继续输入..." 或引导问题
- "正在处理"状态消失

### 步骤 5: 测试继续对话

1. 再次发送消息："请介绍一下你自己"
2. **预期结果**:
   - Console 显示 `sessionId: "543b4e9c81024fd08bb64ac53994a27e_async_task_id"`
   - Console 显示 `messageId: "421"`
   - 收到 `stream_msg` 或 `output_msg` 事件
   - UI 显示 AI 的回复内容

## 关键改进

### 1. 事件监听器生命周期

**之前的问题**:
```
时间线:
T0: 调用 invokeWorkflow
T1: 主进程发送 stream-start 事件
T2: 主进程发送 stream-chunk 事件
T3: 主进程发送 stream-end 事件
T4: invokeWorkflow 返回
T5: 注册事件监听器 ❌ 太晚了，事件已经发送完了
```

**修复后**:
```
时间线:
T0: 注册事件监听器 ✅
T1: 调用 invokeWorkflow
T2: 主进程发送 stream-start 事件 ✅ 监听器已注册
T3: 主进程发送 stream-chunk 事件 ✅ 监听器已注册
T4: 主进程发送 stream-end 事件 ✅ 监听器已注册
```

### 2. Session 管理

**之前的问题**:
- 自己生成 `session-${Date.now()}`，与 Bisheng 服务器不一致
- 使用固定的 `messageId: '0'`，不是有效值

**修复后**:
- `sessionId` 从第一个 SSE 事件中提取
- `messageId` 从 `input` 事件中提取
- 首次调用时不传递这两个参数

### 3. 调试能力

添加了详细的 `[DEBUG]` 日志，可以清楚地看到：
- 事件监听器何时注册
- 何时调用工作流
- 何时收到各种事件
- 事件是否被正确处理

## 常见问题排查

### 问题 1: 仍然没有收到事件

**检查**:
1. 查看 Console 是否有 `[DEBUG] Stream start event received:` 日志
2. 如果没有，检查主进程日志，确认是否发送了事件

**可能原因**:
- 主进程没有正确发送事件
- eventManager 有问题

### 问题 2: 收到事件但被忽略

**检查**:
1. 查看 Console 是否有 `[DEBUG] Ignoring chunk for different streamId` 日志
2. 比较事件中的 streamId 和本地的 streamId

**可能原因**:
- streamId 不匹配
- 事件监听器中的条件判断有问题

### 问题 3: sessionId 或 messageId 未更新

**检查**:
1. 查看 Console 是否有 "Setting session_id:" 和 "Setting message_id:" 日志
2. 检查 SSE 事件中是否包含这些字段

**可能原因**:
- SSE 事件解析有问题
- React 状态更新有问题

## 技术说明

### Electron IPC 事件机制

Electron 的 IPC 通信分为两种：
1. **invoke/handle**: 请求-响应模式（同步或异步）
2. **send/on**: 事件发送模式（单向）

Bisheng 流式响应使用的是混合模式：
- `invokeWorkflow`: 使用 invoke/handle 启动流
- `stream-start/chunk/end`: 使用 send/on 传递流式数据

### 事件监听器注册时机

在异步操作中注册事件监听器时，必须确保：
1. 监听器在事件发送**之前**注册
2. 监听器在不需要时正确清理

### EventListenerManager

`EventListenerManager` 是一个自定义的事件管理器，用于：
- 管理多个监听器
- 自动清理监听器
- 防止内存泄漏

## 文件清单

### 修改的文件
1. `src/renderer/components/AgentChat.tsx` - 修复事件监听器注册时机和 session 管理

### 创建的文档
1. `BISHENG_EVENT_FIX.md` - 本文档

---

**修复时间**: 2025-10-08
**状态**: ✅ 代码修复完成，⏳ 等待测试验证

