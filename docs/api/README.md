## API 文档总览

本文件汇总本项目的公开 API：工具函数、日志、服务层、前端 Hooks/Utils、Zustand Stores 以及主要组件的用法与示例。所有示例均为示例用途，请根据实际上下文传入真实配置与依赖。

- 语言与栈：TypeScript、Electron、React、Zustand
- 命名约定：函数/方法动词化，类型名名词化；错误统一通过 Error/自定义错误类型抛出

目录
- 工具函数与日志
  - utils/index.ts
  - utils/audio-utils.ts
  - utils/logger.ts
- 服务层
  - services/api-client.ts
  - services/medical-integration.ts
  - services/voice-recognition.ts
  - services/voice.ts
  - services/shortcut.ts
  - services/screenshot.ts（主进程）
  - services/desktop-recognition.ts
  - services/chat-persistence.ts
  - services/web-search.ts
  - services/ai.ts
  - services/config.ts
  - services/service-health-checker.ts
  - services/bisheng.ts
- 前端 Hooks 与工具
  - renderer/hooks/useGlassEffect.ts & useFloatingGlassEffect.ts
  - renderer/hooks/useElectronAPI.ts
  - renderer/utils/index.ts
- Stores
  - renderer/stores/configStore.ts
  - renderer/stores/chatStore.ts
  - renderer/store/agentSessionStore.ts
- 组件（部分列举）
  - 默认导出组件列表与基本用法
- 共享类型
  - shared/types.ts 关键类型速览

---

## 工具函数与日志

### src/utils/index.ts
常用通用工具函数。

- 延迟与节流/防抖
  - delay(ms: number): Promise<void>
  - debounce(func, wait, immediate?) => (...args) => void
  - throttle(func, limit) => (...args) => void

- 对象与数组
  - deepClone<T>(obj: T): T
  - deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T
  - isObject(item: any): boolean
  - uniqueArray<T>(array: T[], key?: keyof T): T[]
  - groupBy<T>(array: T[], key: keyof T): Record<string, T[]>
  - sortBy<T>(array: T[], key: keyof T, order?: 'asc'|'desc'): T[]

- 字符串/格式化
  - generateId(prefix = 'id'): string
  - formatFileSize(bytes: number): string
  - formatTimeDiff(ms: number): string
  - formatRelativeTime(date: Date | string): string
  - truncateText(text, maxLength, suffix='...')
  - highlightText(text, query)
  - escapeRegExp(str)
  - isValidEmail(email), isValidUrl(url)
  - getFileExtension(filename), getMimeType(filename)
  - formatNumber(num, decimals=2), formatPercentage(value, total, decimals=1)

- colorUtils
  - hexToRgb(hex)
  - rgbToHex(r,g,b)
  - getContrastColor(hex)

- storageUtils（本地存储）
  - set/get/remove/clear

- clipboardUtils（剪贴板）
  - copyText(text): Promise<boolean>
  - readText(): Promise<string|null>

- deviceUtils
  - isMobile(), isTouchDevice(), getDeviceInfo()

- performanceUtils
  - measureTime(fn, label?), measureTimeAsync(fn, label?), getMemoryUsage()

- errorUtils
  - safeExecute(fn, fallback?), safeExecuteAsync(fn, fallback?)
  - retry(fn, maxAttempts=3, delay=1000)

示例：
```ts
import { debounce, deepMerge, colorUtils } from '@/utils/index';

const onResize = debounce(() => console.log('resized'), 200);
window.addEventListener('resize', onResize);

const merged = deepMerge({ a: { x: 1 } }, { a: { y: 2 } });
console.log(merged); // { a: { x:1, y:2 } }

const contrast = colorUtils.getContrastColor('#ffffff'); // '#000000'
```

### src/utils/audio-utils.ts
浏览器音频兼容工具。

- getSupportedAudioFormats(): string[]
- getSupportedPlaybackFormats(): string[]
- convertToWav(audioData: ArrayBuffer): Promise<ArrayBuffer>
- createCompatibleAudioPlayer(audioData: ArrayBuffer): Promise<HTMLAudioElement>
- playAudioData(audioData: ArrayBuffer): Promise<void>
- getBestRecordingFormat(): string
- isValidAudioData(audioData: ArrayBuffer): boolean

示例：
```ts
import { playAudioData, getBestRecordingFormat } from '@/utils/audio-utils';

console.log(getBestRecordingFormat());
await playAudioData(myArrayBuffer);
```

### src/utils/logger.ts
高性能日志记录器。

- 枚举与接口
  - LogLevel
  - LogEntry, LoggerConfig, PerformanceMetrics, LogStats
