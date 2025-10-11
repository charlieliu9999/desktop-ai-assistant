# 使用示例和最佳实践

本文档提供桌面AI助手的实际使用示例和最佳实践。

---

## 目录

- [1. 快速开始](#1-快速开始)
- [2. AI服务使用示例](#2-ai服务使用示例)
- [3. 语音识别示例](#3-语音识别示例)
- [4. 医疗系统集成](#4-医疗系统集成)
- [5. Bisheng智能体使用](#5-bisheng智能体使用)
- [6. 桌面识别和OCR](#6-桌面识别和ocr)
- [7. 完整应用场景](#7-完整应用场景)
- [8. 调试和故障排除](#8-调试和故障排除)

---

## 1. 快速开始

### 基本应用初始化

```typescript
// src/main/main.ts
import { app } from 'electron';
import { ConfigService } from './services/config';
import { WindowManager } from './window-manager';
import { Logger } from '../utils/logger';
import { AIService } from '../services/ai';
import { VoiceRecognitionManager } from '../services/voice-recognition';

const logger = new Logger({ level: LogLevel.INFO });
const configService = new ConfigService();
const windowManager = new WindowManager(configService, logger);

app.on('ready', async () => {
  // 初始化配置
  await configService.initialize();
  
  // 创建窗口
  await windowManager.initialize();
  
  // 初始化服务
  const config = await configService.getConfig();
  const aiService = new AIService(config.ai, logger);
  const voiceManager = new VoiceRecognitionManager(config.voice, logger);
  
  await aiService.initialize();
  await voiceManager.initialize();
  
  logger.info('应用启动成功');
});
```

---

## 2. AI服务使用示例

### 2.1 基本聊天

```typescript
import { AIService } from './services/ai';
import { Logger } from './utils/logger';

const logger = new Logger();
const aiService = new AIService({
  enabled: true,
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000,
  maxHistory: 10
}, logger);

async function chat() {
  await aiService.initialize();
  
  const message = {
    role: 'user',
    content: '介绍一下量子计算的基本原理',
    timestamp: Date.now()
  };
  
  const response = await aiService.processMessage(message);
  console.log('AI回复:', response.content);
  console.log('Token使用:', response.usage.totalTokens);
}
```

### 2.2 流式响应

```typescript
async function streamingChat() {
  const message = {
    role: 'user',
    content: '写一篇关于人工智能的短文',
    timestamp: Date.now()
  };
  
  let fullText = '';
  
  const response = await aiService.processMessageStream(
    message,
    (chunk) => {
      // 实时显示每个文本块
      fullText += chunk;
      console.log(chunk); // 或更新UI
    }
  );
  
  console.log('完整回复:', fullText);
}
```

### 2.3 使用工具（网络搜索）

```typescript
const aiService = new AIService({
  enabled: true,
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  toolsEnabled: true,
  webSearch: {
    enabled: true,
    provider: 'duckduckgo',
    maxResults: 5
  }
}, logger);

async function chatWithSearch() {
  await aiService.initialize();
  
  const message = {
    role: 'user',
    content: '2024年诺贝尔物理学奖得主是谁？',
    timestamp: Date.now()
  };
  
  // AI会自动调用网络搜索工具
  const response = await aiService.processMessageWithTools(message);
  console.log('答案:', response.content);
}
```

### 2.4 自定义系统提示

```typescript
async function customSystemPrompt() {
  const systemPrompt = `你是一个专业的医疗咨询助手。
  - 始终以患者安全为第一优先级
  - 使用简单易懂的语言
  - 必要时建议就医
  - 不要做出确诊`;
  
  const message = {
    role: 'user',
    content: '我最近总是头痛，怎么办？',
    timestamp: Date.now()
  };
  
  const response = await aiService.processMessage(message, {
    systemPrompt
  });
  
  console.log(response.content);
}
```

---

## 3. 语音识别示例

### 3.1 浏览器原生识别

```typescript
import { VoiceRecognitionManager } from './services/voice-recognition';

const voiceManager = new VoiceRecognitionManager({
  enabled: true,
  recognition: {
    enabled: true,
    model: 'browser',
    language: 'zh-CN',
    continuous: true,
    interimResults: true,
    maxAlternatives: 1
  }
}, logger);

async function startVoiceRecognition() {
  await voiceManager.initialize();
  
  // 监听识别结果
  voiceManager.on('recognition-result', (result) => {
    console.log('识别文本:', result.transcript);
    console.log('置信度:', result.confidence);
    console.log('是否最终:', result.isFinal);
  });
  
  // 开始监听
  await voiceManager.startListening();
}
```

### 3.2 Whisper模型识别

```typescript
const voiceManager = new VoiceRecognitionManager({
  enabled: true,
  recognition: {
    enabled: true,
    model: 'whisper',
    language: 'zh',
    whisper: {
      model: 'base',
      device: 'cpu',
      computeType: 'int8',
      language: 'zh',
      temperature: 0.0,
      beamSize: 5
    }
  }
}, logger);

async function useWhisper() {
  await voiceManager.initialize();
  await voiceManager.setCurrentModel('whisper');
  
  // 测试识别
  const audioBuffer = await getAudioFromMicrophone();
  const result = await voiceManager.testRecognition('whisper', audioBuffer);
  
  console.log('识别结果:', result.text);
  console.log('准确率:', result.accuracy);
  console.log('延迟:', result.latency, 'ms');
}
```

### 3.3 模型对比测试

```typescript
async function compareModels() {
  const audioBuffer = await getTestAudio();
  const results = await voiceManager.testAllModels(audioBuffer);
  
  // 按准确率排序
  results.sort((a, b) => b.accuracy - a.accuracy);
  
  console.log('=== 识别模型对比 ===');
  results.forEach(result => {
    console.log(`${result.model}:`);
    console.log(`  文本: ${result.text}`);
    console.log(`  准确率: ${(result.accuracy * 100).toFixed(2)}%`);
    console.log(`  延迟: ${result.latency}ms`);
    console.log('---');
  });
  
  // 选择最佳模型
  const bestModel = results[0].model;
  await voiceManager.setCurrentModel(bestModel);
  console.log(`已切换到最佳模型: ${bestModel}`);
}
```

---

## 4. 医疗系统集成

### 4.1 患者信息提取

```typescript
import { PatientInfoExtractor } from './services/patient-info-extractor';
import { ScreenshotService } from './services/screenshot';

const extractor = new PatientInfoExtractor({
  useAI: true,
  aiApiUrl: 'http://localhost:8010/api/ai/extract-patient-info',
  minConfidence: 0.6
});

const screenshotService = new ScreenshotService(logger);

async function extractPatientInfo() {
  // 1. 截图
  const screenshot = await screenshotService.captureScreen({
    quality: 90
  });
  
  // 2. OCR识别
  const ocrResult = await performOCR(screenshot.dataUrl);
  
  // 3. 提取患者信息
  const patientInfo = await extractor.extractFromOCR(ocrResult);
  
  // 4. 验证
  const validation = extractor.validatePatientInfo(patientInfo);
  
  if (validation.valid) {
    console.log('患者信息:');
    console.log('  姓名:', patientInfo.name);
    console.log('  年龄:', patientInfo.age);
    console.log('  性别:', patientInfo.gender);
    console.log('  患者ID:', patientInfo.patientId);
    console.log('  科室:', patientInfo.department);
    console.log('  置信度:', patientInfo.confidence);
  } else {
    console.error('验证失败:', validation.errors);
  }
}
```

### 4.2 医疗数据搜索

```typescript
import { MedicalIntegrationService } from './services/medical-integration';

const medicalService = new MedicalIntegrationService({
  enabled: true,
  apiUrl: 'http://医疗系统API地址',
  apiKey: process.env.MEDICAL_API_KEY,
  timeout: 10000,
  cacheEnabled: true,
  cacheTtl: 300
}, logger);

async function searchPatient() {
  await medicalService.initialize();
  
  // 搜索患者
  const results = await medicalService.searchPatients('张三', {
    limit: 10,
    filters: {
      department: '心内科',
      dateRange: { start: '2024-01-01', end: '2024-12-31' }
    }
  });
  
  console.log(`找到 ${results.length} 个匹配患者`);
  
  // 获取详细记录
  if (results.length > 0) {
    const patientId = results[0].id;
    const record = await medicalService.getPatientRecord(patientId);
    
    console.log('患者详情:', record.data);
  }
}
```

### 4.3 一键生成诊疗建议

```typescript
async function generateRecommendations() {
  // 1. 截图并提取患者信息
  const screenshot = await screenshotService.captureScreen();
  const ocrResult = await performOCR(screenshot.dataUrl);
  const patientInfo = await extractor.extractFromOCR(ocrResult);
  
  // 2. 生成诊断建议
  const diagnosisPrompt = `基于以下患者信息，提供初步诊断建议：
姓名: ${patientInfo.name}
年龄: ${patientInfo.age}
主诉: ${patientInfo.chiefComplaint}
`;
  
  const diagnosisResponse = await aiService.processMessage({
    role: 'user',
    content: diagnosisPrompt,
    timestamp: Date.now()
  }, {
    systemPrompt: '你是一个医疗诊断助手，提供专业的诊断建议。'
  });
  
  // 3. 生成检查建议
  const examPrompt = `基于诊断建议，推荐必要的检查项目：
${diagnosisResponse.content}
`;
  
  const examResponse = await aiService.processMessage({
    role: 'user',
    content: examPrompt,
    timestamp: Date.now()
  });
  
  // 4. 生成用药建议
  const medicationPrompt = `基于诊断和检查，推荐适当的用药方案：
诊断: ${diagnosisResponse.content}
检查: ${examResponse.content}
`;
  
  const medicationResponse = await aiService.processMessage({
    role: 'user',
    content: medicationPrompt,
    timestamp: Date.now()
  });
  
  return {
    patient: patientInfo,
    diagnosis: diagnosisResponse.content,
    examinations: examResponse.content,
    medications: medicationResponse.content
  };
}
```

---

## 5. Bisheng智能体使用

### 5.1 基本工作流调用

```typescript
import { BishengService } from './services/bisheng';

const bishengService = new BishengService({
  enabled: true,
  baseUrl: 'http://localhost:7860',
  frontendUrl: 'http://localhost:3001',
  username: 'admin',
  password: 'password',
  mode: 'api',
  autoLogin: true
}, logger);

async function callWorkflow() {
  await bishengService.initialize();
  
  // 登录
  if (!bishengService.isAuthenticated()) {
    await bishengService.login('admin', 'password');
  }
  
  // 获取工作流列表
  const workflows = await bishengService.getWorkflows(10, 1);
  console.log('可用工作流:', workflows.map(w => w.name));
  
  // 调用工作流
  const workflowId = workflows[0].id;
  const stream = await bishengService.invokeWorkflow(
    workflowId,
    { user_input: '你好，请介绍一下自己' },
    true
  );
  
  // 处理流式响应
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let sessionId = '';
  let messageId = '';
  let answer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.session_id) sessionId = data.session_id;
          if (data.data?.message_id) messageId = data.data.message_id;
          if (data.data?.output_schema?.message) {
            const msg = data.data.output_schema.message;
            answer += Array.isArray(msg) ? msg.join(' ') : msg;
            console.log('收到:', msg);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }
  
  console.log('完整回复:', answer);
  console.log('会话ID:', sessionId);
  console.log('消息ID:', messageId);
  
  return { sessionId, messageId, answer };
}
```

### 5.2 继续对话

```typescript
async function continueConversation(sessionId: string, messageId: string, inputNodeId: string) {
  const stream = await bishengService.invokeWorkflow(
    workflowId,
    { user_input: '请详细解释一下' },
    true,
    sessionId,
    messageId,
    inputNodeId
  );
  
  // 处理响应...
}
```

### 5.3 连接测试

```typescript
async function testBishengConnection() {
  const result = await bishengService.runConnectionTests();
  
  console.log('=== Bisheng连接测试 ===');
  console.log(`总体结果: ${result.overall ? '✅ 成功' : '❌ 失败'}`);
  console.log('\n详细信息:');
  result.details.forEach(detail => console.log(detail));
  
  return result.overall;
}
```

---

## 6. 桌面识别和OCR

### 6.1 屏幕捕获和OCR

```typescript
import { DesktopRecognitionService } from './services/desktop-recognition';

const desktopService = new DesktopRecognitionService({
  enabled: true,
  ocrEnabled: true,
  autoAnalyze: true,
  ocrLanguages: ['chi_sim', 'eng']
}, logger);

async function captureAndRecognize() {
  await desktopService.initialize();
  
  // 捕获屏幕
  const capture = await desktopService.captureScreen({
    includeOCR: true
  });
  
  if (capture.ocrResult) {
    console.log('识别文本:', capture.ocrResult.text);
    console.log('置信度:', capture.ocrResult.confidence);
    
    // 显示单词级别结果
    capture.ocrResult.words.forEach(word => {
      console.log(`  ${word.text} (${word.confidence.toFixed(2)})`);
    });
  }
  
  return capture;
}
```

### 6.2 智能桌面分析

```typescript
async function analyzeDesktop() {
  const { capture, analysis } = await desktopService.captureAndAnalyze({
    analysisPrompt: '分析这个界面上的内容，并提供操作建议'
  });
  
  console.log('屏幕内容分析:');
  console.log('摘要:', analysis.summary);
  console.log('识别元素:', analysis.elements);
  console.log('建议操作:', analysis.suggestions);
}
```

---

## 7. 完整应用场景

### 7.1 智能医疗助手完整流程

```typescript
class MedicalAssistant {
  private aiService: AIService;
  private screenshotService: ScreenshotService;
  private patientExtractor: PatientInfoExtractor;
  private medicalService: MedicalIntegrationService;
  
  async processPatientCase() {
    // 1. 截取患者信息
    console.log('📸 正在截取屏幕...');
    const screenshot = await this.screenshotService.captureScreen({
      quality: 90
    });
    
    // 2. OCR识别
    console.log('🔍 正在识别文本...');
    const ocrResult = await performOCR(screenshot.dataUrl);
    
    // 3. 提取患者信息
    console.log('🤖 正在提取患者信息...');
    const patientInfo = await this.patientExtractor.extractFromOCR(ocrResult);
    console.log(`✅ 患者: ${patientInfo.name}, ${patientInfo.age}岁`);
    
    // 4. 搜索历史记录
    console.log('📋 正在查询历史记录...');
    const history = await this.medicalService.searchPatients(
      patientInfo.name,
      { limit: 1 }
    );
    
    // 5. 生成诊断建议
    console.log('💡 正在生成诊断建议...');
    const diagnosisPrompt = `
患者信息:
- 姓名: ${patientInfo.name}
- 年龄: ${patientInfo.age}
- 主诉: ${patientInfo.chiefComplaint}
${history.length > 0 ? `- 病史: ${JSON.stringify(history[0])}` : ''}

请提供初步诊断建议:
`;
    
    const diagnosis = await this.aiService.processMessage({
      role: 'user',
      content: diagnosisPrompt,
      timestamp: Date.now()
    }, {
      systemPrompt: '你是一个专业的医疗诊断助手。'
    });
    
    // 6. 生成检查建议
    console.log('🔬 正在生成检查建议...');
    const examinations = await this.aiService.processMessage({
      role: 'user',
      content: `基于以下诊断，推荐必要的检查项目:\n${diagnosis.content}`,
      timestamp: Date.now()
    });
    
    // 7. 生成用药建议
    console.log('💊 正在生成用药建议...');
    const medications = await this.aiService.processMessage({
      role: 'user',
      content: `基于诊断和检查结果，推荐用药方案:\n诊断: ${diagnosis.content}\n检查: ${examinations.content}`,
      timestamp: Date.now()
    });
    
    // 8. 整理结果
    const result = {
      patient: patientInfo,
      screenshot: screenshot.dataUrl,
      diagnosis: diagnosis.content,
      examinations: examinations.content,
      medications: medications.content,
      timestamp: new Date()
    };
    
    console.log('✨ 完成！');
    return result;
  }
}

// 使用
const assistant = new MedicalAssistant();
const result = await assistant.processPatientCase();
console.log(JSON.stringify(result, null, 2));
```

---

## 8. 调试和故障排除

### 8.1 启用详细日志

```typescript
const logger = new Logger({
  level: LogLevel.DEBUG,
  enableConsole: true,
  enableFile: true,
  format: 'json'
});

// 监听日志事件
logger.on('log', (entry) => {
  if (entry.level >= LogLevel.ERROR) {
    // 发送错误报告
    sendErrorReport(entry);
  }
});
```

### 8.2 服务健康检查

```typescript
async function healthCheck() {
  const services = {
    ai: aiService.getState(),
    voice: voiceManager.getCurrentModel(),
    medical: medicalService.getState(),
    bisheng: bishengService.getProxyStatus()
  };
  
  console.log('=== 服务健康检查 ===');
  console.log('AI:', services.ai.state);
  console.log('语音:', services.voice);
  console.log('医疗:', services.medical.state);
  console.log('Bisheng:', services.bisheng.running ? '运行中' : '未运行');
  
  return services;
}
```

### 8.3 错误处理示例

```typescript
async function safeExecute<T>(
  operation: () => Promise<T>,
  fallback: T,
  retries: number = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      logger.warn(`操作失败 (${i + 1}/${retries}):`, error);
      
      if (i === retries - 1) {
        logger.error('所有重试失败，返回fallback值');
        return fallback;
      }
      
      // 指数退避
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
  
  return fallback;
}

// 使用
const result = await safeExecute(
  () => aiService.processMessage(message),
  { content: '服务暂时不可用', timestamp: Date.now() },
  3
);
```

---

**文档版本**: 1.0.0  
**更新日期**: 2025-10-10

更多示例和最佳实践将持续更新。
