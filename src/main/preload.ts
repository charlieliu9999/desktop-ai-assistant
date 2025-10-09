import { contextBridge, ipcRenderer } from 'electron';
import type { 
  VoiceState, 
  AIState, 
  MedicalServiceState, 
  DesktopRecognitionState,
  AppConfig,
  VoiceRecognitionTestResult
} from '../shared/types';

// 定义快捷键状态类型
interface ShortcutState {
  enabled: boolean;
  registered: string[];
  active: boolean;
}

// 定义暴露给渲染进程的API接口
export interface ElectronAPI {
  // 应用状态
  getAppState(): Promise<{
    voice: VoiceState;
    ai: AIState;
    medical: MedicalServiceState;
    desktop: DesktopRecognitionState;
    shortcuts: ShortcutState;
    config: AppConfig;
  }>;
  
  // 语音控制API
  voice: {
    startRecognition(): Promise<void>;
    stopRecognition(): Promise<void>;
    // 兼容旧接口
    startListening?(): Promise<void>;
    stopListening?(): Promise<void>;
    speak(text: string): Promise<void>;
    stopSpeaking(): Promise<void>;
    testAllModels(audioData: ArrayBuffer): Promise<VoiceRecognitionTestResult[]>;
    onRecognitionResult(callback: (data: { input: string; response: string }) => void): () => void;
    onStateChange(callback: (state: VoiceState) => void): () => void;
  };
  
  // AI服务API
  ai: {
    processMessage(message: string): Promise<string>;
    processMessageStream(message: string): Promise<{ success: boolean; content?: string; error?: string }>;
    processMessageWithTools?(message: string): Promise<string>;
    clearHistory(): Promise<void>;
    generateSummary(text: string): Promise<string>;
    searchWeb?(query: string, maxResults?: number): Promise<any>;
    onResponse(callback: (response: string) => void): () => void;
    onStateChange(callback: (state: AIState) => void): () => void;
    onStreamChunk(callback: (chunk: string) => void): () => void;
    onStreamEnd(callback: (result: { success: boolean; content?: string; error?: string }) => void): () => void;
  };
  
  // 桌面识别API
  desktop: {
    captureScreen(options?: any): Promise<any>;
    analyzeScreen(options?: any): Promise<any>;
    getDisplays(): Promise<Electron.Display[]>;
    onAnalysisResult(callback: (analysis: any) => void): () => void;
    onStateChange(callback: (state: DesktopRecognitionState) => void): () => void;
  };
  
  // 医疗服务API
  medical: {
    searchPatients(query: string, options?: any): Promise<any>;
    getPatient(patientId: string): Promise<any>;
    onSearchResult(callback: (results: any) => void): () => void;
    onStateChange(callback: (state: MedicalServiceState) => void): () => void;
  };

  // Bisheng 智能体服务API
  bisheng: {
    login(username: string, password: string): Promise<{ token: string; expiry: number }>;
    getWorkflows(pageSize?: number, pageNum?: number): Promise<any[]>;
    invokeWorkflow(
      workflowId: string,
      input: any,
      stream?: boolean,
      sessionId?: string,
      messageId?: string
    ): Promise<{ streamId: string }>;
    stopWorkflow(workflowId: string, sessionId: string): Promise<void>;
    onStreamStart(callback: (e: { streamId: string; workflowId?: string }) => void): () => void;
    onStreamChunk(callback: (e: { streamId: string; chunk: string }) => void): () => void;
    onStreamEnd(callback: (e: { streamId: string; success: boolean; error?: string }) => void): () => void;
    getConfig(): Promise<any>;
    updateConfig(config: any): Promise<boolean>;
    isAuthenticated(): Promise<boolean>;
    getProxyStatus(): Promise<{ running: boolean; port: number }>;
    testWorkflowList(): Promise<any>;
    testWorkflowInvoke(workflowId: string): Promise<any>;
    runConnectionTests(): Promise<any>;
  };

