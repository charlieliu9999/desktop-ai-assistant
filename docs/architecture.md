# 技术架构设计

## 1. 系统架构概览

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Desktop AI Assistant                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   UI Layer      │  │  Service Layer  │  │  Data Layer     │ │
│  │  (Renderer)     │  │   (Main Process)│  │   (Storage)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    System Integration                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  macOS APIs     │  │  Medical APIs   │  │   AI Services   │ │
│  │ (Accessibility) │  │ (RIS/PACS/HIS)  │  │ (OpenAI/Local)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 架构原则

#### 1.2.1 分层架构
- **表现层 (Presentation Layer)**: React UI组件
- **业务逻辑层 (Business Logic Layer)**: 核心服务和业务规则
- **数据访问层 (Data Access Layer)**: 数据存储和外部API集成
- **基础设施层 (Infrastructure Layer)**: 系统服务和工具

#### 1.2.2 模块化设计
- 高内聚、低耦合
- 插件化架构支持功能扩展
- 清晰的模块边界和接口定义

#### 1.2.3 安全优先
- 本地优先处理敏感数据
- 最小权限原则
- 数据加密和安全传输

## 2. 核心模块设计

### 2.1 主进程架构 (Main Process)

```typescript
// 主进程核心模块结构
src/main/
├── app.ts                 // 应用入口和生命周期管理
├── window-manager.ts      // 窗口管理器
├── services/
│   ├── desktop-recognition/   // 桌面识别服务
│   │   ├── ocr-service.ts
│   │   ├── window-service.ts
│   │   └── clipboard-service.ts
│   ├── voice/                // 语音处理服务
│   │   ├── wake-word-service.ts
│   │   ├── speech-recognition.ts
│   │   └── text-to-speech.ts
│   ├── ai/                   // AI服务集成
│   │   ├── llm-service.ts
│   │   ├── intent-parser.ts
│   │   └── context-analyzer.ts
│   ├── medical/              // 医疗系统集成
│   │   ├── ris-connector.ts
│   │   ├── pacs-connector.ts
│   │   └── medical-api.ts
│   └── security/             // 安全服务
│       ├── encryption.ts
│       ├── audit-logger.ts
│       └── permission-manager.ts
├── ipc/                   // 进程间通信
│   ├── handlers/
│   └── events.ts
└── utils/
    ├── config-manager.ts
    └── logger.ts
```

### 2.2 渲染进程架构 (Renderer Process)

```typescript
// 渲染进程UI架构
src/renderer/
├── App.tsx               // 应用根组件
├── components/           // UI组件
│   ├── common/          // 通用组件
│   │   ├── FloatingWidget.tsx
│   │   ├── SuggestionCard.tsx
│   │   └── VoiceIndicator.tsx
│   ├── medical/         // 医疗相关组件
│   │   ├── PatientInfo.tsx
│   │   ├── ImageViewer.tsx
│   │   └── ReportEditor.tsx
│   └── settings/        // 设置组件
│       ├── GeneralSettings.tsx
│       ├── VoiceSettings.tsx
│       └── PrivacySettings.tsx
├── hooks/               // React Hooks
│   ├── useVoiceRecognition.ts
│   ├── useDesktopContext.ts
│   └── useMedicalData.ts
├── services/            // 前端服务
│   ├── ipc-service.ts
│   ├── state-manager.ts
│   └── notification-service.ts
├── styles/              // 样式文件
│   ├── globals.css
│   └── components/
└── utils/
    ├── helpers.ts
    └── constants.ts
```

### 2.3 桌面识别模块详细设计

#### 2.3.1 OCR服务架构

```typescript
interface OCRService {
  // 全屏OCR识别
  recognizeFullScreen(): Promise<OCRResult[]>;
  
  // 区域OCR识别
  recognizeRegion(region: Rectangle): Promise<OCRResult[]>;
  
  // 医疗术语优化识别
  recognizeMedicalText(image: Buffer): Promise<MedicalOCRResult>;
  
  // 实时OCR监控
  startRealtimeRecognition(callback: (result: OCRResult) => void): void;
}

interface OCRResult {
  text: string;
  confidence: number;
  boundingBox: Rectangle;
  language: string;
  medicalEntities?: MedicalEntity[];
}

interface MedicalEntity {
  type: 'patient_id' | 'study_id' | 'accession_number' | 'diagnosis';
  value: string;
  confidence: number;
}
```

