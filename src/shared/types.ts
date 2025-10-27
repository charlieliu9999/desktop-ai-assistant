/**
 * 共享类型定义
 * 用于主进程和渲染进程之间的类型一致性
 */

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 应用状态
 */
export type AppStatus = 
  | 'initializing'  // 初始化中
  | 'ready'         // 就绪
  | 'error'         // 错误
  | 'updating'      // 更新中
  | 'offline'       // 离线
  | 'shutdown';     // 关闭中

/**
 * 窗口模式
 */
export type WindowMode = 
  | 'main'          // 主窗口
  | 'floating'      // 浮动窗口
  | 'voice';        // 语音输入窗口

/**
 * 主题类型
 */
export type ThemeType = 
  | 'light'         // 浅色主题
  | 'dark'          // 深色主题
  | 'auto'          // 自动跟随系统
  | 'glass';        // 玻璃主题（统一启用毛玻璃/透明）

/**
 * 语言类型
 */
export type LanguageType = 
  | 'zh-CN'         // 简体中文
  | 'zh-TW'         // 繁体中文
  | 'en-US'         // 英语
  | 'ja-JP'         // 日语
  | 'ko-KR';        // 韩语

/**
 * 日志级别
 */
export type LogLevel = 
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

// ============================================================================
// 配置相关类型
// ============================================================================

/**
 * 窗口配置
 */
export interface WindowConfig {
  width: number;
  height: number;
  x?: number;
  y?: number;
  alwaysOnTop?: boolean;
  resizable?: boolean;
  movable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  closable?: boolean;
  focusable?: boolean;
  skipTaskbar?: boolean;
  transparent?: boolean;
  opacity?: number;
  alignRight?: boolean;  // 是否靠右显示
  // 玻璃效果配置（可选）
  glassEffect?: {
    enabled: boolean;
    opacity?: number;     // 背景透明度 (0-1)
    blur?: number;        // 模糊半径 (px)
    saturation?: number;  // 饱和度 (%)
    tintColor?: string;   // 玻璃色彩遮罩（#RRGGBB）
    tintOpacity?: number; // 遮罩透明度 (0-1)
  } | undefined;
}

/**
 * 快捷键配置
 */
export interface ShortcutConfig {
  enabled: boolean;
  toggleMainWindow: string;
  toggleFloatingWindow: string;
  voiceInput: string;
  screenCapture: string;
  quickSearch: string;
  showSettings: string;
  quit: string;
}

/**
 * 快捷键动作
 */
export interface ShortcutAction {
  type: 'window' | 'voice' | 'ai' | 'app' | 'desktop';
  action: string;
  description: string;
  params?: any;
}

/**
 * 语音识别模型类型
 */
export type VoiceRecognitionModel = 'browser' | 'whisper' | 'funasr';

/**
 * Whisper 模型配置
 */
export interface WhisperConfig {
  model: 'tiny' | 'base' | 'small' | 'medium' | 'large' | 'large-v2' | 'large-v3';
  device: 'cpu' | 'cuda' | 'auto';
  computeType: 'int8' | 'int16' | 'float16' | 'float32';
  language: string;
  // 可选：若使用远端/本地HTTP服务进行识别
  apiUrl?: string;         // 例如: http://127.0.0.1:9000/transcribe
  apiKey?: string;
  temperature: number;
  beamSize: number;
  bestOf: number;
  patience: number;
  lengthPenalty: number;
  suppressTokens: string;
  initialPrompt: string;
  conditionOnPreviousText: boolean;
  fp16: boolean;
  compressionRatioThreshold: number;
  logProbThreshold: number;
  noSpeechThreshold: number;
}

/**
 * FunASR 模型配置
 */
export interface FunASRConfig {
  model: 'paraformer-zh' | 'paraformer-en' | 'conformer-zh' | 'conformer-en';
  modelRevision: string;
  device: 'cpu' | 'cuda' | 'auto';
  batchSize: number;
  language: string;
  hotwords: string[];
  useItn: boolean;
  usePunctuation: boolean;
  useTimestamp: boolean;
  maxLength: number;
  minLength: number;
  beamSize: number;
  temperature: number;
  // 可选：若使用远端/本地HTTP服务进行识别
  apiUrl?: string;         // 例如: http://127.0.0.1:10095/inference
  apiKey?: string;
}

/**
 * 语音识别测试结果
 */
export interface VoiceRecognitionTestResult {
  model: VoiceRecognitionModel;
  success: boolean;
  accuracy: number;
  latency: number;
  text: string;
  confidence: number;
  error?: string;
  timestamp: number;
}

/**
 * 语音配置
 */
