# Bisheng 对话功能异步修复

## 问题诊断

### 日志分析

从用户提供的日志可以看到：

```javascript
[DEBUG] Stream start event received: bisheng-1759927262300-0pz0rm
[DEBUG] Stream chunk event received: {streamId: 'bisheng-1759927262300-0pz0rm', chunkLength: 1070}
[DEBUG] Ignoring chunk for different streamId  // ❌ 问题！
[DEBUG] Stream end event received: {streamId: 'bisheng-1759927262300-0pz0rm', success: true}
[DEBUG] Ignoring end event for different streamId  // ❌ 问题！
[DEBUG] Workflow invoked, streamId: bisheng-1759927262300-0pz0rm  // ⚠️ 太晚了！
```

### 根本原因

**主进程同步阻塞问题**：

在 `main.ts` 的 `bisheng-invoke-workflow` 处理器中，流读取是同步阻塞的：

```typescript
ipcMain.handle('bisheng-invoke-workflow', async (...) => {
  const streamId = generateStreamId();
  
  // 调用 API 获取流
  const responseStream = await this.bishengService.invokeWorkflow(...);
  
  // 发送事件
  webContents.send('bisheng-stream-start', { streamId });
  
  // 同步读取整个流（阻塞）
  while (true) {
    const { done, value } = await reader.read();  // ❌ 阻塞在这里
    if (done) break;
    webContents.send('bisheng-stream-chunk', { streamId, chunk });
  }
  
  webContents.send('bisheng-stream-end', { streamId, success: true });
  
  return { streamId };  // ⚠️ 所有事件都已发送完了才返回
});
```

**时间线**:
```
T0: 渲染进程调用 invokeWorkflow
T1: 主进程开始处理
T2: 主进程发送 stream-start 事件
T3: 主进程发送 stream-chunk 事件（多次）
T4: 主进程发送 stream-end 事件
T5: 主进程返回 { streamId }
T6: 渲染进程收到 streamId
T7: 渲染进程注册事件监听器 ❌ 太晚了，事件已经发送完了
```

## 修复方案

### 修复 1: 主进程异步处理流

**文件**: `src/main/main.ts`

**关键改动**: 使用 `setImmediate` 将流读取放到后台异步执行

```typescript
ipcMain.handle('bisheng-invoke-workflow', async (...) => {
  const streamId = generateStreamId();
  const webContents = event.sender;
  
  // 立即返回 streamId，然后在后台处理流
  setImmediate(async () => {
    try {
      // 调用 API 获取流
      const responseStream = await this.bishengService.invokeWorkflow(...);
      
      // 发送流开始事件
      webContents.send('bisheng-stream-start', { streamId });
      
      // 读取流并转发
      const reader = responseStream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        webContents.send('bisheng-stream-chunk', { streamId, chunk });
      }
      
      webContents.send('bisheng-stream-end', { streamId, success: true });
    } catch (error) {
      webContents.send('bisheng-stream-end', { streamId, success: false, error });
    }
  });
  
  // 立即返回 streamId
  return { streamId };
});
```

**新的时间线**:
```
T0: 渲染进程调用 invokeWorkflow
T1: 主进程立即返回 { streamId }
T2: 渲染进程收到 streamId
T3: 渲染进程注册事件监听器 ✅
T4: 主进程在后台开始处理流
T5: 主进程发送 stream-start 事件 ✅ 监听器已注册
T6: 主进程发送 stream-chunk 事件 ✅ 监听器已注册
T7: 主进程发送 stream-end 事件 ✅ 监听器已注册
```

### 修复 2: 渲染层保持原有顺序

**文件**: `src/renderer/components/AgentChat.tsx`

**顺序**:
1. 调用 `invokeWorkflow` 获取 `streamId`
2. 注册事件监听器（使用已知的 `streamId`）
3. 等待事件

```typescript
// 1. 先调用工作流获取 streamId
const { streamId } = await window.electronAPI.bisheng.invokeWorkflow(...);

// 2. 注册事件监听器
const offStart = window.electronAPI.bisheng.onStreamStart(({ streamId: id }) => {
  if (id === streamId) {
    console.log('Stream started:', streamId);
  }
});

const offChunk = window.electronAPI.bisheng.onStreamChunk(({ streamId: id, chunk }) => {
  if (id !== streamId) return;
  // 处理 chunk
});

const offEnd = window.electronAPI.bisheng.onStreamEnd(({ streamId: id, success, error }) => {
  if (id !== streamId) return;
  // 处理结束
});

// 3. 等待事件（事件会在后台异步到达）
```

