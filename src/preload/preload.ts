import { contextBridge, ipcRenderer } from 'electron';
import { AppStatus, ChatMessage, AnalysisRequest, SearchFilters } from '../shared/types';

// 定义暴露给渲染进程的API接口
interface ElectronAPI {
  // 窗口控制
  window: {
    minimize: () => Promise<void>;
    close: () => Promise<void>;
    toggleAlwaysOnTop: () => Promise<boolean>;
  };
  
  // 应用状态
  app: {
    getStatus: () => Promise<AppStatus>;
    onStatusChange: (callback: (status: AppStatus) => void) => void;
    removeStatusListener: (callback: (status: AppStatus) => void) => void;
    setVisibility: (visible: boolean) => Promise<void>;
    reportError: (error: any) => Promise<void>;
  };
  
  // 配置管理
  config: {
    get: (path?: string) => Promise<any>;
    set: (path: string, value: any) => Promise<boolean>;
    onChange: (callback: (path: string, value: any) => void) => void;
    removeConfigListener: (callback: (path: string, value: any) => void) => void;
  };
  
  // 语音服务
  voice: {
    startListening: () => Promise<boolean>;
    stopListening: () => Promise<boolean>;
    speak: (text: string) => Promise<boolean>;
    testAllModels?: (audioData: ArrayBuffer) => Promise<any>;
    onStateChange: (callback: (state: any) => void) => void;
    onRecognitionResult: (callback: (result: any) => void) => void;
    removeVoiceListener: (callback: (state: any) => void) => void;
  };
  
  // AI服务
  ai: {
    chat: (messages: ChatMessage[]) => Promise<any>;
    analyzeContent: (request: AnalysisRequest) => Promise<any>;
    onSuggestion: (callback: (suggestion: any) => void) => void;
    removeSuggestionListener: (callback: (suggestion: any) => void) => void;
  };
  
  // 医疗集成
  medical: {
    search: (filters: SearchFilters) => Promise<any>;
    getPatient: (id: string) => Promise<any>;
    getStudy: (id: string) => Promise<any>;
    onDataUpdate: (callback: (data: any) => void) => void;
    removeMedicalListener: (callback: (data: any) => void) => void;
  };
  
  // 截屏功能
  screen: {
    capture: () => Promise<string>;
    onScreenCaptured: (callback: (data: any) => void) => void;
    removeScreenListener: (callback: (data: any) => void) => void;
  };

  // 屏幕截图API (新增)
  screenshot: {
    capture(options?: any): Promise<{ success: boolean; data?: any; error?: string }>;
    captureWindow(windowTitle?: string): Promise<{ success: boolean; data?: any; error?: string }>;
    checkPermissions(): Promise<{ success: boolean; hasPermission: boolean }>;
    getDisplays(): Promise<{ success: boolean; displays: any[] }>;
  };

  // 窗口显示控制
  windows: {
    showFloating: () => Promise<void>;
    hideFloating: () => Promise<void>;
    showVoiceInput: () => Promise<void>;
    hideVoiceInput: () => Promise<void>;
  };
  
  // 通知系统
  notifications: {
    show: (notification: any) => Promise<void>;
    onNotification: (callback: (notification: any) => void) => void;
    removeNotificationListener: (callback: (notification: any) => void) => void;
  };
  
  // 事件系统
  events: {
    on: (event: string, callback: (...args: any[]) => void) => void;
    off: (event: string, callback: (...args: any[]) => void) => void;
    emit: (event: string, ...args: any[]) => void;
  };
  
  // 系统信息
  system: {
    getInfo: () => Promise<any>;
    getPerformance: () => Promise<any>;
  };
  
  // 开发工具（仅在开发模式下可用）
  dev?: {
    openDevTools: () => Promise<void>;
    reload: () => Promise<void>;
    toggleDevTools: () => Promise<void>;
  };
  
  // Bisheng 智能体服务
  bisheng: {
    login: (username: string, password: string) => Promise<any>;
    getWorkflows: (pageSize?: number, pageNum?: number) => Promise<any>;
    invokeWorkflow: (workflowId: string, input: any, stream?: boolean, sessionId?: string, messageId?: string, inputNodeId?: string) => Promise<any>;
    getConfig: () => Promise<any>;
    updateConfig: (config: any) => Promise<boolean>;
    isAuthenticated: () => Promise<boolean>;
    getProxyStatus: () => Promise<{ running: boolean; port: number }>;
    testWorkflowList: () => Promise<any>;
    testWorkflowInvoke: (workflowId: string) => Promise<any>;
    runConnectionTests: () => Promise<any>;
  };
  
