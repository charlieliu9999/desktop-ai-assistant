// @ts-nocheck - Legacy code, type checking disabled
import { EventEmitter } from 'events';
import { screen, desktopCapturer, BrowserWindow } from 'electron';
import type { Logger } from '../../utils/logger';
import type { 
  DesktopRecognitionConfig, 
  DesktopRecognitionState, 
  ScreenCapture, 
  WindowInfo, 
  OCRResult 
} from '../../shared/types';

// 桌面识别状态
export type RecognitionServiceState = 'idle' | 'capturing' | 'processing' | 'analyzing' | 'error';

// 桌面识别事件
export interface DesktopRecognitionEvents {
  'capture-start': () => void;
  'capture-complete': (capture: ScreenCapture) => void;
  'capture-error': (error: Error) => void;
  'ocr-complete': (result: OCRResult) => void;
  'ocr-error': (error: Error) => void;
  'analysis-complete': (analysis: any) => void;
  'window-change': (windowInfo: WindowInfo) => void;
  'state-change': (state: DesktopRecognitionState) => void;
}

// OCR引擎接口
interface OCREngine {
  recognize(imageData: Buffer): Promise<OCRResult>;
}

// 简单的OCR结果解析器
class SimpleOCREngine implements OCREngine {
  async recognize(_imageData: Buffer): Promise<OCRResult> {
    // 这里应该集成真实的OCR引擎，如Tesseract.js
    // 目前返回模拟数据
    return {
      text: 'Sample OCR text from screen capture',
      confidence: 0.85,
      bounds: { x: 10, y: 10, width: 300, height: 20 },
      words: [
        { text: 'Sample', confidence: 0.9, bounds: { x: 10, y: 10, width: 60, height: 20 } },
        { text: 'OCR', confidence: 0.8, bounds: { x: 80, y: 10, width: 40, height: 20 } },
        { text: 'text', confidence: 0.85, bounds: { x: 130, y: 10, width: 50, height: 20 } }
      ],
      lines: [
          { text: 'Sample OCR text from screen capture', confidence: 0.85, bounds: { x: 10, y: 10, width: 300, height: 20 } }
        ]
    };
  }
}

export class DesktopRecognitionService extends EventEmitter {
  private logger: Logger;
  private config: DesktopRecognitionConfig;
  private state: RecognitionServiceState = 'idle';
  private isEnabled: boolean = false;
  private ocrEngine: OCREngine;
  private captureInterval: NodeJS.Timeout | null = null;
  private windowMonitorInterval: NodeJS.Timeout | null = null;
  private currentActiveWindow: WindowInfo | null = null;
  private captureHistory: ScreenCapture[] = [];
  private maxHistorySize: number = 10;
  private isCapturing: boolean = false;
  private lastCapture?: Date;
  private captureCount: number = 0;
  private errorCount: number = 0;

  constructor(config: DesktopRecognitionConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.isEnabled = config.enabled;
    this.ocrEngine = new SimpleOCREngine();
  }

