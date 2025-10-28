import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, screen, desktopCapturer, dialog } from 'electron';
import { join } from 'path';
// import { electronApp, optimizer, is } from '@electron-toolkit/utils';
const is = { dev: process.env.NODE_ENV === 'development' };
import { Logger } from '../utils/logger';
import { ConfigService } from '../services/config';
import { VoiceService, MedicalIntegrationService } from './stubs/legacy';
// ✅ 使用适配器替代直接导入 legacy 服务（stubbed）
import { AIServiceAdapter } from './stubs/adapters';
import type { 
  AppStatus, 
  AIProvider, 
  AIMessage,
  ScreenCapture
} from '../shared/types';

// 临时类型定义
type SearchFilters = {
  query?: string;
  dateRange?: { start: Date; end: Date };
  status?: string;
};

type AppEvent = {
  type: string;
  data?: any;
  timestamp?: Date;
};

/**
 * 桌面AI助手主应用类
 */
class DesktopAIAssistant {
  private mainWindow: BrowserWindow | null = null;
  private floatingWindow: BrowserWindow | null = null;
  private voiceInputWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private logger: Logger;
  private configService: ConfigService;
  private voiceService!: VoiceService;
  private aiService!: AIServiceAdapter; // ✅ 使用适配器类型
  private medicalService!: MedicalIntegrationService;
  private appStatus: AppStatus = 'initializing';
  private isQuitting = false;

  constructor() {
    this.logger = new Logger();
    this.configService = new ConfigService(this.logger);
  }

  /**
   * 初始化应用
   */
  public async initializeApp(): Promise<void> {
    try {
      this.logger.info('Initializing Desktop AI Assistant...');
      const appMode = process.env.APP_MODE || 'full';

      // 设置应用用户模型ID (Windows)
      if (process.platform === 'win32') {
        app.setAppUserModelId('com.desktop-ai-assistant');
      }

      // macOS 特定配置，避免 SetApplicationIsDaemon 错误
      if (process.platform === 'darwin') {
        try {
          // 禁用硬件加速可以避免某些 macOS 系统服务错误
          // app.disableHardwareAcceleration();

          // 设置激活策略为常规应用
          app.setActivationPolicy('regular');

          this.logger.info('macOS specific configuration applied');
        } catch (macError) {
          this.logger.warn('Failed to apply macOS configuration:', macError);
        }
      }

      // 初始化服务
      await this.initializeServices();
      
      // 创建窗口（支持只启动某一种窗口的模式）
      if (appMode === 'floating') {
        await this.createFloatingWindow();
      } else if (appMode === 'voice') {
        this.createVoiceInputWindow();
      } else {
        await this.createMainWindow();
        await this.createFloatingWindow();
      }
      
      // 设置系统托盘
      this.createTray();
      
      // 注册全局快捷键
      await this.registerGlobalShortcuts();
      
      // 设置IPC处理器
      this.setupIPCHandlers();
      
      // 设置应用事件监听器
      this.setupAppEventListeners();
      
      this.appStatus = 'ready';
      this.broadcastStatusChange();
      
      this.logger.info('Desktop AI Assistant initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize application:', error);
      this.appStatus = 'error';
      this.broadcastStatusChange();
    }
  }

