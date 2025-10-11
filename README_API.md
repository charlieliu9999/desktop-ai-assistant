# 桌面AI助手 - API文档导航

欢迎使用桌面AI助手API文档！本项目提供完整的API文档、组件指南和使用示例。

---

## 📚 文档目录

### 🚀 快速开始
- **[API快速入门](./docs/API_QUICK_START.md)** ⭐ 推荐首先阅读
  - 5分钟快速开始
  - 常用功能速查
  - 配置说明
  - 常见问题

### 📖 完整文档

#### 核心API文档
- **[完整API文档](./docs/API_DOCUMENTATION.md)**
  - 服务层API (AI、语音、截图、医疗、Bisheng等)
  - Electron API (Preload)
  - 工具函数
  - 状态管理
  - 类型定义

#### 组件文档
- **[React组件使用指南](./docs/COMPONENTS_GUIDE.md)**
  - 核心窗口组件
  - 聊天组件
  - 医疗系统组件
  - 功能组件
  - 自定义Hooks

#### 实践指南
- **[使用示例和最佳实践](./docs/USAGE_EXAMPLES.md)**
  - AI服务使用示例
  - 语音识别示例
  - 医疗系统集成
  - Bisheng智能体使用
  - 桌面识别和OCR
  - 完整应用场景
  - 调试和故障排除

---

## 🎯 按功能查找

