# Desktop AI Assistant - UI优化设计方案

## 📐 设计方案总览

本文档详细描述了Desktop AI Assistant的UI优化设计方案,包括具体的设计规范、组件设计、交互流程等。

---

## 一、窗口系统重新设计

### 1.1 窗口层级关系

```
┌─────────────────────────────────────────┐
│  Desktop AI Assistant 窗口系统          │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐                          │
│  │ 浮动窗口  │ ← 始终可见,快速入口      │
│  └──────────┘                          │
│       │                                 │
│       ├─→ [展开] → 快速操作面板        │
│       ├─→ [更多] → 主窗口              │
│       └─→ [语音] → 语音窗口            │
│                                         │
│  ┌─────────────────┐                   │
│  │   主窗口        │ ← 完整功能中心    │
│  │  ┌───┬────────┐ │                   │
│  │  │Tab│Content │ │                   │
│  │  └───┴────────┘ │                   │
│  └─────────────────┘                   │
│                                         │
│  ┌─────────────────┐                   │
│  │  语音窗口       │ ← 专注语音交互    │
│  │  [麦克风动画]   │                   │
│  └─────────────────┘                   │
│                                         │
└─────────────────────────────────────────┘
```

### 1.2 浮动窗口重新设计

#### 收起状态 (64×64px)

**视觉设计**:
```css
/* 渐变色圆形按钮 */
.floating-collapsed {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
  cursor: pointer;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.floating-collapsed:hover {
  transform: scale(1.1);
  box-shadow: 0 12px 32px rgba(59, 130, 246, 0.5);
}

/* 呼吸灯效果 */
.floating-collapsed::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  opacity: 0.5;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

/* 图标 */
.floating-icon {
  width: 32px;
  height: 32px;
  color: white;
  position: relative;
  z-index: 1;
}

/* 状态指示器 */
.status-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  z-index: 2;
}

.status-indicator.status-ready { background: #10b981; }
.status-indicator.status-listening { background: #f59e0b; animation: blink 1s infinite; }
.status-indicator.status-processing { background: #3b82f6; animation: spin 1s linear infinite; }
.status-indicator.status-error { background: #ef4444; }
```

**交互行为**:
- 单击: 展开浮动窗口
- 双击: 打开主窗口
- 右键: 显示快捷菜单
- 拖拽: 移动位置(自动吸附边缘)

#### 展开状态 (320×auto)

**布局设计**:
```
┌─────────────────────────────────┐
│  🤖 AI助手        [展开] [×]    │ ← 头部
├─────────────────────────────────┤
│  💡 智能建议                     │ ← 上下文感知建议
│  ┌───────────────────────────┐ │
│  │ 检测到患者ID: P20240115   │ │
│  │ [快速查询] [查看详情]     │ │
│  └───────────────────────────┘ │
├─────────────────────────────────┤
│  ⚡ 快速操作                     │ ← 常用操作
│  ┌──────┐ ┌──────┐             │
│  │ 📸   │ │ 🔍   │             │
│  │分析屏幕│ │查询  │             │
│  └──────┘ └──────┘             │
│  ┌──────┐ ┌──────┐             │
│  │ 📝   │ │ ⚙️   │             │
│  │生成报告│ │更多  │             │
│  └──────┘ └──────┘             │
├─────────────────────────────────┤
│  💬 快速输入                     │ ← 输入区
│  ┌───────────────────────────┐ │
│  │ 输入您的问题...      [🎤] │ │
│  └───────────────────────────┘ │
├─────────────────────────────────┤
│  📋 最近操作                     │ ← 历史记录
│  • 查询患者 张三 (2分钟前)      │
│  • 生成CT报告 (5分钟前)         │
└─────────────────────────────────┘
```

**组件规范**:

1. **智能建议卡片**:
```tsx
interface SmartSuggestion {
  id: string;
  type: 'patient' | 'exam' | 'report' | 'action';
  title: string;
  description: string;
  actions: Array<{
    label: string;
    icon: string;
    onClick: () => void;
  }>;
  priority: 'high' | 'medium' | 'low';
}

// 样式
.smart-suggestion {
  background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.smart-suggestion.priority-high {
  border-color: #f59e0b;
  background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
}
```

2. **快速操作按钮**:
```tsx
interface QuickAction {
  id: string;
  icon: string;
  label: string;
  shortcut?: string;
  onClick: () => void;
  badge?: number;
}

// 样式
.quick-action-btn {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  background: white;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  background: #f9fafb;
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.quick-action-icon {
  font-size: 24px;
}

.quick-action-label {
  font-size: 12px;
  color: #6b7280;
}
```

### 1.3 主窗口优化设计

#### 布局优化

**调整前**:
- Sidebar: 256px (固定)
- Content: auto

**调整后**:
- Sidebar: 220px (可调整,最小180px,最大280px)
- Content: auto (添加最大宽度限制,提升可读性)