export interface VoiceConfig {
  enabled: boolean;
  // 语音识别配置
  recognition: {
    enabled: boolean;
    model: VoiceRecognitionModel;
    language: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    hotwordEnabled: boolean;
    hotwords: string[];
    sensitivity: number;
    noiseReduction: boolean;
    echoCancellation: boolean;
    autoGainControl: boolean;
    sampleRate: number;
    channels: number;
    voiceActivityDetection: boolean;
    silenceTimeout: number;
    speechTimeout: number;
    // 模型特定配置
    whisper?: WhisperConfig;
    funasr?: FunASRConfig;
  };
  // 语音合成配置
  synthesis: {
    enabled: boolean;
    voice: string;
    rate: number;
    pitch: number;
    volume: number;
  };
}

/**
 * 网络搜索配置
 */
export interface WebSearchConfig {
  enabled: boolean;
  provider: 'google' | 'bing' | 'duckduckgo' | 'serpapi' | 'custom';
  apiKey?: string;
  apiUrl?: string;
  searchEngineId?: string; // Google Custom Search Engine ID
  maxResults: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimitRpm: number;
  safeSearch: boolean;
  language: string;
  region: string;
  customHeaders?: Record<string, string>;
  routingMode?: 'inherit' | 'frontend' | 'backend';
}

/**
 * 网络搜索结果
 */
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  source?: string;
  relevanceScore?: number;
}

/**
 * 网络搜索响应
 */
export interface WebSearchResponse {
  success: boolean;
  results: WebSearchResult[];
  totalResults: number;
  searchTime: number;
  provider: string;
  query: string;
  error?: string;
}

/**
 * AI配置
 */
export interface AIConfig {
  enabled: boolean;
  provider: 'openai' | 'claude' | 'gemini' | 'local';
  apiKey?: string;
  apiUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  maxHistory: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
  contextLength: number;
  streamResponse: boolean;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimitRpm: number;
  rateLimitTpm: number;
  // 后端模式专用（可选选择）
  backendProvider?: string;
  backendModel?: string;
  // 调用路由模式：frontend=前端直连模型；backend=转发到后端，由后端决定模型
  routingMode?: 'frontend' | 'backend';
  // 网络搜索配置
  webSearch?: WebSearchConfig;
  // 工具调用配置
  toolsEnabled?: boolean;
  availableTools?: string[];
}

/**
 * AI 图片识别配置
 */
export interface AIImageConfig {
  enabled: boolean;
  provider: 'openai' | 'claude' | 'gemini' | 'local';
  apiKey?: string;
  apiUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  contextLength: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimitRpm: number;
  rateLimitTpm: number;
  // 识别抽取模式：strict-严格JSON；freeform-自由文本
  extractionMode?: 'strict' | 'freeform';
  routingMode?: 'inherit' | 'frontend' | 'backend';
  backendProvider?: string;
  backendModel?: string;
}

/**
 * 推荐生成模型配置（按类型独立模型）
 */
export interface AIRecommendConfig {
  enabled: boolean;
  provider: 'openai' | 'claude' | 'gemini' | 'local';
  apiKey?: string;
  apiUrl?: string;
  temperature: number;
  maxTokens: number;
  diagnosisModel: string;
  diagnosisPrompt?: string;
  examModel: string;
  examPrompt?: string;
  medicationModel: string;
  medicationPrompt?: string;
  routingMode?: 'inherit' | 'frontend' | 'backend';
  backendProvider?: string;
  backendModel?: string;
}

/**
 * 一键流程配置
 */
export interface OneClickConfig {
  enabled: boolean;
  showScreenshot: boolean;
  showPatientInfo: boolean;
  generate: { diagnosis: boolean; exam: boolean; medication: boolean };
  allowFollowUp: boolean; // 是否允许流程完成后继续对话
  followUpModelSameAsRecommend: boolean; // 后续对话沿用推荐模型配置
  exposeInAssistant?: boolean; // 是否在AI助手页面也显示一键按钮
  provider?: 'openai' | 'claude' | 'gemini' | 'local';
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  voiceTrigger?: boolean; // 预留：语音唤起
  voiceHotword?: string;
  routingMode?: 'inherit' | 'frontend' | 'backend';
  backendProvider?: string;
  backendModel?: string;
}

/**
 * 医疗集成配置
 */
export interface MedicalConfig {
  enabled: boolean;
  apiUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  cacheEnabled: boolean;
  cacheTtl: number;
  rateLimitRpm: number;
  endpoints: {
    patients: string;
    records: string;
    diagnoses: string;
    treatments: string;
    medications: string;
    appointments: string;
  };
  features: {
    patientSearch: boolean;
    recordAccess: boolean;
    diagnosisAssist: boolean;
    treatmentPlan: boolean;
    medicationCheck: boolean;
    appointmentSync: boolean;
  };
}

