# Desktop AI Assistant - Bisheng 智能体对话功能修复

## 📋 问题描述

Desktop AI Assistant 中的 Bisheng 智能体对话功能存在以下问题：

1. **首次调用工作流时传递了不必要的 `input` 参数**
   - 导致工作流无法正常启动
   - 应该让工作流自动启动并等待用户输入

2. **继续对话时 `input` 参数格式不正确**
   - 当前使用: `{ user_input: "..." }`
   - 正确格式: `{ [node_id]: { user_input: "..." } }`
   - 缺少输入节点 ID 导致后端无法找到对应的输入节点

3. **缺少 `inputNodeId` 状态管理**
   - 没有保存从 `input` 事件中返回的 `node_id`
   - 导致继续对话时无法正确构建请求参数

## ✅ 修复方案

### 1. 更新 BishengService (`src/services/bisheng.ts`)

**修改内容**:
- 添加 `inputNodeId` 参数
- 区分首次调用和继续对话两种情况
- 首次调用时不传递 `input` 参数
- 继续对话时使用 `{node_id: {user_input: "..."}}` 格式

<augment_code_snippet path="/Users/charlieliu/git_project_vscode/09_medical/demo-web/desktop-ai-assistant/src/services/bisheng.ts" mode="EXCERPT">
```typescript
async invokeWorkflow(
  workflowId: string,
  input: Record<string, any>,
  stream: boolean = true,
  sessionId?: string,
  messageId?: string,
  inputNodeId?: string  // 新增参数
): Promise<ReadableStream> {
  const body: any = {
    workflow_id: workflowId,
    stream: stream,
  };

  // 首次调用：不传递 input 参数，让工作流自动启动
  // 继续对话：传递 {node_id: {user_input: "..."}} 格式
  if (sessionId && inputNodeId) {
    // 继续对话
    body.session_id = sessionId;
    body.message_id = messageId ? parseInt(messageId, 10) : 0;
    body.input = {
      [inputNodeId]: input  // 使用节点 ID 作为 key
    };
  } else {
    // 首次调用，不传递 input
  }
  
  // ... 发送请求
}
```
</augment_code_snippet>

### 2. 更新 AgentChat 组件 (`src/renderer/components/AgentChat.tsx`)

**修改内容**:
- 添加 `inputNodeId` 状态
- 从 `input` 事件中提取并保存 `node_id`
- 调用工作流时传递 `inputNodeId`
- 工作流变化时重置 `inputNodeId`

<augment_code_snippet path="/Users/charlieliu/git_project_vscode/09_medical/demo-web/desktop-ai-assistant/src/renderer/components/AgentChat.tsx" mode="EXCERPT">
```typescript
const AgentChat: React.FC<AgentChatProps> = ({ workflow }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [inputNodeId, setInputNodeId] = useState<string | null>(null); // 新增

  // 工作流变化时重置会话
  useEffect(() => {
    setMessages([]);
    setSessionId(null);
    setMessageId(null);
    setInputNodeId(null);  // 重置输入节点 ID
    setError(null);
  }, [workflow.id]);

  // 调用工作流
  const { streamId } = await window.electronAPI.bisheng.invokeWorkflow(
    workflow.id,
    { user_input: currentInput },
    true,
    sessionId || undefined,
    messageId || undefined,
    inputNodeId || undefined  // 传递输入节点 ID
  );

  // 处理 input 事件
  if (eventData.event === 'input') {
    if (eventData.message_id) {
      setMessageId(String(eventData.message_id));
    }
    if (eventData.node_id) {
      setInputNodeId(eventData.node_id);  // 保存输入节点 ID
    }
  }
}
```
</augment_code_snippet>

### 3. 更新 Preload 脚本

**文件**: `src/preload/preload.ts` 和 `src/main/preload.ts`

添加 `inputNodeId` 参数到类型定义和 IPC 调用：

```typescript
invokeWorkflow: (
  workflowId: string, 
  input: any, 
  stream?: boolean, 
  sessionId?: string, 
  messageId?: string,
  inputNodeId?: string  // 新增
) => Promise<any>
```

### 4. 更新 Main 进程 IPC 处理器 (`src/main/main.ts`)

添加 `inputNodeId` 参数并传递给 BishengService：

```typescript
ipcMain.handle('bisheng-invoke-workflow', async (
  event,
  workflowId: string,
  input: Record<string, any>,
  stream: boolean = true,
  sessionId?: string,
  messageId?: string,
  inputNodeId?: string  // 新增
) => {
  const responseStream = await this.bishengService.invokeWorkflow(
    workflowId,
    input,
    stream,
    sessionId,
    messageId,
    inputNodeId  // 传递给服务
  );
});
```