### AI 功能
- [AI服务 API](./docs/API_DOCUMENTATION.md#11-ai服务-aiservice)
- [AI配置](./docs/API_QUICK_START.md#ai-配置)
- [AI使用示例](./docs/USAGE_EXAMPLES.md#2-ai服务使用示例)

### 语音功能
- [语音识别服务 API](./docs/API_DOCUMENTATION.md#12-语音识别服务-voicerecognitionmanager)
- [语音配置](./docs/API_QUICK_START.md#语音配置)
- [语音识别示例](./docs/USAGE_EXAMPLES.md#3-语音识别示例)

### 医疗功能
- [医疗集成服务 API](./docs/API_DOCUMENTATION.md#15-医疗集成服务-medicalintegrationservice)
- [患者信息提取服务 API](./docs/API_DOCUMENTATION.md#18-患者信息提取服务-patientinfoextractor)
- [医疗系统组件](./docs/COMPONENTS_GUIDE.md#3-医疗系统组件)
- [医疗集成示例](./docs/USAGE_EXAMPLES.md#4-医疗系统集成)

### Bisheng智能体
- [Bisheng服务 API](./docs/API_DOCUMENTATION.md#14-bisheng智能体服务-bishengservice)
- [Bisheng配置](./docs/BISHENG_INTEGRATION_PLAN.md)
- [Bisheng使用示例](./docs/USAGE_EXAMPLES.md#5-bisheng智能体使用)

### 桌面识别
- [桌面识别服务 API](./docs/API_DOCUMENTATION.md#17-桌面识别服务-desktoprecognitionservice)
- [截图服务 API](./docs/API_DOCUMENTATION.md#13-截图服务-screenshotservice)
- [桌面识别示例](./docs/USAGE_EXAMPLES.md#6-桌面识别和ocr)

---

## 🔍 快速查找

### 常用服务

| 服务名称 | API文档 | 使用示例 | 说明 |
|---------|---------|---------|------|
| AIService | [查看](./docs/API_DOCUMENTATION.md#11-ai服务-aiservice) | [示例](./docs/USAGE_EXAMPLES.md#2-ai服务使用示例) | AI对话、内容分析 |
| VoiceRecognitionManager | [查看](./docs/API_DOCUMENTATION.md#12-语音识别服务-voicerecognitionmanager) | [示例](./docs/USAGE_EXAMPLES.md#3-语音识别示例) | 语音识别（多模型） |
| ScreenshotService | [查看](./docs/API_DOCUMENTATION.md#13-截图服务-screenshotservice) | [示例](./docs/USAGE_EXAMPLES.md#6-桌面识别和ocr) | 屏幕和窗口截图 |
| BishengService | [查看](./docs/API_DOCUMENTATION.md#14-bisheng智能体服务-bishengservice) | [示例](./docs/USAGE_EXAMPLES.md#5-bisheng智能体使用) | Bisheng智能体集成 |
| MedicalIntegrationService | [查看](./docs/API_DOCUMENTATION.md#15-医疗集成服务-medicalintegrationservice) | [示例](./docs/USAGE_EXAMPLES.md#4-医疗系统集成) | 医疗系统集成 |
| WebSearchService | [查看](./docs/API_DOCUMENTATION.md#16-网络搜索服务-websearchservice) | - | 网络搜索 |
| DesktopRecognitionService | [查看](./docs/API_DOCUMENTATION.md#17-桌面识别服务-desktoprecognitionservice) | [示例](./docs/USAGE_EXAMPLES.md#6-桌面识别和ocr) | 桌面识别和OCR |
| PatientInfoExtractor | [查看](./docs/API_DOCUMENTATION.md#18-患者信息提取服务-patientinfoextractor) | [示例](./docs/USAGE_EXAMPLES.md#41-患者信息提取) | 患者信息提取 |

### 常用组件

| 组件名称 | Props文档 | 说明 |
|---------|---------|------|
| Chat | [查看](./docs/COMPONENTS_GUIDE.md#21-chat) | 通用聊天组件 |
| AgentChat | [查看](./docs/COMPONENTS_GUIDE.md#22-agentchat) | Bisheng智能体聊天 |
| PatientInfoCapture | [查看](./docs/COMPONENTS_GUIDE.md#32-patientinfocapture) | 患者信息捕获 |
| ExamRecommendations | [查看](./docs/COMPONENTS_GUIDE.md#34-examrecommendations) | 检查推荐 |
| OneClickDesktopChat | [查看](./docs/COMPONENTS_GUIDE.md#35-oneclickdesktopchat) | 一键桌面聊天 |
| SettingsPanel | [查看](./docs/COMPONENTS_GUIDE.md#41-settingspanel) | 设置面板 |
| VoiceInputWindow | [查看](./docs/COMPONENTS_GUIDE.md#43-voiceinputwindow) | 语音输入窗口 |

---

## 💡 使用建议

### 对于新手
1. 从 **[API快速入门](./docs/API_QUICK_START.md)** 开始
2. 阅读 **[使用示例](./docs/USAGE_EXAMPLES.md)** 了解实际应用
3. 查看 **[组件指南](./docs/COMPONENTS_GUIDE.md)** 学习组件用法

### 对于开发者
1. 参考 **[完整API文档](./docs/API_DOCUMENTATION.md)** 查找详细API
2. 使用 **[使用示例](./docs/USAGE_EXAMPLES.md)** 作为参考代码
3. 查看源码中的JSDoc注释获取最新信息

### 对于集成者
1. 阅读 **[架构文档](./docs/architecture.md)** 了解系统设计
2. 参考 **[Bisheng集成](./docs/BISHENG_INTEGRATION_PLAN.md)** 进行平台集成
3. 查看 **[医疗集成文档](./docs/BISHENG_AGENT_INTEGRATION.md)** 集成医疗系统

---

## 📝 代码示例速查

### 快速开始 - AI聊天

```typescript
import { AIService } from './services/ai';

const aiService = new AIService(config, logger);
await aiService.initialize();

const response = await aiService.processMessage({
  role: 'user',
  content: '你好',
  timestamp: Date.now()
});
```

### 快速开始 - 语音识别

```typescript
import { VoiceRecognitionManager } from './services/voice-recognition';

const voiceManager = new VoiceRecognitionManager(config, logger);
await voiceManager.initialize();

voiceManager.on('recognition-result', (result) => {
  console.log(result.transcript);
});

await voiceManager.startListening();
```

### 快速开始 - 截图

```typescript
import { ScreenshotService } from './services/screenshot';

const screenshotService = new ScreenshotService(logger);
const screenshot = await screenshotService.captureScreen();
```

更多示例请查看 **[使用示例文档](./docs/USAGE_EXAMPLES.md)**。

---

## 🔗 相关文档

### 项目文档
- [README](./README.md) - 项目主页
- [架构设计](./docs/architecture.md) - 系统架构
- [需求文档](./docs/requirements.md) - 功能需求
- [路线图](./docs/roadmap.md) - 开发计划

### 专题文档
- [Bisheng集成](./docs/BISHENG_INTEGRATION_PLAN.md)
- [医疗系统](./docs/BISHENG_AGENT_INTEGRATION.md)
- [语音设置](./docs/VOICE_RECOGNITION_SETUP.md)
- [网络搜索](./docs/WEB_SEARCH_SETUP.md)
- [测试指南](./tests/TESTING_GUIDE.md)

---

## 📞 支持与反馈

- **文档问题**: 如发现文档错误或遗漏，请提交Issue
- **功能建议**: 欢迎提出API改进建议
- **使用问题**: 查看[常见问题](./docs/API_QUICK_START.md#常见问题)或提Issue

GitHub: https://github.com/desktop-ai-assistant/desktop-ai-assistant

---

## ⚡ 快速链接

- [5分钟快速开始](./docs/API_QUICK_START.md#-5分钟快速开始)
- [常用功能速查](./docs/API_QUICK_START.md#-常用功能速查)
- [完整API列表](./docs/API_DOCUMENTATION.md#目录)
- [组件列表](./docs/COMPONENTS_GUIDE.md#目录)
- [实际应用场景](./docs/USAGE_EXAMPLES.md#7-完整应用场景)

---

**版本**: 1.0.0  
**更新**: 2025-10-10  
**作者**: Desktop AI Assistant Team

开始探索吧！🚀
