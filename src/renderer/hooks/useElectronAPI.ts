/**
 * Electron API Hook
 * 提供对Electron API的React封装
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppStatus, AppConfig, VoiceServiceState, AIServiceState, MedicalServiceState } from '../../shared/types';

interface ElectronAPIState {
  isAvailable: boolean;
  status: AppStatus;
  config: AppConfig | null;
  voiceState: VoiceServiceState;
  aiState: AIServiceState;
  medicalState: MedicalServiceState;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
  }>;
  isLoading: boolean;
  error: string | null;
}

interface ElectronAPIActions {
  // 窗口控制
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  hideWindow: () => Promise<void>;
  showMainWindow: () => Promise<void>;
  toggleFloatingWindow: () => Promise<void>;
  
  // 配置管理
  updateConfig: (config: Partial<AppConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
  
  // 语音服务
  startVoiceRecognition: () => Promise<{ success: boolean; error?: string }>;
  stopVoiceRecognition: () => Promise<{ success: boolean; transcript?: string; confidence?: number }>;
  speakText: (text: string) => Promise<{ success: boolean; error?: string }>;
  stopSpeaking: () => Promise<void>;
  
  // AI服务
  processMessage: (message: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  generateSummary: () => Promise<{ success: boolean; content?: string; error?: string }>;
  
  // 医疗集成
  searchPatients: (query: string) => Promise<any>;
  getMedicalRecord: (patientId: string) => Promise<any>;
  
  // 屏幕捕获
  captureScreen: () => Promise<{ success: boolean; data?: string; error?: string }>;
  captureAndAnalyze: () => Promise<{ success: boolean; analysis?: string; error?: string }>;
  
  // 通知
  showNotification: (options: { title: string; body: string; silent?: boolean }) => Promise<void>;
  dismissNotification: (id: string) => void;
  
  // 错误处理
  clearError: () => void;
  reportError: (error: Error) => Promise<void>;
}

export const useElectronAPI = (): ElectronAPIState & ElectronAPIActions => {
  const [state, setState] = useState<ElectronAPIState>({
    isAvailable: false,
    status: 'initializing',
    config: null,
    voiceState: {
      isListening: false,
      isRecognizing: false,
      isProcessing: false,
      audioLevel: 0,
      language: 'zh-CN',
      hotwordDetected: false
    } as unknown as VoiceServiceState,
    aiState: {
      isConnected: false,
      isProcessing: false,
      provider: '',
      model: '',
      tokensUsed: 0,
      requestsCount: 0,
      rateLimitRemaining: 0
    } as unknown as AIServiceState,
    medicalState: {
      isConnected: false,
      isProcessing: false,
      apiUrl: '',
      requestsCount: 0,
      cacheSize: 0,
      rateLimitRemaining: 0
    } as unknown as MedicalServiceState,
    notifications: [],
    isLoading: true,
    error: null
  });

  const initializationRef = useRef(false);
  const listenersRef = useRef<Array<() => void>>([]);

  // 初始化Electron API
  const initialize = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      // 检查Electron API是否可用
      if (!window.electronAPI) {
        setState(prev => ({
          ...prev,
          isAvailable: false,
          isLoading: false,
          error: 'Electron API不可用'
        }));
        return;
      }

      setState(prev => ({ ...prev, isAvailable: true }));

      // 获取初始状态
      const [status, config] = await Promise.all([
        window.electronAPI.app.getStatus(),
        window.electronAPI.config.get()
      ]);

      setState(prev => ({
        ...prev,
        status,
        config,
        isLoading: false
      }));

      // 设置事件监听器
      setupEventListeners();

    } catch (error) {
      console.error('Failed to initialize Electron API:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '初始化失败'
      }));
    }
  }, []);

  // 设置事件监听器
  const setupEventListeners = useCallback(() => {
    if (!window.electronAPI) return;

    // 状态变化监听
    const statusListener = (newStatus: AppStatus) => {
      setState(prev => ({ ...prev, status: newStatus }));
    };

    // 通知监听
    const notificationListener = (notification: any) => {
      const newNotification = {
        id: `notif-${Date.now()}`,
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        timestamp: Date.now()
      };
      
      setState(prev => ({
        ...prev,
        notifications: [newNotification, ...prev.notifications.slice(0, 9)]
      }));
    };

    // 语音状态监听
    const voiceStateListener = (voiceState: VoiceServiceState) => {
      setState(prev => ({ ...prev, voiceState }));
    };

    // AI状态监听
    // 可选：如主进程提供 AI 状态变更事件，可在此注册

    // 医疗服务状态监听
    const medicalStateListener = (medicalState: MedicalServiceState) => {
      setState(prev => ({ ...prev, medicalState }));
    };

    // 注册监听器
    window.electronAPI.app.onStatusChange(statusListener);
    window.electronAPI.notifications.onNotification(notificationListener);
    window.electronAPI.voice.onStateChange(voiceStateListener);
    window.electronAPI.voice.onRecognitionResult(voiceStateListener);
    window.electronAPI.medical.onDataUpdate(medicalStateListener);

    // 保存清理函数
    listenersRef.current = [
      () => window.electronAPI?.app.removeStatusListener?.(statusListener),
      () => window.electronAPI?.notifications.removeNotificationListener?.(notificationListener),
      () => window.electronAPI?.voice.removeVoiceListener?.(voiceStateListener),
      () => window.electronAPI?.medical.removeMedicalListener?.(medicalStateListener)
    ];
  }, []);

  // 窗口控制方法
  const minimizeWindow = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.window.minimize();
    }
  }, []);

  const closeWindow = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.window.close();
    }
  }, []);

  const hideWindow = useCallback(async () => {
    if (window.electronAPI?.window?.hide) {
      await window.electronAPI.window.hide();
    } else if (window.electronAPI?.window?.hideFloating) {
      await window.electronAPI.window.hideFloating();
    }
  }, []);

  const showMainWindow = useCallback(async () => {
    if (window.electronAPI?.window?.showMain) {
      await window.electronAPI.window.showMain();
    } else if (window.electronAPI?.window?.showFloating) {
      await window.electronAPI.window.showFloating();
    }
  }, []);

  const toggleFloatingWindow = useCallback(async () => {
    if (window.electronAPI?.window?.showFloating) {
      await window.electronAPI.window.showFloating();
    }
  }, []);

  // 配置管理方法
  const updateConfig = useCallback(async (config: Partial<AppConfig>) => {
    if (window.electronAPI) {
      // 更新配置的每个属性
      for (const [key, value] of Object.entries(config)) {
        await window.electronAPI.config.set(key, value);
      }
      const newConfig = await window.electronAPI.config.get();
      setState(prev => ({ ...prev, config: newConfig }));
    }
  }, []);

  const resetConfig = useCallback(async () => {
    if (window.electronAPI) {
      // 重置配置需要通过设置默认值实现
      const newConfig = await window.electronAPI.config.get();
      setState(prev => ({ ...prev, config: newConfig }));
    }
  }, []);

  // 语音服务方法
  const startVoiceRecognition = useCallback(async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.voice.startListening();
      return { success: result };
    }
    return { success: false, error: 'API不可用' };
  }, []);

  const stopVoiceRecognition = useCallback(async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.voice.stopListening();
      return { success: result };
    }
    return { success: false };
  }, []);

  const speakText = useCallback(async (text: string) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.voice.speak(text);
      return { success: result };
    }
    return { success: false, error: 'API不可用' };
  }, []);

  const stopSpeaking = useCallback(async () => {
    if (window.electronAPI) {
      // 语音服务没有stopSpeaking方法，可以通过speak空字符串来停止
      await window.electronAPI.voice.speak('');
    }
  }, []);

  // AI服务方法
  const processMessage = useCallback(async (message: string) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.ai.chat([{ role: 'user', content: message }]);
      return { success: true, content: result };
    }
    return { success: false, error: 'API不可用' };
  }, []);

  const generateSummary = useCallback(async () => {
    if (window.electronAPI?.ai?.generateSummary) {
      const result = await window.electronAPI.ai.generateSummary();
      return { success: true, content: result };
    }
    if (window.electronAPI?.ai?.processQuery) {
      const result = await window.electronAPI.ai.processQuery('请总结当前内容');
      return { success: true, content: String(result) };
    }
    return { success: false, error: 'API不可用' };
  }, []);

  // 医疗集成方法
  const searchPatients = useCallback(async (query: string) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.medical.search({ query });
      return { success: true, data: result };
    }
    return { success: false, error: 'API不可用' };
  }, []);

  const getMedicalRecord = useCallback(async (patientId: string) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.medical.getPatient(patientId);
      return { success: true, data: result };
    }
    return { success: false, error: 'API不可用' };
  }, []);

  // 屏幕捕获方法
  const captureScreen = useCallback(async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.screen.capture();
      return { success: true, data: result };
    }
    return { success: false, error: 'API不可用' };
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (window.electronAPI?.screen?.captureAndAnalyze) {
      return await window.electronAPI.screen.captureAndAnalyze();
    }
    return { success: false, error: 'API不可用' };
  }, []);

  // 通知方法
  const showNotification = useCallback(async (options: { title: string; body: string; silent?: boolean }) => {
    if (window.electronAPI) {
      await window.electronAPI.notifications.show(options);
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }));
  }, []);

  // 错误处理方法
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reportError = useCallback(async (error: Error) => {
    if (window.electronAPI) {
      // 通过事件系统报告错误
      window.electronAPI.events.emit('error-report', {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    }
  }, []);

  // 初始化和清理
  useEffect(() => {
    initialize();

    return () => {
      // 清理事件监听器
      listenersRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('Failed to cleanup listener:', error);
        }
      });
      listenersRef.current = [];
    };
  }, [initialize]);

  return {
    ...state,
    minimizeWindow,
    closeWindow,
    hideWindow,
    showMainWindow,
    toggleFloatingWindow,
    updateConfig,
    resetConfig,
    startVoiceRecognition,
    stopVoiceRecognition,
    speakText,
    stopSpeaking,
    processMessage,
    generateSummary,
    searchPatients,
    getMedicalRecord,
    captureScreen,
    captureAndAnalyze,
    showNotification,
    dismissNotification,
    clearError,
    reportError
  };
};

export default useElectronAPI;