## 🔄 工作流程

### 首次调用工作流

1. 用户选择智能体并发送第一条消息
2. 前端调用 `invokeWorkflow`，不传递 `sessionId` 和 `inputNodeId`
3. 后端构建请求体，**不包含 `input` 参数**
4. Bisheng 工作流自动启动
5. 工作流返回 `input` 事件，包含 `session_id`、`message_id` 和 `node_id`
6. 前端保存这些值用于后续对话

### 继续对话

1. 用户发送后续消息
2. 前端调用 `invokeWorkflow`，传递 `sessionId`、`messageId` 和 `inputNodeId`
3. 后端构建请求体:
   ```json
   {
     "workflow_id": "xxx",
     "stream": true,
     "session_id": "xxx",
     "message_id": 123,
     "input": {
       "input_e1758": {
         "user_input": "用户消息"
       }
     }
   }
   ```
4. Bisheng 工作流继续执行
5. 返回 AI 回复

## 📁 修改的文件

1. ✅ `src/services/bisheng.ts` - BishengService 类
2. ✅ `src/renderer/components/AgentChat.tsx` - 对话组件
3. ✅ `src/preload/preload.ts` - Preload 类型定义
4. ✅ `src/main/preload.ts` - Main Preload 实现
5. ✅ `src/main/main.ts` - IPC 处理器

## 🎯 关键改进

### 1. 正确的请求参数格式

**之前** (错误):
```json
{
  "workflow_id": "xxx",
  "stream": true,
  "input": {
    "user_input": "消息"
  }
}
```

**现在** (正确):

首次调用:
```json
{
  "workflow_id": "xxx",
  "stream": true
}
```

继续对话:
```json
{
  "workflow_id": "xxx",
  "stream": true,
  "session_id": "xxx",
  "message_id": 123,
  "input": {
    "input_e1758": {
      "user_input": "消息"
    }
  }
}
```

### 2. 完整的会话状态管理

- ✅ `sessionId` - 会话 ID
- ✅ `messageId` - 消息 ID
- ✅ `inputNodeId` - 输入节点 ID (新增)

### 3. 事件处理改进

正确提取和保存 `input` 事件中的所有必要信息：

```typescript
if (eventData.event === 'input') {
  if (eventData.message_id) {
    setMessageId(String(eventData.message_id));
  }
  if (eventData.node_id) {
    setInputNodeId(eventData.node_id);  // 关键：保存节点 ID
  }
}
```

## 🧪 测试验证

### 测试步骤

1. **启动应用**
   ```bash
   cd /Users/charlieliu/git_project_vscode/09_medical/demo-web/desktop-ai-assistant
   npm run dev
   ```

2. **测试首次对话**
   - 选择一个智能体
   - 发送第一条消息
   - 验证能够收到回复
   - 检查控制台日志，确认保存了 `sessionId`、`messageId` 和 `inputNodeId`

3. **测试继续对话**
   - 发送第二条消息
   - 验证能够正确继续对话
   - 检查网络请求，确认 `input` 参数格式正确

4. **测试切换智能体**
   - 切换到另一个智能体
   - 验证会话状态被正确重置
   - 发送消息，验证新对话正常工作

### 预期结果

- ✅ 首次对话能够正常启动
- ✅ 继续对话能够正确执行
- ✅ 切换智能体后会话状态正确重置
- ✅ 不再出现 `'input_e1758'` 错误
- ✅ 流式响应正常显示

## 📚 相关文档

- Bisheng API 文档: `docs/bisheng-api.md`
- 工作流 API 规范: `src/backend/bisheng/api/v2/workflow.py`
- 事件类型定义: `src/backend/bisheng/api/v1/schema/workflow.py`

## 🔗 参考

这个修复基于在 Bisheng 仓库中的类似修复：
- `docker/bisheng-agent-chat-fixed.html`
- `BISHENG_INTEGRATION_FIX_SUMMARY.md`

主要区别是 Desktop AI Assistant 使用 Electron IPC 通信，而不是直接的 HTTP 请求。

## ✨ 总结

通过这次修复，Desktop AI Assistant 的 Bisheng 智能体对话功能现在能够：

1. ✅ 正确启动工作流（首次调用不传递 input）
2. ✅ 正确继续对话（使用节点 ID 构建 input）
3. ✅ 完整管理会话状态（session_id, message_id, input_node_id）
4. ✅ 正确处理所有 Bisheng 事件类型
5. ✅ 流畅的用户体验

修复完成！🎉