  // 兼容函数（旧版调用）：
  processWithAI?: (payload: any) => Promise<string>;
  speak?: (text: string, options?: any) => Promise<any>;
}

// 实现API
const electronAPI: ElectronAPI = {
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    close: () => ipcRenderer.invoke('window-close'),
    toggleAlwaysOnTop: () => ipcRenderer.invoke('window-toggle-always-on-top'),
  },
  
  // 应用状态
  app: {
    getStatus: () => ipcRenderer.invoke('get-app-status'),
    onStatusChange: (callback) => {
      ipcRenderer.on('app-status-changed', (_, status) => callback(status));
    },
    removeStatusListener: (callback) => {
      ipcRenderer.removeListener('app-status-changed', callback);
    },
    setVisibility: (visible) => ipcRenderer.invoke('app:setVisibility', visible),
    reportError: (error) => ipcRenderer.invoke('app:reportError', error),
  },
  
  // 配置管理
  config: {
    get: (path) => ipcRenderer.invoke('get-config', path),
    set: (path, value) => ipcRenderer.invoke('set-config', path, value),
    onChange: (callback) => {
      ipcRenderer.on('config-changed', (_, path, value) => callback(path, value));
    },
    removeConfigListener: (callback) => {
      ipcRenderer.removeListener('config-changed', callback);
    },
  },
  
  // 语音服务
  voice: {
    // 对齐主进程的命名：voice-start-recognition/voice-stop-recognition
    startListening: () => ipcRenderer.invoke('voice-start-recognition'),
    stopListening: () => ipcRenderer.invoke('voice-stop-recognition'),
    speak: (text) => ipcRenderer.invoke('voice-speak', text),
    testAllModels: (audioData: ArrayBuffer) => ipcRenderer.invoke('voice-test-all-models', audioData),
    onStateChange: (callback) => {
      ipcRenderer.on('voice-state-changed', (_, state) => callback(state));
    },
    onRecognitionResult: (callback) => {
      ipcRenderer.on('voice-recognition-result', (_, result) => callback(result));
    },
    removeVoiceListener: (callback) => {
      ipcRenderer.removeListener('voice-state-changed', callback);
      ipcRenderer.removeListener('voice-recognition-result', callback);
    },
  },
  
  // AI服务
  ai: {
    // 为现有渲染层适配：增加 processMessage / processMessageStream 兼容
    chat: (messages) => ipcRenderer.invoke('ai-chat', messages),
    analyzeContent: (request) => ipcRenderer.invoke('ai-analyze-content', request),
    processMessage: (message: string) => ipcRenderer.invoke('ai-process-message', message),
    processMessageStream: (message: string) => ipcRenderer.invoke('ai-process-message-stream', message),
    onSuggestion: (callback) => {
      ipcRenderer.on('ai-suggestion', (_, suggestion) => callback(suggestion));
    },
    removeSuggestionListener: (callback) => {
      ipcRenderer.removeListener('ai-suggestion', callback);
    },
  },
  
  // 医疗集成
  medical: {
    search: (filters) => ipcRenderer.invoke('medical-search', filters),
    getPatient: (id) => ipcRenderer.invoke('medical-get-patient', id),
    getStudy: (id) => ipcRenderer.invoke('medical-get-study', id),
    onDataUpdate: (callback) => {
      ipcRenderer.on('medical-data-updated', (_, data) => callback(data));
    },
    removeMedicalListener: (callback) => {
      ipcRenderer.removeListener('medical-data-updated', callback);
    },
  },
  
  // 截屏功能
  screen: {
    capture: () => ipcRenderer.invoke('screen-capture'),
    onScreenCaptured: (callback) => {
      ipcRenderer.on('screen-captured', (_, data) => callback(data));
    },
    removeScreenListener: (callback) => {
      ipcRenderer.removeListener('screen-captured', callback);
    },
  },

  // 屏幕截图API (新增实现)
  screenshot: {
    capture: (options?: any) => ipcRenderer.invoke('screenshot:capture', options),
    captureWindow: (windowTitle?: string) => ipcRenderer.invoke('screenshot:captureWindow', windowTitle),
    checkPermissions: () => ipcRenderer.invoke('screenshot:checkPermissions'),
    getDisplays: () => ipcRenderer.invoke('screenshot:getDisplays')
  },

  // 窗口显示控制
  windows: {
    showFloating: () => ipcRenderer.invoke('show-floating-window'),
    hideFloating: () => ipcRenderer.invoke('hide-floating-window'),
    showVoiceInput: () => ipcRenderer.invoke('show-voice-input'),
    hideVoiceInput: () => ipcRenderer.invoke('hide-voice-input'),
  },
  
  // 通知系统
  notifications: {
    show: (notification) => ipcRenderer.invoke('show-notification', notification),
    onNotification: (callback) => {
      ipcRenderer.on('notification', (_, notification) => callback(notification));
    },
    removeNotificationListener: (callback) => {
      ipcRenderer.removeListener('notification', callback);
    },
  },
  
  // 事件系统
  events: {
    on: (event, callback) => {
      ipcRenderer.on(event, (_, ...args) => callback(...args));
    },
    off: (event, callback) => {
      ipcRenderer.removeListener(event, callback);
    },
    emit: (event, ...args) => {
      ipcRenderer.send(event, ...args);
    },
  },
  
  // 系统信息
  system: {
    getInfo: () => ipcRenderer.invoke('get-system-info'),
    getPerformance: () => ipcRenderer.invoke('get-performance-info'),
  },
  
  // Bisheng 智能体服务
  bisheng: {
    login: (username, password) => ipcRenderer.invoke('bisheng-login', username, password),
    getWorkflows: (pageSize, pageNum) => ipcRenderer.invoke('bisheng-get-workflows', pageSize, pageNum),
    invokeWorkflow: (workflowId, input, stream, sessionId, messageId, inputNodeId) =>
      ipcRenderer.invoke('bisheng-invoke-workflow', workflowId, input, stream, sessionId, messageId, inputNodeId),
    getConfig: () => ipcRenderer.invoke('bisheng-get-config'),
    updateConfig: (config) => ipcRenderer.invoke('bisheng-update-config', config),
    isAuthenticated: () => ipcRenderer.invoke('bisheng-is-authenticated'),
    getProxyStatus: () => ipcRenderer.invoke('bisheng-get-proxy-status'),
    testWorkflowList: () => ipcRenderer.invoke('bisheng-test-workflow-list'),
    testWorkflowInvoke: (workflowId) => ipcRenderer.invoke('bisheng-test-workflow-invoke', workflowId),
    runConnectionTests: () => ipcRenderer.invoke('bisheng-run-connection-tests'),
  },
};

