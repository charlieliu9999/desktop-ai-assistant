# Bisheng 智能体对话功能 - 快速测试指南

## 🚀 快速开始

### 1. 确保 Bisheng 服务运行

```bash
# 检查 Bisheng 服务状态
curl http://localhost:7860/health

# 如果未运行，启动 Bisheng
cd /path/to/bisheng/docker
docker-compose up -d
```

### 2. 启动 Desktop AI Assistant

```bash
cd /Users/charlieliu/git_project_vscode/09_medical/demo-web/desktop-ai-assistant

# 开发模式
npm run dev

# 或者只启动渲染进程（如果 Electron 已经在运行）
npm run dev:renderer
```

### 3. 配置 Bisheng 连接

1. 打开应用后，进入设置页面
2. 找到 "Bisheng 智能体" 配置
3. 确认以下配置：
   - **启用**: ✅ 开启
   - **模式**: API 模式
   - **后端地址**: `http://localhost:7860`
   - **前端地址**: `http://localhost:3001`
   - **Access Token**: (从浏览器 Cookie 中获取)

### 4. 获取 Access Token

```bash
# 方法 1: 从浏览器获取
# 1. 访问 http://localhost:3001
# 2. 登录 Bisheng
# 3. F12 > Application > Cookies > access_token_cookie
# 4. 复制 token 值

# 方法 2: 使用 API 登录
curl -X POST http://localhost:7860/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lzhy9999@163.com","password":"Moto@9999"}'
```

## 🧪 测试步骤

### 测试 1: 首次对话

1. **选择智能体**
   - 在应用中打开 "智能体" 页面
   - 选择一个可用的工作流

2. **发送第一条消息**
   - 输入: "你好"
   - 点击发送

3. **验证结果**
   - ✅ 消息成功发送
   - ✅ 收到 AI 回复
   - ✅ 控制台显示保存了 `sessionId`、`messageId` 和 `inputNodeId`

4. **检查控制台日志**
   ```
   [DEBUG] Calling invokeWorkflow...
   Invoking workflow { workflowId: 'xxx', sessionId: null, messageId: null, inputNodeId: null }
   [DEBUG] Workflow invoked, streamId: bisheng-xxx
   Setting session_id: xxx_async_task_id
   Setting message_id: 123
   Setting input node_id: input_e1758
   ```

### 测试 2: 继续对话

1. **发送第二条消息**
   - 输入: "请详细说明"
   - 点击发送

2. **验证结果**
   - ✅ 消息成功发送
   - ✅ 收到 AI 回复
   - ✅ 对话上下文正确

3. **检查控制台日志**
   ```
   Invoking workflow { 
     workflowId: 'xxx', 
     sessionId: 'xxx_async_task_id', 
     messageId: '123',
     inputNodeId: 'input_e1758'
   }
   ```

4. **检查网络请求** (F12 > Network)
   - 找到 `/api/v2/workflow/invoke` 请求
   - 查看请求体:
     ```json
     {
       "workflow_id": "xxx",
       "stream": true,
       "session_id": "xxx_async_task_id",
       "message_id": 123,
       "input": {
         "input_e1758": {
           "user_input": "请详细说明"
         }
       }
     }
     ```

### 测试 3: 切换智能体

1. **选择另一个智能体**
   - 返回智能体列表
   - 选择不同的工作流

2. **发送消息**
   - 输入: "你好"
   - 点击发送

3. **验证结果**
   - ✅ 会话状态被重置
   - ✅ 新对话正常工作
   - ✅ 控制台显示 `sessionId`、`messageId` 和 `inputNodeId` 都是新的

### 测试 4: 流式响应

1. **发送需要长回复的消息**
   - 输入: "请详细介绍一下你的功能"
   - 点击发送

2. **验证结果**
   - ✅ 回复逐字显示（流式效果）
   - ✅ 没有卡顿或延迟
   - ✅ 最终显示完整内容

3. **检查控制台日志**
   ```
   Stream message (stream): 我
   Stream message (stream): 是
   Stream message (stream): 一个
   ...
   Stream message (end): 我是一个智能助手...
   ```

## 🔍 故障排查

### 问题 1: 无法连接到 Bisheng

**症状**: 提示 "Bisheng service not initialized"

**解决方法**:
1. 检查 Bisheng 服务是否运行: `curl http://localhost:7860/health`
2. 检查配置中的 `baseUrl` 是否正确
3. 重启 Desktop AI Assistant

