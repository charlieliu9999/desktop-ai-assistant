import { EventEmitter } from 'events';
import { globalShortcut, BrowserWindow } from 'electron';
import type { Logger } from '../utils/logger';
import type { ShortcutConfig, ShortcutAction } from '../shared/types';

// 快捷键事件
export interface ShortcutEvents {
  'shortcut-triggered': (action: ShortcutAction, shortcut: string) => void;
  'shortcut-registered': (shortcut: string, action: ShortcutAction) => void;
  'shortcut-unregistered': (shortcut: string) => void;
  'shortcut-error': (error: Error, shortcut?: string) => void;
}

// 快捷键状态
export interface ShortcutState {
  enabled: boolean;
  registeredShortcuts: Map<string, ShortcutAction>;
  totalShortcuts: number;
  config: ShortcutConfig;
}

export class ShortcutService extends EventEmitter {
  private logger: Logger;
  private config: ShortcutConfig;
  private isEnabled: boolean = false;
  private registeredShortcuts: Map<string, ShortcutAction> = new Map();
  private windowManager: any; // WindowManager实例
  private voiceService: any; // VoiceService实例
  private aiService: any; // AIService实例
  private desktopRecognitionService: any; // DesktopRecognitionService实例

  constructor(
    config: ShortcutConfig, 
    logger: Logger,
    dependencies: {
      windowManager?: any;
      voiceService?: any;
      aiService?: any;
      desktopRecognitionService?: any;
    } = {}
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.isEnabled = config.enabled;
    
    // 设置依赖服务
    this.windowManager = dependencies.windowManager;
    this.voiceService = dependencies.voiceService;
    this.aiService = dependencies.aiService;
    this.desktopRecognitionService = dependencies.desktopRecognitionService;
  }

  /**
   * 初始化快捷键服务
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing shortcut service...');
    
    try {
      if (!this.isEnabled) {
        this.logger.info('Shortcut service is disabled');
        return;
      }

      // 注册默认快捷键
      await this.registerDefaultShortcuts();
      
      // 注册配置中的快捷键
      const shortcuts = {
        [this.config.toggleMainWindow]: {
          type: 'window' as const,
          action: 'toggle-main',
          description: '切换主窗口显示/隐藏'
        },
        [this.config.toggleFloatingWindow]: {
          type: 'window' as const,
          action: 'toggle-floating',
          description: '切换浮动窗口显示/隐藏'
        },
        [this.config.voiceInput]: {
          type: 'voice' as const,
          action: 'toggle-listening',
          description: '切换语音输入'
        },
        [this.config.screenCapture]: {
          type: 'desktop' as const,
          action: 'screen-capture',
          description: '屏幕截图'
        },
        [this.config.quickSearch]: {
          type: 'app' as const,
          action: 'quick-search',
          description: '快速搜索'
        },
        [this.config.showSettings]: {
          type: 'window' as const,
          action: 'show-settings',
          description: '显示设置'
        },
        [this.config.quit]: {
          type: 'app' as const,
          action: 'quit',
          description: '退出应用'
        }
      };
      
      for (const [shortcut, action] of Object.entries(shortcuts)) {
        if (shortcut) {
          await this.registerShortcut(shortcut, action);
        }
      }
      
      this.logger.info(`Shortcut service initialized with ${this.registeredShortcuts.size} shortcuts`);
    } catch (error) {
      this.logger.error('Failed to initialize shortcut service:', error as any);
      // 不再抛出，避免影响应用整体启动
      this.emit('shortcut-error', error as any);
    }
  }

  /**
   * 注册默认快捷键
   */
  private normalizeShortcut(shortcut: string): string {
    return shortcut.trim().toUpperCase();
  }

