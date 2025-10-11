# 桌面AI助手设计系统

**版本**: 2.0.0  
**日期**: 2025-10-09  
**状态**: 实施中

---

## 📋 目录

1. [设计原则](#设计原则)
2. [颜色系统](#颜色系统)
3. [字体系统](#字体系统)
4. [间距系统](#间距系统)
5. [圆角系统](#圆角系统)
6. [阴影系统](#阴影系统)
7. [动画系统](#动画系统)
8. [对话样式](#对话样式)

---

## 设计原则

### 1. 现代简约
- 扁平化设计，减少视觉噪音
- 使用玻璃态效果增加层次感
- 保持界面清爽、专业

### 2. 一致性优先
- 所有组件使用统一的设计语言
- 颜色、间距、圆角等保持一致
- 交互反馈统一

### 3. 可访问性
- 符合WCAG 2.1 AA标准
- 颜色对比度≥4.5:1
- 支持键盘导航

### 4. 响应式
- 适配不同窗口大小
- 流畅的动画过渡
- 性能优先

---

## 颜色系统

### 主题颜色

#### 玻璃主题 (Glass Theme)
```css
/* 主色调 - 蓝色系 */
--primary: 59 130 246;           /* rgb(59, 130, 246) - Blue 500 */
--primary-foreground: 255 255 255;

/* 背景色 - 半透明 */
--background: 255 255 255 / 0.05;
--foreground: 15 23 42;          /* Slate 900 */

/* 卡片/表面 - 玻璃效果 */
--card: 255 255 255 / 0.15;
--card-foreground: 15 23 42;

/* 边框 */
--border: 226 232 240 / 0.3;     /* Slate 200 / 30% */
--input: 226 232 240 / 0.5;

/* 状态色 */
--muted: 241 245 249;            /* Slate 100 */
--muted-foreground: 100 116 139; /* Slate 500 */

--accent: 240 253 250;           /* Teal 50 */
--accent-foreground: 15 23 42;

--destructive: 239 68 68;        /* Red 500 */
--destructive-foreground: 255 255 255;
```

#### 浅色主题 (Light Theme)
```css
--primary: 59 130 246;
--primary-foreground: 255 255 255;

--background: 255 255 255;
--foreground: 15 23 42;

--card: 255 255 255;
--card-foreground: 15 23 42;

--border: 226 232 240;
--input: 226 232 240;

--muted: 241 245 249;
--muted-foreground: 100 116 139;

--accent: 240 253 250;
--accent-foreground: 15 23 42;

--destructive: 239 68 68;
--destructive-foreground: 255 255 255;
```

#### 深色主题 (Dark Theme)
```css
--primary: 96 165 250;           /* Blue 400 */
--primary-foreground: 15 23 42;

--background: 15 23 42;          /* Slate 900 */
--foreground: 248 250 252;       /* Slate 50 */

--card: 30 41 59;                /* Slate 800 */
--card-foreground: 248 250 252;

--border: 51 65 85;              /* Slate 700 */
--input: 51 65 85;

--muted: 51 65 85;
--muted-foreground: 148 163 184; /* Slate 400 */

--accent: 30 41 59;
--accent-foreground: 248 250 252;

--destructive: 248 113 113;      /* Red 400 */
--destructive-foreground: 15 23 42;
```

### 语义化颜色

```css
/* 成功 */
--success: 34 197 94;            /* Green 500 */
--success-foreground: 255 255 255;

/* 警告 */
--warning: 251 146 60;           /* Orange 400 */
--warning-foreground: 255 255 255;

/* 信息 */
--info: 59 130 246;              /* Blue 500 */
--info-foreground: 255 255 255;

/* 错误 */
--error: 239 68 68;              /* Red 500 */
--error-foreground: 255 255 255;
```

### 对话专用颜色

```css
/* 用户消息 */
--message-user-bg: 59 130 246;           /* Blue 500 */
--message-user-text: 255 255 255;

/* 助手消息 - 玻璃主题 */
--message-assistant-bg: 255 255 255 / 0.15;
--message-assistant-text: 15 23 42;

/* 助手消息 - 浅色主题 */
--message-assistant-bg-light: 241 245 249;  /* Slate 100 */
--message-assistant-text-light: 15 23 42;

/* 助手消息 - 深色主题 */
--message-assistant-bg-dark: 30 41 59;      /* Slate 800 */
--message-assistant-text-dark: 248 250 252;

/* 系统消息 */
--message-system-bg: 254 243 199;        /* Amber 100 */
--message-system-text: 120 53 15;        /* Amber 900 */
```

---

## 字体系统

### 字体家族

```css
/* 主字体 - 系统字体栈 */
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Arial, "Noto Sans", sans-serif,
             "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";

/* 等宽字体 - 代码显示 */
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco,
             Consolas, "Liberation Mono", "Courier New", monospace;
```

### 字体大小

```css
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
```

### 字重

```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### 行高

```css
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;
```

---

## 间距系统

### 基础间距（基于4px网格）

```css
--spacing-0: 0;
--spacing-1: 0.25rem;    /* 4px */
--spacing-2: 0.5rem;     /* 8px */
--spacing-3: 0.75rem;    /* 12px */
--spacing-4: 1rem;       /* 16px */
--spacing-5: 1.25rem;    /* 20px */
--spacing-6: 1.5rem;     /* 24px */
--spacing-8: 2rem;       /* 32px */
--spacing-10: 2.5rem;    /* 40px */
--spacing-12: 3rem;      /* 48px */
--spacing-16: 4rem;      /* 64px */
--spacing-20: 5rem;      /* 80px */
```

### 对话专用间距

```css
--chat-message-gap: 1rem;           /* 消息之间的间距 */
--chat-bubble-padding-x: 1rem;      /* 消息气泡水平内边距 */
--chat-bubble-padding-y: 0.75rem;   /* 消息气泡垂直内边距 */
--chat-input-padding: 1rem;         /* 输入框内边距 */
```

---

## 圆角系统

### 基础圆角

```css
--radius-none: 0;
--radius-sm: 0.25rem;    /* 4px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-2xl: 1.5rem;    /* 24px */
--radius-full: 9999px;   /* 完全圆形 */
```

### 对话专用圆角

```css
--chat-bubble-radius: 1.5rem;       /* 消息气泡圆角 */
--chat-bubble-corner-radius: 0.25rem; /* 消息气泡尖角 */
--chat-input-radius: 0.75rem;       /* 输入框圆角 */
--chat-button-radius: 0.5rem;       /* 按钮圆角 */
```

---

## 阴影系统

### 基础阴影

```css
/* 无阴影 */
--shadow-none: none;

/* 小阴影 - 悬浮元素 */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);

/* 中等阴影 - 卡片 */
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1),
             0 2px 4px -2px rgb(0 0 0 / 0.1);

/* 大阴影 - 模态框 */
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1),
             0 4px 6px -4px rgb(0 0 0 / 0.1);

/* 超大阴影 - 弹出层 */
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1),
             0 8px 10px -6px rgb(0 0 0 / 0.1);

/* 内阴影 */
--shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
```

### 玻璃效果阴影

```css
--shadow-glass: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
--shadow-glass-hover: 0 8px 32px 0 rgba(31, 38, 135, 0.25);
```

---

## 动画系统

### 过渡时长

```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--duration-slower: 500ms;
```

### 缓动函数

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### 常用动画

```css
/* 淡入 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 淡入上移 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 脉冲 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 打字指示器 */
@keyframes typing {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}
```

---

## 对话样式

### 消息气泡

#### 用户消息
```css
.message-user {
  margin-left: auto;
  max-width: 80%;
  background: rgb(var(--message-user-bg));
  color: rgb(var(--message-user-text));
  border-radius: var(--chat-bubble-radius);
  border-top-right-radius: var(--chat-bubble-corner-radius);
  padding: var(--chat-bubble-padding-y) var(--chat-bubble-padding-x);
  box-shadow: var(--shadow-sm);
  animation: fadeInUp var(--duration-normal) var(--ease-out);
}
```

#### 助手消息
```css
.message-assistant {
  margin-right: auto;
  max-width: 80%;
  background: rgb(var(--message-assistant-bg));
  color: rgb(var(--message-assistant-text));
  border-radius: var(--chat-bubble-radius);
  border-top-left-radius: var(--chat-bubble-corner-radius);
  padding: var(--chat-bubble-padding-y) var(--chat-bubble-padding-x);
  box-shadow: var(--shadow-sm);
  animation: fadeInUp var(--duration-normal) var(--ease-out);
}

/* 玻璃效果 */
.theme-glass .message-assistant {
  backdrop-filter: blur(var(--glass-blur, 40px)) 
                   saturate(var(--glass-saturation, 200%));
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

#### 系统消息
```css
.message-system {
  margin: 0 auto;
  max-width: 60%;
  background: rgb(var(--message-system-bg));
  color: rgb(var(--message-system-text));
  border-radius: var(--radius-lg);
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--text-sm);
  text-align: center;
  animation: fadeIn var(--duration-normal) var(--ease-out);
}
```

### 输入框

```css
.chat-input {
  width: 100%;
  min-height: 44px;
  max-height: 120px;
  padding: var(--chat-input-padding);
  background: rgb(var(--input));
  border: 1px solid rgb(var(--border));
  border-radius: var(--chat-input-radius);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  resize: none;
  transition: all var(--duration-normal) var(--ease-out);
}

.chat-input:focus {
  outline: none;
  border-color: rgb(var(--primary));
  box-shadow: 0 0 0 3px rgba(var(--primary) / 0.1);
}

/* 玻璃效果 */
.theme-glass .chat-input {
  backdrop-filter: blur(var(--glass-blur, 40px)) 
                   saturate(var(--glass-saturation, 200%));
  background: rgba(255, 255, 255, var(--glass-opacity, 0.15));
}
```

### 按钮

```css
.chat-button-primary {
  padding: var(--spacing-2) var(--spacing-4);
  background: rgb(var(--primary));
  color: rgb(var(--primary-foreground));
  border: none;
  border-radius: var(--chat-button-radius);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out);
}

.chat-button-primary:hover {
  background: rgb(var(--primary) / 0.9);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.chat-button-primary:active {
  transform: translateY(0);
}

.chat-button-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

---

**下一步**: 创建主题配置系统和样式工具类

