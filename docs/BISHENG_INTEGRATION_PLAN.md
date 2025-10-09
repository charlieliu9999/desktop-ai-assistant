# Bisheng 智能体集成技术方案

## 1. API 测试结果

### 1.1 登录接口

**接口**: `POST /api/v1/user/login`

**请求示例**:
```bash
curl -X POST http://localhost:7860/api/v1/user/login \
  -H 'Content-Type: application/json' \
  -d '{
    "user_name": "lzhy9999@163.com",
    "password": "Moto@9999"
  }'
```

**当前状态**: ❌ 返回 500 "Decryption failed"
- 原因：服务器端密码加密方式可能改变或配置问题
- 解决方案：使用已有的有效 token 进行测试和开发

**成功响应格式**（预期）:
```json
{
  "status_code": 200,
  "status_message": "SUCCESS",
  "data": {
    "user_id": 1,
    "role": "admin",
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

**Token 提取位置**: `data.data.access_token`

### 1.2 工作流列表接口

**接口**: `GET /api/v1/workflow/list`

**请求示例**:
```bash
curl -X GET "http://localhost:7860/api/v1/workflow/list?page_size=10&page_num=1" \
  -H "accept: application/json" \
  -H "Authorization: Bearer {token}"
```

**测试结果**: ✅ 成功

**响应格式**:
```json
{
  "status_code": 200,
  "status_message": "SUCCESS",
  "data": {
    "data": [
      {
        "id": "d5e79601de8245768a38ee756a14a067",
        "name": "检查项目推荐",
        "description": "检索文档知识库，根据检索结果进行回答。",
        "flow_type": 10,
        "status": 2,
        "user_id": 1,
        "create_time": "2025-10-06T20:25:54",
        "update_time": "2025-10-06T20:44:27"
      }
    ],
    "total": 4
  }
}
```

**数据提取**: `data.data.data` (工作流数组)

### 1.3 工作流调用接口（核心）

**接口**: `POST /api/v2/workflow/invoke`

**首次调用（启动工作流）**:
```bash
curl -N -X POST "http://localhost:7860/api/v2/workflow/invoke" \
  -H "accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "workflow_id": "d5e79601de8245768a38ee756a14a067",
    "stream": true,
    "input": {
      "user_input": "你好"
    }
  }'
```

**测试结果**: ✅ 成功返回 SSE 流

**响应事件示例**:
```
data: {"session_id":"3249f64eef454d69a5d3972434abf736_async_task_id","data":{"event":"guide_question","message_id":null,"status":"end","node_id":"start_fa9af","node_name":"开始","node_execution_id":"a87f50017cc148b68a38a443ff12644d","output_schema":{"message":[""],"reasoning_content":null,"output_key":null,"files":null,"source_url":null,"extra":null},"input_schema":null}}

data: {"session_id":"3249f64eef454d69a5d3972434abf736_async_task_id","data":{"event":"input","message_id":"416","status":"end","node_id":"input_e1758","node_name":"输入","node_execution_id":null,"output_schema":null,"input_schema":{"input_type":"dialog_input","value":[{"key":"user_input","type":"text","value":"","label":null,"multiple":false,"required":true,"options":null,"file_type":null}]}}}
```

## 2. SSE 事件类型详解

根据用户提供的文档和测试结果，Bisheng 工作流返回以下事件类型：

### 2.1 guide_word（引导词）
- **作用**: 工作流开始时的欢迎语
- **处理**: 显示给用户

### 2.2 guide_question（引导问题）
- **作用**: 提供建议的问题
- **处理**: 可选显示为快捷问题按钮

### 2.3 input（等待输入）
- **作用**: 工作流等待用户输入
- **关键字段**:
  - `message_id`: 必须保存，用于继续对话
  - `input_schema`: 定义需要的输入字段
- **处理**: 提示用户输入，保存 message_id

### 2.4 stream_msg（流式消息）
- **作用**: AI 回复的流式输出
- **关键字段**:
  - `status: "stream"`: 增量内容，需要拼接
  - `status: "end"`: 最终完整内容，覆盖之前的流式输出
  - `output_schema.message`: 消息内容（数组或字符串）
- **处理**: 
  - stream 状态：累加显示
  - end 状态：用完整内容替换

### 2.5 output_msg（普通消息）
- **作用**: 非流式的完整消息
- **处理**: 直接显示

### 2.6 close（关闭事件）
- **作用**: 工作流结束
- **关键字段**:
  - `output_schema.message`: 如果为空表示正常结束，否则是错误信息
- **错误码**:
  - 500: 服务端异常
  - 10527: 等待用户输入超时
  - 10528: 节点执行超过最大次数
  - 10531: 节点功能已升级
  - 10532: 工作流版本已升级
  - 10540: 服务器线程数已满

## 3. 会话管理方案

### 3.1 状态维护
```typescript
interface BishengSession {
  sessionId: string;      // 从首次响应中获取
  messageId: string;      // 从 input 事件中获取
  workflowId: string;     // 工作流 ID
  messages: Message[];    // 消息历史
}
```

### 3.2 消息流程
1. **首次调用**: 只传 `workflow_id`, `stream: true`, `input: {user_input: "..."}`
2. **获取 session_id**: 从第一个事件的 `session_id` 字段提取
3. **获取 message_id**: 从 `input` 事件的 `message_id` 字段提取
4. **继续对话**: 传递 `workflow_id`, `stream: true`, `session_id`, `message_id`, `input: {user_input: "..."}`

## 4. IPC 通信设计

### 4.1 主进程职责
- 发起 HTTP 请求到 Bisheng API
- 读取 SSE 流
- 逐块发送到渲染进程

### 4.2 IPC 事件定义
```typescript
// 主进程 -> 渲染进程
'bisheng-stream-start': { streamId: string; workflowId: string }
'bisheng-stream-chunk': { streamId: string; chunk: string }
'bisheng-stream-end': { streamId: string; success: boolean; error?: string }

