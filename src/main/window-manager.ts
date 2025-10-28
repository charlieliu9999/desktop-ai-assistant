import { BrowserWindow, screen, nativeImage } from 'electron';
import { join } from 'path';
import type { ConfigService } from '../services/config';
import type { Logger } from '../utils/logger';
import type { WindowMode } from '../shared/types';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private floatingWindow: BrowserWindow | null = null;
  private voiceWindow: BrowserWindow | null = null;
  private configService: ConfigService;
  private logger: Logger;
  private isDev: boolean;

  constructor(configService: ConfigService, logger: Logger) {
    this.configService = configService;
    this.logger = logger;
    // 检测开发模式:检查是否有 ELECTRON_RENDERER_URL 环境变量或 NODE_ENV
    this.isDev = process.env.NODE_ENV === 'development' ||
                 !!process.env.ELECTRON_RENDERER_URL ||
                 !require('electron').app.isPackaged;
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing window manager...');

    // 仅创建必要窗口，避免启动时出现多窗口干扰
    await this.createMainWindow();
    try {
      const cfg = await this.configService.getConfig();
      if (cfg?.startup?.showFloatingWindow) {
        await this.createFloatingWindow();
      }
    } catch (e) {
      this.logger.warn('Conditional floating window creation failed:', e as any);
    }

    this.logger.info('Window manager initialized');
  }

  // 创建主窗口
  private async createMainWindow(): Promise<void> {
    const config = await this.configService.getConfig();
    const windowConfig = config.windows.main;
    const isGlass = config.theme === 'glass';

    // 获取屏幕尺寸
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // 计算窗口位置
    const width = Math.min(windowConfig.width, screenWidth - 100);
    const height = Math.min(windowConfig.height, screenHeight - 100);
    
    // 根据配置决定是否靠右显示
    const alignRight = windowConfig.alignRight ?? true;
    const x = alignRight 
      ? Math.floor(screenWidth - width - 20) // 靠右，留20px边距
      : Math.floor((screenWidth - width) / 2); // 居中
    const y = Math.floor((screenHeight - height) / 2); // 垂直居中

    this.mainWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      minWidth: 400,
      minHeight: 600,
      show: true, // 直接显示窗口
      frame: false, // 无边框
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 16, y: 16 },
      transparent: isGlass, // 仅玻璃主题启用透明
      // 不设置 backgroundColor，让它完全透明
      // 移除 vibrancy 和 visualEffectState，它们可能与 CSS backdrop-filter 冲突
      hasShadow: true,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
      alwaysOnTop: false,
      skipTaskbar: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        // Use main-built preload that exposes correct electronAPI surface
        preload: join(__dirname, 'preload.js'),
        webSecurity: false, // 禁用 webSecurity 以允许 blob/data URL 播放
        allowRunningInsecureContent: true, // 允许不安全内容以支持媒体播放
        experimentalFeatures: false,
        nodeIntegrationInWorker: false,
        nodeIntegrationInSubFrames: false,
        safeDialogs: true,
        safeDialogsMessage: '此应用程序正在尝试显示多个对话框。',
        spellcheck: false,
        // 完全禁用内容安全策略
        additionalArguments: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
      },
      icon: this.getAppIcon()
    });

    // 加载页面
    await this.loadWindow(this.mainWindow, 'main');

    // 设置窗口事件
    this.setupMainWindowEvents();

    // 开发模式下根据环境变量决定是否自动打开开发者工具
    // 设置环境变量 AUTO_OPEN_DEVTOOLS=true 来启用自动打开
    if (this.isDev && process.env.AUTO_OPEN_DEVTOOLS === 'true') {
      this.mainWindow.webContents.openDevTools({ mode: 'detach' });
      this.logger.info('Developer tools auto-opened for main window (AUTO_OPEN_DEVTOOLS=true)');
    } else if (this.isDev) {
      this.logger.info('Developer tools available (use Ctrl+Shift+I or F12 to open)');
    }

    this.logger.info('Main window created');
  }

  // 创建浮动窗口
  private async createFloatingWindow(): Promise<void> {
    const config = await this.configService.getConfig();
    const floatingConfig = (config as any)?.windows?.floating ?? {} as any;
    const isGlass = config.theme === 'glass';

    // 获取鼠标位置附近的屏幕
    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { width: screenWidth, height: screenHeight } = currentDisplay.workAreaSize;

    // 浮动窗口尺寸 - 从配置读取,如果没有则使用默认值
    const width = (typeof floatingConfig.width === 'number' && floatingConfig.width > 0) ? floatingConfig.width : 360;
    const height = (typeof floatingConfig.height === 'number' && floatingConfig.height > 0) ? floatingConfig.height : 480;
    const x = Math.min(cursorPoint.x - width / 2, screenWidth - width - 20);
    const y = Math.min(cursorPoint.y - height / 2, screenHeight - height - 20);

    this.floatingWindow = new BrowserWindow({
      width,
      height,
      x: Math.max(x, 20),
      y: Math.max(y, 20),
      minWidth: 280,
      minHeight: 200,
      maxWidth: 500,
      maxHeight: 700,
      show: false,
      frame: false,
      titleBarStyle: 'hidden',
      transparent: isGlass ? (typeof floatingConfig.transparent === 'boolean' ? floatingConfig.transparent : true) : false,
      // 不设置 backgroundColor，让它完全透明
      // 移除 vibrancy 和 visualEffectState，它们可能与 CSS backdrop-filter 冲突
      hasShadow: true,
      resizable: floatingConfig.resizable ?? true,
      maximizable: false,
      minimizable: false,
      closable: true,
      alwaysOnTop: floatingConfig.alwaysOnTop ?? true,
      skipTaskbar: true,
      focusable: true,
      opacity: floatingConfig.opacity ?? 0.95,
      roundedCorners: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: join(__dirname, 'preload.js'),
        webSecurity: false, // 禁用 webSecurity 以允许 blob/data URL 播放
        allowRunningInsecureContent: true, // 允许不安全内容以支持媒体播放
        experimentalFeatures: false,
        nodeIntegrationInWorker: false,
        nodeIntegrationInSubFrames: false,
        safeDialogs: true,
        safeDialogsMessage: '此应用程序正在尝试显示多个对话框。',
        spellcheck: false,
        // 完全禁用内容安全策略
        additionalArguments: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
      },
      icon: this.getAppIcon()
    });

    // 加载页面
    await this.loadWindow(this.floatingWindow, 'floating');

    // 设置窗口事件
    this.setupFloatingWindowEvents();

    // 开发模式下根据环境变量决定是否自动打开开发者工具
    if (this.isDev && process.env.AUTO_OPEN_DEVTOOLS === 'true') {
      this.floatingWindow.webContents.openDevTools({ mode: 'detach' });
      this.logger.info('Developer tools auto-opened for floating window (AUTO_OPEN_DEVTOOLS=true)');
    }

    this.logger.info('Floating window created');
  }

  // 创建语音窗口
  private async createVoiceWindow(): Promise<void> {
    if (this.voiceWindow) {
      return;
    }

    // 获取屏幕中心位置
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    const width = 400;
    const height = 300;
    const x = Math.floor((screenWidth - width) / 2);
    const y = Math.floor((screenHeight - height) / 2);

    this.voiceWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      minWidth: 350,
      minHeight: 250,
      maxWidth: 500,
      maxHeight: 400,
      show: false,
      frame: false,
      titleBarStyle: 'hidden',
      transparent: true,
      hasShadow: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      closable: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: join(__dirname, 'preload.js'),
        webSecurity: false, // 禁用 webSecurity 以允许 blob/data URL 播放
        allowRunningInsecureContent: true, // 允许不安全内容以支持媒体播放
        experimentalFeatures: false,
        nodeIntegrationInWorker: false,
        nodeIntegrationInSubFrames: false,
        safeDialogs: true,
        safeDialogsMessage: '此应用程序正在尝试显示多个对话框。',
        spellcheck: false,
        // 完全禁用内容安全策略
        additionalArguments: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
      },
      icon: this.getAppIcon()
    });

    // 加载页面
    await this.loadWindow(this.voiceWindow, 'voice');

    // 设置窗口事件
    this.setupVoiceWindowEvents();

    this.logger.info('Voice window created');
  }

  // 加载窗口内容（开发模式下带重试）
  private async loadWindow(window: BrowserWindow, mode: WindowMode): Promise<void> {
    const devPort = process.env.VITE_PORT || '5928';
    const url = this.isDev
      ? `http://127.0.0.1:${devPort}?mode=${mode}`
      : `file://${join(__dirname, '../renderer/index.html')}?mode=${mode}`;

    const tryLoad = async (): Promise<void> => {
      await window.loadURL(url);
      // 移除自动打开开发者工具，让用户手动按快捷键打开
    };

    if (!this.isDev) {
      // 生产模式：直接加载，失败则抛出
      try {
        await tryLoad();
      } catch (error) {
        this.logger.error(`Failed to load window (${mode}):`, error);
        throw error;
      }
      return;
    }

    // 开发模式：Vite 可能尚未就绪，进行重试
    const maxAttempts = 30; // 最长约15s
    const delayMs = 500;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await tryLoad();
        return;
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        const code = (err && (err.code as string)) || '';
        const transient = msg.includes('ERR_CONNECTION_REFUSED') ||
                          msg.includes('ERR_NAME_NOT_RESOLVED') ||
                          msg.includes('ERR_CONNECTION_RESET') ||
                          code === 'ERR_CONNECTION_REFUSED';
        if (transient && attempt < maxAttempts) {
          this.logger.warn(`Dev server not ready for ${mode} (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms...`);
          await new Promise(res => setTimeout(res, delayMs));
          continue;
        }
        // 最后一次或非瞬时错误，仅记录不抛出，避免整个应用退出
        this.logger.error(`Failed to load window (${mode}) after ${attempt} attempts:`, err);
        return;
      }
    }
  }

  // 设置主窗口事件
  private setupMainWindowEvents(): void {
    if (!this.mainWindow) return;

    this.mainWindow.on('ready-to-show', () => {
      this.logger.info('Main window ready to show');
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      this.logger.info('Main window closed');
    });

    this.mainWindow.on('focus', () => {
      this.logger.debug('Main window focused');
    });

    this.mainWindow.on('blur', () => {
      this.logger.debug('Main window blurred');
    });

    this.mainWindow.on('minimize', () => {
      this.logger.debug('Main window minimized');
    });

    this.mainWindow.on('restore', () => {
      this.logger.debug('Main window restored');
    });

    // 阻止窗口关闭，改为隐藏
    this.mainWindow.on('close', (event) => {
      event.preventDefault();
      this.mainWindow?.hide();
    });
  }

  // 设置浮动窗口事件
  private setupFloatingWindowEvents(): void {
    if (!this.floatingWindow) return;

    this.floatingWindow.on('ready-to-show', () => {
      this.logger.info('Floating window ready to show');
    });

    this.floatingWindow.on('closed', () => {
      this.floatingWindow = null;
      this.logger.info('Floating window closed');
    });

    this.floatingWindow.on('blur', () => {
      // 浮动窗口失去焦点时自动隐藏
      setTimeout(() => {
        if (this.floatingWindow && !this.floatingWindow.isFocused()) {
          this.floatingWindow.hide();
        }
      }, 200);
    });

    // 阻止窗口关闭，改为隐藏
    this.floatingWindow.on('close', (event) => {
      event.preventDefault();
      this.floatingWindow?.hide();
    });
  }

  // 设置语音窗口事件
  private setupVoiceWindowEvents(): void {
    if (!this.voiceWindow) return;

    this.voiceWindow.on('ready-to-show', () => {
      this.logger.info('Voice window ready to show');
    });

    this.voiceWindow.on('closed', () => {
      this.voiceWindow = null;
      this.logger.info('Voice window closed');
    });

    // 语音窗口可以真正关闭
    this.voiceWindow.on('close', () => {
      this.voiceWindow = null;
    });
  }

  /**
   * 打开开发者工具
   */
  openDevTools(windowType: 'main' | 'floating' | 'voice' = 'main'): void {
    let window: BrowserWindow | null = null;
    
    switch (windowType) {
      case 'main':
        window = this.mainWindow;
        break;
      case 'floating':
        window = this.floatingWindow;
        break;
      case 'voice':
        window = this.voiceWindow;
        break;
    }
    
    if (window && !window.isDestroyed()) {
      window.webContents.openDevTools();
      this.logger.info(`Developer tools opened for ${windowType} window`);
    } else {
      this.logger.warn(`Cannot open dev tools: ${windowType} window not available`);
    }
  }

  /**
   * 关闭开发者工具
   */
  closeDevTools(windowType: 'main' | 'floating' | 'voice' = 'main'): void {
    let window: BrowserWindow | null = null;
    
    switch (windowType) {
      case 'main':
        window = this.mainWindow;
        break;
      case 'floating':
        window = this.floatingWindow;
        break;
      case 'voice':
        window = this.voiceWindow;
        break;
    }
    
    if (window && !window.isDestroyed()) {
      window.webContents.closeDevTools();
      this.logger.info(`Developer tools closed for ${windowType} window`);
    }
  }

  /**
   * 获取应用图标
   */
  private getAppIcon(): Electron.NativeImage {
    const iconPaths = [
      join(__dirname, '../../assets/icon.png'),
      join(__dirname, '../../assets/icon.ico'),
      join(__dirname, '../../assets/app-icon.png'),
      join(process.resourcesPath, 'icon.png'),
      join(process.resourcesPath, 'icon.ico')
    ];

    for (const iconPath of iconPaths) {
      try {
        if (require('fs').existsSync(iconPath)) {
          return nativeImage.createFromPath(iconPath);
        }
      } catch (error) {
        // 忽略错误，继续尝试下一个路径
      }
    }

    // 如果没有找到图标文件，返回空的 NativeImage
    return nativeImage.createEmpty();
  }

  // 公共方法
  async showMainWindow(): Promise<void> {
    if (!this.mainWindow) {
      await this.createMainWindow();
    }

    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
      this.logger.info('Main window shown');
    }
  }

  async showFloatingWindow(): Promise<void> {
    if (!this.floatingWindow) {
      await this.createFloatingWindow();
    }

    if (this.floatingWindow) {
      // 更新位置到鼠标附近
      const cursorPoint = screen.getCursorScreenPoint();
      const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
      const { width: screenWidth, height: screenHeight } = currentDisplay.workAreaSize;

      const [windowWidth, windowHeight] = this.floatingWindow.getSize();
      const x = Math.min(cursorPoint.x - windowWidth / 2, screenWidth - windowWidth - 20);
      const y = Math.min(cursorPoint.y - windowHeight / 2, screenHeight - windowHeight - 20);

      this.floatingWindow.setPosition(Math.max(x, 20), Math.max(y, 20));
      this.floatingWindow.show();
      this.floatingWindow.focus();
      this.logger.info('Floating window shown');
    }
  }

  async showVoiceWindow(): Promise<void> {
    if (!this.voiceWindow) {
      await this.createVoiceWindow();
    }

    if (this.voiceWindow) {
      this.voiceWindow.show();
      this.voiceWindow.focus();
      this.logger.info('Voice window shown');
    }
  }

  hideMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.hide();
      this.logger.info('Main window hidden');
    }
  }

  hideFloatingWindow(): void {
    if (this.floatingWindow) {
      this.floatingWindow.hide();
      this.logger.info('Floating window hidden');
    }
  }

  hideVoiceWindow(): void {
    if (this.voiceWindow) {
      this.voiceWindow.hide();
      this.logger.info('Voice window hidden');
    }
  }

  toggleMainWindow(): void {
    if (this.mainWindow?.isVisible()) {
      this.hideMainWindow();
    } else {
      this.showMainWindow();
    }
  }

  toggleFloatingWindow(): void {
    if (this.floatingWindow?.isVisible()) {
      this.hideFloatingWindow();
    } else {
      this.showFloatingWindow();
    }
  }

  // 获取窗口实例
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  getFloatingWindow(): BrowserWindow | null {
    return this.floatingWindow;
  }

  getVoiceWindow(): BrowserWindow | null {
    return this.voiceWindow;
  }

  // 清理资源
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up window manager...');

    if (this.mainWindow) {
      this.mainWindow.removeAllListeners();
      this.mainWindow.destroy();
      this.mainWindow = null;
    }

    if (this.floatingWindow) {
      this.floatingWindow.removeAllListeners();
      this.floatingWindow.destroy();
      this.floatingWindow = null;
    }

    if (this.voiceWindow) {
      this.voiceWindow.removeAllListeners();
      this.voiceWindow.destroy();
      this.voiceWindow = null;
    }

    this.logger.info('Window manager cleanup completed');
  }
}