#### 2.3.2 窗口信息服务

```typescript
interface WindowService {
  // 获取当前活动窗口信息
  getActiveWindow(): Promise<WindowInfo>;
  
  // 监控窗口变化
  onWindowChange(callback: (window: WindowInfo) => void): void;
  
  // 获取窗口可访问性信息
  getAccessibilityInfo(windowId: string): Promise<AccessibilityNode[]>;
  
  // 检测医疗应用
  detectMedicalApplication(window: WindowInfo): MedicalAppType | null;
}

interface WindowInfo {
  id: string;
  title: string;
  applicationName: string;
  url?: string;  // 浏览器窗口
  bounds: Rectangle;
  isVisible: boolean;
  processId: number;
}
```

### 2.4 语音处理模块设计

#### 2.4.1 语音唤醒服务

```typescript
interface WakeWordService {
  // 启动唤醒词检测
  startListening(wakeWords: string[]): Promise<void>;
  
  // 停止检测
  stopListening(): void;
  
  // 设置唤醒回调
  onWakeWordDetected(callback: (wakeWord: string) => void): void;
  
  // 配置检测参数
  configure(config: WakeWordConfig): void;
}

interface WakeWordConfig {
  sensitivity: number;      // 灵敏度 0-1
  noiseThreshold: number;   // 噪音阈值
  customModels?: string[];  // 自定义模型路径
}
```

#### 2.4.2 语音识别服务

```typescript
interface SpeechRecognitionService {
  // 开始语音识别
  startRecognition(config?: RecognitionConfig): Promise<void>;
  
  // 停止识别
  stopRecognition(): Promise<string>;
  
  // 实时识别结果
  onPartialResult(callback: (text: string) => void): void;
  
  // 最终识别结果
  onFinalResult(callback: (text: string, confidence: number) => void): void;
}

interface RecognitionConfig {
  language: 'zh-CN' | 'en-US';
  medicalTermsEnabled: boolean;
  continuousMode: boolean;
  maxDuration: number;
}
```

### 2.5 AI服务集成模块

#### 2.5.1 大语言模型服务

```typescript
interface LLMService {
  // 发送聊天请求
  chat(messages: ChatMessage[], context?: ContextInfo): Promise<ChatResponse>;
  
  // 意图识别
  parseIntent(text: string, context: ContextInfo): Promise<Intent>;
  
  // 生成建议
  generateSuggestions(context: ContextInfo): Promise<Suggestion[]>;
  
  // 医疗知识问答
  medicalQA(question: string, patientContext?: PatientInfo): Promise<MedicalAnswer>;
}

interface ContextInfo {
  currentWindow: WindowInfo;
  ocrResults: OCRResult[];
  clipboardContent: string;
  userProfile: UserProfile;
  medicalContext?: MedicalContext;
}

interface Intent {
  type: 'query' | 'action' | 'navigation' | 'help';
  entity: string;
  parameters: Record<string, any>;
  confidence: number;
}
```

### 2.6 医疗系统集成模块

#### 2.6.1 医疗API连接器

```typescript
interface MedicalAPIConnector {
  // 患者信息查询
  getPatientInfo(patientId: string): Promise<PatientInfo>;
  
  // 检查信息查询
  getStudyInfo(studyId: string): Promise<StudyInfo>;
  
  // 报告查询
  getReports(patientId: string, dateRange?: DateRange): Promise<Report[]>;
  
  // 工作列表获取
  getWorklist(filters?: WorklistFilter): Promise<WorklistItem[]>;
}

// Medical Integration System API接口
interface MISConnector extends MedicalAPIConnector {
  // WebSocket连接
  connect(): Promise<void>;
  
  // 实时事件监听
  onEvent(eventType: string, callback: (data: any) => void): void;
  
  // 发送上下文快照
  sendContextSnapshot(snapshot: ContextSnapshot): Promise<Suggestion[]>;
}
```

## 3. 数据流设计

### 3.1 核心数据流

