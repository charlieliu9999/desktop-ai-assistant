# 玻璃效果样式使用规范

## 📋 概述

本文档规定了桌面AI助手项目中玻璃效果（Glassmorphism）样式的统一使用规范，确保整个应用的视觉一致性和代码可维护性。

**最后更新**: 2025-10-09  
**版本**: 2.0.0

---

## 🎨 核心原则

### 1. 统一使用 `.glass` 类

**✅ 正确用法**：
```tsx
// 基础用法
<div className="glass">内容</div>

// 组合其他样式
<div className="glass rounded-lg p-4 border border-gray-200/50">内容</div>

// 条件应用
<div className={`${isGlass ? 'glass' : 'bg-white'}`}>内容</div>
```

**❌ 错误用法**：
```tsx
// 不要使用冗余的 dark:glass-dark
<div className="glass dark:glass-dark">内容</div>

// 不要使用旧的语义化类名
<div className="glass-header">内容</div>
<div className="glass-effect">内容</div>
<div className="glass-card">内容</div>
```

### 2. 深色模式自动适配

`.glass` 类已通过 CSS 自动处理深色模式，**无需**手动添加 `dark:` 前缀。

**CSS 实现**（glass-effect.css）：
```css
.glass {
  background: rgba(255, 255, 255, var(--glass-opacity, 0.15)) !important;
  /* ... */
}

.dark .glass {
  background: rgba(17, 24, 39, var(--glass-opacity, 0.15)) !important;
  /* ... */
}
```

---

## 🔧 CSS 变量系统

### 可配置的玻璃效果参数

玻璃效果通过以下 CSS 变量控制，用户可在设置中调整：

| CSS 变量 | 默认值 | 说明 | 范围 |
|---------|--------|------|------|
| `--glass-opacity` | `0.15` | 背景透明度 | 0.0 - 1.0 |
| `--glass-blur` | `40px` | 模糊半径 | 0px - 100px |
| `--glass-saturation` | `200%` | 饱和度增强 | 100% - 300% |
| `--glass-tint` | `rgba(0,0,0,0)` | 色调叠加 | 任意 rgba 值 |

### 设置 CSS 变量

CSS 变量由 `useGlassEffect` Hook 自动设置：

```typescript
// src/renderer/hooks/useGlassEffect.ts
document.documentElement.style.setProperty('--glass-opacity', opacity.toString());
document.documentElement.style.setProperty('--glass-blur', `${blur}px`);
document.documentElement.style.setProperty('--glass-saturation', `${saturation}%`);
document.documentElement.style.setProperty('--glass-tint', rgba);
```

---

## 📦 特殊场景类名

以下语义化类名保留用于特殊场景，**不应**用于常规组件：

| 类名 | 用途 | 何时使用 |
|------|------|---------|
| `.glass-modal` | 模态框 | 需要更强的玻璃效果和阴影 |
| `.glass-tooltip` | 工具提示 | 需要深色半透明背景 |
| `.glass-notification` | 通知消息 | 需要更高的不透明度 |
| `.glass-scrollbar` | 滚动条 | 自定义滚动条样式 |
| `.floating-window-glass` | 浮动窗口 | 浮动窗口专用样式 |

**示例**：
```tsx
// 模态框
<div className="glass-modal">
  <h2>标题</h2>
  <p>内容</p>
</div>

// 工具提示
<div className="glass-tooltip">提示文本</div>
```

---

## 🎯 常见使用场景

### 1. 头部栏 / 工具栏

```tsx
<div className="glass flex items-center justify-between px-4 py-2 border-b border-gray-200/50 dark:border-gray-700/50">
  <h1>标题</h1>
  <button>操作</button>
</div>
```

### 2. 侧边栏

```tsx
<div className="glass w-64 h-full border-r border-gray-200/50 dark:border-gray-700/50 p-4">
  <nav>导航内容</nav>
</div>
```

### 3. 卡片

```tsx
<div className="glass rounded-xl p-6 shadow-lg">
  <h3>卡片标题</h3>
  <p>卡片内容</p>
</div>
```

### 4. 输入框区域

