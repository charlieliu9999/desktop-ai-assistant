/**
 * 渲染进程的屏幕截图服务
 * 封装 Electron IPC 调用
 */

export interface ScreenshotOptions {
  quality?: number;
  includeCursor?: boolean;
  displayIndex?: number;
  noCache?: boolean;
}

export interface ScreenshotResult {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface DisplayInfo {
  id: number;
  index: number;
  label: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scaleFactor: number;
  isPrimary: boolean;
}

class ScreenshotServiceRenderer {
  /**
   * 检查 Electron API 是否可用
   */
  private checkElectronAPI(): void {
    if (!(window as any).electronAPI) {
      throw new Error('Electron API 未初始化。请确保应用在 Electron 环境中运行。');
    }
    // 允许 screen/desktop 两种命名
    const api: any = (window as any).electronAPI;
    if (!api.screen && !api.desktop) {
      throw new Error('截图 API 未暴露。请检查 preload.ts 配置。');
    }
  }

  /**
   * 捕获屏幕截图
   */
  async captureScreen(options?: ScreenshotOptions): Promise<ScreenshotResult> {
    this.checkElectronAPI();

    const api: any = (window as any).electronAPI;
    const dataUrl: string = await (api.screen?.capture?.(options) || api.desktop?.captureScreen?.(options));
    return { dataUrl, width: 0, height: 0, timestamp: Date.now() };
  }

  /**
   * 捕获指定窗口
   */
  async captureWindow(_windowTitle?: string): Promise<ScreenshotResult> {
    this.checkElectronAPI();

    // 回退：当不支持捕获指定窗口时，退化为捕获全屏
    return this.captureScreen();
  }

  /**
   * 检查屏幕录制权限
   */
  async checkPermissions(): Promise<boolean> {
    this.checkElectronAPI();

    const api: any = (window as any).electronAPI;
    try {
      const res = await api.screenshot?.checkPermissions?.();
      return !!res?.hasPermission;
    } catch {
      // 若无实现，假设有权限
      return true;
    }
  }

  /**
   * 获取可用的显示器列表
   */
  async getDisplays(): Promise<DisplayInfo[]> {
    this.checkElectronAPI();

    const api: any = (window as any).electronAPI;
    try {
      const result = await api.screenshot?.getDisplays?.();
      return result?.success ? (result.displays || []) : [];
    } catch { return []; }
  }

  /**
   * 将 base64 数据 URL 转换为 Blob
   */
  dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = (arr[0] || '').match(/:(.*?);/)?.[1] || 'image/png';
    const base64 = arr[1] || '';
    const bstr = atob(base64);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }

  /**
   * 下载截图
   */
  downloadScreenshot(dataUrl: string, filename: string = 'screenshot.png'): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }
}

// 导出单例
export const screenshotService = new ScreenshotServiceRenderer();