/**
 * 桌面识别配置
 */
export interface DesktopRecognitionConfig {
  enabled: boolean;
  ocrEnabled: boolean;
  accessibilityEnabled: boolean;
  screenCaptureInterval: number;
  // 是否自动分析截图
  autoAnalyze: boolean;
  captureInterval?: number;
  windowMonitoring?: boolean;
  autoCapture?: boolean;
  monitoringInterval?: number;
  // 截图质量设置
  screenshotQuality?: 'low' | 'medium' | 'high';
  ocrLanguages: string[];
  confidenceThreshold: number;
  excludeApps: string[];
  includeApps: string[];
  sensitiveDataFilter: boolean;
  dataRetention: number;
}

/**
 * 隐私配置
 */
export interface PrivacyConfig {
  dataCollection: boolean;
  analytics: boolean;
  crashReports: boolean;
  localProcessing: boolean;
  dataEncryption: boolean;
  autoCleanup: boolean;
  cleanupInterval: number;
  sensitiveDataMask: boolean;
  auditLog: boolean;
  dataExport: boolean;
}

/**
 * 通知配置
 */
export interface NotificationConfig {
  enabled: boolean;
  sound: boolean;
  badge: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  duration: number;
  maxCount: number;
  priority: 'low' | 'normal' | 'high';
  categories: {
    system: boolean;
    voice: boolean;
    ai: boolean;
    medical: boolean;
    error: boolean;
  };
}

/**
 * 性能配置
 */
export interface PerformanceConfig {
  hardwareAcceleration: boolean;
  backgroundThrottling: boolean;
  memoryLimit: number;
  cpuLimit: number;
  diskCacheSize: number;
  networkTimeout: number;
  maxConcurrentRequests: number;
  debounceDelay: number;
  throttleDelay: number;
}

/**
 * 应用配置
 */
export interface AppConfig {
  version: string;
  firstRun: boolean;
  windows: {
    main: WindowConfig;
    floating: WindowConfig;
    voice: WindowConfig;
  };
  shortcuts: ShortcutConfig;
  voice: VoiceConfig;
  ai: AIConfig;
  aiImage?: AIImageConfig;
  aiRecommend?: AIRecommendConfig;
  oneClick?: OneClickConfig;
  bisheng?: BishengConfig;
  medical: MedicalConfig;
  desktopRecognition: DesktopRecognitionConfig;
  privacy: PrivacyConfig;
  notifications: NotificationConfig;
  theme: ThemeType;
  language: LanguageType;
  startup: {
    autoStart: boolean;
    minimizeToTray: boolean;
    showFloatingWindow: boolean;
    checkUpdates: boolean;
  };
  performance: PerformanceConfig;
  logging: {
    level: LogLevel;
    file: boolean;
    console: boolean;
    remote: boolean;
    maxFileSize: number;
    maxFiles: number;
  };
}

// ============================================================================
// 服务状态类型
// ============================================================================

/**
 * 语音服务状态
 */
export interface VoiceServiceState {
  isListening: boolean;
  isRecognizing: boolean;
  isProcessing: boolean;
  audioLevel: number;
  lastResult?: string;
  confidence?: number;
  error?: string;
  language: string;
  hotwordDetected: boolean;
}

/**
 * 语音状态
 */
export interface VoiceState {
  enabled: boolean;
  recognitionState: 'idle' | 'listening' | 'processing' | 'error';
  synthesisState: 'idle' | 'speaking' | 'paused' | 'error';
  keywordDetectionActive: boolean;
  config: VoiceConfig;
}

/**
 * 语音识别结果
 */
export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

/**
 * AI服务状态
 */
export interface AIServiceState {
  isConnected: boolean;
  isProcessing: boolean;
  provider: string;
  model: string;
  tokensUsed: number;
  requestsCount: number;
  lastResponse?: string;
  error?: string;
  rateLimitRemaining: number;
}

/**
 * 医疗服务状态
 */
export interface MedicalServiceState {
  isConnected: boolean;
  isProcessing: boolean;
  apiUrl: string;
  lastSync?: Date;
  requestsCount: number;
  cacheSize: number;
  error?: string;
  rateLimitRemaining: number;
}

/**
 * 医疗状态
 */
export interface MedicalState {
  enabled: boolean;
  state: 'idle' | 'connecting' | 'connected' | 'error' | 'searching';
  connected: boolean;
  cacheStats: {
    searchCacheSize: number;
    patientCacheSize: number;
    totalCacheSize: number;
  };
  queueLength: number;
  config: MedicalConfig;
}

