# 对话组件统一化实施计划

**版本**: 1.0.0  
**日期**: 2025-10-09  
**状态**: 待批准

---

## 📋 目录

1. [实施概览](#实施概览)
2. [阶段划分](#阶段划分)
3. [详细任务](#详细任务)
4. [向后兼容性](#向后兼容性)
5. [测试验证方案](#测试验证方案)
6. [风险评估](#风险评估)

---

## 实施概览

### 总体策略

采用**渐进式升级**策略，分阶段实施，确保每个阶段都可独立验证和回滚。

### 时间估算

| 阶段 | 任务数 | 预计工时 | 依赖关系 |
|------|--------|----------|----------|
| **阶段0: 基础设施** | 3 | 4小时 | 无 |
| **阶段1: Chat.tsx升级** | 5 | 6小时 | 阶段0 |
| **阶段2: AgentChat.tsx升级** | 4 | 5小时 | 阶段0 |
| **阶段3: OneClickDesktopChat升级** | 4 | 5小时 | 阶段0 |
| **阶段4: 共享组件提取** | 3 | 4小时 | 阶段1-3 |
| **阶段5: 测试与优化** | 4 | 6小时 | 阶段4 |
| **总计** | 23 | **30小时** | - |

### 优先级定义

- **P0** - 核心功能，必须完成
- **P1** - 重要功能，建议完成
- **P2** - 增强功能，可选完成

---

## 阶段划分

### 阶段0: 基础设施搭建 (P0)

**目标**: 创建统一的状态管理和工具函数

**任务列表**:

1. **创建统一的ChatStore** (2小时)
   - 文件: `src/renderer/stores/chatStore.ts`
   - 实现完整的Store接口
   - 支持多会话管理
   - 实现持久化逻辑

2. **创建共享类型定义** (1小时)
   - 文件: `src/renderer/types/chat.ts`
   - 定义 `Message`, `ChatSession`, `Attachment` 等接口
   - 导出统一的类型

3. **创建工具函数库** (1小时)
   - 文件: `src/renderer/utils/chatUtils.ts`
   - 消息ID生成
   - 时间格式化
   - 文件大小格式化
   - Markdown处理

**验收标准**:
- [ ] ChatStore通过单元测试
- [ ] 类型定义完整且无错误
- [ ] 工具函数覆盖所有常用场景

---

### 阶段1: Chat.tsx升级 (P0)

**目标**: 将AI助手对话组件迁移到新架构

**当前问题**:
- 使用 `useState` + `sessionStorage` 管理状态
- 缺少停止生成功能
- 缺少智能建议功能

**任务列表**:

1. **迁移状态管理** (2小时)
   - 移除 `useState` 管理的 `messages`
   - 使用 `useChatStore` 替代
   - 保留 `sessionStorage` 作为备份（向后兼容）

2. **添加停止生成功能** (1小时)
   - 实现 `AbortController` 逻辑
   - 添加停止按钮UI
   - 处理中断后的状态

3. **添加智能建议功能** (2小时)
   - 对话完成后生成建议
   - 显示建议按钮
   - 点击建议自动发送

4. **优化流式输出** (0.5小时)
   - 使用Store的 `updateMessage` 方法
   - 优化渲染性能

5. **样式统一** (0.5小时)
   - 确保使用 `.glass` 类
   - 移除旧的样式类名

**修改文件**:
- `src/renderer/components/Chat.tsx`

**验收标准**:
- [ ] 消息正确保存到Store
- [ ] 停止生成功能正常工作
- [ ] 智能建议正确显示和发送
- [ ] 样式与设计规范一致
- [ ] 向后兼容（可从sessionStorage恢复）

---

### 阶段2: AgentChat.tsx升级 (P0)

**目标**: 将智能体对话组件迁移到新架构

**当前问题**:
- 使用独立的 `agentSessionStore`
- 缺少消息操作按钮（复制、删除）
- 缺少智能建议功能

**任务列表**:

1. **整合到统一Store** (2小时)
   - 评估是否保留 `agentSessionStore`（因为有特殊的Bisheng逻辑）
   - 或者扩展 `chatStore` 支持Bisheng特性
   - 实现数据迁移逻辑

2. **添加消息操作** (1小时)
   - 添加复制按钮
   - 添加删除按钮
   - 添加重新生成按钮（如适用）

3. **添加智能建议** (1.5小时)
   - 基于工作流上下文生成建议
   - 显示建议按钮

4. **样式统一** (0.5小时)
   - 确保使用 `.glass` 类
   - 统一消息气泡样式

**修改文件**:
- `bisheng-integration/components/AgentChat.tsx`
- `bisheng-integration/store/agentSessionStore.ts` (可能)

**验收标准**:
- [ ] 与统一Store集成（或保持兼容）
- [ ] 消息操作按钮正常工作
- [ ] 智能建议正确显示
- [ ] 样式一致
- [ ] Bisheng工作流功能不受影响

---

### 阶段3: OneClickDesktopChat升级 (P0)

**目标**: 将医疗对话组件迁移到新架构

**当前问题**:
- 使用本地 `useState` 管理消息
- 缺少消息操作功能
- 缺少智能建议功能

**任务列表**:

1. **迁移状态管理** (2小时)
   - 使用 `useChatStore` 管理消息
   - 保留患者信息的本地状态
   - 实现持久化

2. **添加消息操作** (1小时)
   - 添加复制、删除按钮
   - 保留现有的清空会话功能

3. **添加智能建议** (1.5小时)
   - 基于医疗场景生成建议
   - 例如："查看检查结果"、"调整用药方案"

4. **样式统一** (0.5小时)
   - 统一消息气泡样式
   - 确保使用 `.glass` 类

**修改文件**:
- `src/renderer/components/medical/OneClickDesktopChat.tsx`

**验收标准**:
- [ ] 消息正确保存到Store
- [ ] 患者信息正确关联
- [ ] 消息操作按钮正常工作
- [ ] 智能建议符合医疗场景
- [ ] 样式一致

---

### 阶段4: 共享组件提取 (P1)

**目标**: 提取可复用的子组件，减少代码重复

**任务列表**:

1. **提取MessageList组件** (1.5小时)
   - 文件: `src/renderer/components/chat/MessageList.tsx`
   - 接受 `messages` 和 `isLoading` props
   - 处理虚拟滚动（长列表优化）

2. **提取MessageItem组件** (1小时)
   - 文件: `src/renderer/components/chat/MessageItem.tsx`
   - 渲染单条消息
   - 包含操作按钮（复制、删除、重新生成）

3. **提取ChatInput组件** (1.5小时)
   - 文件: `src/renderer/components/chat/ChatInput.tsx`
   - 多行输入框
   - 附件上传
   - 发送/停止按钮

**修改文件**:
- 新建多个共享组件文件
- 更新三个对话组件使用共享组件

**验收标准**:
- [ ] 共享组件可在三个对话组件中复用
- [ ] 代码重复率降低50%以上
- [ ] 组件接口清晰且文档完善

---

### 阶段5: 测试与优化 (P1)

**目标**: 全面测试和性能优化

**任务列表**:

1. **功能测试** (2小时)
   - 测试所有对话场景
   - 测试消息操作
   - 测试智能建议
   - 测试错误处理

2. **性能测试** (1.5小时)
   - 测试长对话（>100条消息）
   - 测试流式输出性能
   - 测试内存占用

3. **兼容性测试** (1.5小时)
   - 测试数据迁移
   - 测试向后兼容性
   - 测试不同配置下的表现

4. **优化与修复** (1小时)
   - 修复发现的问题
   - 性能优化
   - 代码清理

**验收标准**:
- [ ] 所有功能测试通过
- [ ] 长对话场景流畅（60fps）
- [ ] 内存占用合理（<100MB）
- [ ] 向后兼容性良好

---

## 向后兼容性

### 数据迁移策略

#### 1. Chat.tsx 数据迁移

```typescript
// 从 sessionStorage 迁移到 Store
const migrateFromSessionStorage = (sessionId: string) => {
  try {
    const raw = sessionStorage.getItem('chatMessages');
    if (raw) {
      const oldMessages = JSON.parse(raw);
      const newMessages = oldMessages.map((m: any) => ({
        ...m,
        sessionId,
        timestamp: new Date(m.timestamp).getTime(),
      }));
      
      // 导入到新Store
      useChatStore.getState().importMessages(sessionId, newMessages);
      
      // 保留原数据作为备份
      sessionStorage.setItem('chatMessages_backup', raw);
    }
  } catch (e) {
    console.warn('Migration failed:', e);
  }
};
```

#### 2. AgentChat.tsx 数据兼容

保留 `agentSessionStore` 作为适配层，内部调用统一的 `chatStore`：

```typescript
// agentSessionStore.ts
export const useAgentSessionStore = create<AgentSessionStore>((set, get) => ({
  // 内部使用 chatStore
  getSession: (workflowId, workflowName) => {
    const chatSession = useChatStore.getState().getSession(workflowId, workflowName);
    // 转换为 AgentSession 格式
    return adaptToAgentSession(chatSession);
  },
  // ...
}));
```

#### 3. OneClickDesktopChat 数据迁移

```typescript
// 从 localStorage (persistence.ts) 迁移
const migrateFromPersistence = (sessionId: string) => {
  try {
    const messages = listChatMessages(sessionId);
    if (messages.length > 0) {
      const newMessages = messages.map(m => ({
        id: m.id,
        sessionId: m.session_id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
        type: 'text' as const,
      }));
      
      useChatStore.getState().importMessages(sessionId, newMessages);
    }
  } catch (e) {
    console.warn('Migration failed:', e);
  }
};
```

### 回滚方案

每个阶段完成后创建Git标签，便于回滚：

```bash
# 阶段0完成
git tag -a v2.0.0-stage0 -m "Stage 0: Infrastructure"

# 阶段1完成
git tag -a v2.0.0-stage1 -m "Stage 1: Chat.tsx upgrade"

# 回滚到阶段0
git checkout v2.0.0-stage0
```

---

## 测试验证方案

### 单元测试

```typescript
// chatStore.test.ts
describe('ChatStore', () => {
  it('should create new session', () => {
    const { getSession } = useChatStore.getState();
    const session = getSession('test-session', 'Test');
    expect(session.id).toBe('test-session');
    expect(session.messages).toEqual([]);
  });

  it('should add message', () => {
    const { addMessage, getSession } = useChatStore.getState();
    const message: Message = {
      id: 'msg-1',
      sessionId: 'test-session',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    };
    
    addMessage('test-session', message);
    const session = getSession('test-session');
    expect(session.messages).toHaveLength(1);
    expect(session.messages[0].content).toBe('Hello');
  });

  // 更多测试...
});
```

### 集成测试

```typescript
// Chat.integration.test.tsx
describe('Chat Component', () => {
  it('should send and receive message', async () => {
    render(<Chat sessionId="test" />);
    
    const input = screen.getByPlaceholderText('输入消息...');
    const sendButton = screen.getByTitle('发送');
    
    fireEvent.change(input, { target: { value: 'Hello AI' } });
    fireEvent.click(sendButton);
    
    // 验证用户消息显示
    expect(screen.getByText('Hello AI')).toBeInTheDocument();
    
    // 等待AI响应
    await waitFor(() => {
      expect(screen.getByText(/AI响应/)).toBeInTheDocument();
    });
  });

  // 更多测试...
});
```

### 手动测试清单

#### Chat.tsx
- [ ] 发送文本消息
- [ ] 上传图片附件
- [ ] 上传文件附件
- [ ] 复制消息
- [ ] 删除消息
- [ ] 重新生成响应
- [ ] 清空对话
- [ ] 停止生成
- [ ] 点击智能建议
- [ ] 刷新页面后恢复对话

#### AgentChat.tsx
- [ ] 自动启动工作流
- [ ] 发送消息到工作流
- [ ] 接收流式响应
- [ ] 停止生成
- [ ] 复制消息
- [ ] 删除消息
- [ ] 切换工作流
- [ ] 清空会话

#### OneClickDesktopChat.tsx
- [ ] 一键启动流程
- [ ] 截图识别
- [ ] 生成推荐
- [ ] 继续对话
- [ ] 复制消息
- [ ] 删除消息
- [ ] 清空会话
- [ ] 患者信息正确关联

---

## 风险评估

### 高风险项

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **数据迁移失败** | 高 | 中 | 保留原数据备份，提供手动迁移工具 |
| **性能下降** | 高 | 低 | 性能测试，虚拟滚动优化 |
| **Bisheng集成问题** | 中 | 中 | 保留独立Store，渐进式集成 |

### 中风险项

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **样式不一致** | 中 | 低 | 严格遵循样式规范，代码审查 |
| **功能回归** | 中 | 中 | 全面测试，分阶段发布 |
| **用户体验变化** | 中 | 低 | 保持交互一致性，用户反馈 |

### 低风险项

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **代码重构工作量** | 低 | 高 | 合理估算时间，分阶段实施 |
| **文档不完善** | 低 | 中 | 同步更新文档 |

---

## 下一步行动

### 立即行动

1. **审查本计划** - 确认实施方案和优先级
2. **准备开发环境** - 创建开发分支
3. **开始阶段0** - 搭建基础设施

### 需要确认的问题

1. **是否保留 agentSessionStore？**
   - 选项A: 完全迁移到 chatStore
   - 选项B: 保留作为适配层
   - **建议**: 选项B，降低风险

2. **智能建议的生成方式？**
   - 选项A: 调用AI模型生成
   - 选项B: 预定义模板
   - **建议**: 选项A（P1），选项B作为降级方案

3. **是否需要虚拟滚动？**
   - 选项A: 立即实现
   - 选项B: 后续优化
   - **建议**: 选项B，先完成核心功能

4. **测试覆盖率目标？**
   - 建议: 核心功能80%，整体60%

---

**状态**: 等待批准  
**预计开始时间**: 批准后立即开始  
**预计完成时间**: 批准后30工作小时（约1周）