// 渲染进程 -> 主进程
'bisheng-invoke-workflow': (workflowId, input, stream, sessionId?, messageId?) => Promise<{streamId}>
```

### 4.3 流式处理流程
```
渲染进程                主进程                  Bisheng API
   |                      |                         |
   |--invokeWorkflow----->|                         |
   |                      |--------POST------------>|
   |<--stream-start-------|                         |
   |                      |<------SSE chunk---------|
   |<--stream-chunk-------|                         |
   |                      |<------SSE chunk---------|
   |<--stream-chunk-------|                         |
   |                      |<------SSE end-----------|
   |<--stream-end---------|                         |
```

## 5. 错误处理策略

### 5.1 网络错误
- 超时：30秒
- 重试：最多 3 次
- 降级：显示错误提示

### 5.2 认证错误
- Token 过期：提示重新登录
- 权限不足：显示权限错误

### 5.3 工作流错误
- 根据 close 事件的 message 字段判断
- 显示具体错误码和提示

## 6. 代码重构计划

### 6.1 BishengService 重构
```typescript
class BishengService {
  // 登录（暂时跳过，使用硬编码 token）
  async login(username: string, password: string): Promise<string>
  
  // 获取工作流列表
  async getWorkflows(pageSize: number, pageNum: number): Promise<Workflow[]>
  
  // 调用工作流（返回 ReadableStream）
  async invokeWorkflow(
    workflowId: string,
    input: Record<string, any>,
    stream: boolean,
    sessionId?: string,
    messageId?: string
  ): Promise<ReadableStream>
}
```

### 6.2 主进程 IPC 处理
```typescript
// 工作流调用处理器
ipcMain.handle('bisheng-invoke-workflow', async (event, workflowId, input, stream, sessionId, messageId) => {
  const streamId = generateStreamId();
  const webContents = event.sender;
  
  // 发送开始事件
  webContents.send('bisheng-stream-start', { streamId, workflowId });
  
  try {
    const response = await bishengService.invokeWorkflow(workflowId, input, stream, sessionId, messageId);
    const reader = response.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      webContents.send('bisheng-stream-chunk', { streamId, chunk });
    }
    
    webContents.send('bisheng-stream-end', { streamId, success: true });
  } catch (error) {
    webContents.send('bisheng-stream-end', { streamId, success: false, error: error.message });
  }
  
  return { streamId };
});
```

### 6.3 渲染层组件
```typescript
const AgentChat = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [messageId, setMessageId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  
  const handleSendMessage = async (input: string) => {
    // 添加用户消息
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    // 调用工作流
    const { streamId } = await window.electronAPI.bisheng.invokeWorkflow(
      workflowId,
      { user_input: input },
      true,
      sessionId,
      messageId
    );
    
    let buffer = '';
    let assistantContent = '';
    
    // 监听流式响应
    const offChunk = window.electronAPI.bisheng.onStreamChunk(({ streamId: id, chunk }) => {
      if (id !== streamId) return;
      
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        
        const event = JSON.parse(line.substring(6));
        
        // 更新 session_id
        if (event.session_id) setSessionId(event.session_id);
        
        // 处理 input 事件
        if (event.data?.event === 'input' && event.data?.message_id) {
          setMessageId(String(event.data.message_id));
        }
        
        // 处理 stream_msg 事件
        if (event.data?.event === 'stream_msg') {
          const msg = event.data.output_schema?.message;
          if (msg) {
            const content = Array.isArray(msg) ? msg.join('') : msg;
            if (event.data.status === 'end') {
              assistantContent = content; // 最终内容
            } else {
              assistantContent += content; // 增量内容
            }
            // 更新 UI
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMsg = newMessages[newMessages.length - 1];
              if (lastMsg?.role === 'assistant') {
                lastMsg.content = assistantContent;
              } else {
                newMessages.push({ role: 'assistant', content: assistantContent });
              }
              return newMessages;
            });
          }
        }
        
        // 处理 close 事件
        if (event.data?.event === 'close') {
          const error = event.data.output_schema?.message;
          if (error) {
            console.error('工作流错误:', error);
          }
        }
      }
    });
    
    // 监听结束事件
    const offEnd = window.electronAPI.bisheng.onStreamEnd(({ streamId: id, success, error }) => {
      if (id !== streamId) return;
      offChunk();
      offEnd();
      if (!success) {
        console.error('流式响应错误:', error);
      }
    });
  };
  
  return (/* UI 组件 */);
};
```

## 7. 测试验证清单

- [ ] 使用有效 token 获取工作流列表
- [ ] 首次调用工作流并获取 session_id
- [ ] 从 input 事件中提取 message_id
- [ ] 使用 session_id 和 message_id 继续对话
- [ ] 正确处理 stream_msg 的 stream 和 end 状态
- [ ] 正确处理 close 事件和错误码
- [ ] 多轮对话测试
- [ ] 错误场景测试（超时、网络中断等）

## 8. 已知问题和限制

1. **登录接口不可用**: 当前服务器返回 "Decryption failed"，需要使用硬编码 token
2. **Token 过期**: 需要定期更新 token（当前 token 有效期未知）
3. **继续对话的 input 结构**: 需要进一步测试确认正确的 input 结构

## 9. 下一步行动

1. ✅ 完成 API 测试和文档整理
2. ⏳ 重构 BishengService
3. ⏳ 重构主进程 IPC 处理
4. ⏳ 重构渲染层组件
5. ⏳ 端到端测试
6. ⏳ 错误处理完善