  /**
   * 初始化桌面识别服务
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing desktop recognition service...');
    
    try {
      if (!this.isEnabled) {
        this.logger.info('Desktop recognition service is disabled');
        return;
      }

      // 检查权限
      await this.checkPermissions();
      
      // 初始化OCR引擎
      await this.initializeOCR();
      
      // 启动窗口监控
      if (this.config.windowMonitoring) {
        this.startWindowMonitoring();
      }
      
      // 启动自动捕获
      if (this.config.autoCapture) {
        this.startAutoCapture();
      }
      
      this.logger.info('Desktop recognition service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize desktop recognition service:', error);
      throw error;
    }
  }

  /**
   * 检查权限
   */
  private async checkPermissions(): Promise<void> {
    try {
      // 检查屏幕捕获权限
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 }
      });
      
      if (sources.length === 0) {
        throw new Error('No screen capture sources available');
      }
      
      this.logger.info('Screen capture permissions verified');
    } catch (error) {
      this.logger.error('Screen capture permission check failed:', error);
      throw new Error('Screen capture permissions are required');
    }
  }

  /**
   * 初始化OCR引擎
   */
  private async initializeOCR(): Promise<void> {
    // 这里可以初始化更高级的OCR引擎
    // 例如：Tesseract.js, Google Vision API, Azure Computer Vision等
    this.logger.info('OCR engine initialized');
  }

  /**
   * 捕获屏幕
   */
  async captureScreen(options: {
    displayId?: string;
    region?: { x: number; y: number; width: number; height: number };
    includeOCR?: boolean;
  } = {}): Promise<ScreenCapture> {
    if (!this.isEnabled) {
      throw new Error('Desktop recognition service is not enabled');
    }
    
    if (this.isCapturing) {
      throw new Error('Screen capture is already in progress');
    }
    
    this.isCapturing = true;
    this.state = 'capturing';
    this.emit('capture-start');
    this.emitStateChange();
    
    try {
      const { displayId, region, includeOCR = true } = options;
      
      // 获取屏幕源
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      
      let targetSource = sources[0]; // 默认主屏幕
      
      if (displayId) {
        const found = sources.find(source => source.display_id === displayId);
        if (found) {
          targetSource = found;
        }
      }
      
      if (!targetSource) {
        throw new Error('No suitable screen source found');
      }
      
      // 获取屏幕信息
      const displays = screen.getAllDisplays();
      const display = displays.find(d => d.id.toString() === targetSource.display_id) || displays[0];
      
      // 创建屏幕捕获
      const capture: ScreenCapture = {
          id: `capture_${Date.now()}`,
          timestamp: new Date(),
          displayId: targetSource.display_id,
          bounds: region || display.bounds,
          imageData: targetSource.thumbnail.toPNG(),
          format: 'png'
      };
      
      // 执行OCR（如果启用）
      if (includeOCR && this.config.ocrEnabled) {
        this.state = 'processing';
        this.emitStateChange();
        
        try {
          capture.ocrResult = await this.ocrEngine.recognize(capture.imageData);
          this.emit('ocr-complete', capture.ocrResult);
        } catch (ocrError) {
          this.logger.warn('OCR processing failed:', ocrError);
          this.emit('ocr-error', ocrError as Error);
        }
      }
      
      // 添加到历史记录
      this.addToHistory(capture);
      
      // 更新统计信息
      this.captureCount++;
      this.lastCapture = new Date();
      
      this.state = 'idle';
      this.emit('capture-complete', capture);
      this.emitStateChange();
      
      this.logger.info(`Screen captured: ${capture.id}`);
      
      return capture;
    } catch (error) {
      this.errorCount++;
      this.state = 'error';
      this.emit('capture-error', error as Error);
      this.emitStateChange();
      this.logger.error('Screen capture failed:', error);
      throw error;
    } finally {
      this.isCapturing = false;
    }
  }

  /**
   * 捕获并分析屏幕
   */
  async captureAndAnalyze(options: {
    displayId?: string;
    region?: { x: number; y: number; width: number; height: number };
    analysisPrompt?: string;
  } = {}): Promise<{ capture: ScreenCapture; analysis: any }> {
    const captureOptions: any = { includeOCR: true };
    if (options.displayId) captureOptions.displayId = options.displayId;
    if (options.region) captureOptions.region = options.region;
    const capture = await this.captureScreen(captureOptions);
    
    this.state = 'analyzing';
    this.emitStateChange();
    
    try {
      // 这里应该调用AI服务进行分析
      const analysis = {
        summary: 'Screen content analysis',
        elements: [
          { type: 'text', content: capture.ocrResult?.text || '', confidence: 0.8 },
          { type: 'ui', content: 'Detected UI elements', confidence: 0.7 }
        ],
        suggestions: [
          'Possible action: Click on button',
          'Possible action: Fill form field'
        ],
        timestamp: Date.now()
      };
      
      this.state = 'idle';
      this.emit('analysis-complete', analysis);
      this.emitStateChange();
      
      return { capture, analysis };
    } catch (error) {
      this.state = 'error';
      this.emitStateChange();
      throw error;
    }
  }

  /**
   * 获取活动窗口信息
   */
  async getActiveWindow(): Promise<WindowInfo | null> {
    try {
      // 获取所有窗口
      BrowserWindow.getAllWindows();
      const focusedWindow = BrowserWindow.getFocusedWindow();
      
      if (!focusedWindow) {
        return null;
      }
      
      const bounds = focusedWindow.getBounds();
      const title = focusedWindow.getTitle();
      
      const windowInfo: WindowInfo = {
        id: typeof focusedWindow.id === 'string' ? parseInt(focusedWindow.id) : focusedWindow.id,
        title,
        bounds,
        processId: process.pid,
        isVisible: focusedWindow.isVisible(),
        isMinimized: focusedWindow.isMinimized(),
        isFocused: focusedWindow.isFocused(),
        processName: 'electron' // 在实际应用中应该获取真实的进程名
      };
      
      return windowInfo;
    } catch (error) {
      this.logger.error('Failed to get active window info:', error);
      return null;
    }
  }

  /**
   * 启动窗口监控
   */
  private startWindowMonitoring(): void {
    if (this.windowMonitorInterval) {
      clearInterval(this.windowMonitorInterval);
    }
    
    this.windowMonitorInterval = setInterval(async () => {
      try {
        const activeWindow = await this.getActiveWindow();
        
        if (activeWindow && 
            (!this.currentActiveWindow || 
             this.currentActiveWindow.id !== activeWindow.id ||
             this.currentActiveWindow.title !== activeWindow.title)) {
          
          this.currentActiveWindow = activeWindow;
          this.emit('window-change', activeWindow);
          this.logger.debug(`Active window changed: ${activeWindow.title}`);
        }
      } catch (error) {
        this.logger.warn('Window monitoring error:', error);
      }
    }, this.config.monitoringInterval || 1000);
    
    this.logger.info('Window monitoring started');
  }

  /**
   * 停止窗口监控
   */
  private stopWindowMonitoring(): void {
    if (this.windowMonitorInterval) {
      clearInterval(this.windowMonitorInterval);
      this.windowMonitorInterval = null;
      this.logger.info('Window monitoring stopped');
    }
  }

  /**
   * 启动自动捕获
   */
  private startAutoCapture(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
    }
    
    this.captureInterval = setInterval(async () => {
      try {
        if (!this.isCapturing && this.state === 'idle') {
          await this.captureScreen({ includeOCR: this.config.ocrEnabled });
        }
      } catch (error) {
        this.logger.warn('Auto capture error:', error);
      }
    }, this.config.captureInterval || 30000); // 默认30秒
    
    this.logger.info('Auto capture started');
  }

  /**
   * 停止自动捕获
   */
  private stopAutoCapture(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
      this.logger.info('Auto capture stopped');
    }
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(capture: ScreenCapture): void {
    this.captureHistory.unshift(capture);
    
    // 限制历史记录大小
    if (this.captureHistory.length > this.maxHistorySize) {
      this.captureHistory = this.captureHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 获取捕获历史
   */
  getCaptureHistory(): ScreenCapture[] {
    return [...this.captureHistory];
  }

  /**
   * 清除捕获历史
   */
  clearCaptureHistory(): void {
    this.captureHistory = [];
    this.logger.info('Capture history cleared');
  }

  /**
   * 获取可用显示器
   */
  getAvailableDisplays(): Electron.Display[] {
    return screen.getAllDisplays();
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<DesktopRecognitionConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.isEnabled = this.config.enabled;
    
    // 重新启动监控和捕获
    if (this.config.windowMonitoring) {
      this.startWindowMonitoring();
    } else {
      this.stopWindowMonitoring();
    }
    
    if (this.config.autoCapture) {
      this.startAutoCapture();
    } else {
      this.stopAutoCapture();
    }
    
    this.logger.info('Desktop recognition config updated');
    this.emitStateChange();
  }

  /**
   * 获取当前状态
   */
  getState(): DesktopRecognitionState {
    const result: DesktopRecognitionState = {
      enabled: this.isEnabled,
      state: this.state === 'processing' ? 'analyzing' : this.state as 'idle' | 'capturing' | 'analyzing' | 'error',
      captureCount: this.captureCount,
      errorCount: this.errorCount,
      config: this.config
    };
    
    if (this.lastCapture) {
      result.lastCapture = this.lastCapture;
    }
    
    return result;
  }

  /**
   * 发送状态变化事件
   */
  private emitStateChange(): void {
    this.emit('state-change', this.getState());
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up desktop recognition service...');
    
    // 停止监控和捕获
    this.stopWindowMonitoring();
    this.stopAutoCapture();
    
    // 清除历史记录
    this.clearCaptureHistory();
    
    // 重置状态
    this.state = 'idle';
    this.isCapturing = false;
    this.currentActiveWindow = null;
    
    // 移除所有监听器
    this.removeAllListeners();
    
    this.logger.info('Desktop recognition service cleanup completed');
  }
}