**新布局**:
```
┌────────────────────────────────────────────────┐
│  Desktop AI Assistant              [- □ ×]     │ ← 标题栏
├──────────┬─────────────────────────────────────┤
│          │                                     │
│  🏠 首页  │  ┌─────────────────────────────┐   │
│  💬 对话  │  │                             │   │
│  📸 识别  │  │      Content Area           │   │
│  🏥 医疗  │  │      (max-width: 1200px)    │   │
│  ⚙️ 设置  │  │                             │   │
│          │  └─────────────────────────────┘   │
│  ────────│                                     │
│          │                                     │
│  📊 状态  │                                     │
│  🔌 已连接│                                     │
│          │                                     │
└──────────┴─────────────────────────────────────┘
  220px      auto (max 1200px, centered)
```

#### Tab切换动画

```css
/* Tab内容切换动画 */
.tab-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Tab按钮激活动画 */
.tab-btn.active::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 3px;
  background: #3b82f6;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}
```

### 1.4 语音窗口重新设计

**全新设计理念**: 沉浸式语音交互

```
┌─────────────────────────────────────────┐
│                                         │
│         [半透明深色遮罩]                 │
│                                         │
│     ┌─────────────────────────┐        │
│     │                         │        │
│     │    🎤                   │        │
│     │   [麦克风动画]          │        │
│     │                         │        │
│     │   "正在聆听..."         │        │
│     │                         │        │
│     │   ▓▓▓▓▓▓▓▓▓▓           │        │
│     │   [音量可视化]          │        │
│     │                         │        │
│     │   [按空格键停止]        │        │
│     │   [Esc 取消]            │        │
│     │                         │        │
│     └─────────────────────────┘        │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

**样式规范**:
```css
/* 全屏遮罩 */
.voice-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease-out;
}

/* 语音卡片 */
.voice-card {
  width: 400px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 48px;
  text-align: center;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
  animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 麦克风动画 */
.mic-animation {
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
  position: relative;
}

.mic-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 40px;
  position: relative;
  z-index: 1;
  margin: 20px;
}

.mic-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid #3b82f6;
  animation: pulse-ring 1.5s ease-out infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

/* 音量可视化 */
.volume-visualizer {
  display: flex;
  gap: 4px;
  justify-content: center;
  height: 60px;
  align-items: flex-end;
  margin: 24px 0;
}

.volume-bar {
  width: 8px;
  background: linear-gradient(to top, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: height 0.1s ease-out;
}
```

---

## 二、AI对话界面优化

### 2.1 对话气泡重新设计

**用户消息**:
```css
.message-user {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 18px 18px 4px 18px;
  padding: 12px 16px;
  max-width: 70%;
  margin-left: auto;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}
```

**AI消息**:
```css
.message-assistant {
  background: white;
  color: #1f2937;
  border: 1px solid #e5e7eb;
  border-radius: 18px 18px 18px 4px;
  padding: 12px 16px;
  max-width: 70%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
```

### 2.2 打字机效果

```tsx
const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 30); // 30ms per character
      
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  return <span>{displayText}<span className="cursor">|</span></span>;
};
```

### 2.3 思考动画

```tsx
const ThinkingIndicator: React.FC = () => (
  <div className="thinking-indicator">
    <div className="thinking-dots">
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="dot"></span>
    </div>
    <span className="thinking-text">AI正在思考...</span>
  </div>
);

// CSS
.thinking-dots {
  display: flex;
  gap: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
  animation: bounce 1.4s ease-in-out infinite;
}

.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
}
```

### 2.4 上下文卡片

```tsx
interface ContextCard {
  patient?: {
    id: string;
    name: string;
    age: number;
    gender: string;
  };
  exam?: {
    type: string;
    date: string;
    status: string;
  };
  source?: string;
}

const ContextCard: React.FC<{ context: ContextCard }> = ({ context }) => (
  <div className="context-card">
    <div className="context-header">
      <span className="context-icon">📋</span>
      <span className="context-title">当前上下文</span>
    </div>
    {context.patient && (
      <div className="context-item">
        <span className="label">患者:</span>
        <span className="value">{context.patient.name} ({context.patient.id})</span>
      </div>
    )}
    {context.exam && (
      <div className="context-item">
        <span className="label">检查:</span>
        <span className="value">{context.exam.type}</span>
      </div>
    )}
  </div>
);
```

---

## 三、桌面识别功能优化

### 3.1 快速截图流程

**新流程**:
1. 用户按下 `Cmd+Shift+A`
2. 屏幕变暗,显示截图工具
3. 用户选择区域
4. 实时显示OCR识别结果
5. 用户确认或编辑
6. 一键执行操作

**UI设计**:
```
┌─────────────────────────────────────────┐
│  [屏幕截图模式 - 按Esc取消]             │
├─────────────────────────────────────────┤
│                                         │
│     [用户拖拽选择区域]                  │
│     ┌─────────────────┐                │
│     │                 │ ← 选择框       │
│     │                 │                │
│     └─────────────────┘                │
│                                         │
│     实时OCR预览:                        │
│     ┌─────────────────────────────┐   │
│     │ 患者ID: P20240115           │   │
│     │ 姓名: 张三                  │   │
│     │ 检查类型: CT                │   │
│     └─────────────────────────────┘   │
│                                         │
│     [✓ 确认] [✏️ 编辑] [× 取消]        │
│                                         │
└─────────────────────────────────────────┘
```

---

**文档版本**: v1.0  
**下一步**: 实现优化后的设计图例

