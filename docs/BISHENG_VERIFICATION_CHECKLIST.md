# Bisheng 集成验证清单

## 前置条件

- [ ] Bisheng 服务运行在 `http://localhost:7860`
- [ ] 有效的访问 Token（见下方）
- [ ] 应用已编译（`npm run build` 或 `npm run dev`）

**测试 Token**:
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ7XCJ1c2VyX25hbWVcIjogXCJsemh5OTk5OUAxNjMuY29tXCIsIFwidXNlcl9pZFwiOiAxLCBcInJvbGVcIjogXCJhZG1pblwifSIsImlhdCI6MTc1OTg1MTkwOSwibmJmIjoxNzU5ODUxOTA5LCJqdGkiOiI1NjAyNTIyMC0yNGRjLTRkNmQtOWY1OS0xYTUxNGVjYmNhMWQiLCJleHAiOjE3NTk5MzgzMDksInR5cGUiOiJhY2Nlc3MiLCJmcmVzaCI6ZmFsc2V9.zckjzI4BrKYe1fVgVGUdMRsVmE1N8vvPxgRixE41_88
```

## API 层测试

### 1. 工作流列表获取
```bash
curl -X GET "http://localhost:7860/api/v1/workflow/list?page_size=10&page_num=1" \
  -H "Authorization: Bearer {token}"
```

**预期结果**:
- [ ] 返回 200 状态码
- [ ] `status_code: 200`
- [ ] `data.data` 包含工作流数组
- [ ] 至少有 1 个工作流

### 2. 工作流调用（首次）
```bash
curl -N -X POST "http://localhost:7860/api/v2/workflow/invoke" \
  -H "accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "workflow_id": "d5e79601de8245768a38ee756a14a067",
    "stream": true,
    "input": {"user_input": "你好"}
  }'
```

**预期结果**:
- [ ] 返回 SSE 流（`data: {...}` 格式）
- [ ] 第一个事件包含 `session_id`
- [ ] 收到 `guide_question` 或 `guide_word` 事件
- [ ] 收到 `input` 事件（包含 `message_id`）

## 应用层测试

### 3. 启动应用
```bash
cd desktop-ai-assistant
npm run dev
```

**预期结果**:
- [ ] 应用成功启动
- [ ] 没有编译错误（忽略已知的类型警告）
- [ ] 主窗口正常显示

### 4. 配置 Bisheng
1. 打开应用设置
2. 找到 Bisheng 配置部分
3. 填写以下信息：
   - Base URL: `http://localhost:7860`
   - Access Token: （使用上面的 token）

**预期结果**:
- [ ] 配置保存成功
- [ ] 没有错误提示

### 5. 获取工作流列表
1. 进入 Bisheng 测试页面
2. 点击"获取工作流列表"按钮

**预期结果**:
- [ ] 显示加载状态
- [ ] 成功获取工作流列表
- [ ] 显示至少 1 个工作流
- [ ] 工作流名称和描述正确显示

**检查控制台**:
- [ ] 主进程日志显示 "Retrieved X workflows"
- [ ] 没有错误日志

### 6. 首次对话测试
1. 选择工作流"检查项目推荐"
2. 在输入框输入："你好，请介绍一下你自己"
3. 点击发送

**预期结果**:
- [ ] 用户消息立即显示
- [ ] 显示"正在处理"状态
- [ ] 助手消息开始出现（可能是空的）
- [ ] 逐渐显示回复内容（流式输出）
- [ ] 最终显示完整回复
- [ ] "正在处理"状态消失

**检查控制台**:
- [ ] 看到 "Invoking workflow" 日志
- [ ] 看到 "Workflow invoked successfully" 日志
- [ ] 看到 "Stream started" 日志
- [ ] 看到多个 "SSE event" 日志
- [ ] 看到 "Setting session_id" 日志
- [ ] 看到 "Setting message_id" 日志
- [ ] 看到 "Stream ended" 日志
- [ ] 没有错误日志

### 7. 继续对话测试
1. 在同一个对话中输入："谢谢"
2. 点击发送

