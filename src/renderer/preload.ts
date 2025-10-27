import { contextBridge, ipcRenderer } from 'electron';
// 预加载脚本：仅做桥接与简单日志输出

// 定义API接口
export interface ElectronAPI {
  // top-level convenience aliases
  closeWindow?: () => Promise<void>;
  minimizeWindow?: () => Promise<void>;
  app?: {
    getStatus: () => Promise<'initializing' | 'ready' | 'error' | 'updating' | 'offline' | 'shutdown'>;
    reportError: (payload: any) => Promise<void>;
    restart: () => Promise<void>;
    toggleDevTools: () => Promise<void>;
    setVisibility: (visible: boolean) => Promise<void>;
    showNotification?: (opts: { title: string; body: string; silent?: boolean }) => Promise<void>;
    createReminder?: () => Promise<{ success: boolean; message?: string }>;
  };
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
    // Extended helpers used by renderer components
    processMessage?(message: string): Promise<string>;
    processMessageStream?(message: string): Promise<void>;
    processMessageWithTools?(content: string): Promise<string>;
    generateSummary?(): Promise<string>;
    clearHistory?(): Promise<void>;
    onStreamChunk?: (cb: (data: any) => void) => () => void;
    onStreamEnd?: (cb: (data: any) => void) => () => void;
  };
  
  // 医疗系统集成相关
  medical: {
    getPatientInfo(patientId: string): Promise<any>;
    getWorklist(): Promise<any[]>;
    searchPatients(query: string): Promise<any[]>;
    getStudyDetails(studyId: string): Promise<any>;
    quickSearch?: (query: string) => Promise<any>;
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
    ): Promise<any>;
    getConfig(): Promise<any>;
    updateConfig(config: any): Promise<boolean>;
    isAuthenticated(): Promise<boolean>;
    getProxyStatus(): Promise<{ running: boolean; port: number }>;
    // Event hooks (no-op if not provided by main)
    onStreamStart?(cb: (ev: any) => void): () => void;
    onStreamChunk?(cb: (ev: any) => void): () => void;
    onStreamEnd?(cb: (ev: any) => void): () => void;
    stopWorkflow?(workflowId: string, sessionId?: string): Promise<void>;
    runConnectionTests?(): Promise<any>;
  };
  
  // 配置相关
  config: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    getAll(): Promise<any>;
    update?(config: any): Promise<void>;
  };
  
  // 窗口管理相关
  window: {
    showFloating(options?: any): Promise<void>;
    hideFloating(): Promise<void>;
    showSettings(): Promise<void>;
    // Aliases used in renderer components
    hide?(): Promise<void>;
    showMain?(): Promise<void>;
    close(): void;
    minimize(): void;
    maximize(): void;
    toggleMaximize(): void;
  };
  // Screen helpers used by some components
  screen?: {
    capture(): Promise<string>;
    captureAndAnalyze(): Promise<any>;
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
  closeWindow: () => ipcRenderer.invoke('window:close'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
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
    // aliases for compatibility
    // @ts-ignore
    startRecognition: () => ipcRenderer.invoke('voice:start-listening'),
    // @ts-ignore
    stopRecognition: () => ipcRenderer.invoke('voice:stop-listening'),
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
      ipcRenderer.invoke('ai:get-suggestions', context),
    // Extended helpers used by renderer components
    processMessage: async (message: string) => {
      const res = await ipcRenderer.invoke('ai:process-query', message, {});
      return typeof res === 'string' ? res : JSON.stringify(res);
    },
    processMessageStream: async (message: string) => {
      await ipcRenderer.invoke('ai:process-query', message, { stream: true });
    },
    processMessageWithTools: async (content: string) => {
      const res = await ipcRenderer.invoke('ai:process-query', content, { tools: true });
      return typeof res === 'string' ? res : JSON.stringify(res);
    },
    generateSummary: async () => {
      const res = await ipcRenderer.invoke('ai:process-query', '请总结', {});
      return typeof res === 'string' ? res : JSON.stringify(res);
    },
    clearHistory: async () => {
      try { await ipcRenderer.invoke('ai:clear-history'); } catch {}
    },
    onStreamChunk: (cb: (data: any) => void) => {
      const handler = (_: any, ev: any) => cb(ev);
      ipcRenderer.on('ai:stream-chunk', handler);
      return () => ipcRenderer.off('ai:stream-chunk', handler);
    },
    onStreamEnd: (cb: (data: any) => void) => {
      const handler = (_: any, ev: any) => cb(ev);
      ipcRenderer.on('ai:stream-end', handler);
      return () => ipcRenderer.off('ai:stream-end', handler);
    }
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
      ipcRenderer.invoke('medical:get-study-details', studyId),
    quickSearch: (query: string) => ipcRenderer.invoke('medical:search-patients', query)
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
      ipcRenderer.invoke('bisheng-get-proxy-status'),
    onStreamStart: (cb: (ev: any) => void) => {
      const handler = (_: any, ev: any) => cb(ev);
      ipcRenderer.on('bisheng:stream-start', handler);
      return () => ipcRenderer.off('bisheng:stream-start', handler);
    },
    onStreamChunk: (cb: (ev: any) => void) => {
      const handler = (_: any, ev: any) => cb(ev);
      ipcRenderer.on('bisheng:stream-chunk', handler);
      return () => ipcRenderer.off('bisheng:stream-chunk', handler);
    },
    onStreamEnd: (cb: (ev: any) => void) => {
      const handler = (_: any, ev: any) => cb(ev);
      ipcRenderer.on('bisheng:stream-end', handler);
      return () => ipcRenderer.off('bisheng:stream-end', handler);
    },
    stopWorkflow: async (workflowId: string, sessionId?: string) => {
      try { await ipcRenderer.invoke('bisheng-stop-workflow', workflowId, sessionId); } catch {}
    },
    runConnectionTests: async () => {
      try { return await ipcRenderer.invoke('bisheng-run-tests'); } catch { return { ok: false }; }
    }
  },
  
  // 配置相关
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
    getAll: () => ipcRenderer.invoke('config:get-all'),
    update: (config: any) => ipcRenderer.invoke('config:update', config)
  },
  
  // 窗口管理相关
  window: {
    showFloating: (options?: any) => ipcRenderer.invoke('window:show-floating', options),
    hideFloating: () => ipcRenderer.invoke('window:hide-floating'),
    showSettings: () => ipcRenderer.invoke('window:show-settings'),
    hide: () => ipcRenderer.invoke('window:hide-floating'),
    showMain: () => ipcRenderer.invoke('window:show-floating'),
    close: () => ipcRenderer.invoke('window:close'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize')
  },
  
  // Screen helpers for convenience
  screen: {
    capture: () => ipcRenderer.invoke('desktop:capture-screen'),
    captureAndAnalyze: async () => {
      const img = await ipcRenderer.invoke('desktop:capture-screen');
      const res = await ipcRenderer.invoke('ai:process-query', 'analyze-image', { image: img });
      return { success: true, analysis: res };
    }
  },
  
  // 系统相关
  system: {
    getSystemInfo: () => ipcRenderer.invoke('system:get-info'),
    openExternal: (url: string) => ipcRenderer.invoke('system:open-external', url),
    showInFolder: (path: string) => ipcRenderer.invoke('system:show-in-folder', path)
  },
  
  // app 辅助
  app: {
    getStatus: () => ipcRenderer.invoke('app:get-status'),
    reportError: (payload: any) => ipcRenderer.invoke('app:report-error', payload),
    restart: () => ipcRenderer.invoke('app:restart'),
    toggleDevTools: () => ipcRenderer.invoke('app:toggle-devtools'),
    setVisibility: (visible: boolean) => ipcRenderer.invoke('app:set-visibility', visible),
    showNotification: (opts: { title: string; body: string; silent?: boolean }) => ipcRenderer.invoke('notifications:show', opts.title, opts.body, { silent: opts.silent }),
    createReminder: async () => ({ success: false, message: 'not implemented' })
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
        try { console.warn(`[Preload] Invalid channel: ${channel}`); } catch {}
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
        try { console.warn(`[Preload] Invalid channel: ${channel}`); } catch {}
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
  try { console.error('[Preload] Renderer error:', event.error); } catch {}
});

window.addEventListener('unhandledrejection', (event) => {
  try { console.error('[Preload] Unhandled rejection:', event.reason); } catch {}
});

try { console.info('[Preload] script loaded'); } catch {}

// 导出类型定义供TypeScript使用
// (types are exported via interface above)
