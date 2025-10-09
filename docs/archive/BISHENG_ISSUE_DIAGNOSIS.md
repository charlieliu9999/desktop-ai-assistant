# Bisheng 集成问题诊断报告

## 测试结果总结

### ✅ 已验证正常的功能

1. **新 Token 有效**
   ```bash
   curl -X GET "http://localhost:7860/api/v1/workflow/list?page_size=10&page_num=1" \
     -H "Authorization: Bearer {新token}"
   ```
   - 结果：成功返回 4 个工作流
   - 结论：Token 有效，可以正常使用

2. **工作流列表获取正常**
   - API: `GET /api/v1/workflow/list`
   - 状态：✅ 正常工作
   - 返回数据格式正确

3. **工作流调用返回 SSE 流**
   ```bash
   curl -N -X POST "http://localhost:7860/api/v2/workflow/invoke" \
     -H "accept: text/event-stream" \
     -H "Authorization: Bearer {token}" \
     -d '{"workflow_id":"d5e79601de8245768a38ee756a14a067","stream":true,"input":{"user_input":"你好"}}'
   ```
   - 结果：成功返回 SSE 事件流
   - 事件类型：`guide_question`, `input`
   - session_id: `543b4e9c81024fd08bb64ac53994a27e_async_task_id`
   - message_id: `421`

### ❌ 存在问题的功能

1. **登录 API 不可用**
   ```bash
   curl -X POST "http://localhost:7860/api/v1/user/login" \
     -d '{"user_name":"lzhy9999@163.com","password":"Moto@9999"}'
   ```
   - 结果：`{"status_code":500,"status_message":"Decryption failed"}`
   - 原因：服务器端密码加密/解密问题
   - 影响：无法通过用户名密码登录

2. **对话功能无法返回内容**
   - 现象：发送消息后没有看到 AI 回复
   - 可能原因：
     - 渲染层事件处理逻辑有问题
     - SSE 事件解析不正确
     - UI 更新逻辑有问题

## 问题根因分析

### 问题 1: 登录功能显示不正确

**根本原因**: Bisheng 服务器端的密码加密方式改变或配置问题

**证据**:
- curl 测试返回 "Decryption failed"
- 之前的测试也遇到同样的问题
- 这是服务器端问题，不是客户端代码问题

**解决方案**:
1. **短期方案**: 在应用设置中直接配置 Token，跳过登录步骤
2. **长期方案**: 联系 Bisheng 服务器管理员解决密码加密问题

### 问题 2: 对话功能无法返回内容

**可能原因分析**:

1. **工作流等待用户输入**
   - SSE 返回的是 `input` 事件，表示工作流在等待用户输入
   - 需要使用 session_id 和 message_id 继续对话
   - 当前代码可能没有正确处理这个流程

2. **事件解析逻辑问题**
   - 渲染层可能没有正确解析 SSE 事件
   - 可能没有正确提取 session_id 和 message_id
   - 可能没有正确处理 `input` 事件

3. **UI 更新逻辑问题**
   - 即使接收到事件，UI 可能没有正确更新
   - 需要检查 React 状态更新逻辑

## 修复方案

### 修复 1: 配置 Token 而不是登录

在 `SettingsPanel.tsx` 中添加直接配置 Token 的选项：

```typescript
// 在 Bisheng 配置部分添加 Token 输入框
<div>
  <label>Access Token (可选，如果登录失败请直接配置)</label>
  <input
    type="password"
    value={config.bisheng.accessToken || ''}
    onChange={(e) => handleConfigChange('bisheng.accessToken', e.target.value)}
    placeholder="直接粘贴有效的 Token"
  />
  <p className="text-sm text-gray-500">
    如果登录功能不可用，请直接配置 Token
  </p>
</div>
```

### 修复 2: 检查并修复事件处理逻辑

需要检查 `AgentChat.tsx` 中的以下部分：

1. **确认是否正确提取 session_id**
   ```typescript
   // 应该从第一个事件中提取
   if (event.session_id && !sessionId) {
     setSessionId(event.session_id);
   }
   ```

2. **确认是否正确提取 message_id**
   ```typescript
   // 应该从 input 事件中提取
   if (event.data?.event === 'input' && event.data?.message_id) {
     setMessageId(String(event.data.message_id));
   }
   ```

