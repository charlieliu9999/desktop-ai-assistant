---
type: "always_apply"
---

# 样式系统开发规则

**版本**: 2.0.0  
**日期**: 2025-10-09  
**状态**: 强制执行

---

## 📋 核心原则

### 1. 统一性优先
- **必须**使用统一的设计系统（`docs/DESIGN_SYSTEM.md`）
- **必须**使用主题配置系统（`config/themes.ts`）
- **禁止**硬编码颜色、间距、圆角等样式值
- **禁止**创建与设计系统冲突的自定义样式

### 2. 主题响应
- **必须**支持玻璃、浅色、深色三种主题
- **必须**使用CSS变量而非硬编码值
- **必须**测试所有主题下的显示效果
- **禁止**假设用户使用特定主题

### 3. 可维护性
- **必须**使用样式工具函数（`utils/styleUtils.ts`）
- **必须**使用统一的类名规范
- **必须**为自定义样式添加注释
- **禁止**使用内联样式（除非必要）

### 4. 性能优先
- **必须**使用CSS类而非动态生成样式
- **必须**避免不必要的重渲染
- **必须**使用CSS动画而非JS动画
- **禁止**在渲染函数中创建样式对象

### 5. 可访问性
- **必须**确保颜色对比度≥4.5:1
- **必须**支持键盘导航
- **必须**提供焦点指示器
- **必须**使用语义化HTML

---

## 🎨 样式使用规范

### 1. 颜色使用

#### ✅ 正确示例

```tsx
// 使用CSS变量
<div className="bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]">
  Primary Button
</div>

// 使用预定义类名
<div className="message-user">
  User message
</div>

// 使用主题配置
import { useThemeStore } from '@/stores/themeStore';

const MyComponent = () => {
  const { config } = useThemeStore();
  const primaryColor = config.colors.primary;
  
  return <div style={{ color: `rgb(${primaryColor})` }}>Text</div>;
};
```

#### ❌ 错误示例

```tsx
// 硬编码颜色
<div style={{ backgroundColor: '#3b82f6' }}>
  Button
</div>

// 不支持主题切换
<div className="bg-blue-500">
  Button
</div>
```

---

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

// 使用设计系统定义的间距
import { useThemeStore } from '@/stores/themeStore';

const MyComponent = () => {
  const { config } = useThemeStore();
  
  return (
    <div style={{ padding: config.spacing.inputPadding }}>
      Content
    </div>
  );
};
```

#### ❌ 错误示例

```tsx
// 随意的间距值
<div style={{ padding: '13px', margin: '7px' }}>
  Content
</div>

// 不符合4px网格
<div className="p-[15px]">
  Content
</div>
```

---

### 3. 圆角使用

#### ✅ 正确示例

```tsx
// 使用CSS变量
<div className="rounded-[var(--radius-lg)]">
  Card
</div>

// 使用预定义类名
<div className="message-bubble">
  Message
</div>

// 使用主题配置
const { config } = useThemeStore();
<div style={{ borderRadius: config.borderRadius.lg }}>
  Card
</div>
```

#### ❌ 错误示例

```tsx
// 随意的圆角值
<div style={{ borderRadius: '13px' }}>
  Card
</div>
```

---

### 4. 对话样式使用

#### ✅ 正确示例

```tsx
import { getMessageBubbleClass, getMessageContainerClass } from '@/utils/styleUtils';
import type { Message } from '@/types/chat';

const MessageBubble = ({ message }: { message: Message }) => {
  return (
    <div className={getMessageContainerClass(message.role)}>
      <div className={getMessageBubbleClass(message.role, message.type === 'stream')}>
        {message.content}
      </div>
    </div>
  );
};
```

#### ❌ 错误示例

```tsx
// 硬编码样式
const MessageBubble = ({ message }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
    }}>
      <div style={{
        backgroundColor: message.role === 'user' ? '#3b82f6' : '#f1f5f9',
        padding: '12px 16px',
        borderRadius: '24px'
      }}>
        {message.content}
      </div>
    </div>
  );
};
```

---

### 5. 玻璃效果使用

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

// 自定义玻璃效果
import { createGlassStyle } from '@/utils/styleUtils';

<div style={createGlassStyle(0.2, 50, 180)}>
  Custom glass effect
</div>
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
```