  /**
   * 初始化服务
   */
  private async initializeServices(): Promise<void> {
    try {
      await this.configService.initialize();
      const config = await this.configService.getConfig();
      
      // 初始化服务实例
      this.voiceService = new VoiceService(config.voice, this.logger);
      this.aiService = new AIServiceAdapter(config.ai, this.logger); // ✅ 使用适配器实例化
      this.medicalService = new MedicalIntegrationService(config.medical, this.logger);
      
      // 初始化服务
      await this.voiceService.initialize();
      await this.aiService.initialize();
      await this.medicalService.initialize();
      
      this.logger.info('All services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * 创建主窗口
   */
  private async createMainWindow(): Promise<void> {
    const config = await this.configService.getConfig();
    
    this.mainWindow = new BrowserWindow({
      width: config.windows.main.width,
      height: config.windows.main.height,
      minWidth: 800,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 20, y: 20 },
      vibrancy: 'under-window',
      visualEffectState: 'active',
      webPreferences: {
        preload: join(__dirname, '../preload/preload.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.mainWindow.on('ready-to-show', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        if (is.dev) {
          this.mainWindow.webContents.openDevTools();
        }
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting && process.platform === 'darwin') {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    // 加载应用
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?mode=main`);
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        query: { mode: 'main' }
      });
    }
  }

  /**
   * 创建浮动窗口
   */
  private async createFloatingWindow(): Promise<void> {
    const config = await this.configService.getConfig();
    
    this.floatingWindow = new BrowserWindow({
      width: config.windows.floating.width,
      height: config.windows.floating.height,
      x: config.windows.floating.x || 100,
      y: config.windows.floating.y || 100,
      show: false,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      transparent: true,
      hasShadow: false,
      webPreferences: {
        preload: join(__dirname, '../preload/preload.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.floatingWindow.on('closed', () => {
      this.floatingWindow = null;
    });

    // 加载浮动窗口
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.floatingWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?mode=floating`);
    } else {
      this.floatingWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        query: { mode: 'floating' }
      });
    }
  }

  /**
   * 创建语音输入窗口
   */
  private createVoiceInputWindow(): void {
    if (this.voiceInputWindow) {
      return;
    }

    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;
    
    this.voiceInputWindow = new BrowserWindow({
      width: 400,
      height: 300,
      x: Math.round((width - 400) / 2),
      y: Math.round((height - 300) / 2),
      show: false,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      transparent: true,
      hasShadow: true,
      webPreferences: {
        preload: join(__dirname, '../preload/preload.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.voiceInputWindow.on('closed', () => {
      this.voiceInputWindow = null;
    });

    this.voiceInputWindow.on('blur', () => {
      // 失去焦点时隐藏窗口
      setTimeout(() => {
        if (this.voiceInputWindow && !this.voiceInputWindow.isFocused()) {
          this.voiceInputWindow.hide();
        }
      }, 100);
    });

    // 加载语音输入窗口
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.voiceInputWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?mode=voice`);
    } else {
      this.voiceInputWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        query: { mode: 'voice' }
      });
    }
  }

  /**
   * 创建系统托盘
   */
  private createTray(): void {
    const icon = nativeImage.createFromPath(join(__dirname, '../../assets/tray-icon.png'));
    this.tray = new Tray(icon.resize({ width: 16, height: 16 }));
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => this.showMainWindow()
      },
      {
        label: '显示浮动窗口',
        type: 'checkbox',
        checked: this.floatingWindow?.isVisible() || false,
        click: () => this.toggleFloatingWindow()
      },
      { type: 'separator' },
      {
        label: '语音输入',
        accelerator: 'CommandOrControl+Shift+V',
        click: () => this.toggleVoiceInput()
      },
      {
        label: '屏幕截图',
        accelerator: 'CommandOrControl+Shift+S',
        click: () => this.captureScreen()
      },
      { type: 'separator' },
      {
        label: '设置',
        click: () => {
          this.showMainWindow();
          this.mainWindow?.webContents.send('navigate-to-settings');
        }
      },
      {
        label: '关于',
        click: () => {
          dialog.showMessageBox({
            type: 'info',
            title: '关于桌面AI助手',
            message: '桌面AI助手',
            detail: '版本 1.0.0\n一个智能的桌面助手应用'
          });
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => this.quit()
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('桌面AI助手');
    
    this.tray.on('click', () => {
      this.toggleMainWindow();
    });
  }

  /**
   * 注册全局快捷键
   */
  private async registerGlobalShortcuts(): Promise<void> {
    const config = await this.configService.getConfig();
    
    // 注册快捷键
    Object.entries(config.shortcuts).forEach(([action, shortcut]) => {
      if (shortcut && typeof shortcut === 'string') {
        const success = globalShortcut.register(shortcut, () => {
          this.handleGlobalShortcut(action);
        });
        
        if (!success) {
          this.logger.warn(`Failed to register global shortcut: ${shortcut} for ${action}`);
        } else {
          this.logger.info(`Registered global shortcut: ${shortcut} for ${action}`);
        }
      }
    });
  }

  /**
   * 处理全局快捷键
   */
  private handleGlobalShortcut(action: string): void {
    switch (action) {
      case 'toggleMainWindow':
        this.toggleMainWindow();
        break;
      case 'toggleFloatingWindow':
        this.toggleFloatingWindow();
        break;
      case 'toggleVoiceInput':
        this.toggleVoiceInput();
        break;
      case 'captureScreen':
        this.captureScreen();
        break;
      case 'quickAction':
        this.showQuickActions();
        break;
      default:
        this.logger.warn(`Unknown global shortcut action: ${action}`);
    }
  }

  /**
   * 设置IPC处理器
   */
  private setupIPCHandlers(): void {
    // 窗口控制
    ipcMain.handle('window:close', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      focusedWindow?.close();
    });

    ipcMain.handle('window:minimize', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      focusedWindow?.minimize();
    });

    ipcMain.handle('window:toggle-maximize', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow?.isMaximized()) {
        focusedWindow.unmaximize();
      } else {
        focusedWindow?.maximize();
      }
    });

    ipcMain.handle('window:toggle-always-on-top', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      const isAlwaysOnTop = focusedWindow?.isAlwaysOnTop();
      focusedWindow?.setAlwaysOnTop(!isAlwaysOnTop);
      return !isAlwaysOnTop;
    });

    // 应用状态
    ipcMain.handle('app-get-status', () => this.appStatus);
    
    ipcMain.handle('app-quit', () => this.quit());
    
    ipcMain.handle('app-set-visibility', (_, visible: boolean) => {
      this.logger.info(`Setting app visibility: ${visible}`);
      // 这里可以根据需要实现具体的可见性逻辑
      return Promise.resolve();
    });
    
    ipcMain.handle('app-report-error', (_, error: any) => {
      this.logger.error('Error reported from renderer:', error);
      // 这里可以添加错误报告逻辑，比如发送到错误监控服务
      return Promise.resolve();
    });

    // 应用状态 (冒号格式)
    ipcMain.handle('app:setVisibility', (_, visible: boolean) => {
      this.logger.info(`Setting app visibility: ${visible}`);
      // 这里可以根据需要实现具体的可见性逻辑
      return Promise.resolve();
    });
    
    ipcMain.handle('app:reportError', (_, error: any) => {
      this.logger.error('Error reported from renderer:', error);
      // 这里可以添加错误报告逻辑，比如发送到错误监控服务
      return Promise.resolve();
    });

    // 配置管理
    ipcMain.handle('config:get', () => this.configService.getConfig());
    
    ipcMain.handle('config:update', (_, updates) => {
      return this.configService.updateConfig(updates);
    });

    ipcMain.handle('config:reset', () => {
      return this.configService.resetConfig();
    });

    // 语音服务
    ipcMain.handle('voice:get-state', () => {
      try {
        return this.voiceService?.getState() || null;
      } catch (error) {
        this.logger.warn('Failed to get voice state:', error);
        return null;
      }
    });
    
    ipcMain.handle('voice:start-listening', () => {
      return this.voiceService.startListening();
    });
    
    ipcMain.handle('voice:stop-listening', () => {
      return this.voiceService.stopListening();
    });
    
    ipcMain.handle('voice:process-text', (_, text: string) => {
      return this.voiceService.processText(text);
    });

    // 语音识别统一测试（Whisper/FunASR/Browser占位）
    ipcMain.handle('voice-test-all-models', async (_event, audioData: any) => {
      try {
        this.logger.info('[Voice Test] Starting voice recognition test for all models');
        this.logger.info('[Voice Test] Received audio data type:', typeof audioData);
        this.logger.info('[Voice Test] Audio data constructor:', audioData?.constructor?.name);

        const start = Date.now();

        // 验证输入数据
        if (!audioData) {
          this.logger.error('[Voice Test] Audio data is null or undefined');
          throw new Error('音频数据为空');
        }

        // 获取配置（添加错误处理）
        let cfg: any;
        try {
          cfg = await this.configService.getConfig();
          this.logger.info('[Voice Test] Config loaded successfully');
        } catch (configError) {
          this.logger.error('[Voice Test] Failed to load config:', configError);
          cfg = {}; // 使用空配置继续
        }

        // 安全地转换 ArrayBuffer/Buffer 到 Buffer
        let buf: Buffer;
        try {
          // 处理不同类型的输入
          if (Buffer.isBuffer(audioData)) {
            this.logger.info('[Voice Test] Audio data is already a Buffer');
            buf = audioData;
          } else if (audioData instanceof ArrayBuffer) {
            this.logger.info('[Voice Test] Converting ArrayBuffer to Buffer');
            buf = Buffer.from(new Uint8Array(audioData));
          } else if (audioData instanceof Uint8Array) {
            this.logger.info('[Voice Test] Converting Uint8Array to Buffer');
            buf = Buffer.from(audioData);
          } else if (typeof audioData === 'object' && audioData.type === 'Buffer' && Array.isArray(audioData.data)) {
            // IPC 传输可能将 Buffer 序列化为 { type: 'Buffer', data: [...] }
            this.logger.info('[Voice Test] Converting serialized Buffer to Buffer');
            buf = Buffer.from(audioData.data);
          } else {
            this.logger.error('[Voice Test] Unsupported audio data type:', typeof audioData);
            throw new Error(`不支持的音频数据类型: ${typeof audioData}`);
          }

          this.logger.info(`[Voice Test] Audio data converted to buffer, size: ${buf.length} bytes`);

          // 验证 buffer 大小
          if (buf.length === 0) {
            throw new Error('音频数据为空');
          }

          if (buf.length < 1024) {
            this.logger.warn('[Voice Test] Audio data is very small, may be invalid');
          }

        } catch (error: any) {
          this.logger.error('[Voice Test] Failed to convert audio data:', error);
          throw new Error(`音频数据转换失败: ${error.message}`);
        }

        const results: any[] = [];

        // Browser 占位（主进程无法直接识别）
        this.logger.info('[Voice Test] Adding browser placeholder result');
        results.push({
          model: 'browser',
          success: false,
          accuracy: 0,
          latency: Date.now() - start,
          text: '',
          confidence: 0,
          error: '浏览器原生识别需在渲染进程测试',
          timestamp: Date.now()
        });

        // Whisper
        this.logger.info('[Voice Test] Testing Whisper model');
        try {
          const whisperUrl = (cfg as any)?.voice?.recognition?.whisper?.apiUrl;
          if (whisperUrl) {
            this.logger.info(`[Voice Test] Whisper API URL: ${whisperUrl}`);
            this.logger.info(`[Voice Test] Preparing to send ${buf.length} bytes to Whisper`);
            const wstart = Date.now();

            // 添加超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              this.logger.warn('[Voice Test] Whisper request timeout, aborting...');
              controller.abort();
            }, 30000); // 30秒超时

            try {
              this.logger.info('[Voice Test] Sending request to Whisper...');
              const resp = await fetch(whisperUrl, {
                method: 'POST',
                body: buf as any,
                headers: { 'Content-Type': 'audio/wav' },
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              this.logger.info(`[Voice Test] Whisper response received: ${resp.status} ${resp.statusText}`);

              if (resp.ok) {
                const data = await resp.json().catch(() => ({}));
                this.logger.info('[Voice Test] Whisper recognition successful:', data);
                results.push({
                  model: 'whisper',
                  success: true,
                  accuracy: data.accuracy ?? 0.9,
                  latency: Date.now() - wstart,
                  text: data.text ?? data.result ?? data.transcript ?? '',
                  confidence: data.confidence ?? 0.9,
                  timestamp: Date.now()
                });
              } else {
                const txt = await resp.text();
                this.logger.error(`[Voice Test] Whisper API error: ${resp.status} ${resp.statusText}`);
                results.push({
                  model: 'whisper',
                  success: false,
                  accuracy: 0,
                  latency: Date.now() - wstart,
                  text: '',
                  confidence: 0,
                  error: `HTTP ${resp.status} ${resp.statusText}: ${txt}`,
                  timestamp: Date.now()
                });
              }
            } catch (fetchError: any) {
              clearTimeout(timeoutId);
              if (fetchError.name === 'AbortError') {
                this.logger.error('[Voice Test] Whisper request timeout');
                results.push({
                  model: 'whisper',
                  success: false,
                  accuracy: 0,
                  latency: 30000,
                  text: '',
                  confidence: 0,
                  error: '请求超时（30秒）',
                  timestamp: Date.now()
                });
              } else {
                throw fetchError;
              }
            }
          } else {
            this.logger.warn('[Voice Test] Whisper API URL not configured');
            results.push({
              model: 'whisper',
              success: false,
              accuracy: 0,
              latency: 0,
              text: '',
              confidence: 0,
              error: '未配置 whisper.apiUrl',
              timestamp: Date.now()
            });
          }
        } catch (e: any) {
          this.logger.error('[Voice Test] Whisper test failed:', e);
          results.push({
            model: 'whisper',
            success: false,
            accuracy: 0,
            latency: 0,
            text: '',
            confidence: 0,
            error: e?.message || String(e),
            timestamp: Date.now()
          });
        }

        // FunASR
        this.logger.info('[Voice Test] Testing FunASR model');
        try {
          const funasrUrl = (cfg as any)?.voice?.recognition?.funasr?.apiUrl;
          if (funasrUrl) {
            this.logger.info(`[Voice Test] FunASR API URL: ${funasrUrl}`);
            this.logger.info(`[Voice Test] Preparing to send ${buf.length} bytes to FunASR`);
            const fstart = Date.now();

            // 添加超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              this.logger.warn('[Voice Test] FunASR request timeout, aborting...');
              controller.abort();
            }, 30000); // 30秒超时

            try {
              this.logger.info('[Voice Test] Sending request to FunASR...');
              const resp = await fetch(funasrUrl, {
                method: 'POST',
                body: buf as any,
                headers: { 'Content-Type': 'audio/wav' },
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              this.logger.info(`[Voice Test] FunASR response received: ${resp.status} ${resp.statusText}`);

              if (resp.ok) {
                const data = await resp.json().catch(() => ({}));
                this.logger.info('[Voice Test] FunASR recognition successful:', data);
                results.push({
                  model: 'funasr',
                  success: true,
                  accuracy: data.accuracy ?? 0.9,
                  latency: Date.now() - fstart,
                  text: data.text ?? data.result ?? data.transcript ?? '',
                  confidence: data.confidence ?? 0.9,
                  timestamp: Date.now()
                });
              } else {
                const txt = await resp.text();
                this.logger.error(`[Voice Test] FunASR API error: ${resp.status} ${resp.statusText}`);
                results.push({
                  model: 'funasr',
                  success: false,
                  accuracy: 0,
                  latency: Date.now() - fstart,
                  text: '',
                  confidence: 0,
                  error: `HTTP ${resp.status} ${resp.statusText}: ${txt}`,
                  timestamp: Date.now()
                });
              }
            } catch (fetchError: any) {
              clearTimeout(timeoutId);
              if (fetchError.name === 'AbortError') {
                this.logger.error('[Voice Test] FunASR request timeout');
                results.push({
                  model: 'funasr',
                  success: false,
                  accuracy: 0,
                  latency: 30000,
                  text: '',
                  confidence: 0,
                  error: '请求超时（30秒）',
                  timestamp: Date.now()
                });
              } else {
                throw fetchError;
              }
            }
          } else {
            this.logger.warn('[Voice Test] FunASR API URL not configured');
            results.push({
              model: 'funasr',
              success: false,
              accuracy: 0,
              latency: 0,
              text: '',
              confidence: 0,
              error: '未配置 funasr.apiUrl',
              timestamp: Date.now()
            });
          }
        } catch (e: any) {
          this.logger.error('[Voice Test] FunASR test failed:', e);
          results.push({
            model: 'funasr',
            success: false,
            accuracy: 0,
            latency: 0,
            text: '',
            confidence: 0,
            error: e?.message || String(e),
            timestamp: Date.now()
          });
        }

        this.logger.info(`[Voice Test] All models tested, returning ${results.length} results`);
        return results;

      } catch (error: any) {
        this.logger.error('[Voice Test] Voice recognition test failed with error:', error);
        // 返回错误结果而不是抛出异常，避免崩溃
        return [{
          model: 'error',
          success: false,
          accuracy: 0,
          latency: 0,
          text: '',
          confidence: 0,
          error: error?.message || String(error),
          timestamp: Date.now()
        }];
      }
    });

    // AI服务
    ipcMain.handle('ai:get-providers', () => this.aiService.getAvailableProviders());
    
    ipcMain.handle('ai:send-message', (_, provider: AIProvider, messages: AIMessage[]) => {
      return this.aiService.sendMessage(provider, messages);
    });
    
    ipcMain.handle('ai:analyze-content', (_, content: string, context?: any) => {
      return this.aiService.analyzeContent(content, context);
    });

    // AI: 简单网络搜索测试（用于设置页诊断）
    ipcMain.handle('ai-search-web', async (_event, query: string, maxResults?: number) => {
      try {
        if (!this.aiService) throw new Error('AI service not initialized');
        const res = await this.aiService.searchWeb(query || '测试', maxResults || 3);
        return { success: true, data: res };
      } catch (error: any) {
        this.logger.warn('Web search test failed:', error);
        return { success: false, error: error?.message || String(error) };
      }
    });

    // 医疗集成
    ipcMain.handle('medical:search-patients', (_, filters: SearchFilters) => {
      return this.medicalService.searchPatients(filters.query || '');
    });
    
    ipcMain.handle('medical:get-patient', (_, patientId: string) => {
      return this.medicalService.getPatient(patientId);
    });
    
    ipcMain.handle('medical:search-studies', (_, filters: SearchFilters) => {
      return this.medicalService.searchStudies(filters.query || '');
    });

    // 屏幕截图
    ipcMain.handle('screen:capture', () => this.captureScreen());

    // 窗口显示控制
    ipcMain.handle('window:show-main', () => this.showMainWindow());
    
    ipcMain.handle('window:show-floating', () => this.showFloatingWindow());
    
    ipcMain.handle('window:hide-floating', () => this.hideFloatingWindow());
    
    ipcMain.handle('window:show-voice', () => this.showVoiceInputWindow());
    
    ipcMain.handle('window:hide-voice', () => this.hideVoiceInputWindow());
  }

  /**
   * 设置应用事件监听器
   */
  private setupAppEventListeners(): void {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      } else {
        this.showMainWindow();
      }
    });

    app.on('before-quit', () => {
      this.isQuitting = true;
    });

    app.on('will-quit', () => {
      globalShortcut.unregisterAll();
    });
  }

  /**
   * 显示主窗口
   */
  private async showMainWindow(): Promise<void> {
    if (!this.mainWindow) {
      await this.createMainWindow();
    }
    
    this.mainWindow?.show();
    this.mainWindow?.focus();
  }

  /**
   * 隐藏主窗口
   */
  private hideMainWindow(): void {
    this.mainWindow?.hide();
  }

  /**
   * 切换主窗口显示状态
   */
  private toggleMainWindow(): void {
    if (this.mainWindow?.isVisible()) {
      this.hideMainWindow();
    } else {
      this.showMainWindow();
    }
  }

  /**
   * 显示浮动窗口
   */
  private async showFloatingWindow(): Promise<void> {
    if (!this.floatingWindow) {
      await this.createFloatingWindow();
    }
    
    this.floatingWindow?.show();
  }

  /**
   * 隐藏浮动窗口
   */
  private hideFloatingWindow(): void {
    this.floatingWindow?.hide();
  }

  /**
   * 切换浮动窗口显示状态
   */
  private toggleFloatingWindow(): void {
    if (this.floatingWindow?.isVisible()) {
      this.hideFloatingWindow();
    } else {
      this.showFloatingWindow();
    }
  }

  /**
   * 显示语音输入窗口
   */
  private showVoiceInputWindow(): void {
    if (!this.voiceInputWindow) {
      this.createVoiceInputWindow();
    }
    
    this.voiceInputWindow?.show();
    this.voiceInputWindow?.focus();
  }

  /**
   * 隐藏语音输入窗口
   */
  private hideVoiceInputWindow(): void {
    this.voiceInputWindow?.hide();
  }

  /**
   * 切换语音输入
   */
  private toggleVoiceInput(): void {
    if (this.voiceInputWindow?.isVisible()) {
      this.hideVoiceInputWindow();
    } else {
      this.showVoiceInputWindow();
    }
  }

  /**
   * 屏幕截图
   */
  private async captureScreen(): Promise<ScreenCapture | null> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });

      if (sources.length > 0) {
        const capture: ScreenCapture = {
          id: `capture_${Date.now()}`,
          timestamp: new Date(),
          bounds: { x: 0, y: 0, width: sources[0].thumbnail.getSize().width, height: sources[0].thumbnail.getSize().height },
          imageData: sources[0].thumbnail.toPNG(),
          format: 'png' as const
        };

        // 广播截图事件
        this.broadcastEvent({
          type: 'screen-capture',
          timestamp: new Date(),
          data: capture
        });

        return capture;
      }
    } catch (error) {
      this.logger.error('Failed to capture screen:', error);
    }
    
    return null;
  }

  /**
   * 显示快速操作
   */
  private showQuickActions(): void {
    // 显示浮动窗口作为快速操作面板
    this.showFloatingWindow();
  }

  /**
   * 广播状态变化
   */
  private broadcastStatusChange(): void {
    const windows = [this.mainWindow, this.floatingWindow, this.voiceInputWindow];
    windows.forEach(window => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('app:status-changed', this.appStatus);
      }
    });
  }

  /**
   * 广播事件
   */
  private broadcastEvent(event: AppEvent): void {
    const windows = [this.mainWindow, this.floatingWindow, this.voiceInputWindow];
    windows.forEach(window => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('app:event', event);
      }
    });
  }

  /**
   * 广播通知
   */
  // private broadcastNotification(notification: Notification): void {
  //   const windows = [this.mainWindow, this.floatingWindow, this.voiceInputWindow];
  //   windows.forEach(window => {
  //     if (window && !window.isDestroyed()) {
  //       window.webContents.send('app:notification', notification);
  //     }
  //   });
  // }

  /**
   * 退出应用
   */
  private async quit(): Promise<void> {
    try {
      this.logger.info('Shutting down Desktop AI Assistant...');
      this.appStatus = 'shutdown';
      this.broadcastStatusChange();
      
      // 清理服务
      await this.voiceService.cleanup();
      await this.aiService.cleanup();
      await this.medicalService.cleanup();
      
      // 保存配置 - ConfigService 可能没有 saveConfig 方法
      // await this.configService.saveConfig();
      
      this.logger.info('Desktop AI Assistant shutdown complete');
      
      app.quit();
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      app.quit();
    }
  }
}

// 创建应用实例并在app准备好后初始化
const appInstance = new DesktopAIAssistant();
app.whenReady().then(() => {
  appInstance.initializeApp();
});

// 导出用于测试
export { DesktopAIAssistant };
