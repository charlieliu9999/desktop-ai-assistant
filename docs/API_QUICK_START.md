# API 快速入门指南

快速开始使用桌面AI助手的公共API。

---

## 📚 文档索引

### 核心文档
- **[完整API文档](./API_DOCUMENTATION.md)** - 所有服务、API和函数的详细说明
- **[组件使用指南](./COMPONENTS_GUIDE.md)** - React组件Props和使用方法
- **[使用示例](./USAGE_EXAMPLES.md)** - 实际应用场景和最佳实践

### 专题文档
- [架构设计](./architecture.md) - 系统架构和设计理念
- [Bisheng集成](./BISHENG_INTEGRATION_PLAN.md) - Bisheng智能体平台集成
- [医疗系统集成](./BISHENG_AGENT_INTEGRATION.md) - 医疗系统功能说明
- [语音识别设置](./VOICE_RECOGNITION_SETUP.md) - 语音识别配置指南

---

## 🚀 5分钟快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
# AI服务配置
OPENAI_API_KEY=your_api_key_here
AI_PROVIDER=openai
AI_MODEL=gpt-4

# Bisheng配置（可选）
BISHENG_BASE_URL=http://localhost:7860
BISHENG_USERNAME=admin
BISHENG_PASSWORD=password

# 医疗系统配置（可选）
MEDICAL_API_URL=http://your-medical-system-api
MEDICAL_API_KEY=your_medical_api_key
```

### 3. 启动应用

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
npm run dist
```

---

## 💡 常用功能速查

### AI 聊天

```typescript
import { AIService } from './services/ai';

const aiService = new AIService(config, logger);
await aiService.initialize();

const response = await aiService.processMessage({
  role: 'user',
  content: '你好',
  timestamp: Date.now()
});

console.log(response.content);
```

### 语音识别

```typescript
import { VoiceRecognitionManager } from './services/voice-recognition';

const voiceManager = new VoiceRecognitionManager(config, logger);
await voiceManager.initialize();

voiceManager.on('recognition-result', (result) => {
  console.log('识别:', result.transcript);
});

await voiceManager.startListening();
```

### 屏幕截图

```typescript
import { ScreenshotService } from './services/screenshot';

const screenshotService = new ScreenshotService(logger);

const screenshot = await screenshotService.captureScreen({
  quality: 90
});

console.log('截图:', screenshot.dataUrl);
```

### Electron API (渲染进程)

```typescript
// 窗口控制
await window.electronAPI.window.minimize();

// AI服务
const response = await window.electronAPI.ai.chat(messages);

// 语音识别
await window.electronAPI.voice.startListening();

// 截图
const result = await window.electronAPI.screenshot.capture();
```

### React组件

```tsx
import Chat from './components/Chat';
import { useChatStore } from './stores/chatStore';

function MyApp() {
  const { messages, add } = useChatStore();
  
  return (
    <Chat
      messages={messages}
      onSend={(content) => add({
        id: Date.now().toString(),
        type: 'user',
        content,
        timestamp: new Date()
      })}
    />
  );
}
```

---

## 📖 核心概念

### 服务架构

```
┌─────────────────┐
│   Main Process  │  ← Electron主进程
├─────────────────┤
│  - AIService    │  ← AI服务
│  - VoiceService │  ← 语音服务
│  - MedicalSrv   │  ← 医疗服务
│  - BishengSrv   │  ← Bisheng服务
└─────────────────┘
        ↕ IPC
┌─────────────────┐
│ Renderer Process│  ← React渲染进程
├─────────────────┤
│  - Components   │  ← React组件
│  - Stores       │  ← 状态管理
│  - Hooks        │  ← 自定义钩子
└─────────────────┘
```

### 主要服务

| 服务 | 功能 | 配置键 |
|------|------|--------|
| AIService | AI对话、内容分析 | `config.ai` |
| VoiceRecognitionManager | 语音识别（多模型） | `config.voice` |
| MedicalIntegrationService | 医疗系统集成 | `config.medical` |
| BishengService | Bisheng智能体 | `config.bisheng` |
| ScreenshotService | 屏幕截图 | - |
| WebSearchService | 网络搜索 | `config.ai.webSearch` |
| DesktopRecognitionService | 桌面识别 | `config.desktopRecognition` |

---

## 🎯 典型使用场景

### 场景1: AI助手对话

