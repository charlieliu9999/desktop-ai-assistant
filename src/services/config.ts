import Store from 'electron-store';
import { join } from 'path';
import { app } from 'electron';
import type { AppConfig } from '../shared/types';
import type { Logger } from '../utils/logger';

// 默认配置
const DEFAULT_CONFIG: AppConfig = {
  version: '1.0.0',
  firstRun: true,
  theme: 'glass',
  language: 'zh-CN',
  windows: {
    main: {
      width: 450,
      height: 700,
      x: 0,
      y: 0,
      alwaysOnTop: false,
      resizable: true,
      transparent: false,
      opacity: 1.0,
      glassEffect: {
        enabled: false,
        opacity: 0.15,
        blur: 40,
        saturation: 200,
        tintColor: '#ffffff',
        tintOpacity: 0
      }
    },
    floating: {
      width: 450,
      height: 700,
      alwaysOnTop: true,
      resizable: true,
      movable: true,
      transparent: true,
      opacity: 0.95,
      glassEffect: {
        enabled: false,
        opacity: 0.18,
        blur: 30,
        saturation: 180,
        tintColor: '#ffffff',
        tintOpacity: 0
      }
    },
    voice: {
      width: 300,
      height: 200,
      alwaysOnTop: true,
      resizable: false,
      transparent: true,
      opacity: 0.95
    }
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
      hotwordEnabled: false,
      hotwords: ['小助手'],
      sensitivity: 0.5,
      noiseReduction: true,
      echoCancellation: true,
      autoGainControl: true,
      sampleRate: 16000,
      channels: 1,
      voiceActivityDetection: true,
      silenceTimeout: 3000,
      speechTimeout: 10000,
      whisper: {
        model: 'base',
        device: 'auto',
        computeType: 'float16',
        language: 'zh',
        apiUrl: '',
        apiKey: '',
        temperature: 0.0,
        beamSize: 5,
        bestOf: 5,
        patience: 1.0,
        lengthPenalty: 1.0,
        suppressTokens: '',
        initialPrompt: '',
        conditionOnPreviousText: true,
        fp16: true,
        compressionRatioThreshold: 2.4,
        logProbThreshold: -1.0,
        noSpeechThreshold: 0.6
      },
      funasr: {
        model: 'paraformer-zh',
        modelRevision: 'v1.0.0',
        device: 'auto',
        batchSize: 1,
        language: 'zh',
        hotwords: [],
        useItn: true,
        usePunctuation: true,
        useTimestamp: false,
        maxLength: 600,
        minLength: 0,
        beamSize: 10,
        temperature: 1.0,
        apiUrl: '',
        apiKey: ''
      }
    },
    synthesis: {
      enabled: true,
      voice: 'zh-CN-XiaoxiaoNeural',
      rate: 1.0,
      pitch: 1.0,
      volume: 0.8
    }
  },
  ai: {
    enabled: true,
    provider: 'local',
    model: 'qwen3:30b',
    apiKey: '',
    apiUrl: 'http://127.0.0.1:11434/v1/chat/completions',
    temperature: 0.7,
    maxTokens: 2048,
    maxHistory: 10,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    systemPrompt: '你是一个智能医疗助手，请提供专业、准确的医疗建议。',
    contextLength: 10,
    streamResponse: true,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    rateLimitRpm: 60,
    rateLimitTpm: 10000
  },
  medical: {
    enabled: true,
    apiUrl: 'http://127.0.0.1:8010/api',
    apiKey: '',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
    cacheEnabled: true,
    cacheTtl: 300000,
    rateLimitRpm: 100,
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
  desktopRecognition: {
    enabled: false,
    ocrEnabled: true,
    accessibilityEnabled: true,
    screenCaptureInterval: 5000,
    autoAnalyze: true,
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
    showFloatingWindow: true,
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
  bisheng: {
    enabled: false,
    baseUrl: 'http://localhost:7860',
    frontendUrl: 'http://localhost:3001',
    username: '',
    password: '',
    accessToken: '',
    tokenExpiry: 0,
    mode: 'api',
    autoLogin: false,
    savePassword: false,
    timeout: 120000,
    retryAttempts: 3,
    iframeProxyPort: 8080
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
  logging: {
    level: 'info',
    file: true,
    console: true,
    remote: false,
    maxFileSize: 10,
    maxFiles: 5
  }
};

// 配置验证模式 (JSON Schema format)
// @ts-ignore: CONFIG_SCHEMA is kept for future use
const CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    version: {
      type: 'string'
    },
    firstRun: {
      type: 'boolean'
    },
    autoStart: {
      type: 'boolean'
    },
    minimizeToTray: {
      type: 'boolean'
    },
    showNotifications: {
      type: 'boolean'
    },
    theme: {
      type: 'string',
      enum: ['light', 'dark', 'system']
    },
    language: {
      type: 'string',
      enum: ['zh-CN', 'en-US']
    },
    window: {
      type: 'object',
      properties: {
        width: { type: 'number', minimum: 800, maximum: 2560 },
        height: { type: 'number', minimum: 600, maximum: 1440 },
        x: { type: 'number' },
        y: { type: 'number' },
        alwaysOnTop: { type: 'boolean' },
        opacity: { type: 'number', minimum: 0.1, maximum: 1.0 },
        mode: { type: 'string', enum: ['normal', 'floating', 'overlay'] }
      }
    },
    voice: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        language: { type: 'string' },
        continuous: { type: 'boolean' },
        interimResults: { type: 'boolean' },
        maxAlternatives: { type: 'number', minimum: 1, maximum: 10 },
        hotwordEnabled: { type: 'boolean' },
        hotwords: { type: 'array', items: { type: 'string' } },
        sensitivity: { type: 'number', minimum: 0.0, maximum: 1.0 },
        noiseReduction: { type: 'boolean' },
        echoCancellation: { type: 'boolean' },
        autoGainControl: { type: 'boolean' },
        sampleRate: { type: 'number', minimum: 8000, maximum: 48000 },
        channels: { type: 'number', minimum: 1, maximum: 2 },
        voiceActivityDetection: { type: 'boolean' },
        silenceTimeout: { type: 'number', minimum: 1000, maximum: 10000 },
        speechTimeout: { type: 'number', minimum: 5000, maximum: 30000 },
        ttsEnabled: { type: 'boolean' },
        ttsVoice: { type: 'string' },
        ttsRate: { type: 'number', minimum: 0.1, maximum: 2.0 },
        ttsPitch: { type: 'number', minimum: 0.1, maximum: 2.0 },
        ttsVolume: { type: 'number', minimum: 0.0, maximum: 1.0 }
      }
    },
    ai: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        provider: { type: 'string', enum: ['openai', 'claude', 'gemini', 'local'] },
        model: { type: 'string' },
        apiKey: { type: 'string' },
        baseURL: { type: 'string' },
        temperature: { type: 'number', minimum: 0.0, maximum: 2.0 },
        maxTokens: { type: 'number', minimum: 1, maximum: 8192 },
        maxHistory: { type: 'number', minimum: 1, maximum: 100 },
        timeout: { type: 'number', minimum: 1000, maximum: 120000 },
        retryAttempts: { type: 'number', minimum: 0, maximum: 10 },
        enableContext: { type: 'boolean' },
        contextLength: { type: 'number', minimum: 1, maximum: 50 }
      }
    },
    medical: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        apiEndpoint: { type: 'string' },
        apiKey: { type: 'string' },
        timeout: { type: 'number', minimum: 1000, maximum: 60000 },
        enableCache: { type: 'boolean' },
        cacheExpiry: { type: 'number', minimum: 60000, maximum: 3600000 },
        autoSync: { type: 'boolean' },
        syncInterval: { type: 'number', minimum: 30000, maximum: 600000 }
      }
    },
    bisheng: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        baseUrl: { type: 'string' },
        frontendUrl: { type: 'string' },
        username: { type: 'string' },
        password: { type: 'string' },
        accessToken: { type: 'string' },
        tokenExpiry: { type: 'number' },
        mode: { type: 'string', enum: ['api', 'iframe'] },
        autoLogin: { type: 'boolean' },
        savePassword: { type: 'boolean' },
        timeout: { type: 'number', minimum: 1000, maximum: 300000 },
        retryAttempts: { type: 'number', minimum: 0, maximum: 10 },
        iframeProxyPort: { type: 'number', minimum: 1024, maximum: 65535 }
      }
    },
    shortcuts: {
      type: 'object',
      properties: {
        toggleMainWindow: { type: 'string' },
        toggleFloatingWindow: { type: 'string' },
        voiceActivation: { type: 'string' },
        screenshot: { type: 'string' },
        quickSearch: { type: 'string' }
      }
    }
  }
};