## 验证步骤

### 步骤 1: 编译主进程

```bash
cd desktop-ai-assistant
npm run build:main
```

### 步骤 2: 启动应用

```bash
npm run dev
```

### 步骤 3: 测试对话

1. 打开应用
2. 进入 Bisheng 测试页面
3. 选择工作流"检查项目推荐"
4. **打开浏览器 DevTools Console**
5. 发送消息："你好"

### 步骤 4: 检查日志

**应该看到以下日志顺序**:

```javascript
Invoking workflow {workflowId: "...", sessionId: null, messageId: null, input: "你好"}
[DEBUG] Calling invokeWorkflow...
[DEBUG] Workflow invoked, streamId: bisheng-...
[DEBUG] Now registering event listeners...
[DEBUG] Event listeners registered, waiting for stream events...
[DEBUG] Stream start event received: bisheng-...
Stream started: bisheng-...
[DEBUG] Stream chunk event received: {streamId: "bisheng-...", chunkLength: 123}
SSE event: guide_question {...}
[DEBUG] Stream chunk event received: {streamId: "bisheng-...", chunkLength: 456}
SSE event: input {...}
Setting session_id: ...
Setting message_id: ...
[DEBUG] Stream end event received: {streamId: "bisheng-...", success: true}
Stream ended: {success: true}
```

**关键点**:
- ✅ `Workflow invoked` 在事件之前
- ✅ `Event listeners registered` 在事件之前
- ✅ 没有 "Ignoring chunk for different streamId" 日志
- ✅ 所有事件都被正确处理

### 步骤 5: 验证 UI

**预期结果**:
- ✅ 用户消息立即显示
- ✅ 显示"正在处理"状态
- ✅ 显示助手消息（引导问题或提示）
- ✅ "正在处理"状态消失

## 技术说明

### setImmediate vs setTimeout

使用 `setImmediate` 而不是 `setTimeout(fn, 0)` 的原因：

1. **更快**: `setImmediate` 在当前事件循环结束后立即执行
2. **更可预测**: 不受定时器队列的影响
3. **Node.js 推荐**: 专门用于异步 I/O 操作

### IPC 通信模式

Electron IPC 有两种模式：

1. **invoke/handle**: 请求-响应模式
   - 渲染进程等待主进程返回结果
   - 适合同步操作

2. **send/on**: 事件发送模式
   - 主进程单向发送事件
   - 适合异步通知

Bisheng 流式响应使用混合模式：
- `invokeWorkflow`: 使用 invoke/handle 获取 streamId
- `stream-start/chunk/end`: 使用 send/on 传递流式数据

### 为什么不能在 handle 中直接返回流

Electron 的 IPC 通信不支持传递 ReadableStream 对象，因为：
1. ReadableStream 不能被序列化
2. 跨进程传递需要序列化

所以必须：
1. 在主进程中读取流
2. 将数据分块发送到渲染进程
3. 渲染进程重新组装数据

## 常见问题排查

### 问题 1: 仍然看到 "Ignoring chunk for different streamId"

**原因**: 主进程仍然在同步阻塞

**检查**:
1. 确认 `main.ts` 中使用了 `setImmediate`
2. 确认 `return { streamId }` 在 `setImmediate` 之后

### 问题 2: 没有收到任何事件

**原因**: 主进程异步任务可能出错

**检查**:
1. 查看主进程日志中的错误信息
2. 确认 `setImmediate` 回调中的 try-catch 正常工作

### 问题 3: 事件顺序混乱

**原因**: 多个并发请求

**检查**:
1. 确认使用 streamId 过滤事件
2. 确认每个请求使用唯一的 streamId

## 文件清单

### 修改的文件
1. `src/main/main.ts` - 使用 setImmediate 异步处理流
2. `src/renderer/components/AgentChat.tsx` - 调整日志和错误处理

### 创建的文档
1. `BISHENG_ASYNC_FIX.md` - 本文档

---

**修复时间**: 2025-10-08
**状态**: ✅ 代码修复完成，⏳ 等待测试验证
**关键修复**: 主进程异步处理流 + 立即返回 streamId