3. **确认是否正确处理 input 事件**
   - `input` 事件表示工作流在等待用户输入
   - 需要使用 session_id 和 message_id 继续对话
   - 不应该期待在首次调用时就有回复内容

### 修复 3: 添加详细的调试日志

在 `AgentChat.tsx` 的事件处理中添加更多日志：

```typescript
const offChunk = window.electronAPI.bisheng.onStreamChunk(({ streamId: id, chunk }) => {
  if (id !== streamId) return;
  
  console.log('[DEBUG] Received chunk:', chunk.substring(0, 100));
  
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  console.log('[DEBUG] Processing', lines.length, 'lines');
  
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    
    try {
      const event = JSON.parse(line.substring(6));
      console.log('[DEBUG] SSE event:', event.data?.event || event.event, event);
      
      // ... 处理事件
    } catch (e) {
      console.error('[DEBUG] Failed to parse line:', line, e);
    }
  }
});
```

## 验证步骤

### 步骤 1: 配置 Token

1. 启动应用：`npm run dev`
2. 打开设置页面
3. 在 Bisheng 配置中填写：
   - Base URL: `http://localhost:7860`
   - Access Token: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ7XCJ1c2VyX25hbWVcIjogXCJsemh5OTk5OUAxNjMuY29tXCIsIFwidXNlcl9pZFwiOiAxLCBcInJvbGVcIjogXCJhZG1pblwifSIsImlhdCI6MTc1OTkyMTI2NywibmJmIjoxNzU5OTIxMjY3LCJqdGkiOiIyZjNmOTI4ZC1mZmE1LTRjMjMtOTA2ZS1jYTJiNmZlNmE2ZGQiLCJleHAiOjE3NjAwMDc2NjcsInR5cGUiOiJhY2Nlc3MiLCJmcmVzaCI6ZmFsc2V9.IR44CwxXmg54syCfnlAq7k4pU4n9QajlGLlS5IcScJk`
4. 保存配置

### 步骤 2: 测试工作流列表

1. 点击"获取工作流列表"按钮
2. 预期结果：显示 4 个工作流

### 步骤 3: 测试对话功能

1. 选择工作流"检查项目推荐"
2. 打开浏览器 DevTools Console
3. 发送消息："你好"
4. 观察 Console 日志：
   - 应该看到 "Invoking workflow" 日志
   - 应该看到 "Stream started" 日志
   - 应该看到 "SSE event: guide_question" 日志
   - 应该看到 "SSE event: input" 日志
   - 应该看到 "Setting session_id" 日志
   - 应该看到 "Setting message_id" 日志

5. 再次发送消息："请介绍一下你自己"
6. 观察 Console 日志：
   - 应该看到 "hasSessionId: true" 日志
   - 应该看到 "hasMessageId: true" 日志
   - 应该看到 "SSE event: stream_msg" 或 "output_msg" 日志
   - 应该看到回复内容

### 步骤 4: 如果仍无法显示内容

检查以下几点：

1. **主进程日志**
   - 查看终端输出
   - 确认是否有 "Stream reading completed" 日志
   - 确认是否有错误日志

2. **渲染进程日志**
   - 查看 Console
   - 确认是否收到 SSE 事件
   - 确认事件解析是否正确

3. **网络请求**
   - 打开 DevTools Network 标签
   - 查看工作流调用请求
   - 确认请求体是否正确
   - 确认响应是否正常

## 临时解决方案

如果对话功能仍然无法工作，可以使用 iframe 模式作为备选方案：

1. 启动 iframe 代理：
   ```bash
   cd bisheng-integration
   node iframe-proxy.js &
   ```

2. 在应用中切换到 iframe 模式

3. 使用 Bisheng 原生界面进行对话

## 需要的信息

为了进一步诊断问题，请提供：

1. **浏览器 Console 日志**
   - 完整的 SSE 事件日志
   - 任何错误信息

2. **主进程日志**
   - 启动应用的终端输出
   - 特别是 Bisheng 相关的日志

3. **具体现象描述**
   - 发送消息后 UI 有什么变化
   - 是否显示"正在处理"状态
   - 是否有任何错误提示

---

**诊断时间**: 2025-10-08
**Token 有效期**: 2025-10-09
**状态**: 等待应用层测试验证