- 类
  - Logger(config?: Partial<LoggerConfig>)
    - trace/debug/info/warn/error/fatal
    - time(operation): () => void
    - withTiming(operation, fn)
    - getStats(), getPerformanceMetrics()
    - setLevel(level), updateConfig(config), exportLogs(), isHealthy(), cleanup()
- 便捷导出
  - logger: 默认实例
  - trace/debug/info/warn/error/fatal: 直接函数

示例：
```ts
import { logger, LogLevel } from '@/utils/logger';

logger.setLevel(LogLevel.INFO);
logger.info('App started');
const done = logger.time('heavy-op');
// ...
done(true);
```

---

## 服务层

### src/services/api-client.ts
后端 API 客户端（单例 `apiClient`）。

- 模型配置
  - getAllConfigs(): Promise<{ configs: Record<string, ModelConfig>; scenarios: string[] }>
  - getScenarioConfig(scenario: string)
  - testModelConnection(request: ModelTestRequest)
  - updateScenarioConfig(scenario, config)
  - getScenarios()

- 患者信息提取
  - extractPatientInfo(imageDataOrRequest, aiImageConfig?)
  - generateRecommendations(patientInfoOrReq, recommendationTypes?)
  - generateRecommendationsWithAI(patient, types, cfg)
  - generateCombinedRecommendationsStream(patient, cfg, onChunk?, types?)

- 其他
  - ping(): Promise<boolean>

示例：
```ts
import apiClient from '@/services/api-client';

const ok = await apiClient.ping();
const configs = await apiClient.getAllConfigs();

const rec = await apiClient.generateRecommendations({
  patient_name: '张三', gender: '男', age: 45, chief_complaint: '胸痛', recommendation_types: ['diagnosis']
});
```

### src/services/medical-integration.ts
医疗集成服务（类 `MedicalIntegrationService`）。

- 生命周期
  - initialize(), cleanup()
- 搜索与数据
  - searchPatients(query, { limit, offset, filters, useCache })
  - getPatientRecord(patientId, useCache?)
  - analyzeContent(content)
  - getPatient(patientId)
  - searchStudies(query, options?)
- 状态与配置
  - getState(): MedicalState
  - clearCache(), getCacheStats()
  - updateConfig(config)

事件：'connection-established' | 'connection-lost' | 'search-start' | 'search-complete' | 'search-error' | 'patient-record-loaded' | 'state-change'

示例：
```ts
const svc = new MedicalIntegrationService(appConfig.medical, logger);
await svc.initialize();
const results = await svc.searchPatients('李四');
const state = svc.getState();
```

### src/services/voice-recognition.ts
多模型语音识别。

- IVoiceRecognitionService 接口：initialize/startListening/stopListening/isListening/testRecognition/cleanup
- 实现：
  - BrowserVoiceRecognitionService
  - WhisperVoiceRecognitionService（依赖 faster-whisper）
  - FunASRVoiceRecognitionService（依赖 funasr）
- VoiceRecognitionManager
  - initialize(), setCurrentModel(model), getCurrentModel(), getAvailableModels()
  - startListening(), stopListening(), isListening()
  - testRecognition(model, audioData), testAllModels(audioData)
  - updateConfig(config), cleanup()

示例：
```ts
const mgr = new VoiceRecognitionManager(appConfig.voice, logger);
await mgr.initialize();
await mgr.startListening();
```

### src/services/voice.ts
端到端语音服务（识别+合成）。

- 生命周期：initialize(), cleanup()
- 识别：startRecognition(), stopRecognition(), startKeywordDetection(), stopKeywordDetection()
- 合成：speak(text, options?), stopSpeaking(), pauseSpeaking(), resumeSpeaking()
- 状态：getState(), getAvailableVoices()
- 配置：updateConfig(config)
- 别名：startListening(), stopListening(), processText(text)

示例：
```ts
const voice = new VoiceService(appConfig.voice, logger);
await voice.initialize();
await voice.startRecognition();
await voice.speak('你好');
```

### src/services/shortcut.ts
全局快捷键服务（Electron）。

- 生命周期：initialize(), cleanup()
- 注册：registerShortcut(shortcut, action), unregisterShortcut(shortcut), unregisterAllShortcuts()
- 状态/配置：getState(), getRegisteredShortcuts(), getShortcutList(), updateConfig(config), setDependencies(deps)

示例：
```ts
const shortcuts = new ShortcutService(appConfig.shortcuts, logger, { windowManager, voiceService });
await shortcuts.initialize();
await shortcuts.registerShortcut('CommandOrControl+Shift+S', { type: 'desktop', action: 'capture-screen', description: '截图' });
```

### src/services/screenshot.ts（主进程）
屏幕/窗口截图。