  // 配置管理API
  config: {
    get(key?: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    update(config: Partial<AppConfig>): Promise<void>;
    reset(): Promise<void>;
    onChange(callback: (data: { key: string; value: any }) => void): () => void;
  };
  
  // 窗口控制API
  window: {
    minimize?(): Promise<void>;
    close?(): Promise<void>;
    toggleAlwaysOnTop?(): Promise<boolean>;
    showMain(): Promise<void>;
    hideMain(): Promise<void>;
    toggleMain(): Promise<void>;
    showFloating(): Promise<void>;
    hideFloating(): Promise<void>;
    showVoice(): Promise<void>;
    // 一些组件会直接调用 window.hide()
    hide?(): Promise<void>;
  };
  
  // 应用控制API
  app: {
    quit(): Promise<void>;
    minimizeToTray(): Promise<void>;
    getVersion(): Promise<string>;
    getStatus?(): Promise<string>;
    // 适配渲染进程调用
    setVisibility?(visible: boolean): Promise<void>;
    reportError?(error: any): Promise<void>;
    reportPerformance?(payload: any): Promise<void>;
    restart?(): Promise<void>;
    toggleDevTools?(): Promise<void>;
    showNotification?(options: { title: string; body: string; silent?: boolean }): Promise<void>;
    createReminder?(): Promise<{ success: boolean; message?: string }>;
  };
  
  // 快捷键API
  shortcuts: {
    onTriggered(callback: (data: { action: any; shortcut: string }) => void): () => void;
  };

  // 导航API
  navigation: {
    onNavigateTo(callback: (route: string) => void): () => void;
  };

  // 屏幕截图API
  screenshot: {
    capture(options?: any): Promise<{ success: boolean; data?: any; error?: string }>;
    captureWindow(windowTitle?: string): Promise<{ success: boolean; data?: any; error?: string }>;
    checkPermissions(): Promise<{ success: boolean; hasPermission: boolean }>;
    getDisplays(): Promise<{ success: boolean; displays: any[] }>;
  };
  
  // 通用事件监听
  on(channel: string, callback: (...args: any[]) => void): () => void;
  off(channel: string, callback: (...args: any[]) => void): void;
  invoke(channel: string, ...args: any[]): Promise<any>;
  send(channel: string, ...args: any[]): void;
}

// 创建事件监听器管理器
class EventListenerManager {
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  
  addListener(channel: string, callback: (...args: any[]) => void): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    
    const listeners = this.listeners.get(channel)!;
    listeners.add(callback);
    
    // 如果是第一个监听器，注册IPC监听
    if (listeners.size === 1) {
      ipcRenderer.on(channel, (_, ...args) => {
        listeners.forEach(listener => {
          try {
            listener(...args);
          } catch (error) {
            console.error(`Error in listener for channel ${channel}:`, error);
          }
        });
      });
    }
    
    // 返回移除监听器的函数
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        ipcRenderer.removeAllListeners(channel);
        this.listeners.delete(channel);
      }
    };
  }
  
  removeListener(channel: string, callback: (...args: any[]) => void): void {
    const listeners = this.listeners.get(channel);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        ipcRenderer.removeAllListeners(channel);
        this.listeners.delete(channel);
      }
    }
  }
  
  removeAllListeners(): void {
    for (const channel of this.listeners.keys()) {
      ipcRenderer.removeAllListeners(channel);
    }
    this.listeners.clear();
  }
}

const eventManager = new EventListenerManager();

