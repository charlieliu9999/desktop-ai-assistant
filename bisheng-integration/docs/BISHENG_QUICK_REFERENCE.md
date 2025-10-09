# Bisheng 智能体功能快速参考

## 📚 文档索引

| 文档 | 用途 | 适合人群 |
|------|------|---------|
| **BISHENG_AGENT_FEATURE_GUIDE.md** | 完整功能指南 | 所有开发者 |
| **BISHENG_CODE_EXAMPLES.md** | 代码示例 | 开发者 |
| **BISHENG_QUICK_REFERENCE.md** | 快速参考（本文档） | 所有人 |
| **WORKFLOW_IMPROVEMENTS.md** | 功能改进说明 | 维护者 |
| **EVENT_LISTENER_FIX.md** | 事件监听器修复 | 维护者 |

---

## 🚀 快速开始

### 1. 配置 Bisheng 服务

```typescript
// 在设置页面配置
{
  enabled: true,
  baseUrl: 'http://localhost:3001',
  mode: 'api',  // 或 'iframe'
  username: 'admin',
  password: 'password',
  autoLogin: true
}
```

### 2. 使用智能体

```typescript
// 1. 获取智能体列表
const workflows = await window.electronAPI.bisheng.getWorkflows(100, 1);

// 2. 选择智能体
onSelectAgent(workflow);

// 3. 自动启动工作流（显示欢迎语）
// 组件会自动调用

// 4. 发送消息
await window.electronAPI.bisheng.invokeWorkflow(
  workflowId,
  { user_input: '你好' },
  true,
  sessionId,
  messageId,
  inputNodeId
);

// 5. 停止工作流
await window.electronAPI.bisheng.stopWorkflow(workflowId, sessionId);
```

---

## 📁 核心文件

### 渲染进程

| 文件 | 功能 | 行数 |
|------|------|------|
| `src/renderer/pages/AgentService.tsx` | 主页面 | ~270 |
| `src/renderer/components/AgentList.tsx` | 智能体列表 | ~200 |
| `src/renderer/components/AgentChat.tsx` | 对话组件 | ~730 |
| `src/renderer/store/agentSessionStore.ts` | 会话管理 | ~270 |

### 主进程

| 文件 | 功能 | 行数 |
|------|------|------|
| `src/services/bisheng.ts` | Bisheng 服务 | ~690 |
| `src/main/main.ts` | IPC 处理器 | ~1400 |
| `src/main/preload.ts` | API 暴露 | ~450 |

### 类型定义

| 文件 | 功能 |
|------|------|
| `src/shared/types.ts` | 类型定义 |

---

## 🔑 关键概念

### 1. 工作流调用流程

```
首次调用:
POST /api/v2/workflow/invoke
{
  "workflow_id": "xxx",
  "stream": true
}

继续对话:
POST /api/v2/workflow/invoke
{
  "workflow_id": "xxx",
  "stream": true,
  "session_id": "xxx_async_task_id",
  "message_id": 1,
  "input": {
    "input_e1758": {
      "user_input": "你好"
    }
  }
}
```

### 2. SSE 事件类型

| 事件类型 | 说明 | 处理方式 |
|---------|------|---------|
| `guide_word` | 欢迎语 | 显示为助手消息 |
| `guide_question` | 引导问题 | 显示为建议 |
| `input` | 需要用户输入 | 保存 node_id 和 message_id |
| `stream_msg` | 流式消息 | 逐字显示 |
| `output_msg` | 输出消息 | 显示完整消息 |
| `close` | 工作流结束 | 清理监听器 |
| `error` | 错误 | 显示错误信息 |

### 3. 会话状态

```typescript
{
  workflowId: string;        // 工作流 ID
  sessionId: string | null;  // 会话 ID (从 SSE 获取)
  messageId: string | null;  // 消息 ID (从 input 事件获取)
  inputNodeId: string | null; // 输入节点 ID (从 input 事件获取)
  messages: BishengMessage[]; // 消息列表
  isAutoStarted: boolean;    // 是否已自动启动
}
```

---

## 🛠️ 常用 API

### Electron API

```typescript
// 登录
await window.electronAPI.bisheng.login(username, password);

// 获取工作流列表
const workflows = await window.electronAPI.bisheng.getWorkflows(pageSize, pageNum);

// 调用工作流
const { streamId } = await window.electronAPI.bisheng.invokeWorkflow(
  workflowId,
  input,
  stream,
  sessionId,
  messageId,
  inputNodeId
);

// 停止工作流
await window.electronAPI.bisheng.stopWorkflow(workflowId, sessionId);

// 监听事件
const offChunk = window.electronAPI.bisheng.onStreamChunk(({ streamId, chunk }) => {
  // 处理数据块
});

const offEnd = window.electronAPI.bisheng.onStreamEnd(({ streamId, success }) => {
  // 处理结束
});

// 清理监听器
offChunk();
offEnd();
```

### Store API