  private async registerDefaultShortcuts(): Promise<void> {
    const defaultShortcuts: Record<string, ShortcutAction> = {
      // 主窗口控制
      'CommandOrControl+Shift+A': {
        type: 'window',
        action: 'toggle-main',
        description: '切换主窗口显示/隐藏'
      },
      
      // 浮动窗口控制
      'CommandOrControl+Shift+F': {
        type: 'window',
        action: 'toggle-floating',
        description: '切换浮动窗口显示/隐藏'
      },
      
      // 语音窗口控制
      'CommandOrControl+Shift+V': {
        type: 'window',
        action: 'show-voice',
        description: '显示语音窗口'
      },
      
      // 语音识别控制
      'CommandOrControl+Shift+Space': {
        type: 'voice',
        action: 'toggle-recognition',
        description: '开始/停止语音识别'
      },
      
      // 屏幕捕获
      'CommandOrControl+Shift+S': {
        type: 'desktop',
        action: 'capture-screen',
        description: '捕获屏幕'
      },
      
      // 屏幕分析
      'CommandOrControl+Shift+D': {
        type: 'desktop',
        action: 'analyze-screen',
        description: '分析屏幕内容'
      },
      
      // AI助手激活
      'CommandOrControl+Shift+Q': {
        type: 'ai',
        action: 'quick-assist',
        description: '快速AI助手'
      },
      
      // 应用退出
      'CommandOrControl+Shift+Escape': {
        type: 'app',
        action: 'quit',
        description: '退出应用'
      }
    };
    
    const userShortcuts = new Set(
      Object.values(this.config)
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map(value => this.normalizeShortcut(value))
    );

    for (const [shortcut, action] of Object.entries(defaultShortcuts)) {
      const normalized = this.normalizeShortcut(shortcut);
      if (userShortcuts.has(normalized)) {
        continue;
      }
      await this.registerShortcut(shortcut, action);
    }
  }

  /**
   * 注册快捷键
   */
  async registerShortcut(shortcut: string, action: ShortcutAction): Promise<void> {
    try {
      const normalized = this.normalizeShortcut(shortcut);

      if (this.registeredShortcuts.has(normalized)) {
        return;
      }

      if (globalShortcut.isRegistered(normalized)) {
        globalShortcut.unregister(normalized);
      }

      const success = globalShortcut.register(normalized, () => {
        this.handleShortcutTrigger(normalized, action);
      });

      if (!success) {
        const warning = `Shortcut ${normalized} is reserved by the system or already taken.`;
        this.logger.warn(warning);
        this.emit('shortcut-error', new Error(warning), normalized);
        return;
      }

      this.registeredShortcuts.set(normalized, action);

      this.logger.info(`Shortcut registered: ${normalized} -> ${action.description}`);
      this.emit('shortcut-registered', normalized, action);
    } catch (error) {
      this.logger.warn(`Failed to register shortcut ${shortcut}:`, error);
      this.emit('shortcut-error', error as Error, shortcut);
    }
  }

  /**
   * 注销快捷键
   */
  async unregisterShortcut(shortcut: string): Promise<void> {
    try {
      const normalized = this.normalizeShortcut(shortcut);
      if (!this.registeredShortcuts.has(normalized)) {
        this.logger.warn(`Shortcut ${normalized} is not registered`);
        return;
      }
      
      // 注销全局快捷键
      globalShortcut.unregister(normalized);
      
      // 从注册表移除
      this.registeredShortcuts.delete(normalized);
      
      this.logger.info(`Shortcut unregistered: ${normalized}`);
      this.emit('shortcut-unregistered', normalized);
    } catch (error) {
      this.logger.error(`Failed to unregister shortcut ${shortcut}:`, error);
      this.emit('shortcut-error', error as Error, shortcut);
      throw error;
    }
  }

