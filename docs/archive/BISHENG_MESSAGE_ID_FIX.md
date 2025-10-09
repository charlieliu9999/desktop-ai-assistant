# Bisheng 继续对话 message_id 类型修复

## 问题诊断

### 错误信息

从用户提供的日志可以看到：

```javascript
[DEBUG] Raw chunk data: {"status_code":500,"status_message":"'input_e1758'"}
```

**分析**:
- `status_code: 500` - 服务器内部错误
- `status_message: "'input_e1758'"` - 这是工作流中"输入"节点的 ID

### 根本原因

**message_id 类型错误**：

我们传递的 `message_id` 是字符串类型（如 `"429"`），但 Bisheng API 期望的是数字类型（如 `429`）。

**证据**:
1. 首次对话成功（不传递 `message_id`）
2. 继续对话失败（传递字符串类型的 `message_id`）
3. API 测试显示首次对话返回 `"message_id":"436"`（字符串格式）
4. 但请求时应该使用数字格式

## 修复内容

### 修复：将 message_id 转换为数字类型

**文件**: `src/services/bisheng.ts`

**修改前**:
```typescript
if (messageId) {
  body.message_id = messageId;  // ❌ 字符串类型
}
```

**修改后**:
```typescript
if (messageId) {
  // message_id 应该是数字类型
  body.message_id = parseInt(messageId, 10);  // ✅ 数字类型
}
```

## 验证步骤

### 步骤 1: 重新启动应用

```bash
cd desktop-ai-assistant
npm run dev
```

### 步骤 2: 测试对话

1. 打开应用
2. 进入 Bisheng 测试页面
3. 选择工作流"检查项目推荐"
4. **打开浏览器 DevTools Console**
5. 发送第一条消息："你好"
6. 等待收到引导问题
7. 发送第二条消息："头痛"

### 步骤 3: 检查日志

**首次对话应该看到**:
```javascript
[DEBUG] Workflow invoked, streamId: bisheng-...
[DEBUG] Stream chunk event received: {chunkLength: 1070}
[DEBUG] Raw chunk data: data: {"session_id":"...","data":{"event":"guide_question",...}}
SSE event: guide_question
Setting session_id: ...
Setting message_id: 429
```

**继续对话应该看到**:
```javascript
Invoking workflow {sessionId: "...", messageId: "429", input: "头痛"}
[DEBUG] Workflow invoked, streamId: bisheng-...
[DEBUG] Stream chunk event received: {chunkLength: >100}  // ✅ 不再是 52 字节
[DEBUG] Raw chunk data: data: {"is_bot":true,"message":{...},"type":"stream",...}  // ✅ 正确的 SSE 数据
SSE event: stream_msg
Stream message (stream): ...  // ✅ AI 回复内容
```

### 步骤 4: 验证 UI

**预期结果**:
- ✅ 首次对话显示引导问题
- ✅ 继续对话显示 AI 的完整回复
- ✅ 对话历史正确显示
- ✅ 可以进行多轮对话

## 技术说明

### JSON 类型转换

在 JSON 中，数字和字符串是不同的类型：

```json
{
  "message_id": "429"   // ❌ 字符串类型
}

{
  "message_id": 429     // ✅ 数字类型
}
```

虽然在 JavaScript 中这两者可以互换，但在严格的 API 中（如 Bisheng），类型必须匹配。

### parseInt 的使用

```typescript
parseInt(messageId, 10)
```

- `messageId`: 要转换的字符串
- `10`: 基数（十进制）
- 返回值：数字类型

**示例**:
```typescript
parseInt("429", 10)  // 返回 429 (数字)
parseInt("0429", 10) // 返回 429 (数字)
parseInt("abc", 10)  // 返回 NaN
```

### 为什么首次对话成功

首次对话不传递 `message_id`，所以不会触发类型错误：

```typescript
// 首次对话
{
  "workflow_id": "...",
  "stream": true,
  "input": {"user_input": "你好"}
  // 没有 message_id
}

// 继续对话（修复前）
{
  "workflow_id": "...",
  "session_id": "...",
  "message_id": "429",  // ❌ 字符串类型导致错误
  "stream": true,
  "input": {"user_input": "头痛"}
}

// 继续对话（修复后）
{
  "workflow_id": "...",
  "session_id": "...",
  "message_id": 429,  // ✅ 数字类型
  "stream": true,
  "input": {"user_input": "头痛"}
}
```

## 相关修复

### 之前的修复

1. **事件监听器注册时机** - 使用 `setImmediate` 异步处理流
2. **sessionId 和 messageId 初始值** - 从 `null` 开始，从 SSE 事件中提取

### 本次修复

3. **message_id 类型转换** - 从字符串转换为数字

## 完整的对话流程

### 首次对话

1. 用户发送消息："你好"
2. 调用 API（不传递 `session_id` 和 `message_id`）
3. 收到 `guide_question` 事件
4. 收到 `input` 事件，提取 `session_id` 和 `message_id`
5. 显示引导问题

### 继续对话

1. 用户发送消息："头痛"
2. 调用 API（传递 `session_id` 和数字类型的 `message_id`）
3. 收到 `stream_msg` 事件（多次，流式响应）
4. 显示 AI 回复内容

## 常见问题排查

### 问题 1: 仍然收到 500 错误

**检查**:
1. 确认 `message_id` 是否正确转换为数字
2. 查看主进程日志中的请求体
3. 使用 curl 测试 API

### 问题 2: message_id 为 NaN

**原因**: `parseInt` 无法解析字符串

**检查**:
1. 确认从 SSE 事件中提取的 `message_id` 是有效的数字字符串
2. 添加日志：`console.log('Parsing message_id:', messageId, '→', parseInt(messageId, 10))`

### 问题 3: 仍然没有收到 AI 回复

**检查**:
1. 查看 `[DEBUG] Raw chunk data:` 的内容
2. 确认是否收到 `stream_msg` 事件
3. 检查事件处理逻辑是否正确

## 文件清单

### 修改的文件
1. `src/services/bisheng.ts` - 将 message_id 转换为数字类型
2. `src/main/main.ts` - 使用 setImmediate 异步处理流（之前的修复）
3. `src/renderer/components/AgentChat.tsx` - 添加详细调试日志（之前的修复）

### 创建的文档
1. `BISHENG_ASYNC_FIX.md` - 异步修复说明
2. `BISHENG_SUCCESS_REPORT.md` - 测试结果总结
3. `BISHENG_MESSAGE_ID_FIX.md` - 本文档

---

**修复时间**: 2025-10-08
**状态**: ✅ 代码修复完成，⏳ 等待测试验证
**关键修复**: message_id 类型转换（字符串 → 数字）

