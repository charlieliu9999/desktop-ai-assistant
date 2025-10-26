# 样式使用规范

**版本**: 2.0.0  
**日期**: 2025-10-26  
**状态**: 强制执行

---

## 📋 目录

1. [核心原则](#核心原则)
2. [主题系统](#主题系统)
3. [样式使用规范](#样式使用规范)
4. [组件样式最佳实践](#组件样式最佳实践)
5. [常见错误](#常见错误)
6. [代码审查清单](#代码审查清单)

---

## 核心原则

### 1. 统一性优先
- **必须**使用统一的设计系统（`docs/DESIGN_SYSTEM.md`）
- **必须**使用主题配置系统（`config/themes.ts`）
- **禁止**硬编码颜色、间距、圆角等样式值
- **禁止**创建与设计系统冲突的自定义样式

### 2. 主题响应
- **必须**支持玻璃、浅色、深色、自动四种主题
- **必须**使用CSS变量而非硬编码值
- **必须**测试所有主题下的显示效果
- **禁止**假设用户使用特定主题

### 3. 配置统一
- **必须**使用统一的样式配置源:
  - CSS变量 (`src/renderer/index.css`)
  - 主题配置 (`src/renderer/config/themes.ts`)
  - ThemeStore (`src/renderer/stores/themeStore.ts`)
- **禁止**使用独立的样式配置
- **禁止**在组件中硬编码样式值

### 4. 灵活性保证
- **必须**保持用户可自定义玻璃效果参数
- **必须**支持窗口级别的独立配置
- **必须**使用样式工具函数支持动态参数

---

## 主题系统

### 支持的主题模式

| 模式 | 说明 | 使用场景 |
|------|------|---------|
| `glass` | 玻璃主题 | 半透明毛玻璃效果，现代科技感 |
| `light` | 浅色主题 | 纯白背景，清晰易读 |
| `dark` | 深色主题 | 深色背景，护眼舒适 |
| `auto` | 自动主题 | 跟随系统主题自动切换 |

### 主题切换

```tsx
import { useTheme } from '@/hooks/useTheme';

const MyComponent = () => {
  const { mode, setMode, toggleTheme } = useTheme();
  
  return (
    <div>
      <p>当前主题: {mode}</p>
      <button onClick={() => setMode('dark')}>切换到深色</button>
      <button onClick={toggleTheme}>切换主题</button>
    </div>
  );
};
```

### 主题检测

```tsx
import { useTheme } from '@/hooks/useTheme';

const MyComponent = () => {
  const { isGlass, isDark, isLight } = useTheme();
  
  return (
    <div className={isGlass ? 'glass-container' : 'normal-container'}>
      {isDark && <p>深色模式特有内容</p>}
    </div>
  );
};
```

---

## 样式使用规范

### 1. 颜色使用

#### ✅ 正确示例

```tsx
// 使用CSS变量
<div className="bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]">
  Primary Button
</div>

// 使用Tailwind语义化类名
<div className="bg-primary text-primary-foreground">
  Primary Button
</div>

// 使用主题配置
import { useTheme } from '@/hooks/useTheme';

const MyComponent = () => {
  const { config } = useTheme();
  const primaryColor = config.colors.primary;
  
  return <div style={{ color: `rgb(${primaryColor})` }}>Text</div>;
};
```

#### ❌ 错误示例

```tsx
// 硬编码颜色
<div style={{ backgroundColor: '#3b82f6' }}>Button</div>

// 不支持主题切换
<div className="bg-blue-500">Button</div>
```

### 2. 间距使用

#### ✅ 正确示例

```tsx
// 使用CSS变量
<div className="p-[var(--spacing-4)] gap-[var(--spacing-2)]">
  Content
</div>

// 使用Tailwind预设值（基于4px网格）
<div className="p-4 gap-2">
  Content
</div>
```

#### ❌ 错误示例

```tsx
// 随意的间距值
<div style={{ padding: '13px', margin: '7px' }}>Content</div>

// 不符合4px网格
<div className="p-[15px]">Content</div>
```

### 3. 玻璃效果使用

#### ✅ 正确示例

```tsx
// 使用预定义类名
<div className="glass">
  Glass effect content
</div>

// 使用样式工具函数
import { getGlassClass } from '@/utils/styleUtils';

<div className={getGlassClass('medium')}>
  Glass effect content
</div>

// 使用useTheme Hook
import { useTheme } from '@/hooks/useTheme';

const MyComponent = () => {
  const { getGlassClass } = useTheme();
  
  return (
    <div className={getGlassClass('p-4 rounded-lg')}>
      Content
    </div>
  );
};
```

#### ❌ 错误示例

```tsx
// 硬编码玻璃效果
<div style={{
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(40px) saturate(200%)'
}}>
  Glass effect
</div>

// 使用废弃的类名
<div className="glass dark:glass-dark">Content</div>
```

---

## 组件样式最佳实践

### 1. 使用useTheme Hook

```tsx
import { useTheme } from '@/hooks/useTheme';

const MyComponent = () => {
  const { mode, isGlass, getGlassClass } = useTheme();
  
  return (
    <div className={getGlassClass('p-4')}>
      <h1>My Component</h1>
      <p>Theme: {mode}</p>
    </div>
  );
};
```

### 2. 使用样式工具函数

```tsx
import { cn, getButtonClass, getMessageBubbleClass } from '@/utils/styleUtils';

const MyButton = ({ variant, size, disabled, children }) => {
  return (
    <button className={getButtonClass(variant, size, disabled)}>
      {children}
    </button>
  );
};

const MessageBubble = ({ message }) => {
  return (
    <div className={getMessageBubbleClass(message.role, message.type === 'stream')}>
      {message.content}
    </div>
  );
};
```

### 3. 条件样式

```tsx
import { cn } from '@/utils/styleUtils';
import { useTheme } from '@/hooks/useTheme';

const MyComponent = ({ isActive, hasError }) => {
  const { isGlass } = useTheme();
  
  return (
    <div className={cn(
      'base-class',
      isGlass && 'glass',
      isActive && 'active-class',
      hasError && 'error-class'
    )}>
      Content
    </div>
  );
};
```

---

## 常见错误

### 1. 硬编码样式值
```tsx
// ❌ 错误
<div style={{ color: '#3b82f6', padding: '16px' }}>

// ✅ 正确
<div className="text-[rgb(var(--primary))] p-4">
```

### 2. 不支持主题切换
```tsx
// ❌ 错误
<div className="bg-blue-500">

// ✅ 正确
<div className="bg-[rgb(var(--primary))]">
```

### 3. 随意的间距值
```tsx
// ❌ 错误
<div style={{ margin: '13px' }}>

// ✅ 正确
<div className="m-3"> {/* 12px, 符合4px网格 */}
```

### 4. 使用废弃的类名
```tsx
// ❌ 错误
<div className="glass dark:glass-dark">

// ✅ 正确
<div className="glass">
```

---

## 代码审查清单

### 样式规范
- [ ] 是否使用了CSS变量而非硬编码值？
- [ ] 是否支持所有主题（玻璃、浅色、深色、自动）？
- [ ] 是否使用了统一的类名规范？
- [ ] 是否避免了内联样式？

### 颜色使用
- [ ] 颜色对比度是否≥4.5:1？
- [ ] 是否使用了语义化颜色（primary、success、error等）？
- [ ] 是否测试了深色模式下的显示效果？

### 间距和布局
- [ ] 间距是否符合4px网格系统？
- [ ] 是否使用了设计系统定义的间距值？
- [ ] 布局是否响应式？

### 主题一致性
- [ ] 是否在所有主题模式下测试了组件？
- [ ] 是否使用了统一的样式配置源？
- [ ] 是否保持了样式配置的灵活性？

---

**遵循这些规则，确保样式系统的统一性和可维护性！**

**相关文档**:
- [设计系统](./DESIGN_SYSTEM.md)
- [玻璃效果指南](./GLASS_STYLE_GUIDE.md)
- [样式系统总结](./STYLE_SYSTEM_SUMMARY.md)
- [组件开发指南](./COMPONENTS_GUIDE.md)