```
用户操作/语音输入
        ↓
   输入处理模块
        ↓
   上下文分析器
        ↓
    AI意图解析
        ↓
   业务逻辑处理
        ↓
  医疗系统API调用
        ↓
   结果聚合处理
        ↓
    UI更新/语音反馈
```

### 3.2 实时数据同步

```typescript
// 实时数据同步架构
class DataSyncManager {
  private wsConnection: WebSocket;
  private eventBus: EventEmitter;
  
  // 建立WebSocket连接到Medical Integration System
  async connectToMIS(): Promise<void> {
    this.wsConnection = new WebSocket(MIS_WEBSOCKET_URL);
    this.setupEventHandlers();
  }
  
  // 发送上下文快照
  async sendContextSnapshot(snapshot: ContextSnapshot): Promise<void> {
    const message = {
      type: 'context_update',
      data: snapshot,
      timestamp: Date.now()
    };
    this.wsConnection.send(JSON.stringify(message));
  }
  
  // 接收建议和动作
  private handleIncomingMessage(message: any): void {
    switch (message.type) {
      case 'suggestions':
        this.eventBus.emit('suggestions_received', message.data);
        break;
      case 'action_request':
        this.eventBus.emit('action_requested', message.data);
        break;
    }
  }
}
```

## 4. 安全架构设计

### 4.1 数据安全策略

#### 4.1.1 本地优先处理
```typescript
class SecurityManager {
  // 敏感数据检测
  detectSensitiveData(text: string): SensitiveDataInfo {
    const patterns = {
      patientId: /\b\d{8,12}\b/,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/,
      medicalRecord: /\bMR\d+\b/i
    };
    
    // 检测逻辑
    return {
      hasSensitiveData: boolean,
      dataTypes: string[],
      maskedText: string
    };
  }
  
  // 数据脱敏
  anonymizeData(data: any): any {
    // 脱敏处理逻辑
    return anonymizedData;
  }
  
  // 本地加密存储
  encryptLocalData(data: any): string {
    return AES.encrypt(JSON.stringify(data), this.getLocalKey()).toString();
  }
}
```

#### 4.1.2 权限控制
```typescript
interface PermissionManager {
  // 检查功能权限
  checkPermission(userId: string, feature: string): boolean;
  
  // 检查数据访问权限
  checkDataAccess(userId: string, dataType: string, patientId?: string): boolean;
  
  // 记录访问日志
  logAccess(userId: string, action: string, resource: string): void;
}
```

### 4.2 通信安全

```typescript
// API通信加密
class SecureAPIClient {
  private apiKey: string;
  private encryptionKey: string;
  
  async makeSecureRequest(endpoint: string, data: any): Promise<any> {
    // 1. 数据加密
    const encryptedData = this.encryptData(data);
    
    // 2. 签名验证
    const signature = this.generateSignature(encryptedData);
    
    // 3. HTTPS请求
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Signature': signature,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(encryptedData)
    });
    
    // 4. 响应解密
    return this.decryptResponse(await response.json());
  }
}
```

## 5. 性能优化设计

### 5.1 内存管理

```typescript
class MemoryManager {
  private cache: Map<string, CacheItem> = new Map();
  private maxCacheSize: number = 100 * 1024 * 1024; // 100MB
  
  // 智能缓存管理
  set(key: string, value: any, ttl: number = 300000): void {
    // LRU缓存实现
    if (this.getCurrentCacheSize() > this.maxCacheSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0
    });
  }
  
  // 内存清理
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}
```

### 5.2 异步处理优化

```typescript
class TaskScheduler {
  private taskQueue: PriorityQueue<Task> = new PriorityQueue();
  private workerPool: Worker[] = [];
  
  // 任务优先级调度
  scheduleTask(task: Task): Promise<any> {
    return new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
      this.taskQueue.enqueue(task);
      this.processNextTask();
    });
  }
  
  // 并发控制
  private async processNextTask(): Promise<void> {
    if (this.taskQueue.isEmpty() || this.getAvailableWorkers().length === 0) {
      return;
    }
    
    const task = this.taskQueue.dequeue();
    const worker = this.getAvailableWorkers()[0];
    
    try {
      const result = await this.executeTask(task, worker);
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    }
  }
}
```

