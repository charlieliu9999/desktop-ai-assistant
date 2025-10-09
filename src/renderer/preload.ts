import { contextBridge, ipcRenderer } from 'electron';
import { Logger } from '../utils/logger';

const logger = new Logger('Preload');

// 定义API接口
export interface ElectronAPI {
  // 桌面识别相关
  desktop: {
    captureScreen(): Promise<string>;
    getActiveWindow(): Promise<any>;
    extractText(imageData: string): Promise<string>;
  };
  
  // 语音服务相关
  voice: {
    startListening(): Promise<boolean>;
    stopListening(): Promise<void>;
    speak(text: string): Promise<void>;
    onSpeechResult(callback: (result: string) => void): void;
    onSpeechEnd(callback: () => void): void;
    onSpeechError(callback: (error: string) => void): void;
  };
  
  // AI服务相关
  ai: {
    processQuery(query: string, context?: any): Promise<any>;
    getSuggestions(context: any): Promise<any[]>;
  };
  
  // 医疗系统集成相关
  medical: {
    getPatientInfo(patientId: string): Promise<any>;
    getWorklist(): Promise<any[]>;
    searchPatients(query: string): Promise<any[]>;
    getStudyDetails(studyId: string): Promise<any>;
  };
  
  // Bisheng 智能体服务相关
  bisheng: {
    login(username: string, password: string): Promise<{ token: string; expiry: number }>;
    getWorkflows(pageSize?: number, pageNum?: number): Promise<any[]>;
    invokeWorkflow(
      workflowId: string,
      input: any,
      stream?: boolean,
      sessionId?: string,
      messageId?: string
    ): Promise<ReadableStream>;
    getConfig(): Promise<any>;
    updateConfig(config: any): Promise<boolean>;
    isAuthenticated(): Promise<boolean>;
    getProxyStatus(): Promise<{ running: boolean; port: number }>;
  };
  
  // 配置相关
  config: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    getAll(): Promise<any>;
  };
  
  // 窗口管理相关
  window: {
    showFloating(options?: any): Promise<void>;
    hideFloating(): Promise<void>;
    showSettings(): Promise<void>;
    close(): void;
    minimize(): void;
    maximize(): void;
    toggleMaximize(): void;
  };
  
  // 系统相关
  system: {
    getSystemInfo(): Promise<any>;
    openExternal(url: string): Promise<void>;
    showInFolder(path: string): Promise<void>;
  };
  
  // 事件监听
  events: {
    on(channel: string, callback: (...args: any[]) => void): void;
    off(channel: string, callback: (...args: any[]) => void): void;
    once(channel: string, callback: (...args: any[]) => void): void;
  };
  
  // 通知相关
  notifications: {
    show(title: string, body: string, options?: any): Promise<void>;
    onNotificationClick(callback: (notificationId: string) => void): void;
  };
}