// 定义暴露给渲染进程的API
const electronAPI: ElectronAPI = {
  // 应用状态
  getAppState: () => ipcRenderer.invoke('get-app-state'),
  
  // 语音控制API
  voice: {
    startRecognition: () => ipcRenderer.invoke('voice-start-recognition'),
    stopRecognition: () => ipcRenderer.invoke('voice-stop-recognition'),
    // 兼容旧接口别名
    startListening: () => ipcRenderer.invoke('voice-start-recognition'),
    stopListening: () => ipcRenderer.invoke('voice-stop-recognition'),
    speak: (text: string) => ipcRenderer.invoke('voice-speak', text),
    stopSpeaking: () => ipcRenderer.invoke('voice-stop-speaking'),
    testAllModels: (audioData: ArrayBuffer) => ipcRenderer.invoke('voice-test-all-models', audioData),
    onRecognitionResult: (callback) => eventManager.addListener('voice-recognition-result', callback),
    onStateChange: (callback) => eventManager.addListener('voice-state-change', callback)
  },
  
  // AI服务API
  ai: {
    processMessage: (message: string) => ipcRenderer.invoke('ai-process-message', message),
    processMessageStream: (message: string) => ipcRenderer.invoke('ai-process-message-stream', message),
    processMessageWithTools: (message: string) => ipcRenderer.invoke('ai-process-with-tools', message),
    clearHistory: () => ipcRenderer.invoke('ai-clear-history'),
    generateSummary: (text: string) => ipcRenderer.invoke('ai-generate-summary', text),
    // 直接执行一次网络搜索（用于设置中的连接测试）
    searchWeb: (query: string, maxResults?: number) => ipcRenderer.invoke('ai-search-web', query, maxResults),
    onResponse: (callback) => eventManager.addListener('ai-response', callback),
    onStateChange: (callback) => eventManager.addListener('ai-state-change', callback),
    onStreamChunk: (callback: (chunk: string) => void) => {
      const listener = (_: any, chunk: string) => callback(chunk);
      ipcRenderer.on('ai-stream-chunk', listener);
      return () => ipcRenderer.removeListener('ai-stream-chunk', listener);
    },
    onStreamEnd: (callback: (result: { success: boolean; content?: string; error?: string }) => void) => {
      const listener = (_: any, result: any) => callback(result);
      ipcRenderer.on('ai-stream-end', listener);
      return () => ipcRenderer.removeListener('ai-stream-end', listener);
    }
  },
  
  // 桌面识别API
  desktop: {
    captureScreen: (options?: any) => ipcRenderer.invoke('desktop-capture-screen', options),
    analyzeScreen: (options?: any) => ipcRenderer.invoke('desktop-analyze-screen', options),
    getDisplays: () => ipcRenderer.invoke('desktop-get-displays'),
    onAnalysisResult: (callback) => eventManager.addListener('desktop-analysis-result', callback),
    onStateChange: (callback) => eventManager.addListener('desktop-state-change', callback)
  },
  
  // 医疗服务API
  medical: {
    searchPatients: (query: string, options?: any) => ipcRenderer.invoke('medical-search-patients', query, options),
    getPatient: (patientId: string) => ipcRenderer.invoke('medical-get-patient', patientId),
    onSearchResult: (callback) => eventManager.addListener('medical-search-result', callback),
    onStateChange: (callback) => eventManager.addListener('medical-state-change', callback)
  },

  // Bisheng 智能体服务API
  bisheng: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke('bisheng-login', username, password),
    getWorkflows: (pageSize?: number, pageNum?: number) =>
      ipcRenderer.invoke('bisheng-get-workflows', pageSize, pageNum),
    invokeWorkflow: (
      workflowId: string,
      input: any,
      stream?: boolean,
      sessionId?: string,
      messageId?: string,
      inputNodeId?: string
    ) =>
      ipcRenderer.invoke('bisheng-invoke-workflow', workflowId, input, stream, sessionId, messageId, inputNodeId),
    stopWorkflow: (workflowId: string, sessionId: string) =>
      ipcRenderer.invoke('bisheng-stop-workflow', workflowId, sessionId),
    onStreamStart: (callback: (e: { streamId: string; workflowId?: string }) => void) =>
      eventManager.addListener('bisheng-stream-start', callback),
    onStreamChunk: (callback: (e: { streamId: string; chunk: string }) => void) =>
      eventManager.addListener('bisheng-stream-chunk', callback),
    onStreamEnd: (callback: (e: { streamId: string; success: boolean; error?: string }) => void) =>
      eventManager.addListener('bisheng-stream-end', callback),
    getConfig: () =>
      ipcRenderer.invoke('bisheng-get-config'),
    updateConfig: (config: any) =>
      ipcRenderer.invoke('bisheng-update-config', config),
    isAuthenticated: () =>
      ipcRenderer.invoke('bisheng-is-authenticated'),
    getProxyStatus: () =>
      ipcRenderer.invoke('bisheng-get-proxy-status'),
    testWorkflowList: () =>
      ipcRenderer.invoke('bisheng-test-workflow-list'),
    testWorkflowInvoke: (workflowId: string) =>
      ipcRenderer.invoke('bisheng-test-workflow-invoke', workflowId),
    runConnectionTests: () =>
      ipcRenderer.invoke('bisheng-run-connection-tests')
  },

  // 配置管理API
  config: {
    get: (key?: string) => ipcRenderer.invoke('config-get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('config-set', key, value),
    update: (config: Partial<AppConfig>) => ipcRenderer.invoke('config-update', config),
    reset: () => ipcRenderer.invoke('config-reset'),
    onChange: (callback) => eventManager.addListener('config-changed', callback)
  },
  
  // 窗口控制API
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    close: () => ipcRenderer.invoke('window-close'),
    toggleAlwaysOnTop: () => ipcRenderer.invoke('window-toggle-always-on-top'),
    showMain: () => ipcRenderer.invoke('window-show-main'),
    hideMain: () => ipcRenderer.invoke('window-hide-main'),
    toggleMain: () => ipcRenderer.invoke('window-toggle-main'),
    showFloating: () => ipcRenderer.invoke('window-show-floating'),
    hideFloating: () => ipcRenderer.invoke('window-hide-floating'),
    showVoice: () => ipcRenderer.invoke('window-show-voice'),
    // 默认针对浮动窗隐藏
    hide: () => ipcRenderer.invoke('window-hide-floating')
  },
  
  // 应用控制API
  app: {
    quit: () => ipcRenderer.invoke('app-quit'),
    minimizeToTray: () => ipcRenderer.invoke('app-minimize-to-tray'),
    getVersion: () => ipcRenderer.invoke('app-get-version'),
    getStatus: () => ipcRenderer.invoke('get-app-status'),
    setVisibility: (visible: boolean) => ipcRenderer.invoke('app:setVisibility', visible),
    reportError: (error: any) => ipcRenderer.invoke('app:reportError', error),
    reportPerformance: (payload: any) => ipcRenderer.invoke('app:reportPerformance', payload),
    restart: () => ipcRenderer.invoke('app:restart'),
    toggleDevTools: () => ipcRenderer.invoke('dev-toggle-devtools'),
    showNotification: (options: { title: string; body: string; silent?: boolean }) =>
      ipcRenderer.invoke('notification-show', options),
    createReminder: () => ipcRenderer.invoke('app:createReminder')
  },
  
  // 快捷键API
  shortcuts: {
    onTriggered: (callback) => eventManager.addListener('shortcut-triggered', callback)
  },
  
  // 导航API
  navigation: {
    onNavigateTo: (callback) => eventManager.addListener('navigate-to', callback)
  },

  // 屏幕截图API
  screenshot: {
    capture: (options?: any) => ipcRenderer.invoke('screenshot:capture', options),
    captureWindow: (windowTitle?: string) => ipcRenderer.invoke('screenshot:captureWindow', windowTitle),
    checkPermissions: () => ipcRenderer.invoke('screenshot:checkPermissions'),
    getDisplays: () => ipcRenderer.invoke('screenshot:getDisplays')
  },

  // 通用事件监听
  on: (channel: string, callback: (...args: any[]) => void) => {
    return eventManager.addListener(channel, callback);
  },
  
  off: (channel: string, callback: (...args: any[]) => void) => {
    eventManager.removeListener(channel, callback);
  },
  
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
  
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  }
};

// 暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 暴露一些有用的Node.js API（安全的子集）
contextBridge.exposeInMainWorld('nodeAPI', {
  platform: process.platform,
  arch: process.arch,
  versions: process.versions
});

// 开发模式下的调试工具
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('devTools', {
    openDevTools: () => {
      ipcRenderer.send('open-dev-tools');
    },
    reload: () => {
      ipcRenderer.send('reload-window');
    },
    log: (...args: any[]) => {
      console.log('[Renderer]', ...args);
    },
    error: (...args: any[]) => {
      console.error('[Renderer]', ...args);
    }
  });
}

// 清理函数（当窗口关闭时调用）
window.addEventListener('beforeunload', () => {
  eventManager.removeAllListeners();
});

// 类型声明（用于TypeScript支持）
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    nodeAPI: {
      platform: string;
      arch: string;
      versions: NodeJS.ProcessVersions;
    };
    devTools?: {
      openDevTools(): void;
      reload(): void;
      log(...args: any[]): void;
      error(...args: any[]): void;
    };
  }
}

export {};
