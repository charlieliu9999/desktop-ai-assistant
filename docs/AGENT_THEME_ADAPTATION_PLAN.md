# 智能体模块主题适配计划

**日期**: 2025-10-09  
**目标**: 使智能体模块支持统一的主题系统（玻璃/浅色/深色/自动）

---

## 📋 需要修改的组件

### 1. AgentService.tsx (页面)
**路径**: `src/renderer/pages/AgentService.tsx`

**当前问题**:
- 使用硬编码颜色：`bg-gray-50 dark:bg-gray-900`
- 未使用CSS变量

**修改方案**:
- 替换为：`bg-[rgb(var(--background))]`
- 使用统一的边框、文本颜色变量

---

### 2. AgentList.tsx (组件)
**路径**: `bisheng-integration/components/AgentList.tsx`

**当前问题**:
- 使用`glass`类名但未正确应用玻璃效果
- 硬编码颜色：`bg-blue-500/20 dark:bg-blue-600/20`
- 未使用CSS变量

**修改方案**:
- 使用`theme-glass`、`theme-light`、`theme-dark`类
- 替换硬编码颜色为CSS变量
- 应用统一的玻璃效果样式

---

### 3. AgentChat.tsx (组件)
**路径**: `bisheng-integration/components/AgentChat.tsx`

**当前问题**:
- 使用`backdrop-blur-sm`但未完整应用玻璃效果
- 硬编码颜色：`bg-white/70 dark:bg-gray-800/70`
- 未使用CSS变量

**修改方案**:
- 使用统一的消息气泡样式类
- 替换硬编码颜色为CSS变量
- 应用chat-components.css中的样式

---

### 4. AgentIframe.tsx (组件)
**路径**: `bisheng-integration/components/AgentIframe.tsx`

**当前问题**:
- 可能使用硬编码颜色
- 未检查主题适配

**修改方案**:
- 检查并更新样式
- 确保iframe容器支持主题切换

---

### 5. BishengStatusIndicator.tsx (组件)
**路径**: `src/renderer/components/BishengStatusIndicator.tsx`

**当前问题**:
- 可能使用硬编码颜色
- 未检查主题适配

**修改方案**:
- 检查并更新样式
- 使用CSS变量

---

## 🎨 样式替换规则

### 背景色
```tsx
// 旧
className="bg-white dark:bg-gray-900"

// 新
className="bg-[rgb(var(--background))]"
```

### 卡片背景
```tsx
// 旧
className="bg-gray-50 dark:bg-gray-800"

// 新
className="bg-[rgb(var(--card))]"
```

### 文本颜色
```tsx
// 旧
className="text-gray-900 dark:text-gray-100"

// 新
className="text-[rgb(var(--foreground))]"
```

### 次要文本
```tsx
// 旧
className="text-gray-600 dark:text-gray-400"

// 新
className="text-[rgb(var(--muted-foreground))]"
```

### 边框
```tsx
// 旧
className="border-gray-200 dark:border-gray-700"

// 新
className="border-[rgb(var(--border))]"
```

### 主色调
```tsx
// 旧
className="bg-blue-600 text-white"

// 新
className="bg-[rgb(var(--primary))] text-white"
```

### 玻璃效果
```tsx
// 旧
className="glass backdrop-blur-sm"

// 新 - 在玻璃主题下
className="theme-glass:backdrop-filter theme-glass:backdrop-blur-[var(--glass-blur)] theme-glass:backdrop-saturate-[var(--glass-saturation)]"

// 或使用预定义的样式类
className="message-assistant" // 对于消息气泡
```

---

## 🔧 实施步骤

### 步骤1: 更新AgentService.tsx
1. 导入useThemeStore（如果需要）
2. 替换所有硬编码颜色为CSS变量
3. 测试主题切换

### 步骤2: 更新AgentList.tsx
1. 替换硬编码颜色为CSS变量
2. 更新玻璃效果样式
3. 测试折叠/展开状态

### 步骤3: 更新AgentChat.tsx
1. 使用chat-components.css中的样式类
2. 替换消息气泡样式
3. 更新输入框样式
4. 测试对话功能

### 步骤4: 更新其他组件
1. 检查AgentIframe.tsx
2. 检查BishengStatusIndicator.tsx
3. 统一样式

### 步骤5: 测试验证
1. 测试四种主题模式切换
2. 测试所有智能体功能
3. 检查控制台无错误

---

## ⚠️ 重要约束

1. **不修改业务逻辑**
   - 只修改className和样式相关代码
   - 不改变组件的功能行为
   - 不修改数据处理流程

2. **保持向后兼容**
   - 确保现有功能正常运行
   - 不破坏现有的交互逻辑

3. **测试验证**
   - 每个组件修改后立即测试
   - 确保所有主题模式正常工作

---

## 📝 预期效果

### 修改前
- 只有浅色和深色主题生效
- 玻璃主题不生效或效果不完整
- 样式不统一

### 修改后
- 支持四种主题模式（玻璃/浅色/深色/自动）
- 玻璃效果完整应用
- 样式与其他组件统一
- 主题切换流畅

---

**状态**: 准备开始实施  
**预计时间**: 2-3小时