```typescript
// 获取会话
const session = getSession(workflowId, workflowName);

// 更新会话
updateSession(workflowId, {
  sessionId: 'xxx',
  messageId: '1',
  inputNodeId: 'input_e1758'
});

// 添加消息
addMessage(workflowId, {
  id: 'msg-1',
  role: 'user',
  content: '你好',
  timestamp: Date.now(),
  type: 'text'
});

// 更新消息
updateMessage(workflowId, messageId, newContent);

// 设置活跃工作流
setActiveWorkflow(workflowId);
```

---

## 🐛 常见问题

### Q1: 消息不显示

**检查**:
- [ ] 是否有 `buffer is not defined` 错误？
- [ ] 是否收到 SSE 事件？（查看 `[DEBUG]` 日志）
- [ ] `sessionId`、`messageId`、`inputNodeId` 是否正确？

**解决**:
```typescript
// 确保 buffer 已声明
let buffer = '';

// 确保事件监听器正确注册
const offChunk = window.electronAPI.bisheng.onStreamChunk(...);
```

### Q2: 切换智能体后无法对话

**检查**:
- [ ] 事件监听器是否清理？（查看 `[Cleanup]` 日志）
- [ ] 是否有多个 streamId 混淆？

**解决**:
```typescript
// 在 useEffect 中清理
useEffect(() => {
  if (cleanupRef.current) {
    cleanupRef.current();
    cleanupRef.current = null;
  }
  
  return () => {
    if (cleanupRef.current) {
      cleanupRef.current();
    }
  };
}, [workflow.id]);
```

### Q3: 停止按钮无效

**检查**:
- [ ] `sessionId` 是否存在？
- [ ] 停止接口是否返回成功？

**解决**:
```typescript
const handleStopWorkflow = async () => {
  if (!sessionId) {
    console.warn('No sessionId');
    return;
  }
  
  await window.electronAPI.bisheng.stopWorkflow(workflow.id, sessionId);
  
  // 清理监听器
  if (cleanupRef.current) {
    cleanupRef.current();
    cleanupRef.current = null;
  }
};
```

---

## 📊 功能清单

### 已实现 ✅

- [x] 智能体列表获取
- [x] 智能体搜索
- [x] 智能体选择
- [x] 自动启动工作流
- [x] 发送消息
- [x] 流式响应
- [x] 停止工作流
- [x] 会话管理
- [x] 切换智能体保留历史
- [x] 双模式支持（API/iframe）
- [x] 事件监听器清理
- [x] 错误处理

### 待实现 ⏸️

- [ ] 多智能体并发对话
- [ ] 服务端历史记录集成
- [ ] 历史记录搜索
- [ ] 对话导出
- [ ] 工作流暂停/恢复
- [ ] 性能优化（虚拟滚动）
- [ ] 离线模式

---

## 🎯 开发建议

### 1. 添加新功能

```typescript
// 1. 在 BishengService 中添加方法
async newFeature() {
  // 实现
}

// 2. 在 preload.ts 中暴露 API
bisheng: {
  newFeature: () => ipcRenderer.invoke('bisheng-new-feature')
}

// 3. 在 main.ts 中注册 IPC 处理器
ipcMain.handle('bisheng-new-feature', async () => {
  return await this.bishengService.newFeature();
});

// 4. 在组件中使用
const result = await window.electronAPI.bisheng.newFeature();
```

### 2. 调试技巧

```typescript
// 启用详细日志
console.log('[DEBUG]', ...);

// 查看会话状态
console.log('Session:', getSession(workflowId, workflowName));

// 查看 SSE 事件
console.log('SSE event:', event);

// 查看监听器清理
console.log('[Cleanup] Removing listeners');
```

### 3. 性能优化

```typescript
// 使用 React.memo 避免不必要的重渲染
const AgentList = React.memo(({ ... }) => { ... });

// 使用 useCallback 缓存函数
const handleSelectAgent = useCallback((agent) => {
  onSelectAgent(agent);
}, [onSelectAgent]);

// 使用虚拟滚动处理大量消息
import { FixedSizeList } from 'react-window';
```

---

## 📞 获取帮助

### 查看日志

```bash
# 开发模式
npm run dev

# 查看控制台
# 渲染进程: 浏览器开发者工具
# 主进程: 终端输出
```

### 查看文档

1. **功能指南**: `BISHENG_AGENT_FEATURE_GUIDE.md`
2. **代码示例**: `BISHENG_CODE_EXAMPLES.md`
3. **改进说明**: `WORKFLOW_IMPROVEMENTS.md`
4. **修复说明**: `EVENT_LISTENER_FIX.md`

### 测试功能

```bash
# 启动应用
npm run dev

# 测试步骤
1. 配置 Bisheng 服务
2. 登录
3. 选择智能体
4. 发送消息
5. 测试停止功能
6. 切换智能体
```

---

## 🎉 总结

Bisheng 智能体功能提供了完整的智能体对话体验：

- ✅ **简单易用**: 选择智能体即可开始对话
- ✅ **功能完整**: 支持流式对话、停止、会话管理
- ✅ **稳定可靠**: 完善的错误处理和事件清理
- ✅ **易于扩展**: 清晰的架构和代码结构

**开始使用**: 查看 `BISHENG_AGENT_FEATURE_GUIDE.md` 获取详细指南！

