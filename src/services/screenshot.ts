/**
 * 屏幕截图服务
 * 使用 Electron desktopCapturer API 捕获屏幕
 */

import { desktopCapturer, screen } from 'electron';
import { Logger } from '../utils/logger';

export interface ScreenshotOptions {
  /**
   * 截图质量 (0-100)
   */
  quality?: number;
  
  /**
   * 是否包含光标
   */
  includeCursor?: boolean;
  
  /**
   * 目标显示器索引 (默认主显示器)
   */
  displayIndex?: number;

  /**
   * 是否跳过缓存并强制重新截屏
   */
  noCache?: boolean;
}

export interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

export interface ScreenshotResult {
  /**
   * Base64 编码的图像数据
   */
  dataUrl: string;
  
  /**
   * 图像宽度
   */
  width: number;
  
  /**
   * 图像高度
   */
  height: number;
  
  /**
   * 截图时间戳
   */
  timestamp: number;
}

export class ScreenshotService {
  private logger: Logger;
  private cache: Map<string, { dataUrl: string; timestamp: number }> = new Map();
  private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_EXPIRY) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(options: ScreenshotOptions): string {
    return `${options.displayIndex || 0}-${options.quality || 90}-${options.includeCursor || false}`;
  }

  /**
   * 压缩图片
   */
  private compressImage(thumbnail: Electron.NativeImage, options: CompressionOptions): string {
    const { maxWidth, maxHeight, quality } = options;
    const originalSize = thumbnail.getSize();
    
    // 计算压缩后的尺寸
    let { width, height } = originalSize;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }
    
    this.logger.info('Compressing image:', {
      original: originalSize,
      compressed: { width, height },
      quality
    });
    
    // 调整尺寸并压缩
    const resized = thumbnail.resize({ width, height });
    return resized.toDataURL({ quality });
  }

  /**
   * 捕获屏幕截图
   */
  async captureScreen(options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
    const {
      quality = 90,
      includeCursor = false,
      displayIndex = 0
    } = options;

    try {
      // 清理过期缓存
      this.cleanExpiredCache();
      
      // 检查缓存（允许跳过）
      const cacheKey = this.generateCacheKey(options);
      const useCache = !options.noCache;
      const cached = useCache ? this.cache.get(cacheKey) : undefined;
      if (cached) {
        this.logger.info('Using cached screenshot');
        return {
          dataUrl: cached.dataUrl,
          width: 0, // 缓存中不存储尺寸
          height: 0,
          timestamp: cached.timestamp
        };
      }

      this.logger.info('Starting screen capture...');

      // 获取所有显示器
      const displays = screen.getAllDisplays();
      const targetDisplay = displays[displayIndex] || displays[0];

      this.logger.info(`Capturing display ${displayIndex}:`, {
        bounds: targetDisplay.bounds,
        scaleFactor: targetDisplay.scaleFactor
      });

      // 获取屏幕源
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: targetDisplay.bounds.width * targetDisplay.scaleFactor,
          height: targetDisplay.bounds.height * targetDisplay.scaleFactor
        }
      });

      if (sources.length === 0) {
        throw new Error('No screen sources available');
      }

      // 选择目标显示器的源
      const source = sources[displayIndex] || sources[0];
      
      this.logger.info(`Selected source: ${source.name}`);

      // 获取缩略图 (实际上是全尺寸截图)
      const thumbnail = source.thumbnail;
      const originalSize = thumbnail.getSize();
      
      // 图片压缩处理
      const compressedDataUrl = this.compressImage(thumbnail, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8
      });
      
      const result: ScreenshotResult = {
        dataUrl: compressedDataUrl,
        width: originalSize.width,
        height: originalSize.height,
        timestamp: Date.now()
      };

      this.logger.info('Screen capture completed:', {
        originalWidth: originalSize.width,
        originalHeight: originalSize.height,
        dataUrlLength: compressedDataUrl.length,
        compressionRatio: (compressedDataUrl.length / (originalSize.width * originalSize.height * 4)).toFixed(2)
      });

      // 保存到缓存
      this.cache.set(cacheKey, {
        dataUrl: compressedDataUrl,
        timestamp: result.timestamp
      });

      this.logger.info(`Screenshot cached with key: ${cacheKey}, cache size: ${this.cache.size}`);

      return result;

    } catch (error) {
      this.logger.error('Failed to capture screen:', error);
      throw new Error(`Screen capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 捕获特定窗口的截图
   */
  async captureWindow(windowTitle?: string): Promise<ScreenshotResult> {
    try {
      this.logger.info('Starting window capture...');

      // 获取窗口源
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: {
          width: 1920,
          height: 1080
        }
      });

      if (sources.length === 0) {
        throw new Error('No window sources available');
      }

      // 如果指定了窗口标题,查找匹配的窗口
      let source = sources[0];
      if (windowTitle) {
        const matchedSource = sources.find(s => 
          s.name.toLowerCase().includes(windowTitle.toLowerCase())
        );
        if (matchedSource) {
          source = matchedSource;
        } else {
          this.logger.warn(`Window "${windowTitle}" not found, using first window`);
        }
      }

      this.logger.info(`Selected window: ${source.name}`);

      // 获取缩略图
      const thumbnail = source.thumbnail;
      
      // 转换为 PNG 格式的 base64
      const dataUrl = thumbnail.toDataURL();
      
      const result: ScreenshotResult = {
        dataUrl,
        width: thumbnail.getSize().width,
        height: thumbnail.getSize().height,
        timestamp: Date.now()
      };

      this.logger.info('Window capture completed:', {
        width: result.width,
        height: result.height
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to capture window:', error);
      throw new Error(`Window capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 检查屏幕录制权限 (macOS)
   */
  async checkPermissions(): Promise<boolean> {
    try {
      // 尝试获取屏幕源来检查权限
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 }
      });

      return sources.length > 0;
    } catch (error) {
      this.logger.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * 获取可用的显示器列表
   */
  getDisplays() {
    return screen.getAllDisplays().map((display, index) => ({
      id: display.id,
      index,
      label: `Display ${index + 1}`,
      bounds: display.bounds,
      scaleFactor: display.scaleFactor,
      isPrimary: display.bounds.x === 0 && display.bounds.y === 0
    }));
  }
}