  /**
   * 处理快捷键触发
   */
  private async handleShortcutTrigger(shortcut: string, action: ShortcutAction): Promise<void> {
    this.logger.info(`Shortcut triggered: ${shortcut} -> ${action.type}:${action.action}`);
    this.emit('shortcut-triggered', action, shortcut);
    
    try {
      switch (action.type) {
        case 'window':
          await this.handleWindowAction(action.action);
          break;
          
        case 'voice':
          await this.handleVoiceAction(action.action);
          break;
          
        case 'desktop':
          await this.handleCaptureAction(action.action, action.params);
          break;
          
        case 'ai':
          await this.handleAIAction(action.action, action.params);
          break;
          
        case 'app':
          await this.handleAppAction(action.action);
          break;
          

          
        default:
          this.logger.warn(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling shortcut ${shortcut}:`, error);
      this.emit('shortcut-error', error as Error, shortcut);
    }
  }

  /**
   * 处理窗口操作
   */
  private async handleWindowAction(action: string): Promise<void> {
    if (!this.windowManager) {
      this.logger.warn('WindowManager not available for window action');
      return;
    }
    
    switch (action) {
      case 'toggle-main':
        this.windowManager.toggleMainWindow();
        break;
        
      case 'show-main':
        this.windowManager.showMainWindow();
        break;
        
      case 'hide-main':
        this.windowManager.hideMainWindow();
        break;
        
      case 'toggle-floating':
        this.windowManager.toggleFloatingWindow();
        break;
        
      case 'show-floating':
        this.windowManager.showFloatingWindow();
        break;
        
      case 'hide-floating':
        this.windowManager.hideFloatingWindow();
        break;
        
      case 'show-voice':
        this.windowManager.showVoiceWindow();
        break;
        
      case 'hide-voice':
        this.windowManager.hideVoiceWindow();
        break;
        
      default:
        this.logger.warn(`Unknown window action: ${action}`);
    }
  }

  /**
   * 处理语音操作
   */
  private async handleVoiceAction(action: string): Promise<void> {
    if (!this.voiceService) {
      this.logger.warn('VoiceService not available for voice action');
      return;
    }
    
    switch (action) {
      case 'toggle-recognition':
        try {
          const voiceState = this.voiceService?.getState();
          if (voiceState && voiceState.recognition.state === 'listening') {
            await this.voiceService.stopRecognition();
          } else {
            await this.voiceService.startRecognition();
          }
        } catch (error) {
          this.logger.warn('Failed to toggle recognition:', error);
        }
        break;
        
      case 'start-recognition':
        await this.voiceService.startRecognition();
        break;
        
      case 'stop-recognition':
        await this.voiceService.stopRecognition();
        break;
        
      case 'toggle-keyword-detection':
        try {
          const state = this.voiceService?.getState();
          if (state && state.recognition.keywordDetection) {
            this.voiceService.stopKeywordDetection();
          } else {
            this.voiceService.startKeywordDetection();
          }
        } catch (error) {
          this.logger.warn('Failed to toggle keyword detection:', error);
        }
        break;
        
      default:
        this.logger.warn(`Unknown voice action: ${action}`);
    }
  }

  /**
   * 处理屏幕捕获操作
   */
  private async handleCaptureAction(action: string, params?: any): Promise<void> {
    if (!this.desktopRecognitionService) {
      this.logger.warn('DesktopRecognitionService not available for capture action');
      return;
    }
    
    switch (action) {
      case 'capture-screen':
        await this.desktopRecognitionService.captureScreen({
          includeOCR: true,
          ...params
        });
        break;
        
      case 'analyze-screen':
        await this.desktopRecognitionService.captureAndAnalyze({
          analysisPrompt: params?.prompt || 'Analyze the screen content',
          ...params
        });
        break;
        
      case 'capture-region':
        if (params?.region) {
          await this.desktopRecognitionService.captureScreen({
            region: params.region,
            includeOCR: true
          });
        }
        break;
        
      default:
        this.logger.warn(`Unknown capture action: ${action}`);
    }
  }

  /**
   * 处理AI操作
   */
  private async handleAIAction(action: string, params?: any): Promise<void> {
    if (!this.aiService) {
      this.logger.warn('AIService not available for AI action');
      return;
    }
    
    switch (action) {
      case 'quick-assist':
        // 显示语音窗口并开始语音识别
        if (this.windowManager) {
          this.windowManager.showVoiceWindow();
        }
        if (this.voiceService) {
          await this.voiceService.startRecognition();
        }
        break;
        
      case 'analyze-desktop':
        // 捕获屏幕并进行AI分析
        if (this.desktopRecognitionService) {
          const result = await this.desktopRecognitionService.captureAndAnalyze({
            analysisPrompt: params?.prompt || 'What can I help you with based on what you see on the screen?'
          });
          
          // 将分析结果发送给AI服务
          await this.aiService.processMessage(
            `Based on the screen analysis: ${JSON.stringify(result.analysis)}, how can I assist you?`
          );
        }
        break;
        
      case 'clear-history':
        this.aiService.clearHistory();
        break;
        
      default:
        this.logger.warn(`Unknown AI action: ${action}`);
    }
  }

  /**
   * 处理应用操作
   */
  private async handleAppAction(action: string): Promise<void> {
    switch (action) {
      case 'quit':
        // 清理所有服务并退出应用
        await this.cleanup();
        const { app } = require('electron');
        app.quit();
        break;
        
      case 'minimize-all':
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
          if (!window.isMinimized()) {
            window.minimize();
          }
        });
        break;
        
      case 'show-all':
        const allWindows = BrowserWindow.getAllWindows();
        allWindows.forEach(window => {
          if (window.isMinimized()) {
            window.restore();
          }
          window.show();
        });
        break;
        
      default:
        this.logger.warn(`Unknown app action: ${action}`);
    }
  }



  /**
   * 检查快捷键是否已注册
   */
  isShortcutRegistered(shortcut: string): boolean {
    return this.registeredShortcuts.has(this.normalizeShortcut(shortcut));
  }

  /**
   * 获取所有已注册的快捷键
   */
  getRegisteredShortcuts(): Map<string, ShortcutAction> {
    return new Map(this.registeredShortcuts);
  }

  /**
   * 获取快捷键列表
   */
  getShortcutList(): Array<{ shortcut: string; action: ShortcutAction }> {
    return Array.from(this.registeredShortcuts.entries()).map(([shortcut, action]) => ({
      shortcut,
      action
    }));
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<ShortcutConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };
    this.isEnabled = this.config.enabled;
    
    // 如果禁用了快捷键服务，注销所有快捷键
    if (!this.isEnabled) {
      await this.unregisterAllShortcuts();
      return;
    }
    
    // 如果启用了快捷键服务，重新初始化
    if (!oldConfig.enabled && this.isEnabled) {
      await this.initialize();
      return;
    }
    
    // 重新注册所有快捷键
    await this.unregisterAllShortcuts();
    await this.registerDefaultShortcuts();
    
    this.logger.info('Shortcut service config updated');
  }

  /**
   * 注销所有快捷键
   */
  async unregisterAllShortcuts(): Promise<void> {
    const shortcuts = Array.from(this.registeredShortcuts.keys());
    
    for (const shortcut of shortcuts) {
      await this.unregisterShortcut(shortcut);
    }
    
    this.logger.info('All shortcuts unregistered');
  }

  /**
   * 获取当前状态
   */
  getState(): ShortcutState {
    return {
      enabled: this.isEnabled,
      registeredShortcuts: new Map(this.registeredShortcuts),
      totalShortcuts: this.registeredShortcuts.size,
      config: this.config
    };
  }

  /**
   * 设置依赖服务
   */
  setDependencies(dependencies: {
    windowManager?: any;
    voiceService?: any;
    aiService?: any;
    desktopRecognitionService?: any;
  }): void {
    if (dependencies.windowManager) {
      this.windowManager = dependencies.windowManager;
    }
    if (dependencies.voiceService) {
      this.voiceService = dependencies.voiceService;
    }
    if (dependencies.aiService) {
      this.aiService = dependencies.aiService;
    }
    if (dependencies.desktopRecognitionService) {
      this.desktopRecognitionService = dependencies.desktopRecognitionService;
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up shortcut service...');
    
    // 注销所有快捷键
    await this.unregisterAllShortcuts();
    
    // 注销所有全局快捷键
    globalShortcut.unregisterAll();
    
    // 清除依赖引用
    this.windowManager = null;
    this.voiceService = null;
    this.aiService = null;
    this.desktopRecognitionService = null;
    
    // 移除所有监听器
    this.removeAllListeners();
    
    this.logger.info('Shortcut service cleanup completed');
  }
}