- captureScreen({ quality, includeCursor, displayIndex, noCache }): Promise<ScreenshotResult>
- captureWindow(windowTitle?): Promise<ScreenshotResult>
- checkPermissions(): Promise<boolean>
- getDisplays(): Array<{ id, index, label, bounds, scaleFactor, isPrimary }>

### src/services/desktop-recognition.ts
桌面识别（OCR 模拟实现，可扩展）。

- initialize(), cleanup()
- captureScreen({ displayId, region, includeOCR }): Promise<ScreenCapture>
- captureAndAnalyze({ displayId, region, analysisPrompt }): Promise<{ capture, analysis }>
- getActiveWindow(), getCaptureHistory(), clearCaptureHistory()
- getAvailableDisplays()
- updateConfig(config), getState()

事件：'capture-start' | 'capture-complete' | 'capture-error' | 'ocr-complete' | 'ocr-error' | 'analysis-complete' | 'window-change' | 'state-change'

### src/services/chat-persistence.ts
聊天记录持久化（electron-store）。

- 类 ChatPersistenceService
  - getAll(), setAll(messages), add(message), clear()

### src/services/web-search.ts
网络搜索（多 Provider）。

- initialize(), cleanup()
- search(query, { maxResults, language, region, safeSearch }): Promise<WebSearchResponse>
- updateConfig(config), getState()
- Provider：google/bing/duckduckgo/serpapi/custom

示例：
```ts
const search = new WebSearchService(appConfig.ai.webSearch, logger);
await search.initialize();
const r = await search.search('肺炎 最新指南');
```

### src/services/ai.ts
统一 AI 调用与流式处理，支持工具调用（web_search）。

- 生命周期：initialize(), cleanup()
- 消息处理：processMessage(message, opts?), processMessageStream(message, onChunk, opts?)
- 辅助：generateSummary(text, maxLength?), analyzeDesktopContent(content, context?), analyzeContent(content, context?)
- 历史：getHistory(), clearHistory()
- 状态/配置：getState(), updateConfig(config), getAvailableProviders(), sendMessage(provider, messages)

示例：
```ts
const ai = new AIService(appConfig.ai, logger);
await ai.initialize();
const res = await ai.processMessage({ role:'user', content: '总结如下文字...', timestamp: Date.now() });
```

### src/services/config.ts
应用配置服务（electron-store）。

- 生命周期：initialize(), cleanup()
- 读取：getConfig(), get(key)
- 写入：set(key, value), updateConfig(updates), resetConfig(), resetConfigKey(key)
- 监听：watch(key, cb)
- 导入导出：exportConfig(), importConfig(json)
- 路径：getConfigPath()

示例：
```ts
const configSvc = new ConfigService(logger);
await configSvc.initialize();
const cfg = await configSvc.getConfig();
await configSvc.updateConfig({ theme: 'glass' });
```

### src/services/service-health-checker.ts
依赖服务健康检查。

- checkAllServices(config): Promise<HealthCheckResult>
  - 自动检查：后端、Bisheng、本地 AI 服务

### src/services/bisheng.ts
Bisheng 智能体服务（API + iframe 代理）。

- 生命周期：initialize(), cleanup(), getProxyStatus()
- 代理：startIframeProxy(), stopIframeProxy()
- 登录：login(username, password)
- 工作流：getWorkflows(pageSize?, pageNum?), invokeWorkflow(workflowId, input, stream?, sessionId?, messageId?, inputNodeId?), stopWorkflow(workflowId, sessionId)
- 配置：updateConfig(config), getConfig(), isAuthenticated()
- 测试工具：testWorkflowList(), testWorkflowInvoke(id), runConnectionTests()

示例：
```ts
const bs = new BishengService(appConfig.bisheng, logger);
await bs.initialize();
const flows = await bs.getWorkflows();
```

---

## 前端 Hooks 与工具

### renderer/hooks/useGlassEffect.ts & useFloatingGlassEffect.ts
根据配置在页面层应用玻璃毛玻璃效果（设置 CSS 变量）。

示例：
```tsx
import { useGlassEffect } from '@/renderer/hooks/useGlassEffect';

export function App() {
  useGlassEffect();
  return <div>...</div>;
}
```

### renderer/hooks/useElectronAPI.ts
统一封装与主进程的桥接 API（通过 `window.electronAPI`）。返回状态与动作集。

- 状态：isAvailable/status/config/voiceState/aiState/medicalState/notifications/isLoading/error
- 动作：
  - 窗口：minimizeWindow/closeWindow/hideWindow/showMainWindow/toggleFloatingWindow
  - 配置：updateConfig/resetConfig
  - 语音：startVoiceRecognition/stopVoiceRecognition/speakText/stopSpeaking
  - AI：processMessage/generateSummary
  - 医疗：searchPatients/getMedicalRecord
  - 截图：captureScreen/captureAndAnalyze
  - 通知：showNotification/dismissNotification
  - 错误：clearError/reportError