```typescript
// 1. 初始化
const aiService = new AIService(config.ai, logger);
await aiService.initialize();

// 2. 发送消息
const response = await aiService.processMessage({
  role: 'user',
  content: '介绍一下量子计算',
  timestamp: Date.now()
});

// 3. 获取响应
console.log(response.content);
```

### 场景2: 语音转文字

```typescript
// 1. 初始化
const voiceManager = new VoiceRecognitionManager(config.voice, logger);
await voiceManager.initialize();

// 2. 监听结果
voiceManager.on('recognition-result', (result) => {
  if (result.isFinal) {
    console.log('最终文本:', result.transcript);
  }
});

// 3. 开始识别
await voiceManager.startListening();
```

### 场景3: 医疗信息提取

```typescript
// 1. 截图
const screenshot = await screenshotService.captureScreen();

// 2. OCR识别
const ocrResult = await performOCR(screenshot.dataUrl);

// 3. 提取患者信息
const extractor = new PatientInfoExtractor();
const patientInfo = await extractor.extractFromOCR(ocrResult);

console.log('患者:', patientInfo.name, patientInfo.age);
```

### 场景4: Bisheng智能体

```typescript
// 1. 登录
await bishengService.login('admin', 'password');

// 2. 获取工作流
const workflows = await bishengService.getWorkflows();

// 3. 调用工作流
const stream = await bishengService.invokeWorkflow(
  workflows[0].id,
  { user_input: '你好' }
);

// 4. 处理流式响应
const reader = stream.getReader();
// ...
```

---

## 🔧 配置说明

### AI 配置

```typescript
{
  ai: {
    enabled: true,
    provider: 'openai' | 'claude' | 'gemini' | 'local',
    apiKey: 'your-api-key',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    streamResponse: true,
    
    // 网络搜索
    webSearch: {
      enabled: true,
      provider: 'duckduckgo',
      maxResults: 5
    }
  }
}
```

### 语音配置

```typescript
{
  voice: {
    enabled: true,
    recognition: {
      model: 'browser' | 'whisper' | 'funasr',
      language: 'zh-CN',
      continuous: true,
      
      // Whisper特定配置
      whisper: {
        model: 'base',
        device: 'cpu',
        language: 'zh'
      }
    }
  }
}
```

### 医疗配置

```typescript
{
  medical: {
    enabled: true,
    apiUrl: 'http://your-medical-api',
    apiKey: 'your-api-key',
    cacheEnabled: true,
    cacheTtl: 300  // 秒
  }
}
```

---

## ⚠️ 常见问题

### Q: AI服务初始化失败？

**A**: 检查API密钥和网络连接：
```typescript
try {
  await aiService.initialize();
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('API密钥无效或未配置');
  } else if (error.message.includes('connection')) {
    console.error('网络连接失败');
  }
}
```

### Q: 语音识别不工作？

**A**: 检查浏览器权限和模型可用性：
```typescript
// 检查可用模型
const available = voiceManager.getAvailableModels();
console.log('可用模型:', available);

// 切换到可用模型
if (available.includes('browser')) {
  await voiceManager.setCurrentModel('browser');
}
```

### Q: 如何处理流式响应？

**A**: 使用回调或ReadableStream：
```typescript
// 方法1: 回调
await aiService.processMessageStream(
  message,
  (chunk) => console.log(chunk)
);

// 方法2: Stream (Bisheng)
const stream = await bishengService.invokeWorkflow(...);
const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(new TextDecoder().decode(value));
}
```

---

## 📞 获取帮助

- **API文档**: [完整API文档](./API_DOCUMENTATION.md)
- **组件指南**: [组件使用指南](./COMPONENTS_GUIDE.md)
- **示例代码**: [使用示例](./USAGE_EXAMPLES.md)
- **问题报告**: [GitHub Issues](https://github.com/desktop-ai-assistant/desktop-ai-assistant/issues)

---

## 🔗 相关资源

### 外部文档
- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev/)
- [OpenAI API](https://platform.openai.com/docs)
- [Bisheng 文档](https://bisheng.dataelem.com/)

### 内部文档
- [项目架构](./architecture.md)
- [开发指南](./DEVELOPMENT.md)
- [部署说明](./DEPLOYMENT.md)
- [测试指南](./tests/TESTING_GUIDE.md)

---

**版本**: 1.0.0  
**更新**: 2025-10-10  
**维护**: Desktop AI Assistant Team

祝你使用愉快！🎉