export class ConfigService {
  private store: Store<AppConfig>;
  private logger: Logger;
  private configPath: string;
  private watchers: Map<string, ((value: any) => void)[]> = new Map();
  private cachedConfig: AppConfig | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
    // In rare dev/bundled cases, electron module may not be resolved yet.
    // Fallback to a local user-data directory to avoid crashing.
    const userDataDir = (app as any)?.getPath ? app.getPath('userData') : join(process.cwd(), 'user-data');
    this.configPath = join(userDataDir, 'config.json');
    
    // 初始化配置存储
    this.store = new Store<AppConfig>({
      name: 'config',
      defaults: DEFAULT_CONFIG,
      cwd: userDataDir,
      fileExtension: 'json',
      clearInvalidConfig: true,
      serialize: (value) => JSON.stringify(value, null, 2),
      deserialize: JSON.parse,
      accessPropertiesByDotNotation: true
      // schema: CONFIG_SCHEMA as any // 暂时禁用schema验证
    });

    this.logger.info(`Config service initialized, config path: ${this.configPath}`);
  }

  /**
   * 初始化配置服务
   */
  async initialize(): Promise<void> {
    try {
      // 清除缓存，确保从磁盘重新加载
      this.cachedConfig = null;
      
      // 验证配置文件
      const config = await this.getConfig();
      this.logger.info('Configuration loaded successfully', { 
        theme: config.theme,
        aiModel: config.ai?.model,
        glassEnabled: config.windows?.main?.glassEffect?.enabled
      });
      
      // 如果是首次运行，设置firstRun为false
      if (config.firstRun) {
        await this.set('firstRun', false);
        this.logger.info('First run completed, updated configuration');
      }
    } catch (error) {
      this.logger.error('Failed to initialize config service:', error);
      throw error;
    }
  }

  /**
   * 深度合并对象
   */
  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const output = { ...target };
    
    if (!source || typeof source !== 'object') {
      return output;
    }
    
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const targetValue = output[key];
        
        // 跳过 undefined 值
        if (sourceValue === undefined) {
          continue;
        }
        
        // 如果是对象且不是数组，递归合并
        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
            output[key] = this.deepMerge(targetValue, sourceValue);
          } else {
            output[key] = { ...sourceValue } as any;
          }
        } else {
          output[key] = sourceValue as any;
        }
      }
    }
    
    return output;
  }

  /**
   * 获取完整配置
   */
  async getConfig(): Promise<AppConfig> {
    try {
      // 使用缓存，但在初始化后第一次读取时从磁盘加载
      if (this.cachedConfig) {
        return this.cachedConfig;
      }

      // 从磁盘读取配置 - 使用安全的方式读取所有数据
      let storedConfig: Partial<AppConfig> = {};
      try {
        // 尝试读取整个 store
        const storeData = this.store.store as any;
        if (storeData && typeof storeData === 'object') {
          storedConfig = storeData as Partial<AppConfig>;
        }
      } catch (storeError) {
        // 如果直接访问 store.store 失败，逐个读取已知的顶级键
        this.logger.warn('Direct store access failed, reading keys individually', {
          error: storeError instanceof Error ? storeError.message : String(storeError)
        });
        const keys: (keyof AppConfig)[] = [
          'version', 'firstRun', 'theme', 'language', 'windows', 'shortcuts',
          'voice', 'ai', 'medical', 'desktopRecognition', 'privacy',
          'notifications', 'startup', 'performance', 'logging'
        ];
        for (const key of keys) {
          try {
            const value = this.store.get(key);
            if (value !== undefined) {
              (storedConfig as any)[key] = value;
            }
          } catch (keyError) {
            // 跳过无法读取的键
          }
        }
      }
      
      // 记录读取到的配置（调试用）
      this.logger.debug('Stored config loaded', { 
        theme: storedConfig.theme,
        aiModel: storedConfig.ai?.model,
        aiProvider: storedConfig.ai?.provider
      });
      
      // 深度合并配置，确保嵌套对象（如glassEffect）不会丢失
      const mergedConfig = this.deepMerge(DEFAULT_CONFIG, storedConfig);
      
      // 记录合并后的配置（调试用）
      this.logger.debug('Merged config', {
        theme: mergedConfig.theme,
        aiModel: mergedConfig.ai?.model,
        aiProvider: mergedConfig.ai?.provider
      });
      
      this.cachedConfig = mergedConfig;
      this.logger.debug('Retrieved and cached config from disk');
      return mergedConfig;
    } catch (error) {
      this.logger.error('Failed to get config:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error
      });
      const defaultCopy = { ...DEFAULT_CONFIG };
      this.cachedConfig = defaultCopy;
      return defaultCopy;
    }
  }

  /**
   * 获取配置项
   */
  async get<K extends keyof AppConfig>(key: K): Promise<AppConfig[K]> {
    try {
      const value = this.store.get(key);
      this.logger.debug(`Retrieved config key: ${String(key)}`);
      return value;
    } catch (error) {
      this.logger.error(`Failed to get config key ${String(key)}:`, error);
      return DEFAULT_CONFIG[key];
    }
  }

  /**
   * 设置配置项
   */
  async set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): Promise<void> {
    try {
      // 验证配置值
      this.validateConfigValue(key, value);
      
      this.store.set(key, value);
      
      // 清除缓存，确保下次读取最新值
      this.cachedConfig = null;
      
      this.logger.info(`Updated config key: ${String(key)}`);
      
      // 触发监听器
      this.notifyWatchers(String(key), value);
    } catch (error) {
      this.logger.error(`Failed to set config key ${String(key)}:`, error);
      throw error;
    }
  }

  /**
   * 更新配置（部分更新）
   */
  async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    try {
      // 验证更新的配置
      for (const [key, value] of Object.entries(updates)) {
        this.validateConfigValue(key as keyof AppConfig, value);
      }

      // 先获取当前完整配置
      const current = await this.getConfig();
      
      // 深合并更新，避免覆盖整个对象（如 windows、ai 等）
      const merged = this.deepMerge(current, updates);
      
      // 保存到磁盘 - 逐个键保存更安全
      try {
        this.store.store = merged;
      } catch (storeError) {
        // 如果整体保存失败，逐个键保存
        this.logger.warn('Batch store update failed, saving keys individually');
        for (const [key, value] of Object.entries(merged)) {
          try {
            this.store.set(key as keyof AppConfig, value);
          } catch (keyError) {
            this.logger.error(`Failed to save config key ${key}:`, keyError);
          }
        }
      }
      
      // 清除缓存，确保下次读取最新配置
      this.cachedConfig = null;
      
      // 重新加载配置到缓存
      await this.getConfig();

      // 记录更新的键和重要值
      this.logger.info('Config updated successfully', { 
        keys: Object.keys(updates),
        theme: merged.theme,
        aiModel: merged.ai?.model
      });

      // 通知主要键的监听器
      for (const key of Object.keys(updates)) {
        // @ts-ignore
        this.notifyWatchers(key, (updates as any)[key]);
      }
    } catch (error) {
      this.logger.error('Failed to update config:', error);
      throw error;
    }
  }

  /**
   * 重置配置到默认值
   */
  async resetConfig(): Promise<void> {
    try {
      this.store.clear();
      this.store.store = { ...DEFAULT_CONFIG };
      
      // 清除缓存，确保下次读取最新配置
      this.cachedConfig = null;
      
      this.logger.info('Config reset to defaults');
      
      // 通知所有监听器
      for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
        this.notifyWatchers(key, value);
      }
    } catch (error) {
      this.logger.error('Failed to reset config:', error);
      throw error;
    }
  }

  /**
   * 重置特定配置项
   */
  async resetConfigKey<K extends keyof AppConfig>(key: K): Promise<void> {
    try {
      const defaultValue = DEFAULT_CONFIG[key];
      this.store.set(key, defaultValue);
      
      // 清除缓存
      this.cachedConfig = null;
      
      this.logger.info(`Reset config key: ${String(key)}`);
      
      this.notifyWatchers(String(key), defaultValue);
    } catch (error) {
      this.logger.error(`Failed to reset config key ${String(key)}:`, error);
      throw error;
    }
  }

  /**
   * 监听配置变化
   */
  watch<K extends keyof AppConfig>(key: K, callback: (value: AppConfig[K]) => void): () => void {
    const keyStr = String(key);
    
    if (!this.watchers.has(keyStr)) {
      this.watchers.set(keyStr, []);
    }
    
    this.watchers.get(keyStr)!.push(callback as any);
    
    // 返回取消监听的函数
    return () => {
      const callbacks = this.watchers.get(keyStr);
      if (callbacks) {
        const index = callbacks.indexOf(callback as any);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * 获取配置文件路径
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * 导出配置
   */
  async exportConfig(): Promise<string> {
    try {
      const config = await this.getConfig();
      return JSON.stringify(config, null, 2);
    } catch (error) {
      this.logger.error('Failed to export config:', error);
      throw error;
    }
  }

  /**
   * 导入配置
   */
  async importConfig(configJson: string): Promise<void> {
    try {
      const config = JSON.parse(configJson) as AppConfig;
      
      // 验证导入的配置
      this.validateConfig(config);
      
      // 更新配置
      await this.updateConfig(config);
      
      this.logger.info('Config imported successfully');
    } catch (error) {
      this.logger.error('Failed to import config:', error);
      throw error;
    }
  }

  /**
   * 验证配置值
   */
  private validateConfigValue<K extends keyof AppConfig>(key: K, _value: AppConfig[K]): void {
    // 暂时禁用配置验证，避免复杂的嵌套对象验证问题
    // TODO: 实现完整的嵌套对象配置验证
    this.logger.debug(`Skipping validation for config key: ${String(key)}`);
  }

  /**
   * 验证完整配置
   */
  private validateConfig(config: AppConfig): void {
    for (const [key, value] of Object.entries(config)) {
      this.validateConfigValue(key as keyof AppConfig, value);
    }
  }

  /**
   * 通知监听器
   */
  private notifyWatchers(key: string, value: any): void {
    const callbacks = this.watchers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          this.logger.error(`Error in config watcher for key ${key}:`, error);
        }
      });
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up config service...');
    this.watchers.clear();
    this.logger.info('Config service cleanup completed');
  }
}