// 实现API
const electronAPI: ElectronAPI = {
  // 桌面识别相关
  desktop: {
    captureScreen: () => ipcRenderer.invoke('desktop:capture-screen'),
    getActiveWindow: () => ipcRenderer.invoke('desktop:get-active-window'),
    extractText: (imageData: string) => ipcRenderer.invoke('desktop:ocr-text', imageData)
  },
  
  // 语音服务相关
  voice: {
    startListening: () => ipcRenderer.invoke('voice:start-listening'),
    stopListening: () => ipcRenderer.invoke('voice:stop-listening'),
    speak: (text: string) => ipcRenderer.invoke('voice:speak', text),
    onSpeechResult: (callback: (result: string) => void) => {
      ipcRenderer.on('voice:speech-result', (_, result) => callback(result));
    },
    onSpeechEnd: (callback: () => void) => {
      ipcRenderer.on('voice:speech-end', () => callback());
    },
    onSpeechError: (callback: (error: string) => void) => {
      ipcRenderer.on('voice:speech-error', (_, error) => callback(error));
    }
  },
  
  // AI服务相关
  ai: {
    processQuery: (query: string, context?: any) => 
      ipcRenderer.invoke('ai:process-query', query, context),
    getSuggestions: (context: any) => 
      ipcRenderer.invoke('ai:get-suggestions', context)
  },
  
  // 医疗系统集成相关
  medical: {
    getPatientInfo: (patientId: string) => 
      ipcRenderer.invoke('medical:get-patient-info', patientId),
    getWorklist: () => 
      ipcRenderer.invoke('medical:get-worklist'),
    searchPatients: (query: string) => 
      ipcRenderer.invoke('medical:search-patients', query),
    getStudyDetails: (studyId: string) => 
      ipcRenderer.invoke('medical:get-study-details', studyId)
  },
  
  // Bisheng 智能体服务相关
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
      messageId?: string
    ) => 
      ipcRenderer.invoke('bisheng-invoke-workflow', workflowId, input, stream, sessionId, messageId),
    getConfig: () => 
      ipcRenderer.invoke('bisheng-get-config'),
    updateConfig: (config: any) => 
      ipcRenderer.invoke('bisheng-update-config', config),
    isAuthenticated: () => 
      ipcRenderer.invoke('bisheng-is-authenticated'),
    getProxyStatus: () => 
      ipcRenderer.invoke('bisheng-get-proxy-status')
  },
  
  // 配置相关
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
    getAll: () => ipcRenderer.invoke('config:get-all')
  },
  
  // 窗口管理相关
  window: {
    showFloating: (options?: any) => ipcRenderer.invoke('window:show-floating', options),
    hideFloating: () => ipcRenderer.invoke('window:hide-floating'),
    showSettings: () => ipcRenderer.invoke('window:show-settings'),
    close: () => ipcRenderer.invoke('window:close'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize')
  },
  
  // 系统相关
  system: {
    getSystemInfo: () => ipcRenderer.invoke('system:get-info'),
    openExternal: (url: string) => ipcRenderer.invoke('system:open-external', url),
    showInFolder: (path: string) => ipcRenderer.invoke('system:show-in-folder', path)
  },
  
  // 事件监听
  events: {
    on: (channel: string, callback: (...args: any[]) => void) => {
      const validChannels = [
        'voice:speech-result',
        'voice:speech-end',
        'voice:speech-error',
        'medical:worklist-updated',
        'medical:patient-updated',
        'ai:suggestion-ready',
        'desktop:window-changed',
        'desktop:clipboard-changed',
        'system:notification',
        'config:changed',
        'suggestions-data'
      ];
      
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, callback);
      } else {
        logger.warn(`Invalid channel: ${channel}`);
      }
    },
    
    off: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.off(channel, callback);
    },
    
    once: (channel: string, callback: (...args: any[]) => void) => {
      const validChannels = [
        'voice:speech-result',
        'voice:speech-end',
        'voice:speech-error',
        'medical:worklist-updated',
        'medical:patient-updated',
        'ai:suggestion-ready',
        'desktop:window-changed',
        'desktop:clipboard-changed',
        'system:notification',
        'config:changed',
        'suggestions-data'
      ];
      
      if (validChannels.includes(channel)) {
        ipcRenderer.once(channel, callback);
      } else {
        logger.warn(`Invalid channel: ${channel}`);
      }
    }
  },
  
  // 通知相关
  notifications: {
    show: (title: string, body: string, options?: any) => 
      ipcRenderer.invoke('notifications:show', title, body, options),
    onNotificationClick: (callback: (notificationId: string) => void) => {
      ipcRenderer.on('notifications:click', (_, notificationId) => callback(notificationId));
    }
  }
};

// 暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 暴露版本信息
contextBridge.exposeInMainWorld('versions', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
  app: process.env.npm_package_version || '1.0.0'
});

// 开发模式下的调试工具
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('debug', {
    log: (...args: any[]) => console.log('[Preload]', ...args),
    error: (...args: any[]) => console.error('[Preload]', ...args),
    warn: (...args: any[]) => console.warn('[Preload]', ...args),
    info: (...args: any[]) => console.info('[Preload]', ...args)
  });
}

// 全局错误处理
window.addEventListener('error', (event) => {
  logger.error('Renderer process error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection:', event.reason);
});

logger.info('Preload script loaded successfully');

// 导出类型定义供TypeScript使用
export type { ElectronAPI };