---

### 6. 动画使用

#### ✅ 正确示例

```tsx
// 使用CSS类动画
<div className="message-container">
  {/* 自动应用fadeInUp动画 */}
  Message
</div>

// 使用样式工具函数
import { createFadeInStyle, createSlideInStyle } from '@/utils/styleUtils';

<div style={createFadeInStyle('200ms', '100ms')}>
  Fade in content
</div>

<div style={createSlideInStyle('up', '300ms')}>
  Slide in content
</div>
```

#### ❌ 错误示例

```tsx
// 使用JS动画（性能差）
const [opacity, setOpacity] = useState(0);

useEffect(() => {
  const timer = setInterval(() => {
    setOpacity(prev => Math.min(prev + 0.1, 1));
  }, 20);
  return () => clearInterval(timer);
}, []);

<div style={{ opacity }}>
  Content
</div>
```

---

## 🛠️ 工具函数使用

### 1. 类名合并

```tsx
import { cn } from '@/utils/styleUtils';

// 条件类名
<div className={cn(
  'base-class',
  isActive && 'active-class',
  hasError && 'error-class'
)}>
  Content
</div>
```

### 2. 按钮样式

```tsx
import { getButtonClass } from '@/utils/styleUtils';

<button className={getButtonClass('primary', 'md', disabled)}>
  Click me
</button>
```

### 3. CSS变量操作

```tsx
import { getCSSVar, setCSSVar } from '@/utils/styleUtils';

// 读取CSS变量
const primaryColor = getCSSVar('primary');

// 设置CSS变量
setCSSVar('primary', '59 130 246');
```

---

## 🎯 主题管理

### 1. 使用ThemeStore

```tsx
import { useThemeStore } from '@/stores/themeStore';

const MyComponent = () => {
  const { mode, config, setMode, updateGlassEffect } = useThemeStore();
  
  return (
    <div>
      <p>Current theme: {mode}</p>
      <button onClick={() => setMode('dark')}>Switch to Dark</button>
      <button onClick={() => updateGlassEffect({ blur: 50 })}>
        Increase Blur
      </button>
    </div>
  );
};
```

### 2. 主题切换

```tsx
import { useThemeStore } from '@/stores/themeStore';

const ThemeSwitcher = () => {
  const { mode, setMode } = useThemeStore();
  
  return (
    <select value={mode} onChange={(e) => setMode(e.target.value as ThemeMode)}>
      <option value="glass">玻璃</option>
      <option value="light">浅色</option>
      <option value="dark">深色</option>
      <option value="auto">自动</option>
    </select>
  );
};
```

---

## 📋 代码审查清单

### 样式规范
- [ ] 是否使用了CSS变量而非硬编码值？
- [ ] 是否支持所有主题（玻璃、浅色、深色）？
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

### 动画和过渡
- [ ] 是否使用了CSS动画而非JS动画？
- [ ] 动画时长是否合理（150-300ms）？
- [ ] 是否提供了过渡效果？

### 可访问性
- [ ] 是否支持键盘导航？
- [ ] 是否提供了焦点指示器？
- [ ] 是否使用了语义化HTML？
- [ ] 是否提供了适当的ARIA属性？

### 性能
- [ ] 是否避免了不必要的重渲染？
- [ ] 是否使用了CSS类而非动态样式？
- [ ] 是否优化了动画性能？

---

## 🚫 常见错误

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

### 4. 使用JS动画
```tsx
// ❌ 错误
const [opacity, setOpacity] = useState(0);
useEffect(() => { /* 动画逻辑 */ }, []);

// ✅ 正确
<div className="animate-fadeIn">
```

---

**遵循这些规则，确保样式系统的统一性和可维护性！**