示例：
```tsx
const api = useElectronAPI();
useEffect(() => { if (api.isAvailable) api.showMainWindow(); }, [api.isAvailable]);
```

### renderer/utils/index.ts
前端工具：domUtils/eventUtils/keyboardUtils/animationUtils/storageUtils/formatUtils/validationUtils。

示例：
```ts
import { domUtils, animationUtils } from '@/renderer/utils';
const el = domUtils.getElementById('root');
if (el) await animationUtils.fadeIn(el, 150);
```

---

## Stores

### renderer/stores/configStore.ts
应用配置的前端状态。方法：
- updateConfig(updates), resetConfig(), loadConfig(), saveConfig()

示例：
```ts
import { useConfigStore } from '@/renderer/stores/configStore';
const { config, updateConfig } = useConfigStore();
updateConfig({ theme: 'glass' });
```

### renderer/stores/chatStore.ts
聊天消息状态。
- add(msg), setAll(msgs), clear()

### renderer/store/agentSessionStore.ts
Bisheng 智能体会话管理。
- getSession(workflowId, workflowName)
- updateSession(workflowId, updates)
- addMessage(workflowId, message)
- updateMessage(workflowId, messageId, content)
- updateMessageType(workflowId, messageId, type)
- setActiveWorkflow(workflowId)
- getAllSessions()
- clearSessionMessages(workflowId)
- deleteSession(workflowId)

---

## 组件（部分）
以下组件以默认导出形式提供，常规使用方式：
```tsx
import Component from '@/renderer/components/ComponentName';
```

- renderer/pages：FloatingWindow, AgentService, MainWindow, VoiceWindow, SettingsWindow
- renderer/components：
  - ModelConfigPanel, FloatingWindow, AgentChat, VoiceInputWindow, MainWindow, ExamRecommendations,
    PatientInfoDisplay, MedicalSystem, DesktopRecognition, AgentIframe, AgentList, AgentHistory,
    SettingsPanel, Chat, WebSearchSettings, VoiceRecognitionTest, medical/*（若干）
- 根组件：renderer/App.tsx
- 通用组件（src/components）：FloatingWindow, MainWindow, VoiceInputWindow, QuickActions, StatusBar,
  SuggestionPanel, SettingsPanel, HistoryPanel, NotificationCenter 等

注：具体 Props 请参见对应文件定义；多数组件以 `React.FC<...Props>` 形式导出，支持受控回调与样式扩展。

示例：
```tsx
import Chat from '@/renderer/components/Chat';

export default function Page() {
  return <Chat />;
}
```

---

## 共享类型（速览）
详见 `src/shared/types.ts`。
- 应用/窗口/主题/语言：AppStatus, WindowMode, ThemeType, LanguageType
- 配置：AppConfig 及其子配置（VoiceConfig/AIConfig/AIImageConfig/AIRecommendConfig/OneClickConfig/MedicalConfig/...
- 服务状态：VoiceServiceState, AIServiceState, MedicalServiceState, DesktopRecognitionState
- 数据模型：Patient, MedicalRecord, DiagnosisSuggestion, TreatmentPlan
- 操作与通用：ScreenCaptureOptions, NotificationOptions, SearchOptions, APIResponse<T>
- 错误：AppError, ServiceError, NetworkError, ConfigError
- 工具类型：DeepPartial, RequiredFields, OptionalFields, EventListener, AsyncEventListener, Callback, AsyncCallback

---

## 最佳实践与注意事项
- 安全：不要在客户端硬编码密钥；通过配置或环境变量传入
- 日志：使用 `logger` 记录关键行为、错误与性能指标
- 速率限制：部分服务（AI/WebSearch/Medical）内置简单队列/限流，请复用实例
- 错误处理：API/服务方法抛出 Error；调用方应在 UI 层妥善捕获并提示
- 可扩展点：
  - DesktopRecognition OCR 引擎可替换为 Tesseract.js 或云端 OCR
  - VoiceRecognition 可按需裁剪模型实现
  - WebSearch provider 可扩展自定义 API

---

## 运行环境与依赖
- Electron 环境下运行（Renderer 侧 Hooks 需 `window.electronAPI` 注入）
- Whisper/FunASR 相关仅在相应依赖可用时启用
- DuckDuckGo 无需 API Key；Google/Bing/SerpAPI 需相应密钥

---

如需按模块拆分文档或导出类型参考表，请在 `docs/api/` 下按模块创建子文档并从本 README 链接。