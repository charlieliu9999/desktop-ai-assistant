# React 组件使用指南

本文档详细介绍项目中所有React组件的Props、状态和使用方法。

---

## 目录

- [1. 核心窗口组件](#1-核心窗口组件)
  - [1.1 MainWindow](#11-mainwindow)
  - [1.2 FloatingWindow](#12-floatingwindow)
  - [1.3 VoiceWindow](#13-voicewindow)
- [2. 聊天组件](#2-聊天组件)
  - [2.1 Chat](#21-chat)
  - [2.2 AgentChat](#22-agentchat)
- [3. 医疗系统组件](#3-医疗系统组件)
  - [3.1 MedicalSystem](#31-medicalsystem)
  - [3.2 PatientInfoCapture](#32-patientinfocapture)
  - [3.3 PatientInfoDisplay](#33-patientinfodisplay)
  - [3.4 ExamRecommendations](#34-examrecommendations)
  - [3.5 OneClickDesktopChat](#35-oneclickdesktopchat)
- [4. 功能组件](#4-功能组件)
  - [4.1 SettingsPanel](#41-settingspanel)
  - [4.2 ModelConfigPanel](#42-modelconfigpanel)
  - [4.3 VoiceInputWindow](#43-voiceinputwindow)
  - [4.4 DesktopRecognition](#44-desktoprecognition)
- [5. 工具组件](#5-工具组件)
  - [5.1 BishengStatusIndicator](#51-bishengstatusindicator)
  - [5.2 ScreenshotPreview](#52-screenshotpreview)
- [6. Hooks (自定义钩子)](#6-hooks-自定义钩子)
  - [6.1 useElectronAPI](#61-useelectronapi)
  - [6.2 useGlassEffect](#62-useglasseffect)
  - [6.3 useFloatingGlassEffect](#63-usefloatingglasseffect)

---

## 1. 核心窗口组件

### 1.1 MainWindow

主应用窗口，提供完整的AI助手功能。

**文件位置**: `src/renderer/components/MainWindow.tsx`

**Props**: 无（根组件）

**功能**:
- 多标签页界面（AI助手、医疗系统、智能体服务、设置）
- 支持玻璃主题和深色/浅色主题切换
- 集成所有核心功能

**使用示例**:
```tsx
import MainWindow from './components/MainWindow';

function App() {
  return <MainWindow />;
}
```

**关键特性**:
- 响应式布局
- 主题自动切换
- 状态持久化
- 窗口控制（最小化、关闭、置顶）

---

### 1.2 FloatingWindow

浮动窗口，提供快速访问功能。

**文件位置**: `src/renderer/components/FloatingWindow.tsx`

**Props**: 无

**功能**:
- 轻量级聊天界面
- 始终置顶
- 失去焦点自动隐藏
- 快捷语音输入

**使用示例**:
```tsx
import FloatingWindow from './components/FloatingWindow';

function App() {
  return <FloatingWindow />;
}
```

**样式特性**:
- 半透明背景
- 毛玻璃效果
- 圆角边框
- 最小化设计

---

### 1.3 VoiceWindow

语音输入专用窗口。

**文件位置**: `src/renderer/components/VoiceWindow.tsx`

**Props**: 无

**功能**:
- 实时语音识别
- 波形可视化
- 识别结果显示
- 快速发送到主窗口

**使用示例**:
```tsx
import VoiceWindow from './components/VoiceWindow';

function App() {
  return <VoiceWindow />;
}
```

---

## 2. 聊天组件

### 2.1 Chat

通用聊天组件，支持文本和附件。

**文件位置**: `src/renderer/components/Chat.tsx`

**Props**:
```typescript
interface ChatProps {
  messages?: ChatMessage[];
  onSend?: (content: string, attachments?: ChatAttachment[]) => void;
  placeholder?: string;
  enableAttachments?: boolean;
  enableVoice?: boolean;
  loading?: boolean;
  className?: string;
}
```

**使用示例**:
```tsx
import Chat from './components/Chat';

function ChatPage() {
  const handleSend = (content: string) => {
    console.log('发送消息:', content);
  };

  return (
    <Chat
      placeholder="输入消息..."
      onSend={handleSend}
      enableVoice={true}
      enableAttachments={true}
    />
  );
}
```

**主要功能**:
- Markdown 渲染
- 代码高亮
- 附件支持（图片、文件）
- 语音输入集成
- 复制消息
- 消息历史滚动

---

### 2.2 AgentChat

智能体聊天组件，支持Bisheng工作流。

**文件位置**: `src/renderer/components/AgentChat.tsx`

**Props**:
```typescript
interface AgentChatProps {
  workflowId: string;
  workflowName?: string;
  sessionId?: string;
  onSessionChange?: (sessionId: string) => void;
  className?: string;
}
```

**使用示例**:
```tsx
import AgentChat from './components/AgentChat';

function AgentPage() {
  const [sessionId, setSessionId] = useState<string>();

  return (
    <AgentChat
      workflowId="workflow-123"
      workflowName="医疗咨询助手"
      sessionId={sessionId}
      onSessionChange={setSessionId}
    />
  );
}
```

**功能特性**:
- 流式响应显示
- 会话管理
- 历史记录
- 工作流状态指示
- 错误处理和重试

---

## 3. 医疗系统组件

### 3.1 MedicalSystem

医疗系统主界面。

**文件位置**: `src/renderer/components/MedicalSystem.tsx`

**Props**: 无

**功能**:
- 患者信息管理
- 病历记录
- 检查推荐
- 一键流程

**使用示例**:
```tsx
import MedicalSystem from './components/MedicalSystem';

function MedicalPage() {
  return <MedicalSystem />;
}
```

**子组件集成**:
```tsx
<MedicalSystem>
  <PatientInfoCapture />
  <PatientRecords />
  <ExamRecommendations />
  <OneClickDesktopChat />
</MedicalSystem>
```

---

### 3.2 PatientInfoCapture

患者信息捕获组件。

**文件位置**: `src/renderer/components/medical/PatientInfoCapture.tsx`

**Props**:
```typescript
interface PatientInfoCaptureProps {
  onCapture?: (info: PatientInfo) => void;
  onError?: (error: Error) => void;
  autoExtract?: boolean;
  className?: string;
}
```

**使用示例**:
```tsx
import PatientInfoCapture from './components/medical/PatientInfoCapture';

function PatientForm() {
  const handleCapture = (info: PatientInfo) => {
    console.log('患者信息:', info);
    // 保存到数据库
  };

  return (
    <PatientInfoCapture
      onCapture={handleCapture}
      autoExtract={true}
    />
  );
}
```

**工作流程**:
1. 点击截图按钮
2. 选择屏幕区域
3. OCR识别文本
4. AI提取患者信息
5. 显示提取结果
6. 允许手动编辑

---

### 3.3 PatientInfoDisplay

患者信息显示组件。

**文件位置**: `src/renderer/components/medical/PatientInfoDisplay.tsx`

**Props**:
```typescript
interface PatientInfoDisplayProps {
  patientInfo: PatientInfo;
  editable?: boolean;
  onEdit?: (info: PatientInfo) => void;
  onSave?: (info: PatientInfo) => void;
  className?: string;
}
```

**使用示例**:
```tsx
import PatientInfoDisplay from './components/medical/PatientInfoDisplay';

function PatientDetail({ patient }: { patient: PatientInfo }) {
  const handleSave = (updatedInfo: PatientInfo) => {
    // 保存更新
  };

  return (
    <PatientInfoDisplay
      patientInfo={patient}
      editable={true}
      onSave={handleSave}
    />
  );
}
```

**显示字段**:
- 姓名
- 年龄、性别
- 患者ID
- 科室
- 主诉
- 诊断
- 置信度指示

---

### 3.4 ExamRecommendations

检查推荐组件。

**文件位置**: `src/renderer/components/medical/ExamRecommendations.tsx`

**Props**:
```typescript
interface ExamRecommendationsProps {
  patientInfo?: PatientInfo;
  type: 'diagnosis' | 'exam' | 'medication';
  onGenerate?: (recommendations: string[]) => void;
  className?: string;
}
```

**使用示例**:
```tsx
import ExamRecommendations from './components/medical/ExamRecommendations';

function RecommendationPanel({ patient }: { patient: PatientInfo }) {
  return (
    <div>
      <ExamRecommendations
        patientInfo={patient}
        type="diagnosis"
      />
      <ExamRecommendations
        patientInfo={patient}
        type="exam"
      />
      <ExamRecommendations
        patientInfo={patient}
        type="medication"
      />
    </div>
  );
}
```

**功能**:
- 基于患者信息生成推荐
- 支持三种类型：诊断、检查、用药
- AI驱动的智能推荐
- 可编辑和保存

---

### 3.5 OneClickDesktopChat

一键桌面聊天组件。

**文件位置**: `src/renderer/components/medical/OneClickDesktopChat.tsx`

**Props**:
```typescript
interface OneClickDesktopChatProps {
  onComplete?: (result: any) => void;
  config?: OneClickConfig;
  className?: string;
}
```

**使用示例**:
```tsx
import OneClickDesktopChat from './components/medical/OneClickDesktopChat';

function QuickAssist() {
  const handleComplete = (result: any) => {
    console.log('流程完成:', result);
  };

  return (
    <OneClickDesktopChat
      onComplete={handleComplete}
      config={{
        enabled: true,
        showScreenshot: true,
        showPatientInfo: true,
        generate: { diagnosis: true, exam: true, medication: true }
      }}
    />
  );
}
```

**一键流程**:
1. 截取桌面/窗口
2. OCR提取文本
3. AI分析患者信息
4. 自动生成诊断、检查和用药建议
5. 支持后续对话

---

## 4. 功能组件

### 4.1 SettingsPanel

设置面板组件。

**文件位置**: `src/renderer/components/SettingsPanel.tsx`

**Props**:
```typescript
interface SettingsPanelProps {
  onClose?: () => void;
  initialTab?: string;
  className?: string;
}
```

**使用示例**:
```tsx
import SettingsPanel from './components/SettingsPanel';

function Settings() {
  return (
    <SettingsPanel
      initialTab="ai"
      onClose={() => window.close()}
    />
  );
}
```

**设置类别**:
- AI配置（提供商、模型、参数）
- 语音配置（识别、合成）
- 医疗集成
- Bisheng配置
- 主题和语言
- 快捷键
- 隐私和性能

---

### 4.2 ModelConfigPanel

模型配置面板。

**文件位置**: `src/renderer/components/ModelConfigPanel.tsx`

**Props**:
```typescript
interface ModelConfigPanelProps {
  provider: AIProvider;
  model: string;
  onSave?: (config: AIConfig) => void;
  className?: string;
}
```

**使用示例**:
```tsx
import ModelConfigPanel from './components/ModelConfigPanel';

function AISettings() {
  const handleSave = (config: AIConfig) => {
    // 保存配置
  };

  return (
    <ModelConfigPanel
      provider="openai"
      model="gpt-4"
      onSave={handleSave}
    />
  );
}
```

**可配置参数**:
- Temperature
- Max Tokens
- Top P
- Frequency Penalty
- Presence Penalty
- System Prompt

---

### 4.3 VoiceInputWindow

语音输入窗口组件。

**文件位置**: `src/renderer/components/VoiceInputWindow.tsx`

**Props**:
```typescript
interface VoiceInputWindowProps {
  onResult?: (text: string, confidence: number) => void;
  onClose?: () => void;
  autoSend?: boolean;
  className?: string;
}
```

**使用示例**:
```tsx
import VoiceInputWindow from './components/VoiceInputWindow';

function VoiceInput() {
  const handleResult = (text: string, confidence: number) => {
    if (confidence > 0.8) {
      sendMessage(text);
    }
  };

  return (
    <VoiceInputWindow
      onResult={handleResult}
      autoSend={true}
    />
  );
}
```

**特性**:
- 实时波形显示
- 识别结果预览
- 置信度指示
- 多语言支持
- 热词检测

---

### 4.4 DesktopRecognition

桌面识别组件。

**文件位置**: `src/renderer/components/DesktopRecognition.tsx`

**Props**:
```typescript
interface DesktopRecognitionProps {
  onCapture?: (capture: ScreenCapture) => void;
  onAnalysis?: (analysis: any) => void;
  autoAnalyze?: boolean;
  className?: string;
}
```

**使用示例**:
```tsx
import DesktopRecognition from './components/DesktopRecognition';

function ScreenAnalyzer() {
  const handleAnalysis = (analysis: any) => {
    console.log('分析结果:', analysis);
  };

  return (
    <DesktopRecognition
      autoAnalyze={true}
      onAnalysis={handleAnalysis}
    />
  );
}
```

**功能**:
- 屏幕截图
- OCR识别
- AI内容分析
- 操作建议
- 历史记录

---

## 5. 工具组件

### 5.1 BishengStatusIndicator

Bisheng连接状态指示器。

**文件位置**: `src/renderer/components/BishengStatusIndicator.tsx`

**Props**:
```typescript
interface BishengStatusIndicatorProps {
  showDetails?: boolean;
  onClick?: () => void;
  className?: string;
}
```

**使用示例**:
```tsx
import BishengStatusIndicator from './components/BishengStatusIndicator';

function Header() {
  return (
    <div className="header">
      <BishengStatusIndicator
        showDetails={true}
        onClick={() => openBishengSettings()}
      />
    </div>
  );
}
```

**状态显示**:
- 🟢 已连接
- 🟡 连接中
- 🔴 未连接
- ⚠️ 错误

---

### 5.2 ScreenshotPreview

截图预览组件。

**文件位置**: `src/renderer/components/medical/ScreenshotPreview.tsx`

**Props**:
```typescript
interface ScreenshotPreviewProps {
  imageUrl: string;
  ocrResult?: OCRResult;
  onEdit?: () => void;
  onDelete?: () => void;
  showOCR?: boolean;
  className?: string;
}
```

**使用示例**:
```tsx
import ScreenshotPreview from './components/medical/ScreenshotPreview';

function Preview({ screenshot }: { screenshot: ScreenCapture }) {
  return (
    <ScreenshotPreview
      imageUrl={screenshot.dataUrl}
      ocrResult={screenshot.ocrResult}
      showOCR={true}
      onEdit={() => editScreenshot(screenshot)}
      onDelete={() => deleteScreenshot(screenshot)}
    />
  );
}
```

**功能**:
- 图片缩放
- OCR文本覆盖显示
- 编辑和删除
- 复制到剪贴板

---

## 6. Hooks (自定义钩子)

### 6.1 useElectronAPI

访问Electron API的Hook。

**文件位置**: `src/renderer/hooks/useElectronAPI.ts`

**用法**:
```tsx
import { useElectronAPI } from '../hooks/useElectronAPI';

function MyComponent() {
  const electronAPI = useElectronAPI();

  const handleScreenshot = async () => {
    const result = await electronAPI.screenshot.capture();
    if (result.success) {
      setImage(result.data.dataUrl);
    }
  };

  return <button onClick={handleScreenshot}>截图</button>;
}
```

**返回值**: `window.electronAPI` 对象

---

### 6.2 useGlassEffect

玻璃效果Hook（主窗口）。

**文件位置**: `src/renderer/hooks/useGlassEffect.ts`

**用法**:
```tsx
import { useGlassEffect } from '../hooks/useGlassEffect';

function GlassPanel() {
  const { isGlass, theme } = useGlassEffect();

  return (
    <div className={isGlass ? 'glass-panel' : 'normal-panel'}>
      内容
    </div>
  );
}
```

**返回值**:
```typescript
{
  isGlass: boolean,
  theme: 'light' | 'dark' | 'glass'
}
```

---

### 6.3 useFloatingGlassEffect

浮动窗口玻璃效果Hook。

**文件位置**: `src/renderer/hooks/useFloatingGlassEffect.ts`

**用法**:
```tsx
import { useFloatingGlassEffect } from '../hooks/useFloatingGlassEffect';

function FloatingPanel() {
  useFloatingGlassEffect();

  return <div className="floating-container">...</div>;
}
```

**功能**: 自动应用玻璃效果样式

---

## 组件最佳实践

### 1. 状态管理

使用Zustand进行全局状态管理：

```tsx
import { useChatStore } from '../stores/chatStore';

function ChatComponent() {
  const { messages, add } = useChatStore();
  
  // 使用状态...
}
```

### 2. 错误处理

始终实现错误边界：

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### 3. 性能优化

使用React.memo和useMemo：

```tsx
const MemoizedComponent = React.memo(MyComponent);

const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

### 4. 样式规范

使用Tailwind CSS类名：

```tsx
<div className="flex items-center justify-between p-4 bg-glass rounded-lg">
  内容
</div>
```

### 5. 类型安全

始终定义Props接口：

```tsx
interface MyComponentProps {
  title: string;
  onAction?: () => void;
  data?: any[];
}

const MyComponent: React.FC<MyComponentProps> = ({ title, onAction, data }) => {
  // 组件实现
};
```

---

**文档版本**: 1.0.0  
**更新日期**: 2025-10-10

如需更多信息，请参考源代码或联系开发团队。