**预期结果**:
- [ ] 用户消息立即显示
- [ ] 助手回复正常显示
- [ ] 使用了之前的 session_id 和 message_id

**检查控制台**:
- [ ] "Invoking workflow" 日志显示 `hasSessionId: true`
- [ ] "Invoking workflow" 日志显示 `hasMessageId: true`
- [ ] 正常接收到回复

### 8. 多轮对话测试
继续发送 3-5 条消息，测试多轮对话

**预期结果**:
- [ ] 每条消息都能正常发送和接收
- [ ] session_id 保持不变
- [ ] message_id 正确更新
- [ ] 对话历史正确显示

## 错误场景测试

### 9. 网络错误测试
1. 停止 Bisheng 服务
2. 尝试发送消息

**预期结果**:
- [ ] 显示错误提示
- [ ] 错误信息清晰明确
- [ ] 应用不崩溃

### 10. Token 过期测试
1. 使用过期的 token
2. 尝试获取工作流列表

**预期结果**:
- [ ] 显示认证错误
- [ ] 提示重新登录或更新 token

### 11. 无效工作流 ID 测试
1. 手动修改代码使用不存在的工作流 ID
2. 尝试发送消息

**预期结果**:
- [ ] 显示错误提示
- [ ] 应用不崩溃

## 性能测试

### 12. 长消息测试
发送一条很长的消息（500+ 字符）

**预期结果**:
- [ ] 消息正常发送
- [ ] 回复正常接收
- [ ] UI 不卡顿

### 13. 快速连续发送测试
快速连续发送 3 条消息

**预期结果**:
- [ ] 所有消息都能正常处理
- [ ] 没有消息丢失
- [ ] 没有状态混乱

## 日志检查

### 主进程日志应包含
- [ ] "Initializing Bisheng service..."
- [ ] "Bisheng service initialized successfully"
- [ ] "IPC: bisheng-invoke-workflow"
- [ ] "Workflow invoked successfully, returning stream"
- [ ] "Stream reading completed"

### 渲染进程日志应包含
- [ ] "Invoking workflow"
- [ ] "Workflow invoked, streamId: ..."
- [ ] "Stream started: ..."
- [ ] "SSE event: guide_question" 或类似
- [ ] "Setting session_id: ..."
- [ ] "Setting message_id: ..."
- [ ] "Stream message (stream): ..." 或 "Stream message (end): ..."
- [ ] "Stream ended: {success: true}"

## 问题排查

### 如果工作流列表获取失败
1. 检查 Bisheng 服务是否运行：`curl http://localhost:7860/health`
2. 检查 token 是否有效
3. 查看主进程日志中的错误信息
4. 查看网络请求（DevTools Network 标签）

### 如果没有收到回复
1. 打开浏览器 DevTools Console
2. 检查是否有 "SSE event" 日志
3. 检查是否有 "Stream started" 日志
4. 检查是否有错误日志
5. 查看主进程日志
6. 使用 curl 命令直接测试 API

### 如果回复显示不完整
1. 检查 Console 中的 SSE 事件
2. 确认是否收到 `status: "end"` 的事件
3. 检查 `output_schema.message` 字段
4. 查看是否有 JavaScript 错误

### 如果 session_id 或 message_id 未更新
1. 检查 Console 中的 "Setting session_id" 和 "Setting message_id" 日志
2. 确认 SSE 事件中包含这些字段
3. 检查事件解析逻辑是否正确

## 验证完成标准

所有以下项目都应该通过：
- [ ] API 层测试全部通过
- [ ] 应用层测试全部通过
- [ ] 至少完成一次完整的多轮对话
- [ ] 错误场景测试至少通过 2 项
- [ ] 日志检查全部通过
- [ ] 没有未处理的错误或警告

## 备注

- 测试时间：_____________
- 测试人员：_____________
- 测试环境：_____________
- 发现的问题：
  1. _____________
  2. _____________
  3. _____________

---

**文档版本**: v1.0
**创建日期**: 2025-10-08