```tsx
<div className="glass px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50">
  <textarea className="w-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm" />
</div>
```

### 5. 悬停效果

```tsx
<button className="hover:glass transition-all">
  悬停显示玻璃效果
</button>
```

---

## 🚫 禁用玻璃效果

### 方法1: 使用 `.glass-disabled` 类

在父元素添加 `.glass-disabled` 类可禁用所有子元素的玻璃效果：

```tsx
<div className="glass-disabled">
  <div className="glass">此处玻璃效果被禁用</div>
</div>
```

### 方法2: 条件渲染

```tsx
const isGlass = config.theme === 'glass' || config.windows?.main?.glassEffect?.enabled;

<div className={isGlass ? 'glass' : 'bg-white dark:bg-gray-900'}>
  内容
</div>
```

---

## 🔍 主题管理

### 主题类型

项目支持以下主题类型（定义在 `configStore.ts`）：

- `'light'` - 浅色主题
- `'dark'` - 深色主题
- `'auto'` - 跟随系统
- `'glass'` - 玻璃主题（启用玻璃效果）

### 主题切换

主题通过 `configStore` 统一管理：

```typescript
import { useConfigStore } from '../stores/configStore';

const { config, updateConfig } = useConfigStore();

// 切换主题
updateConfig({ theme: 'glass' });
```

### 深色模式检测

```typescript
// App.tsx
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

---

## ✅ 代码审查清单

在提交代码前，请确认：

- [ ] 使用 `.glass` 而非 `.glass-header`, `.glass-effect`, `.glass-card`
- [ ] 没有使用冗余的 `dark:glass-dark`
- [ ] 特殊场景类名使用正确（如 `.glass-modal`）
- [ ] 玻璃效果可通过用户配置调整
- [ ] 深色/浅色模式切换正常
- [ ] 没有硬编码玻璃效果参数（使用 CSS 变量）

---

## 📚 相关文件

### 样式文件
- `src/renderer/styles/glass-effect.css` - 玻璃效果样式定义
- `src/renderer/index.css` - 全局样式和 CSS 变量
- `tailwind.config.js` - Tailwind 配置

### Hooks
- `src/renderer/hooks/useGlassEffect.ts` - 主窗口玻璃效果
- `src/renderer/hooks/useFloatingGlassEffect.ts` - 浮动窗口玻璃效果

### 状态管理
- `src/renderer/stores/configStore.ts` - 配置和主题管理

### 组件示例
- `src/renderer/components/MainWindow.tsx` - 主窗口
- `bisheng-integration/components/AgentChat.tsx` - 智能体对话
- `bisheng-integration/components/AgentList.tsx` - 智能体列表

---

## 🐛 常见问题

### Q: 玻璃效果不显示？

**A**: 检查以下几点：
1. 确认 `config.theme === 'glass'` 或 `config.windows.main.glassEffect.enabled === true`
2. 确认 `useGlassEffect` Hook 已在页面中调用
3. 检查浏览器是否支持 `backdrop-filter`（Safari 需要 `-webkit-` 前缀）

### Q: 用户调整玻璃效果参数后不生效？

**A**: 确认：
1. CSS 中使用了 CSS 变量而非硬编码值
2. `useGlassEffect` Hook 正确监听了配置变化
3. 配置更新后触发了重新渲染

### Q: 深色模式下玻璃效果异常？

**A**: 检查：
1. 是否使用了 `dark:glass-dark`（应移除）
2. CSS 中 `.dark .glass` 规则是否正确定义
3. `document.documentElement` 是否正确添加了 `.dark` 类

---

## 📝 更新日志

### v2.0.0 (2025-10-09)
- ✅ 统一使用 `.glass` 类
- ✅ 移除冗余的 `dark:glass-dark`
- ✅ 优化 CSS 变量响应用户配置
- ✅ 移除未使用的 `themeStore`
- ✅ 建立样式使用规范文档

### v1.0.0 (2024-01-08)
- 初始版本
- 添加 `.glass` 和 `.glass-dark` 工具类
- 修复智能体对话组件玻璃效果

---

**维护者**: 桌面AI助手开发团队  
**反馈**: 如有问题或建议，请提交 Issue