/**
 * 患者记录
 */
export interface PatientRecord {
  id: string;
  patientId: string;
  type: 'diagnosis' | 'treatment' | 'medication' | 'lab' | 'imaging';
  date: Date;
  provider: string;
  description: string;
  data: any;
  attachments?: string[];
}

/**
 * 医疗搜索结果
 */
export interface MedicalSearchResult {
  patients: Patient[];
  records: PatientRecord[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 医疗API响应
 */
export interface MedicalApiResponse {
  success: boolean;
  status?: string;
  data?: any;
  error?: string;
  message?: string;
  timestamp: Date;
}

// ============================================================================
// 桌面识别相关类型
// ============================================================================

/**
 * 窗口信息
 */
export interface WindowInfo {
  id: number;
  title: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isVisible: boolean;
  isMinimized: boolean;
  isFocused: boolean;
  processName: string;
  processId: number;
}

/**
 * 无障碍信息
 */
export interface AccessibilityInfo {
  role: string;
  name?: string;
  value?: string;
  description?: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children?: AccessibilityInfo[];
}

/**
 * 桌面识别状态
 */
export interface DesktopRecognitionState {
  enabled: boolean;
  state: 'idle' | 'capturing' | 'analyzing' | 'error';
  lastCapture?: Date;
  captureCount: number;
  errorCount: number;
  config: DesktopRecognitionConfig;
}

/**
 * 屏幕捕获结果
 */
export interface ScreenCapture {
  id: string;
  timestamp: Date;
  displayId?: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageData: Buffer;
  format: 'png' | 'jpeg';
  ocrResult?: OCRResult;
  windowInfo?: WindowInfo;
}

// ============================================================================
// 数据模型类型
// ============================================================================

/**
 * 患者信息
 */
export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalHistory?: string[];
  allergies?: string[];
  medications?: string[];
  lastVisit?: string;
  nextAppointment?: string;
}

/**
 * 患者信息接口
 * 从OCR文本或屏幕截图中提取的患者信息
 */
export interface PatientInfo {
  name: string;
  age?: number;
  gender?: '男' | '女' | '未知';
  patientId?: string;
  department?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  medicalHistory?: string;
  confidence?: number; // 提取置信度 0-1
}

/**
 * OCR结果接口
 */
export interface OCRResult {
  text: string;
  confidence: number;
  bounds?: { x: number; y: number; width: number; height: number };
  words?: Array<{
    text: string;
    confidence: number;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
  lines?: Array<{
    text: string;
    confidence: number;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
}

/**
 * 患者信息提取配置
 */
export interface ExtractionConfig {
  useAI?: boolean; // 是否使用AI辅助提取
  aiApiUrl?: string; // AI API地址
  aiApiKey?: string; // AI API密钥
  minConfidence?: number; // 最小置信度阈值
}

/**
 * 医疗记录
 */
export interface MedicalRecord {
  id: string;
  patientId: string;
  date: string;
  type: 'consultation' | 'diagnosis' | 'treatment' | 'test' | 'surgery';
  title: string;
  description: string;
  doctor: string;
  department: string;
  diagnosis?: string[];
  treatment?: string[];
  medications?: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  testResults?: {
    name: string;
    value: string;
    unit: string;
    normalRange: string;
    status: 'normal' | 'abnormal' | 'critical';
  }[];
  attachments?: {
    name: string;
    type: string;
    url: string;
    size: number;
  }[];
  followUp?: {
    date: string;
    notes: string;
  };
}

/**
 * 诊断建议
 */
export interface DiagnosisSuggestion {
  id: string;
  condition: string;
  probability: number;
  symptoms: string[];
  tests: string[];
  treatments: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
  references?: string[];
}

/**
 * 治疗计划
 */
export interface TreatmentPlan {
  id: string;
  patientId: string;
  condition: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'cancelled' | 'paused';
  goals: string[];
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    startDate: string;
    endDate?: string;
    instructions: string;
  }[];
  procedures: {
    name: string;
    date: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
  }[];
  followUps: {
    date: string;
    type: string;
    completed: boolean;
    notes?: string;
  }[];
  progress: {
    date: string;
    notes: string;
    rating: number;
  }[];
}

// ============================================================================
// 操作相关类型
// ============================================================================

/**
 * 屏幕截图选项
 */
export interface ScreenCaptureOptions {
  format?: 'png' | 'jpeg';
  quality?: number;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  includeAudio?: boolean;
  cursor?: boolean;
}

/**
 * 通知选项
 */
export interface NotificationOptions {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  actions?: {
    label: string;
    action: string;
  }[];
  data?: any;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  query: string;
  type?: 'patient' | 'record' | 'diagnosis' | 'treatment' | 'all';
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * API响应
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

/**
 * 事件数据
 */
export interface EventData {
  type: string;
  timestamp: number;
  source: string;
  data: any;
  metadata?: Record<string, any>;
}

/**
 * 历史记录项
 */
export interface HistoryItem {
  id: string;
  type: 'voice' | 'ai' | 'medical' | 'screen' | 'search';
  timestamp: number;
  title: string;
  content: string;
  metadata?: {
    confidence?: number;
    duration?: number;
    source?: string;
    tags?: string[];
  };
  result?: any;
}

/**
 * 统计数据
 */
export interface Statistics {
  voice: {
    totalSessions: number;
    totalDuration: number;
    averageConfidence: number;
    commandsRecognized: number;
  };
  ai: {
    totalRequests: number;
    totalTokens: number;
    averageResponseTime: number;
    successRate: number;
  };
  medical: {
    totalQueries: number;
    patientsAccessed: number;
    recordsViewed: number;
    averageResponseTime: number;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
}

// ============================================================================
// 错误类型
// ============================================================================

/**
 * 应用错误
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * 服务错误
 */
export class ServiceError extends AppError {
  constructor(
    message: string,
    public service: string,
    code: string,
    details?: any
  ) {
    super(message, code, details);
    this.name = 'ServiceError';
  }
}

/**
 * 网络错误
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    public statusCode?: number,
    details?: any
  ) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

/**
 * 配置错误
 */
export class ConfigError extends AppError {
  constructor(
    message: string,
    public configKey: string,
    details?: any
  ) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 深度部分类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 必需字段类型
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 可选字段类型
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 事件监听器类型
 */
export type EventListener<T = any> = (data: T) => void;

/**
 * 异步事件监听器类型
 */
export type AsyncEventListener<T = any> = (data: T) => Promise<void>;

/**
 * 回调函数类型
 */
export type Callback<T = any> = (error?: Error, result?: T) => void;

/**
 * 异步回调函数类型
 */
export type AsyncCallback<T = any> = (error?: Error, result?: T) => Promise<void>;

// ============================================================================
// AI 相关类型
// ============================================================================

/**
 * AI 状态
 */
export interface AIState {
  enabled: boolean;
  state: 'idle' | 'processing' | 'error';
  provider: string;
  model: string;
  historyLength: number;
  queueLength: number;
  config: AIConfig;
}

/**
 * AI 消息
 */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/**
 * AI 响应
 */
export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: number;
}

/**
 * AI 提供商类型
 */
export type AIProvider = 'openai' | 'claude' | 'gemini' | 'local';

// ============================================================================
// Bisheng 智能体平台相关类型
// ============================================================================

/**
 * Bisheng 连接模式
 */
export type BishengMode = 'api' | 'iframe';

/**
 * Bisheng 工作流信息
 */
export interface BishengWorkflow {
  id: string;
  name: string;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: number;
}

/**
 * Bisheng 配置
 */
export interface BishengConfig {
  enabled: boolean;
  baseUrl: string;           // Bisheng API 地址 (如: http://localhost:7860)
  frontendUrl: string;       // Bisheng 前端地址 (如: http://localhost:3001)
  iframeProxyPort: number;   // iframe 代理端口
  username: string;          // 用户账号
  password: string;          // 用户密码 (加密存储)
  accessToken?: string;      // JWT 访问令牌
  tokenExpiry?: number;      // Token 过期时间戳
  mode: BishengMode;         // 接入方式: api | iframe
  autoLogin: boolean;        // 是否自动登录
  savePassword: boolean;     // 是否保存密码
  timeout: number;           // 请求超时时间(毫秒)
  retryAttempts: number;     // 重试次数
}

/**
 * Bisheng 会话状态
 */
export interface BishengSession {
  sessionId: string;
  workflowId: string;
  messageId: string;
  nodeId?: string;
  startTime: number;
  lastActivity: number;
  messages: BishengMessage[];
}

/**
 * Bisheng 消息
 */
export interface BishengMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  type?: 'text' | 'stream' | 'guide' | 'input' | 'output';
}

/**
 * Bisheng 服务状态
 */
export interface BishengServiceState {
  enabled: boolean;
  isConnected: boolean;
  isAuthenticated: boolean;
  mode: BishengMode;
  proxyRunning: boolean;
  currentWorkflow?: BishengWorkflow;
  currentSession?: BishengSession;
  error?: string;
}
