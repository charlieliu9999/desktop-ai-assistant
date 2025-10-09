# Bisheng 对话功能测试清单

## 前置条件
- [ ] Bisheng 服务运行在 http://localhost:7860
- [ ] 应用已启动（`npm run dev`）
- [ ] 浏览器 DevTools Console 已打开

## 测试步骤

### 1. 首次对话测试
- [ ] 选择工作流"检查项目推荐"
- [ ] 发送消息："你好"
- [ ] 查看 Console 日志

**预期日志**:
```
✅ [DEBUG] Registering event listeners...
✅ [DEBUG] Calling invokeWorkflow...
✅ [DEBUG] Workflow invoked, streamId: bisheng-...
✅ [DEBUG] Stream start event received: bisheng-...
✅ [DEBUG] Stream chunk event received: ...
✅ SSE event: guide_question
✅ SSE event: input
✅ Setting session_id: ...
✅ Setting message_id: ...
✅ [DEBUG] Stream end event received: ...
```

**预期 UI**:
- [ ] 用户消息立即显示
- [ ] 显示"正在处理"状态
- [ ] 显示助手消息（引导问题或提示）
- [ ] "正在处理"状态消失

### 2. 继续对话测试
- [ ] 发送消息："请介绍一下你自己"
- [ ] 查看 Console 日志

**预期日志**:
```
✅ Invoking workflow {sessionId: "...", messageId: "421", ...}
✅ [DEBUG] Stream chunk event received: ...
✅ SSE event: stream_msg (status: "stream")
✅ SSE event: stream_msg (status: "end")
```

**预期 UI**:
- [ ] 显示 AI 的完整回复
- [ ] 回复内容正确显示

### 3. 多轮对话测试
- [ ] 继续发送 2-3 条消息
- [ ] 验证对话历史正确显示
- [ ] 验证 sessionId 保持不变
- [ ] 验证 messageId 正确更新

## 问题排查

### 如果没有收到事件
1. 检查是否有 `[DEBUG] Stream start event received:` 日志
2. 如果没有，查看主进程日志
3. 检查 Bisheng 服务是否正常运行

### 如果事件被忽略
1. 查找 `[DEBUG] Ignoring chunk for different streamId` 日志
2. 比较 streamId 是否匹配

### 如果 UI 没有更新
1. 检查是否有 "Setting session_id:" 日志
2. 检查是否有 "Setting message_id:" 日志
3. 检查 React 状态是否正确更新

---

**测试时间**: _____________
**测试结果**: _____________
**发现的问题**: _____________
