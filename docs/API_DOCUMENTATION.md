# 桌面AI助手 - 完整API文档

> 版本: 1.0.0  
> 更新时间: 2025-10-10

本文档提供桌面AI助手所有公共API、服务、组件和函数的详细说明。

---

## 目录

- [1. 服务层 API](#1-服务层-api)
  - [1.1 AI服务 (AIService)](#11-ai服务-aiservice)
  - [1.2 语音识别服务 (VoiceRecognitionManager)](#12-语音识别服务-voicerecognitionmanager)
  - [1.3 截图服务 (ScreenshotService)](#13-截图服务-screenshotservice)
  - [1.4 Bisheng智能体服务 (BishengService)](#14-bisheng智能体服务-bishengservice)
  - [1.5 医疗集成服务 (MedicalIntegrationService)](#15-医疗集成服务-medicalintegrationservice)
  - [1.6 网络搜索服务 (WebSearchService)](#16-网络搜索服务-websearchservice)
  - [1.7 桌面识别服务 (DesktopRecognitionService)](#17-桌面识别服务-desktoprecognitionservice)
  - [1.8 患者信息提取服务 (PatientInfoExtractor)](#18-患者信息提取服务-patientinfoextractor)
- [2. Electron API (Preload)](#2-electron-api-preload)
  - [2.1 窗口控制 API](#21-窗口控制-api)
  - [2.2 应用状态 API](#22-应用状态-api)
  - [2.3 配置管理 API](#23-配置管理-api)
  - [2.4 语音服务 API](#24-语音服务-api)
  - [2.5 AI服务 API](#25-ai服务-api)
  - [2.6 医疗集成 API](#26-医疗集成-api)
  - [2.7 截图 API](#27-截图-api)
  - [2.8 Bisheng API](#28-bisheng-api)
- [3. React 组件](#3-react-组件)
- [4. 工具函数](#4-工具函数)
  - [4.1 Logger (日志记录器)](#41-logger-日志记录器)
- [5. 状态管理 (Stores)](#5-状态管理-stores)
  - [5.1 ChatStore (聊天状态)](#51-chatstore-聊天状态)
- [6. 类型定义](#6-类型定义)

---

## 1. 服务层 API

### 1.1 AI服务 (AIService)

AI服务提供与多个AI提供商（OpenAI、Claude、Gemini、本地模型）的集成，支持聊天、流式响应和工具调用。

#### 类: `AIService`

**构造函数**

```typescript
constructor(config: AIConfig, logger: Logger)
```

- **参数**:
  - `config`: AI配置对象
  - `logger`: 日志记录器实例

**主要方法**

##### `initialize(): Promise<void>`

初始化AI服务，验证API密钥并测试连接。

```typescript
await aiService.initialize();
```

##### `processMessage(message: AIMessage, options?): Promise<AIResponse>`

处理单条消息并返回AI响应。

**参数**:
- `message`: AI消息对象
  ```typescript
  {
    role: 'user' | 'assistant' | 'system',
    content: string,
    timestamp: number
  }
  ```
- `options` (可选):
  - `skipHistory?: boolean` - 是否跳过历史记录
  - `systemPrompt?: string` - 自定义系统提示
  - `onChunk?: (chunk: string) => void` - 流式响应回调

**返回**: `Promise<AIResponse>`
```typescript
{
  content: string,
  provider: string,
  model: string,
  usage: {
    promptTokens: number,
    completionTokens: number,
    totalTokens: number
  },
  timestamp: number
}
```

**示例**:
```typescript
const message = {
  role: 'user',
  content: '你好，请介绍一下这个应用',
  timestamp: Date.now()
};

const response = await aiService.processMessage(message);
console.log(response.content);
```

##### `processMessageStream(message: AIMessage, onChunk, options?): Promise<AIResponse>`

处理消息并通过流式方式返回响应。

**参数**:
- `message`: AI消息对象
- `onChunk`: 流式数据回调函数 `(chunk: string) => void`
- `options`: 同 `processMessage`

**示例**:
```typescript
const response = await aiService.processMessageStream(
  message,
  (chunk) => console.log(chunk), // 实时接收每个数据块
  { systemPrompt: '你是一个医疗助手' }
);
```

##### `processMessageWithTools(message: AIMessage, options?): Promise<AIResponse>`

处理带工具调用的消息（如网络搜索）。

##### `searchWeb(query: string, maxResults?: number): Promise<any>`

直接执行网络搜索。

**参数**:
- `query`: 搜索查询字符串
- `maxResults`: 最大结果数（默认5）

**返回**: 搜索结果数组

##### `analyzeDesktopContent(content: string, context?: string): Promise<AIResponse>`

分析桌面内容并提供建议。

**参数**:
- `content`: 桌面内容文本
- `context`: 上下文信息（可选）

##### `generateSummary(text: string, maxLength?: number): Promise<string>`

生成文本摘要。

**参数**:
- `text`: 要摘要的文本
- `maxLength`: 最大摘要长度（默认200字符）

##### `clearHistory(): void`

清除对话历史记录。

##### `getHistory(): AIMessage[]`

获取当前对话历史。

##### `updateConfig(config: Partial<AIConfig>): Promise<void>`

更新AI服务配置。

##### `getState(): AIState`

获取当前AI服务状态。

**返回**:
```typescript
{
  enabled: boolean,
  state: 'idle' | 'processing' | 'error',
  provider: string,
  model: string,
  historyLength: number,
  queueLength: number,
  config: AIConfig
}
```

**事件**

AIService 继承自 EventEmitter，支持以下事件：

- `processing-start`: 开始处理消息
- `processing-end`: 处理完成
- `processing-error`: 处理错误，参数: `(error: Error)`
- `response-received`: 接收到响应，参数: `(response: AIResponse)`
- `state-change`: 状态变化，参数: `(state: AIState)`

**示例**:
```typescript
aiService.on('response-received', (response) => {
  console.log('收到AI响应:', response.content);
});

aiService.on('processing-error', (error) => {
  console.error('AI处理错误:', error);
});
```

---

### 1.2 语音识别服务 (VoiceRecognitionManager)

语音识别管理器支持多种识别引擎：浏览器原生、Whisper、FunASR。

#### 类: `VoiceRecognitionManager`

**构造函数**

```typescript
constructor(config: VoiceConfig, logger: Logger)
```

**主要方法**

##### `initialize(): Promise<void>`

初始化所有可用的语音识别服务。

```typescript
await voiceManager.initialize();
```

##### `setCurrentModel(model: VoiceRecognitionModel): Promise<void>`

切换当前使用的语音识别模型。

**参数**:
- `model`: `'browser' | 'whisper' | 'funasr'`

**示例**:
```typescript
await voiceManager.setCurrentModel('whisper');
```

##### `startListening(): Promise<void>`

开始语音识别。

```typescript
await voiceManager.startListening();
```

##### `stopListening(): void`

停止语音识别。

##### `isListening(): boolean`

检查是否正在监听。

##### `getCurrentModel(): VoiceRecognitionModel`

获取当前使用的模型。

##### `getAvailableModels(): VoiceRecognitionModel[]`

获取所有可用的模型列表。

##### `testRecognition(model: VoiceRecognitionModel, audioData: ArrayBuffer): Promise<VoiceRecognitionTestResult>`

测试特定模型的识别性能。

**返回**:
```typescript
{
  model: VoiceRecognitionModel,
  success: boolean,
  accuracy: number,
  latency: number,
  text: string,
  confidence: number,
  error?: string,
  timestamp: number
}
```

##### `testAllModels(audioData: ArrayBuffer): Promise<VoiceRecognitionTestResult[]>`

测试所有可用模型。

**示例**:
```typescript
const audioBuffer = await getAudioBuffer(); // 获取音频数据
const results = await voiceManager.testAllModels(audioBuffer);

results.forEach(result => {
  console.log(`${result.model}: ${result.success ? '成功' : '失败'}`);
  console.log(`准确率: ${result.accuracy}, 延迟: ${result.latency}ms`);
});
```

**子服务类**

##### `BrowserVoiceRecognitionService`

浏览器原生语音识别服务。

##### `WhisperVoiceRecognitionService`

Whisper 模型语音识别服务。

##### `FunASRVoiceRecognitionService`

FunASR 模型语音识别服务。

---

### 1.3 截图服务 (ScreenshotService)

提供屏幕和窗口截图功能。

#### 类: `ScreenshotService`

**构造函数**

```typescript
constructor(logger: Logger)
```

**主要方法**

##### `captureScreen(options?: ScreenshotOptions): Promise<ScreenshotResult>`

捕获屏幕截图。

**参数**:
```typescript
interface ScreenshotOptions {
  quality?: number;        // 0-100
  includeCursor?: boolean; // 是否包含光标
  displayIndex?: number;   // 显示器索引
  noCache?: boolean;       // 跳过缓存
}
```

**返回**:
```typescript
interface ScreenshotResult {
  dataUrl: string;    // Base64编码的图像
  width: number;
  height: number;
  timestamp: number;
}
```

**示例**:
```typescript
const screenshot = await screenshotService.captureScreen({
  quality: 90,
  includeCursor: false,
  displayIndex: 0
});

console.log('截图大小:', screenshot.width, 'x', screenshot.height);
// 使用 dataUrl 显示图片
```

##### `captureWindow(windowTitle?: string): Promise<ScreenshotResult>`

捕获特定窗口的截图。

**参数**:
- `windowTitle`: 窗口标题（可选，未指定则捕获第一个窗口）

##### `checkPermissions(): Promise<boolean>`

检查屏幕录制权限（macOS）。

##### `getDisplays()`

获取所有可用显示器列表。

**返回**:
```typescript
Array<{
  id: number,
  index: number,
  label: string,
  bounds: { x, y, width, height },
  scaleFactor: number,
  isPrimary: boolean
}>
```

---

### 1.4 Bisheng智能体服务 (BishengService)

Bisheng平台集成，支持工作流调用和iframe嵌入。

#### 类: `BishengService`

**构造函数**

```typescript
constructor(config: BishengConfig, logger: Logger)
```

**主要方法**

##### `initialize(): Promise<void>`

初始化Bisheng服务，如果是iframe模式则启动代理服务器。

##### `login(username: string, password: string): Promise<{ token: string; expiry: number }>`

用户登录。

**示例**:
```typescript
const { token, expiry } = await bishengService.login('admin', 'password');
console.log('Token:', token);
```

##### `getWorkflows(pageSize?: number, pageNum?: number): Promise<BishengWorkflow[]>`

获取工作流列表。

**参数**:
- `pageSize`: 每页数量（默认10）
- `pageNum`: 页码（默认1）

**返回**:
```typescript
Array<{
  id: string,
  name: string,
  description?: string,
  status?: string,
  created_at?: string,
  updated_at?: string
}>
```

##### `invokeWorkflow(workflowId, input, stream?, sessionId?, messageId?, inputNodeId?): Promise<ReadableStream>`

调用工作流。

**参数**:
- `workflowId`: 工作流ID
- `input`: 输入数据对象
- `stream`: 是否使用流式响应（默认true）
- `sessionId`: 会话ID（继续对话时必需）
- `messageId`: 消息ID（继续对话时必需）
- `inputNodeId`: 输入节点ID（继续对话时必需）

**返回**: ReadableStream（Server-Sent Events流）

**示例**:
```typescript
// 首次调用
const stream = await bishengService.invokeWorkflow(
  'workflow-123',
  { user_input: '你好' },
  true
);

// 处理流式响应
const reader = stream.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  console.log('收到数据:', chunk);
}
```

##### `stopWorkflow(workflowId: string, sessionId: string): Promise<void>`

停止工作流执行。

##### `isAuthenticated(): boolean`

检查是否已认证。

##### `getConfig(): BishengConfig`

获取当前配置。

##### `updateConfig(config: Partial<BishengConfig>): void`

更新配置。

##### `getProxyStatus(): { running: boolean; port: number }`

获取代理服务器状态（iframe模式）。

##### `testWorkflowList(): Promise<{ success: boolean; data?: any }>`

测试工作流列表API。

##### `runConnectionTests(): Promise<{ overall: boolean; details: string[] }>`

运行完整的连接测试。

**示例**:
```typescript
const testResult = await bishengService.runConnectionTests();
console.log('连接测试结果:', testResult.overall ? '成功' : '失败');
testResult.details.forEach(detail => console.log(detail));
```

---

### 1.5 医疗集成服务 (MedicalIntegrationService)

医疗系统集成服务，提供患者搜索、记录查询等功能。

#### 类: `MedicalIntegrationService`

**构造函数**

```typescript
constructor(config: MedicalConfig, logger: Logger)
```

**主要方法**

##### `initialize(): Promise<void>`

初始化医疗集成服务，建立连接并启动健康检查。

##### `searchPatients(query, options?): Promise<MedicalSearchResult[]>`

搜索患者。

**参数**:
```typescript
{
  query: string,
  options?: {
    limit?: number,      // 最大结果数
    offset?: number,     // 偏移量
    filters?: Record<string, any>,
    useCache?: boolean   // 是否使用缓存
  }
}
```

**返回**:
```typescript
Array<{
  id: string,
  name: string,
  dateOfBirth: string,
  gender: string,
  mrn: string,         // 病历号
  phone?: string,
  email?: string,
  lastVisit?: string,
  status: string,
  relevanceScore: number,
  matchedFields: string[]
}>
```

**示例**:
```typescript
const results = await medicalService.searchPatients('张三', {
  limit: 10,
  filters: { department: '内科' }
});

results.forEach(patient => {
  console.log(`${patient.name} - ${patient.mrn}`);
});
```

##### `getPatientRecord(patientId: string, useCache?: boolean): Promise<PatientRecord>`

获取患者详细记录。

**返回**:
```typescript
{
  id: string,
  patientId: string,
  type: 'diagnosis' | 'treatment' | 'medication' | 'lab' | 'imaging',
  date: Date,
  provider: string,
  description: string,
  data: any,
  attachments?: string[]
}
```

##### `analyzeContent(content: string): Promise<any>`

分析医疗内容。

##### `searchStudies(query: string, options?: any): Promise<any>`

搜索医学研究。

##### `clearCache(): void`

清除缓存。

##### `getCacheStats()`

获取缓存统计信息。

**返回**:
```typescript
{
  searchCacheSize: number,
  patientCacheSize: number,
  totalCacheSize: number
}
```

##### `getState(): MedicalState`

获取服务状态。

**事件**

- `connection-established`: 连接建立
- `connection-lost`: 连接丢失
- `search-start`: 搜索开始
- `search-complete`: 搜索完成，参数: `(results: MedicalSearchResult[])`
- `search-error`: 搜索错误，参数: `(error: Error)`
- `patient-record-loaded`: 患者记录加载，参数: `(record: PatientRecord)`
- `state-change`: 状态变化，参数: `(state: MedicalState)`

---

### 1.6 网络搜索服务 (WebSearchService)

支持多种搜索提供商的网络搜索服务。

#### 类: `WebSearchService`

**构造函数**

```typescript
constructor(config: WebSearchConfig, logger: Logger)
```

**配置的提供商**:
- `google` - Google Custom Search
- `bing` - Bing Web Search API
- `duckduckgo` - DuckDuckGo (无需API Key)
- `serpapi` - SerpAPI
- `custom` - 自定义API

**主要方法**

##### `initialize(): Promise<void>`

初始化网络搜索服务。

##### `search(query, options?): Promise<WebSearchResponse>`

执行网络搜索。

**参数**:
```typescript
{
  query: string,
  options?: {
    maxResults?: number,
    language?: string,
    region?: string,
    safeSearch?: boolean
  }
}
```

**返回**:
```typescript
{
  success: boolean,
  results: Array<{
    title: string,
    url: string,
    snippet: string,
    publishedDate?: string,
    source?: string,
    relevanceScore?: number
  }>,
  totalResults: number,
  searchTime: number,
  provider: string,
  query: string,
  error?: string
}
```

**示例**:
```typescript
const searchResult = await webSearchService.search('人工智能', {
  maxResults: 5,
  language: 'zh-CN'
});

if (searchResult.success) {
  searchResult.results.forEach(result => {
    console.log(`${result.title}: ${result.url}`);
  });
}
```

##### `updateConfig(config: Partial<WebSearchConfig>): Promise<void>`

更新搜索配置。

##### `getState()`

获取服务状态。

---

### 1.7 桌面识别服务 (DesktopRecognitionService)

桌面内容识别服务，支持屏幕捕获和OCR。

#### 类: `DesktopRecognitionService`

**构造函数**

```typescript
constructor(config: DesktopRecognitionConfig, logger: Logger)
```

**主要方法**

##### `initialize(): Promise<void>`

初始化桌面识别服务，检查权限并启动监控。

##### `captureScreen(options?): Promise<ScreenCapture>`

捕获屏幕内容。

**参数**:
```typescript
{
  displayId?: string,
  region?: { x, y, width, height },
  includeOCR?: boolean  // 是否包含OCR识别
}
```

**返回**:
```typescript
{
  id: string,
  timestamp: Date,
  displayId?: string,
  bounds: { x, y, width, height },
  imageData: Buffer,
  format: 'png' | 'jpeg',
  ocrResult?: {
    text: string,
    confidence: number,
    words: Array<{ text, confidence, bounds }>,
    lines: Array<{ text, confidence, bounds }>
  }
}
```

**示例**:
```typescript
const capture = await desktopService.captureScreen({
  includeOCR: true
});

if (capture.ocrResult) {
  console.log('识别文本:', capture.ocrResult.text);
  console.log('置信度:', capture.ocrResult.confidence);
}
```

##### `captureAndAnalyze(options?): Promise<{ capture, analysis }>`

捕获并分析屏幕内容。

**参数**:
```typescript
{
  displayId?: string,
  region?: { x, y, width, height },
  analysisPrompt?: string
}
```

##### `getActiveWindow(): Promise<WindowInfo | null>`

获取当前活动窗口信息。

##### `getCaptureHistory(): ScreenCapture[]`

获取捕获历史记录。

##### `clearCaptureHistory(): void`

清除捕获历史。

##### `getAvailableDisplays(): Electron.Display[]`

获取可用显示器列表。

**事件**

- `capture-start`: 开始捕获
- `capture-complete`: 捕获完成，参数: `(capture: ScreenCapture)`
- `capture-error`: 捕获错误，参数: `(error: Error)`
- `ocr-complete`: OCR完成，参数: `(result: OCRResult)`
- `ocr-error`: OCR错误，参数: `(error: Error)`
- `analysis-complete`: 分析完成，参数: `(analysis: any)`
- `window-change`: 窗口切换，参数: `(windowInfo: WindowInfo)`
- `state-change`: 状态变化

---

### 1.8 患者信息提取服务 (PatientInfoExtractor)

从OCR文本或图像中提取患者信息。

#### 类: `PatientInfoExtractor`

**构造函数**

```typescript
constructor(config?: ExtractionConfig)
```

**配置**:
```typescript
{
  useAI?: boolean,          // 是否使用AI辅助提取
  aiApiUrl?: string,        // AI API地址
  aiApiKey?: string,        // AI API密钥
  minConfidence?: number    // 最小置信度阈值
}
```

**主要方法**

##### `extractFromOCR(ocrResult: OCRResult): Promise<PatientInfo>`

从OCR结果中提取患者信息。

**参数**:
```typescript
{
  text: string,
  confidence: number,
  bounds?: { x, y, width, height },
  words?: Array<...>,
  lines?: Array<...>
}
```

**返回**:
```typescript
{
  name: string,
  age?: number,
  gender?: '男' | '女' | '未知',
  patientId?: string,
  department?: string,
  chiefComplaint?: string,
  diagnosis?: string,
  medicalHistory?: string,
  confidence?: number
}
```

**示例**:
```typescript
const ocrResult = await performOCR(image);
const patientInfo = await extractor.extractFromOCR(ocrResult);

console.log('患者姓名:', patientInfo.name);
console.log('年龄:', patientInfo.age);
console.log('提取置信度:', patientInfo.confidence);
```

##### `validatePatientInfo(info: PatientInfo): { valid: boolean; errors: string[] }`

验证患者信息的有效性。

**示例**:
```typescript
const validation = extractor.validatePatientInfo(patientInfo);

if (!validation.valid) {
  console.error('验证失败:', validation.errors);
}
```

---

## 2. Electron API (Preload)

通过 `window.electronAPI` 访问的主进程功能。

### 2.1 窗口控制 API

```typescript
window.electronAPI.window
```

#### 方法

##### `minimize(): Promise<void>`

最小化窗口。

```typescript
await window.electronAPI.window.minimize();
```

##### `close(): Promise<void>`

关闭窗口。

##### `toggleAlwaysOnTop(): Promise<boolean>`

切换窗口置顶状态。

**返回**: 新的置顶状态

---

### 2.2 应用状态 API

```typescript
window.electronAPI.app
```

#### 方法

##### `getStatus(): Promise<AppStatus>`

获取应用状态。

**返回**: `'initializing' | 'ready' | 'error' | 'updating' | 'offline' | 'shutdown'`

##### `setVisibility(visible: boolean): Promise<void>`

设置应用可见性。

##### `reportError(error: any): Promise<void>`

报告错误。

#### 事件监听

##### `onStatusChange(callback: (status: AppStatus) => void): void`

监听状态变化。

```typescript
window.electronAPI.app.onStatusChange((status) => {
  console.log('应用状态:', status);
});
```

##### `removeStatusListener(callback): void`

移除状态监听器。

---

### 2.3 配置管理 API

```typescript
window.electronAPI.config
```

#### 方法

##### `get(path?: string): Promise<any>`

获取配置值。

```typescript
// 获取全部配置
const config = await window.electronAPI.config.get();

// 获取特定配置
const aiConfig = await window.electronAPI.config.get('ai');
```

##### `set(path: string, value: any): Promise<boolean>`

设置配置值。

```typescript
await window.electronAPI.config.set('ai.temperature', 0.7);
```

#### 事件监听

##### `onChange(callback: (path, value) => void): void`

监听配置变化。

```typescript
window.electronAPI.config.onChange((path, value) => {
  console.log(`配置 ${path} 已更新为:`, value);
});
```

---

### 2.4 语音服务 API

```typescript
window.electronAPI.voice
```

#### 方法

##### `startListening(): Promise<boolean>`

开始语音识别。

```typescript
const started = await window.electronAPI.voice.startListening();
```

##### `stopListening(): Promise<boolean>`

停止语音识别。

##### `speak(text: string): Promise<boolean>`

文字转语音。

```typescript
await window.electronAPI.voice.speak('你好，欢迎使用AI助手');
```

##### `testAllModels(audioData: ArrayBuffer): Promise<any>`

测试所有语音识别模型。

#### 事件监听

##### `onStateChange(callback: (state) => void): void`

监听语音状态变化。

##### `onRecognitionResult(callback: (result) => void): void`

监听识别结果。

```typescript
window.electronAPI.voice.onRecognitionResult((result) => {
  console.log('识别文本:', result.transcript);
  console.log('置信度:', result.confidence);
});
```

---

### 2.5 AI服务 API

```typescript
window.electronAPI.ai
```

#### 方法

##### `chat(messages: ChatMessage[]): Promise<any>`

发送聊天消息。

```typescript
const messages = [
  { role: 'user', content: '介绍一下量子计算', timestamp: Date.now() }
];

const response = await window.electronAPI.ai.chat(messages);
console.log(response.content);
```

##### `analyzeContent(request: AnalysisRequest): Promise<any>`

分析内容。

**参数**:
```typescript
{
  content: string,
  type?: 'text' | 'image' | 'mixed',
  context?: string
}
```

#### 事件监听

##### `onSuggestion(callback: (suggestion) => void): void`

监听AI建议。

---

### 2.6 医疗集成 API

```typescript
window.electronAPI.medical
```

#### 方法

##### `search(filters: SearchFilters): Promise<any>`

搜索医疗数据。

```typescript
const results = await window.electronAPI.medical.search({
  query: '张三',
  type: 'patient',
  limit: 10
});
```

##### `getPatient(id: string): Promise<any>`

获取患者信息。

##### `getStudy(id: string): Promise<any>`

获取研究信息。

#### 事件监听

##### `onDataUpdate(callback: (data) => void): void`

监听数据更新。

---

### 2.7 截图 API

```typescript
window.electronAPI.screenshot
```

#### 方法

##### `capture(options?): Promise<{ success, data?, error? }>`

捕获屏幕。

```typescript
const result = await window.electronAPI.screenshot.capture({
  quality: 90,
  displayIndex: 0
});

if (result.success) {
  // 使用 result.data
}
```

##### `captureWindow(windowTitle?: string): Promise<{ success, data?, error? }>`

捕获窗口。

##### `checkPermissions(): Promise<{ success, hasPermission }>`

检查权限。

##### `getDisplays(): Promise<{ success, displays }>`

获取显示器列表。

---

### 2.8 Bisheng API

```typescript
window.electronAPI.bisheng
```

#### 方法

##### `login(username, password): Promise<any>`

登录Bisheng。

```typescript
const result = await window.electronAPI.bisheng.login('admin', 'password');
```

##### `getWorkflows(pageSize?, pageNum?): Promise<any>`

获取工作流列表。

##### `invokeWorkflow(workflowId, input, stream?, ...): Promise<any>`

调用工作流。

```typescript
const stream = await window.electronAPI.bisheng.invokeWorkflow(
  'workflow-123',
  { user_input: '你好' },
  true
);
```

##### `isAuthenticated(): Promise<boolean>`

检查认证状态。

##### `runConnectionTests(): Promise<any>`

运行连接测试。

---

## 3. React 组件

### 主要组件概览

项目包含以下主要React组件：

#### 窗口组件
- `MainWindow` - 主窗口
- `FloatingWindow` - 浮动窗口
- `VoiceWindow` - 语音输入窗口

#### 功能组件
- `Chat` - 聊天界面
- `AgentChat` - 智能体聊天
- `VoiceInputWindow` - 语音输入
- `DesktopRecognition` - 桌面识别
- `SettingsPanel` - 设置面板
- `ModelConfigPanel` - 模型配置
- `BishengStatusIndicator` - Bisheng状态指示器

#### 医疗系统组件
- `MedicalSystem` - 医疗系统主界面
- `PatientInfoCapture` - 患者信息捕获
- `PatientInfoDisplay` - 患者信息显示
- `PatientRecords` - 患者记录
- `ExamRecommendations` - 检查推荐
- `ScreenshotPreview` - 截图预览
- `OneClickDesktopChat` - 一键桌面聊天

*详细的组件Props和使用方法请参考各组件源代码文件。*

---

## 4. 工具函数

### 4.1 Logger (日志记录器)

高性能日志记录器，支持文件、控制台和远程日志。

#### 类: `Logger`

**构造函数**

```typescript
constructor(config?: Partial<LoggerConfig>)
```

**配置选项**:
```typescript
{
  level: LogLevel,              // 日志级别
  enableConsole: boolean,       // 控制台输出
  enableFile: boolean,          // 文件输出
  enableRemote: boolean,        // 远程日志
  filePath?: string,            // 日志文件路径
  maxFileSize: number,          // 最大文件大小(MB)
  maxFiles: number,             // 最大文件数
  format: 'json' | 'text',      // 输出格式
  enablePerformance: boolean,   // 性能监控
  enableSensitiveDataMasking: boolean  // 敏感数据掩码
}
```

**日志方法**

##### `trace(message, data?, source?): void`
##### `debug(message, data?, source?): void`
##### `info(message, data?, source?): void`
##### `warn(message, data?, source?): void`
##### `error(message, data?, source?): void`
##### `fatal(message, data?, source?): void`

**示例**:
```typescript
import { Logger } from './utils/logger';

const logger = new Logger({
  level: LogLevel.DEBUG,
  enableFile: true
});

logger.info('应用已启动', { version: '1.0.0' });
logger.error('发生错误', { error: err.message });
```

**性能监控**

##### `time(operation: string): (success?, metadata?) => void`

性能计时器。

```typescript
const timer = logger.time('数据库查询');
// 执行操作
await performDatabaseQuery();
timer(true, { rows: 100 });
```

##### `withTiming<T>(operation, fn, metadata?): Promise<T>`

异步操作包装器。

```typescript
const result = await logger.withTiming(
  'API调用',
  async () => {
    return await fetchData();
  },
  { endpoint: '/api/users' }
);
```

**工具方法**

##### `getStats(): LogStats`

获取日志统计信息。

```typescript
const stats = logger.getStats();
console.log('总日志数:', stats.totalLogs);
console.log('错误率:', stats.errorRate);
console.log('运行时间:', stats.uptime);
```

##### `setLevel(level: LogLevel): void`

设置日志级别。

##### `cleanup(): Promise<void>`

清理资源。

---

## 5. 状态管理 (Stores)

### 5.1 ChatStore (聊天状态)

使用 Zustand 管理聊天消息状态。

```typescript
import { useChatStore } from './stores/chatStore';
```

**状态**:
```typescript
{
  messages: ChatMessage[]
}
```

**操作**:

##### `add(msg: ChatMessage): void`

添加消息。

```typescript
const { add } = useChatStore();

add({
  id: 'msg-1',
  type: 'user',
  content: '你好',
  timestamp: new Date()
});
```

##### `setAll(msgs: ChatMessage[]): void`

设置所有消息。

##### `clear(): void`

清空消息。

**使用示例**:
```typescript
function ChatComponent() {
  const { messages, add, clear } = useChatStore();
  
  const sendMessage = (content: string) => {
    add({
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    });
  };
  
  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <button onClick={clear}>清空</button>
    </div>
  );
}
```

---

## 6. 类型定义

详细的类型定义请参考 `src/shared/types.ts`。

### 主要类型

#### 配置类型
- `AppConfig` - 应用配置
- `AIConfig` - AI配置
- `VoiceConfig` - 语音配置
- `MedicalConfig` - 医疗配置
- `BishengConfig` - Bisheng配置
- `WebSearchConfig` - 网络搜索配置

#### 状态类型
- `AIState` - AI状态
- `VoiceState` - 语音状态
- `MedicalState` - 医疗状态
- `DesktopRecognitionState` - 桌面识别状态

#### 数据类型
- `Patient` - 患者信息
- `MedicalRecord` - 医疗记录
- `OCRResult` - OCR结果
- `ScreenCapture` - 屏幕捕获
- `BishengWorkflow` - Bisheng工作流

---

## 附录

### A. 错误处理

所有服务都实现了统一的错误处理机制：

```typescript
try {
  await service.someMethod();
} catch (error) {
  if (error instanceof ServiceError) {
    console.error('服务错误:', error.service, error.message);
  } else if (error instanceof NetworkError) {
    console.error('网络错误:', error.statusCode);
  } else {
    console.error('未知错误:', error);
  }
}
```

### B. 事件系统

大多数服务继承自 `EventEmitter`，支持事件监听：

```typescript
service.on('event-name', (data) => {
  // 处理事件
});

service.once('event-name', (data) => {
  // 只监听一次
});

service.removeListener('event-name', callback);
service.removeAllListeners('event-name');
```

### C. 性能优化

- 所有服务都实现了请求队列和速率限制
- 支持缓存机制减少重复请求
- 自动重试失败的请求
- 流式响应减少内存占用

### D. 安全性

- API密钥通过环境变量或配置文件管理
- 敏感数据自动掩码
- 支持数据加密存储
- 实现了完整的权限检查

---

**文档版本**: 1.0.0  
**最后更新**: 2025-10-10  
**维护者**: Desktop AI Assistant Team

如有问题或建议，请提交Issue或联系开发团队。
