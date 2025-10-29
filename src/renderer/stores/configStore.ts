import { create } from 'zustand';
import { apiClient } from '../../services/api-client';
import type { AppConfig } from '../../shared/types';

interface ConfigState {
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
  resetConfig: () => void;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
}

const defaultConfig: AppConfig = {
  version: "1.0.0",
  firstRun: false,
  theme: 'glass',
  language: 'zh-CN',
  windows: {
    main: {
      width: 480,
      height: 996,
      x: 0, // 将在窗口管理器中计算为靠右位置
      y: 0,
      alwaysOnTop: false,
      opacity: 1,
      alignRight: true, // 靠右显示
      glassEffect: { enabled: false, opacity: 0.15, blur: 40, saturation: 200 }
    },
    floating: {
      width: 400,
      height: 300,
      alwaysOnTop: true,
      opacity: 0.9,
      glassEffect: { enabled: false, opacity: 0.18, blur: 30, saturation: 180 }
    },
    voice: {
      width: 300,
      height: 200,
      alwaysOnTop: true,
      opacity: 0.95
    }
  },
  shortcuts: {
    enabled: true,
    toggleMainWindow: 'CommandOrControl+Shift+A',
    toggleFloatingWindow: 'CommandOrControl+Shift+F',
    voiceInput: 'CommandOrControl+Shift+V',
    screenCapture: 'CommandOrControl+Shift+S',
    quickSearch: 'CommandOrControl+Shift+Q',
    showSettings: 'CommandOrControl+Comma',
    quit: 'CommandOrControl+Q'
  },
  voice: {
    enabled: true,
    recognition: {
      enabled: true,
      model: 'browser',
      language: 'zh-CN',
      continuous: false,
      interimResults: true,
      maxAlternatives: 1,
      hotwordEnabled: true,
      hotwords: ['小助手'],
      sensitivity: 0.7,
      noiseReduction: true,
      echoCancellation: true,
      autoGainControl: true,
      sampleRate: 16000,
      channels: 1,
      voiceActivityDetection: true,
      silenceTimeout: 3000,
      speechTimeout: 10000,
      // Whisper 配置
      whisper: {
        model: 'base',
        device: 'cpu',
        computeType: 'int8',
        language: 'zh',
        temperature: 0.0,
        beamSize: 5,
        bestOf: 5,
        patience: 1.0,
        lengthPenalty: 1.0,
        suppressTokens: '-1',
        initialPrompt: '',
        conditionOnPreviousText: true,
        fp16: false,
        compressionRatioThreshold: 2.4,
        logProbThreshold: -1.0,
        noSpeechThreshold: 0.6
      },
      // FunASR 配置
      funasr: {
        model: 'paraformer-zh',
        modelRevision: 'v2.0.4',
        device: 'cpu',
        batchSize: 1,
        language: 'zh',
        hotwords: ['小助手', '医生', '患者', '诊断', '治疗'],
        useItn: true,
        usePunctuation: true,
        useTimestamp: false,
        maxLength: 500,
        minLength: 1,
        beamSize: 5,
        temperature: 1.0
      }
    },
    synthesis: {
      enabled: true,
      voice: 'default',
      rate: 1,
      pitch: 1,
      volume: 0.8
    }
  },
  ai: {
    enabled: true,
    provider: 'local',
    apiKey: '',
    apiUrl: 'http://127.0.0.1:11434/v1/chat/completions',
    model: 'qwen3:30b',
    temperature: 0.7,
    maxTokens: 2048,
    maxHistory: 10,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    systemPrompt: '你是一个智能桌面助手，可以帮助用户处理各种任务。当用户询问需要最新信息的问题时，你可以使用网络搜索功能来获取实时数据。',
    contextLength: 4096,
    streamResponse: true,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    rateLimitRpm: 60,
    rateLimitTpm: 10000,
    // 网络搜索配置
    webSearch: {
      enabled: true,
      provider: 'duckduckgo', // 默认使用 DuckDuckGo（无需 API Key）
      apiKey: '',
      apiUrl: '',
      searchEngineId: '',
      maxResults: 5,
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimitRpm: 30,
      safeSearch: true,
      language: 'zh-CN',
      region: 'CN'
    },
    // 工具调用配置
    toolsEnabled: true,
    availableTools: ['web_search']
  },
  aiImage: {
    enabled: true,
    provider: 'local',
    apiKey: '',
    apiUrl: 'http://127.0.0.1:11434/api/generate',
    model: 'qwen2.5vl:latest',
    temperature: 0.1,
    maxTokens: 1000,
    systemPrompt: '你是一个专业的医疗信息提取助手。请从医疗文档截图中提取患者信息，包括姓名、年龄、性别、患者ID、科室、主诉、诊断和病史。请以JSON格式返回结果。',
    contextLength: 4096,
    timeout: 60000,
    retryAttempts: 3,
    retryDelay: 1000,
    rateLimitRpm: 30,
    rateLimitTpm: 5000,
    extractionMode: 'freeform'
  },
  aiRecommend: {
    enabled: true,
    provider: 'local',
    apiKey: '',
    apiUrl: 'http://127.0.0.1:11434/v1/chat/completions',
    temperature: 0.3,
    maxTokens: 1200,
    diagnosisModel: 'qwen3:30b',
    diagnosisPrompt: '请根据患者信息生成可能的诊断列表，采用Markdown有序列表，每项附简短依据与置信度（0-1）。',
    examModel: 'qwen3:30b',
    examPrompt: '请根据患者信息列出需要完善的检查项目（血常规、生化、影像等），采用Markdown有序列表，并说明每项的目的和预期价值。',
    medicationModel: 'qwen3:30b',
    medicationPrompt: '请根据患者信息给出初步用药建议（如有禁忌需注明），采用Markdown有序列表，并说明每种药物的适应理由。'
  },
  oneClick: {
    enabled: true,
    showScreenshot: false,
    showPatientInfo: true,
    generate: { diagnosis: true, exam: true, medication: true },
    allowFollowUp: true,
    followUpModelSameAsRecommend: true,
    exposeInAssistant: false,
    provider: 'local',
    apiUrl: 'http://127.0.0.1:11434/v1/chat/completions',
    model: 'qwen3:30b',
    temperature: 0.3,
    maxTokens: 1500,
    voiceTrigger: false,
    voiceHotword: '小助手'
  },
  medical: {
    enabled: true,
    apiUrl: 'http://127.0.0.1:8010/api',
    apiKey: '',
    username: '',
    password: '',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
    cacheEnabled: true,
    cacheTtl: 300000,
    rateLimitRpm: 60,
    endpoints: {
      patients: '/patients',
      records: '/records',
      diagnoses: '/diagnoses',
      treatments: '/treatments',
      medications: '/medications',
      appointments: '/appointments'
    },
    features: {
      patientSearch: true,
      recordAccess: true,
      diagnosisAssist: true,
      treatmentPlan: true,
      medicationCheck: true,
      appointmentSync: true
    }
  },
  bisheng: {
    enabled: true,  // 默认启用智能体功能
    baseUrl: 'http://localhost:7860',
    frontendUrl: 'http://localhost:3001',
    iframeProxyPort: 3002,
    username: '',
    password: '',
    accessToken: '',
    tokenExpiry: 0,
    mode: 'api',
    autoLogin: false,
    savePassword: false,
    timeout: 120000,
    retryAttempts: 3
  },
  desktopRecognition: {
    enabled: false,
    ocrEnabled: true,
    accessibilityEnabled: true,
    screenCaptureInterval: 5000,
    autoAnalyze: false,
    monitoringInterval: 30,
    screenshotQuality: 'medium',
    ocrLanguages: ['zh-CN', 'en-US'],
    confidenceThreshold: 0.8,
    excludeApps: [],
    includeApps: [],
    sensitiveDataFilter: true,
    dataRetention: 86400000
  },
  privacy: {
    dataCollection: false,
    analytics: false,
    crashReports: true,
    localProcessing: true,
    dataEncryption: true,
    autoCleanup: true,
    cleanupInterval: 86400000,
    sensitiveDataMask: true,
    auditLog: true,
    dataExport: false
  },
  notifications: {
    enabled: true,
    sound: true,
    badge: true,
    position: 'top-right',
    duration: 5000,
    maxCount: 5,
    priority: 'normal',
    categories: {
      system: true,
      voice: true,
      ai: true,
      medical: true,
      error: true
    }
  },
  startup: {
    autoStart: false,
    minimizeToTray: true,
    showFloatingWindow: false,
    checkUpdates: true
  },
  performance: {
    hardwareAcceleration: true,
    backgroundThrottling: true,
    memoryLimit: 512,
    cpuLimit: 50,
    diskCacheSize: 100,
    networkTimeout: 10000,
    maxConcurrentRequests: 5,
    debounceDelay: 300,
    throttleDelay: 100
  },
  logging: {
    level: 'info',
    file: true,
    console: true,
    remote: false,
    maxFileSize: 10,
    maxFiles: 5
  }
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: defaultConfig,

  // 轻量级运行时配置校验与修正（无需第三方依赖）
  // 仅校验关键字段类型，异常时回退默认值并打印告警
  _validateAndFix(partial: any): AppConfig {
    const warn = (msg: string) => { try { console.warn(msg); } catch {} };
    const cfg: any = { ...defaultConfig, ...(partial || {}) };

    // ai
    cfg.ai = cfg.ai || {};
    if (typeof cfg.ai.provider !== 'string') { warn('[config] ai.provider 非法，已回退'); cfg.ai.provider = defaultConfig.ai.provider; }
    if (typeof cfg.ai.apiUrl !== 'string') { warn('[config] ai.apiUrl 非法，已回退'); cfg.ai.apiUrl = defaultConfig.ai.apiUrl; }
    if (typeof cfg.ai.model !== 'string') { warn('[config] ai.model 非法，已回退'); cfg.ai.model = defaultConfig.ai.model; }
    if (typeof cfg.ai.temperature !== 'number') { cfg.ai.temperature = Number(cfg.ai.temperature) || defaultConfig.ai.temperature; }
    if (typeof cfg.ai.maxTokens !== 'number') { cfg.ai.maxTokens = Number(cfg.ai.maxTokens) || defaultConfig.ai.maxTokens; }

    // aiImage
    cfg.aiImage = cfg.aiImage || {};
    const dImg = (defaultConfig.aiImage || {}) as any;
    if (typeof cfg.aiImage.provider !== 'string') { cfg.aiImage.provider = dImg.provider || 'local'; }
    if (typeof cfg.aiImage.apiUrl !== 'string') { cfg.aiImage.apiUrl = dImg.apiUrl || ''; }
    if (typeof cfg.aiImage.model !== 'string') { cfg.aiImage.model = dImg.model || ''; }
    if (typeof cfg.aiImage.temperature !== 'number') { cfg.aiImage.temperature = Number(cfg.aiImage.temperature) || (dImg.temperature ?? 0.1); }
    if (typeof cfg.aiImage.maxTokens !== 'number') { cfg.aiImage.maxTokens = Number(cfg.aiImage.maxTokens) || (dImg.maxTokens ?? 1000); }

    // aiRecommend
    cfg.aiRecommend = cfg.aiRecommend || {};
    const dRec = (defaultConfig.aiRecommend || {}) as any;
    if (typeof cfg.aiRecommend.apiUrl !== 'string') { cfg.aiRecommend.apiUrl = dRec.apiUrl || ''; }
    if (typeof cfg.aiRecommend.temperature !== 'number') { cfg.aiRecommend.temperature = Number(cfg.aiRecommend.temperature) || (dRec.temperature ?? 0.3); }
    if (!cfg.aiRecommend.diagnosisModel) cfg.aiRecommend.diagnosisModel = dRec.diagnosisModel || 'qwen3:30b';
    if (!cfg.aiRecommend.examModel) cfg.aiRecommend.examModel = dRec.examModel || 'qwen3:30b';
    if (!cfg.aiRecommend.medicationModel) cfg.aiRecommend.medicationModel = dRec.medicationModel || 'qwen3:30b';

    // oneClick 基本字段
    cfg.oneClick = cfg.oneClick || {};
    const dOne = (defaultConfig.oneClick || {}) as any;
    if (typeof cfg.oneClick.provider !== 'string') cfg.oneClick.provider = dOne.provider || 'local';
    if (typeof cfg.oneClick.apiUrl !== 'string') cfg.oneClick.apiUrl = dOne.apiUrl || '';
    if (typeof cfg.oneClick.model !== 'string') cfg.oneClick.model = dOne.model || '';
    if (typeof cfg.oneClick.temperature !== 'number') cfg.oneClick.temperature = Number(cfg.oneClick.temperature) || (dOne.temperature ?? 0.3);
    if (typeof cfg.oneClick.maxTokens !== 'number') cfg.oneClick.maxTokens = Number(cfg.oneClick.maxTokens) || (dOne.maxTokens ?? 1500);

    // medical 基础
    cfg.medical = cfg.medical || {};
    if (typeof cfg.medical.apiUrl !== 'string') cfg.medical.apiUrl = defaultConfig.medical.apiUrl;

    return cfg as AppConfig;
  },

  updateConfig: (updates: Partial<AppConfig>) => {
    set((state) => {
      // 深度合并windows配置
      const mergedWindows = updates.windows ? {
        ...state.config.windows,
        main: updates.windows.main ? {
          ...state.config.windows.main,
          ...updates.windows.main,
          glassEffect: updates.windows.main.glassEffect !== undefined ? 
            (state.config.windows.main.glassEffect ? {
              ...state.config.windows.main.glassEffect,
              ...updates.windows.main.glassEffect,
            } : updates.windows.main.glassEffect) : 
            state.config.windows.main.glassEffect,
        } : state.config.windows.main,
        floating: updates.windows.floating ? {
          ...state.config.windows.floating,
          ...updates.windows.floating,
          glassEffect: updates.windows.floating.glassEffect !== undefined ?
            (state.config.windows.floating.glassEffect ? {
              ...state.config.windows.floating.glassEffect,
              ...updates.windows.floating.glassEffect,
            } : updates.windows.floating.glassEffect) :
            state.config.windows.floating.glassEffect,
        } : state.config.windows.floating,
        voice: updates.windows.voice ? {
          ...state.config.windows.voice,
          ...updates.windows.voice,
        } : state.config.windows.voice,
      } : state.config.windows;

      const newConfig = {
        ...state.config,
        ...updates,
        windows: mergedWindows,
        voice: updates.voice ? { ...state.config.voice, ...updates.voice } : state.config.voice,
        shortcuts: updates.shortcuts ? { ...state.config.shortcuts, ...updates.shortcuts } : state.config.shortcuts,
        privacy: updates.privacy ? { ...state.config.privacy, ...updates.privacy } : state.config.privacy,
        medical: updates.medical ? { ...state.config.medical, ...updates.medical } : state.config.medical,
        ai: updates.ai ? { ...state.config.ai, ...updates.ai } : state.config.ai,
        aiImage: updates.aiImage ? { ...state.config.aiImage, ...updates.aiImage } : state.config.aiImage,
        aiRecommend: updates.aiRecommend ? { ...state.config.aiRecommend, ...updates.aiRecommend } : state.config.aiRecommend,
        oneClick: updates.oneClick ? { ...state.config.oneClick, ...updates.oneClick } : state.config.oneClick,
        bisheng: updates.bisheng ? { ...state.config.bisheng, ...updates.bisheng } : state.config.bisheng,
        desktopRecognition: updates.desktopRecognition ? { ...state.config.desktopRecognition, ...updates.desktopRecognition } : state.config.desktopRecognition,
        notifications: updates.notifications ? { ...state.config.notifications, ...updates.notifications } : state.config.notifications,
        startup: updates.startup ? { ...state.config.startup, ...updates.startup } : state.config.startup,
        performance: updates.performance ? { ...state.config.performance, ...updates.performance } : state.config.performance,
        logging: updates.logging ? { ...state.config.logging, ...updates.logging } : state.config.logging,
      } as AppConfig;

      console.log('📝 配置更新 (仅内存):', { updates, newConfig });

      return { config: newConfig };
    });

    // 注意：不再自动持久化，需要手动调用 saveConfig() 来保存
    // 这样可以让用户批量修改后一次性保存，并且可以取消未保存的更改
  },

  resetConfig: () => {
    set({ config: defaultConfig });
    get().saveConfig();
  },

  loadConfig: async () => {
    try {
      // 优先从后端加载完整配置
      let backendConfig: any = null;
      try {
        const res = await apiClient.getFullConfig();
        if (res && res.success && res.data) {
          backendConfig = res.data;
        }
      } catch {}

      if (backendConfig || window.electronAPI?.config?.get) {
        const mainConfig = backendConfig || await window.electronAPI.config.get();
        
        // 深度合并配置，确保嵌套对象（如glassEffect）不会丢失
        let mergedConfig = {
          ...defaultConfig,
          ...mainConfig,
          windows: {
            main: {
              ...defaultConfig.windows.main,
              ...(mainConfig.windows?.main || {}),
              glassEffect: {
                ...defaultConfig.windows.main.glassEffect,
                ...(mainConfig.windows?.main?.glassEffect || {}),
              },
            },
            floating: {
              ...defaultConfig.windows.floating,
              ...(mainConfig.windows?.floating || {}),
              glassEffect: {
                ...defaultConfig.windows.floating.glassEffect,
                ...(mainConfig.windows?.floating?.glassEffect || {}),
              },
            },
            voice: {
              ...defaultConfig.windows.voice,
              ...(mainConfig.windows?.voice || {}),
            },
          },
          shortcuts: { ...defaultConfig.shortcuts, ...(mainConfig.shortcuts || {}) },
          voice: { ...defaultConfig.voice, ...(mainConfig.voice || {}) },
          ai: { ...defaultConfig.ai, ...(mainConfig.ai || {}) },
          aiImage: { ...defaultConfig.aiImage, ...(mainConfig.aiImage || {}) },
          aiRecommend: { ...defaultConfig.aiRecommend, ...(mainConfig.aiRecommend || {}) },
          oneClick: { ...defaultConfig.oneClick, ...(mainConfig.oneClick || {}) },
          medical: { ...defaultConfig.medical, ...(mainConfig.medical || {}) },
          bisheng: { ...defaultConfig.bisheng, ...(mainConfig.bisheng || {}) },
          desktopRecognition: { ...defaultConfig.desktopRecognition, ...(mainConfig.desktopRecognition || {}) },
          privacy: { ...defaultConfig.privacy, ...(mainConfig.privacy || {}) },
          notifications: { ...defaultConfig.notifications, ...(mainConfig.notifications || {}) },
          startup: { ...defaultConfig.startup, ...(mainConfig.startup || {}) },
          performance: { ...defaultConfig.performance, ...(mainConfig.performance || {}) },
          logging: { ...defaultConfig.logging, ...(mainConfig.logging || {}) },
        };

        // 运行时校验与修正
        try {
          // @ts-ignore - 访问私有方法
          mergedConfig = (useConfigStore.getState() as any)._validateAndFix(mergedConfig);
        } catch (e) {
          try { console.warn('配置校验失败，已回退默认配置字段：', e); } catch {}
        }

        set({ config: mergedConfig });
        console.log('✅ 配置已加载:', { source: backendConfig ? 'backend' : 'main', config: mergedConfig });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  },

  saveConfig: async () => {
    try {
      const current = get().config as any;
      // 优先尝试保存到后端（运行期，不持久化）
      let savedToBackend = false;
      try {
        // 按顶层键分批更新，后端以 extra='allow' 接收
        const topKeys = [
          'theme', 'language', 'windows', 'shortcuts', 'voice', 'ai', 'aiImage', 'aiRecommend', 'oneClick',
          'medical', 'bisheng', 'desktopRecognition', 'privacy', 'notifications', 'startup', 'performance', 'logging'
        ];
        for (const k of topKeys) {
          if (current[k] !== undefined) {
            await apiClient.updateConfigKey(k, current[k]);
          }
        }
        savedToBackend = true;
        console.log('✅ 配置已保存到后端 /v1/config（运行期）');
      } catch (e) {
        console.warn('⚠️ 保存到后端失败，回退到主进程配置桥接：', e);
      }

      // 回退到主进程（用于本地配置持久化）
      if (!savedToBackend && window.electronAPI?.config?.update) {
        await window.electronAPI.config.update(get().config);
        console.log('✅ 配置已通过主进程持久化');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  },
}));

// Load full config on app start
if (typeof window !== 'undefined') {
  useConfigStore.getState().loadConfig();

  try {
    const api: any = (window as any).electronAPI;
    if (api?.config?.onChange) {
      api.config.onChange((evt: any) => {
        // evt 可能为 { key, value } 或 { config }
        try {
          if (evt && typeof evt === 'object') {
            if (evt.config) {
              // 全量更新（来自主进程广播）
              // 利用 updateConfig 执行内置的深度合并与校验
              useConfigStore.getState().updateConfig(evt.config as Partial<AppConfig>);
            } else if (evt.key) {
              useConfigStore.getState().updateConfig({ [evt.key]: evt.value } as any);
            }
          }
        } catch (e) {
          try { console.warn('配置变更事件处理失败:', e); } catch {}
        }
      });
    }
  } catch {}
}