### 问题 2: 首次对话失败

**症状**: 发送消息后没有回复，或显示错误

**可能原因**:
- Access Token 过期或无效
- 工作流未上线
- 网络连接问题

**解决方法**:
1. 重新获取 Access Token
2. 检查工作流状态（在 Bisheng 前端查看）
3. 查看控制台错误日志

### 问题 3: 继续对话失败

**症状**: 第二条消息发送后出现错误 `'input_e1758'`

**可能原因**:
- `inputNodeId` 未正确保存
- 请求参数格式不正确

**解决方法**:
1. 检查控制台日志，确认 `inputNodeId` 已保存
2. 检查网络请求，确认 `input` 参数格式正确
3. 如果问题持续，清除会话状态并重新开始

### 问题 4: 流式响应不显示

**症状**: 消息发送后一直显示 "思考中..."

**可能原因**:
- SSE 流解析失败
- 事件监听器未正确注册

**解决方法**:
1. 检查控制台日志，查看是否收到 SSE 事件
2. 检查网络请求，确认响应类型为 `text/event-stream`
3. 查看是否有 JavaScript 错误

## 📊 预期日志输出

### 正常的首次对话日志

```
[INFO] Initializing Bisheng service...
[INFO] Bisheng service initialized successfully
[DEBUG] Calling invokeWorkflow...
[INFO] Invoking workflow { workflowId: 'd5e79601...', hasSessionId: false, hasMessageId: false, hasInputNodeId: false }
[INFO] Starting new workflow { workflowId: 'd5e79601...' }
[INFO] Workflow invoked successfully, returning stream
[DEBUG] Workflow invoked, streamId: bisheng-1234567890-abc123
[DEBUG] Now registering event listeners...
[DEBUG] Event listeners registered, waiting for stream events...
[DEBUG] Stream start event received: bisheng-1234567890-abc123
[DEBUG] Stream chunk event received: { streamId: 'bisheng-1234567890-abc123', chunkLength: 156 }
SSE event: input { session_id: 'xxx_async_task_id', data: { event: 'input', message_id: 123, node_id: 'input_e1758' } }
Setting session_id: xxx_async_task_id
Setting message_id: 123
Setting input node_id: input_e1758
SSE event: guide_word { data: { event: 'guide_word', output_schema: { message: '你好！...' } } }
Guide word: 你好！...
[DEBUG] Stream end event received: { streamId: 'bisheng-1234567890-abc123', success: true }
Stream ended: { success: true }
```

### 正常的继续对话日志

```
[DEBUG] Calling invokeWorkflow...
[INFO] Invoking workflow { workflowId: 'd5e79601...', hasSessionId: true, hasMessageId: true, hasInputNodeId: true }
[INFO] Continuing workflow conversation { workflowId: 'd5e79601...', sessionId: 'xxx_async_task_id', messageId: '123', inputNodeId: 'input_e1758' }
[INFO] Workflow invoked successfully, returning stream
[DEBUG] Workflow invoked, streamId: bisheng-1234567891-def456
SSE event: stream_msg { data: { event: 'stream_msg', status: 'stream', output_schema: { message: '当' } } }
Stream message (stream): 当
SSE event: stream_msg { data: { event: 'stream_msg', status: 'stream', output_schema: { message: '然' } } }
Stream message (stream): 然
...
SSE event: stream_msg { data: { event: 'stream_msg', status: 'end', output_schema: { message: '当然可以...' } } }
Stream message (end): 当然可以...
SSE event: close { data: { event: 'close' } }
Workflow completed successfully
```

## ✅ 验证清单

- [ ] Bisheng 服务正常运行
- [ ] Desktop AI Assistant 成功启动
- [ ] Bisheng 配置正确（启用、地址、Token）
- [ ] 能够加载智能体列表
- [ ] 首次对话成功
- [ ] 继续对话成功
- [ ] 切换智能体后会话正确重置
- [ ] 流式响应正常显示
- [ ] 没有控制台错误
- [ ] 网络请求格式正确

## 🎉 成功标志

如果所有测试都通过，你应该看到：

1. ✅ 智能体列表正常加载
2. ✅ 首次对话能够收到回复
3. ✅ 继续对话能够保持上下文
4. ✅ 流式响应流畅显示
5. ✅ 切换智能体后状态正确重置
6. ✅ 控制台没有错误日志
7. ✅ 网络请求参数格式正确

恭喜！Bisheng 智能体对话功能已经正常工作了！🎊