## 6. 部署架构

### 6.1 应用打包结构

```
Desktop AI Assistant.app/
├── Contents/
│   ├── Info.plist
│   ├── MacOS/
│   │   └── Desktop AI Assistant
│   ├── Resources/
│   │   ├── app.asar              # 应用代码
│   │   ├── models/               # AI模型文件
│   │   │   ├── wake-word.model
│   │   │   ├── ocr.model
│   │   │   └── medical-terms.dict
│   │   ├── assets/               # 静态资源
│   │   └── locales/              # 多语言文件
│   └── Frameworks/               # 依赖库
```

### 6.2 配置管理

```typescript
interface AppConfig {
  // 应用配置
  app: {
    version: string;
    environment: 'development' | 'production';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  
  // 医疗系统配置
  medical: {
    misApiUrl: string;
    misWebSocketUrl: string;
    risApiUrl?: string;
    pacsApiUrl?: string;
  };
  
  // AI服务配置
  ai: {
    openaiApiKey?: string;
    localModelsPath: string;
    enableLocalProcessing: boolean;
  };
  
  // 语音配置
  voice: {
    wakeWords: string[];
    language: string;
    sensitivity: number;
  };
  
  // 安全配置
  security: {
    encryptionEnabled: boolean;
    auditLogEnabled: boolean;
    dataRetentionDays: number;
  };
}
```

## 7. 监控和日志

### 7.1 应用监控

```typescript
class ApplicationMonitor {
  private metrics: Map<string, Metric> = new Map();
  
  // 性能指标收集
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      tags: tags || {}
    };
    
    this.metrics.set(`${name}_${Date.now()}`, metric);
    this.checkThresholds(metric);
  }
  
  // 健康检查
  async healthCheck(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      checks: {
        memory: this.checkMemoryUsage(),
        cpu: this.checkCPUUsage(),
        disk: this.checkDiskSpace(),
        network: await this.checkNetworkConnectivity()
      }
    };
  }
}
```

### 7.2 错误处理和恢复

```typescript
class ErrorHandler {
  // 全局错误处理
  handleError(error: Error, context: ErrorContext): void {
    // 1. 记录错误日志
    this.logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      context
    });
    
    // 2. 错误分类和处理
    switch (this.classifyError(error)) {
      case 'network':
        this.handleNetworkError(error);
        break;
      case 'permission':
        this.handlePermissionError(error);
        break;
      case 'critical':
        this.handleCriticalError(error);
        break;
    }
    
    // 3. 用户通知
    this.notifyUser(error, context);
  }
  
  // 自动恢复机制
  async attemptRecovery(error: Error): Promise<boolean> {
    const recoveryStrategies = this.getRecoveryStrategies(error);
    
    for (const strategy of recoveryStrategies) {
      try {
        await strategy.execute();
        return true;
      } catch (recoveryError) {
        this.logger.warn('Recovery attempt failed', { strategy: strategy.name, error: recoveryError });
      }
    }
    
    return false;
  }
}
```

## 8. 扩展性设计

### 8.1 插件架构

```typescript
interface Plugin {
  name: string;
  version: string;
  description: string;
  
  // 插件生命周期
  initialize(context: PluginContext): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  
  // 插件能力
  getCapabilities(): PluginCapability[];
  handleIntent(intent: Intent): Promise<PluginResponse>;
}

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  
  // 加载插件
  async loadPlugin(pluginPath: string): Promise<void> {
    const plugin = await import(pluginPath);
    await plugin.initialize(this.createPluginContext());
    this.plugins.set(plugin.name, plugin);
  }
  
  // 插件通信
  async routeIntent(intent: Intent): Promise<PluginResponse[]> {
    const responses: PluginResponse[] = [];
    
    for (const plugin of this.plugins.values()) {
      if (plugin.canHandle(intent)) {
        const response = await plugin.handleIntent(intent);
        responses.push(response);
      }
    }
    
    return responses;
  }
}
```

---

**文档版本**: v1.0  
**最后更新**: 2024年1月  
**审核状态**: 待审核  
**相关文档**: [功能需求说明](requirements.md), [开发里程碑计划](roadmap.md)