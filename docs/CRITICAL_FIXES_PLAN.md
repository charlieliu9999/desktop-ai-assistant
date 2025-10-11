# 关键问题修复计划

**日期**: 2025-10-09  
**状态**: 执行中

---

## 🔍 问题分析

### 问题4: 主题切换功能失效（最严重）

**根本原因**:
1. **双重主题系统冲突**: 
   - 旧系统：`configStore.theme`（在App.tsx中使用）
   - 新系统：`themeStore.mode`（在ThemeSettings中使用）
   - 两个系统互不通信，导致设置页面的更改不影响实际显示

2. **App.tsx中的冲突代码**:
```typescript
// App.tsx 第21-33行
useEffect(() => {
  const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark =
    config.theme === 'dark' ||  // 使用旧的configStore
    (config.theme === 'auto' && isSystemDark) ||
    (config.theme === 'glass' && isSystemDark);

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}, [config.theme]);  // 监听旧的config.theme
```

3. **玻璃效果参数未持久化**:
   - themeStore已经实现了持久化（saveThemeToStorage）
   - 但玻璃效果参数在updateGlassEffect中已经保存
   - 问题可能在于恢复时没有正确应用

**解决方案**:
1. 移除App.tsx中的旧主题逻辑
2. 完全使用themeStore管理主题
3. 确保玻璃效果参数正确持久化和恢复

---

### 问题3: 会话持久化问题

**根本原因**:
- Chat.tsx使用sessionStorage而非localStorage
- sessionStorage在标签页关闭后会清除

**解决方案**:
1. 将sessionStorage改为localStorage
2. 使用唯一的key存储聊天记录
3. 应用启动时自动恢复

---

### 问题2: 新会话功能不完善

**根本原因**:
- clearChat函数功能单一
- 缺少明确的"新会话"按钮

**解决方案**:
1. 保留clearChat作为"清空聊天"
2. 添加startNewSession作为"新会话"
3. 在UI中添加明显的"新会话"按钮

---

### 问题1: 停止生成功能缺失

**根本原因**:
- 已有abortController状态
- 已有stopGeneration函数
- 缺少UI按钮

**解决方案**:
1. 在加载指示器旁边添加停止按钮
2. 连接到stopGeneration函数

---

## 🎯 修复顺序

### 第1步: 修复主题切换（问题4）⚡ 最优先

**文件修改**:
1. `App.tsx` - 移除旧主题逻辑
2. `themeStore.ts` - 确保持久化正确

**预计时间**: 30分钟

---

### 第2步: 修复会话持久化（问题3）

**文件修改**:
1. `Chat.tsx` - sessionStorage → localStorage

**预计时间**: 15分钟

---

### 第3步: 添加新会话功能（问题2）

**文件修改**:
1. `Chat.tsx` - 添加startNewSession函数和按钮

**预计时间**: 20分钟

---

### 第4步: 添加停止生成按钮（问题1）

**文件修改**:
1. `Chat.tsx` - 添加停止按钮UI

**预计时间**: 15分钟

---

## 📝 详细修复步骤

### 修复问题4: 主题切换

#### 步骤1: 修改App.tsx

**移除旧主题逻辑**:
```typescript
// 删除这段代码（第21-33行）
useEffect(() => {
  const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark =
    config.theme === 'dark' ||
    (config.theme === 'auto' && isSystemDark) ||
    (config.theme === 'glass' && isSystemDark);

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}, [config.theme]);
```

**原因**: 这段代码与themeStore冲突，themeStore的applyTheme已经处理了dark类名

#### 步骤2: 验证themeStore持久化

检查localStorage中是否正确保存：
```javascript
// 在浏览器控制台执行
localStorage.getItem('app:theme')
```

应该看到类似：
```json
{
  "mode": "glass",
  "config": {
    "glassEffect": {
      "opacity": 0.2,
      "blur": 50,
      "saturation": 180
    },
    ...
  }
}
```

---

### 修复问题3: 会话持久化

#### 修改Chat.tsx

**替换sessionStorage为localStorage**:

```typescript
// 旧代码
const raw = sessionStorage.getItem('chatMessages');
sessionStorage.setItem('chatMessages', JSON.stringify(messages));
sessionStorage.removeItem('chatMessages');

// 新代码
const CHAT_STORAGE_KEY = 'app:chat:messages';
const raw = localStorage.getItem(CHAT_STORAGE_KEY);
localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
localStorage.removeItem(CHAT_STORAGE_KEY);
```

---

### 修复问题2: 新会话功能

#### 添加startNewSession函数

```typescript
// 新会话（保留历史记录，但开始新对话）
const startNewSession = async () => {
  if (!confirm('确定要开始新会话吗？当前对话将被清空。')) return;
  try {
    setMessages([]);
    setAttachments([]);
    setInputValue('');
    localStorage.removeItem(CHAT_STORAGE_KEY);
    await window.electronAPI?.ai?.clearHistory?.();
    toast.success('新会话已开始');
  } catch (e) {
    console.warn('Failed to start new session:', e);
    toast.success('新会话已开始');
  }
};
```

#### 添加UI按钮

```tsx
<button
  type="button"
  onClick={startNewSession}
  className="p-2 rounded-lg hover:bg-[rgb(var(--muted))] transition-colors"
  title="新会话"
>
  <Plus className="h-4 w-4" />
</button>
```

---

### 修复问题1: 停止生成按钮

#### 添加UI

```tsx
{isLoading && (
  <div className="flex items-center space-x-2">
    <div className="flex justify-start">
      <div className="message-assistant">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[rgb(var(--primary))]"></div>
          <span className="text-sm">AI正在思考...</span>
        </div>
      </div>
    </div>
    <button
      type="button"
      onClick={stopGeneration}
      className="p-2 rounded-lg bg-[rgb(var(--error))] text-white hover:opacity-90 transition-all"
      title="停止生成"
    >
      <StopCircle className="h-4 w-4" />
    </button>
  </div>
)}
```

---

## 🧪 测试清单

### 问题4测试
- [ ] 切换到浅色主题，整个应用变为浅色
- [ ] 切换到深色主题，整个应用变为深色
- [ ] 切换到玻璃主题，应用显示玻璃效果
- [ ] 调整玻璃参数，刷新页面后参数保持
- [ ] 关闭应用重新打开，主题保持

### 问题3测试
- [ ] 发送几条消息
- [ ] 刷新页面，消息保持
- [ ] 切换到其他页面再切换回来，消息保持
- [ ] 关闭应用重新打开，消息保持

### 问题2测试
- [ ] 点击"新会话"按钮
- [ ] 确认对话被清空
- [ ] 确认附件被清空
- [ ] 确认输入框被清空
- [ ] 看到"新会话已开始"提示

### 问题1测试
- [ ] 发送消息，看到"AI正在思考..."
- [ ] 看到"停止生成"按钮
- [ ] 点击停止按钮
- [ ] AI响应立即停止
- [ ] 看到"已停止生成"提示

---

**状态**: 准备开始修复  
**预计总时间**: 1.5小时