// 在开发模式下添加开发工具
if (process.env.NODE_ENV === 'development') {
  electronAPI.dev = {
    openDevTools: () => ipcRenderer.invoke('dev-open-devtools'),
    reload: () => ipcRenderer.invoke('dev-reload'),
    toggleDevTools: () => ipcRenderer.invoke('dev-toggle-devtools'),
  };
}

// 兼容旧版渲染层调用：processWithAI / speak（顶层）
// - processWithAI: 简化为直接发送文本到 AI 主进程处理
// - speak: 透传到 voice.speak（如果主进程不支持，可在渲染进程自行使用 speechSynthesis）
(electronAPI as any).processWithAI = async (payload: any) => {
  try {
    const message = typeof payload === 'string' ? payload : (payload?.content || payload?.message || '');
    if (!message) return '';
    const res = await ipcRenderer.invoke('ai-process-message', message);
    if (typeof res === 'string') return res;
    if (res && typeof res === 'object' && 'content' in res) return (res as any).content;
    return String(res ?? '');
  } catch (e) {
    console.warn('processWithAI failed:', e);
    return '';
  }
};
(electronAPI as any).speak = async (text: string) => electronAPI.voice.speak(text);

// 暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 类型声明，供TypeScript使用
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// 安全检查
if (process.contextIsolated) {
  console.log('Context isolation is enabled');
} else {
  console.warn('Context isolation is disabled - this is a security risk');
}

// 预加载脚本加载完成日志
console.log('Preload script loaded successfully');

// 导出类型供其他文件使用
export type { ElectronAPI };
