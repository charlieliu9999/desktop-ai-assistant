import { EventEmitter } from 'events';

// Minimal but safe runtime stubs for legacy services used by main process.
// They implement the methods invoked in main.ts and return no-op values
// to keep the app bootable in environments where the real services
// are not wired yet.

class BaseService extends EventEmitter {
  protected logger: any;
  protected config: any;
  constructor(config?: any, logger?: any) {
    super();
    this.config = config || {};
    this.logger = logger;
  }
  async initialize(): Promise<void> {
    try { this.logger?.info?.('[stub] initialize called'); } catch {}
  }
  async cleanup(): Promise<void> {
    try { this.logger?.info?.('[stub] cleanup called'); } catch {}
  }
  async updateConfig(updates?: any): Promise<void> {
    this.config = { ...(this.config || {}), ...(updates || {}) };
  }
  getState(): any { return { status: 'ready', stub: true }; }
}

export class VoiceService extends BaseService {
  private speaking = false;
  async startRecognition(): Promise<boolean> { return true; }
  async stopRecognition(): Promise<boolean> { return true; }
  async speak(_text: string): Promise<void> { this.speaking = true; }
  async stopSpeaking(): Promise<void> { this.speaking = false; }
}

export class AIService extends BaseService {
  async processMessage(_message: any, _opts?: any): Promise<any> {
    // 不允许回退/硬编码：返回空结果，由上层提示“没有结果”
    return { content: '' };
  }
  async processMessageWithTools(_message: any, _opts?: any): Promise<any> {
    // 前端直连模式下不支持工具调用
    throw new Error('tools_not_supported');
  }
  async processMessageStream(_message: any, _onChunk?: (c: string) => void, _opts?: any): Promise<any> {
    // 不推送任何片段，返回空内容
    return { content: '' };
  }
  async clearHistory(): Promise<boolean> { return true; }
  async generateSummary(_text: string): Promise<string> { return ''; }
  async searchWeb(_query: string, _max?: number): Promise<any> { return { results: [] }; }
}

export class MedicalIntegrationService extends BaseService {
  async searchPatients(_query: string, _options?: any): Promise<any[]> { return []; }
  async getPatientRecord(_patientId: string): Promise<any> { return { id: _patientId, name: 'N/A', notes: '' }; }
}

export class DesktopRecognitionService extends BaseService {
  async captureScreen(_options?: any): Promise<any> {
    // Reuse ScreenshotService behavior for consistent dataUrl
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const shot = require('screenshot-desktop');
      const buf: Buffer = await shot({ format: 'png' });
      const dataUrl = 'data:image/png;base64,' + buf.toString('base64');
      return { success: true, dataUrl };
    } catch (e) {
      // 按“无回退/无硬编码”策略：不返回占位图，直接失败
      this.logger?.warn?.('[stub] desktop capture failed:', e);
      return { success: false, error: (e as any)?.message || 'capture_failed' };
    }
  }
  async captureAndAnalyze(_options?: any): Promise<any> {
    // 尚未实现分析逻辑，遵循“无回退/无硬编码”策略
    return { success: false, error: 'not_implemented' };
  }
  getAvailableDisplays(): any[] { return [{ id: 1, name: 'Display 1', width: 1440, height: 900 }]; }
}

export class ScreenshotService extends BaseService {
  async captureScreen(_options?: any): Promise<{ dataUrl: string }> {
    try {
      // Lazy require to avoid type issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const shot = require('screenshot-desktop');
      const buf: Buffer = await shot({ format: 'png' });
      const dataUrl = 'data:image/png;base64,' + buf.toString('base64');
      return { dataUrl };
    } catch (e) {
      // 按“无回退/无硬编码”策略：不返回占位图，直接抛错由上层处理
      this.logger?.warn?.('[stub] screenshot capture failed:', e);
      throw e;
    }
  }
  async captureWindow(_title?: string): Promise<{ dataUrl: string }> {
    return this.captureScreen();
  }
  async checkPermissions(): Promise<boolean> { return true; }
  getDisplays(): any[] { return [{ id: 1, name: 'Display 1', width: 1440, height: 900 }]; }
}

export class BishengService extends BaseService {
  getConfig(): any { return { ...this.config }; }
  override async updateConfig(cfg?: any): Promise<void> { this.config = { ...(this.config || {}), ...(cfg || {}) }; }
  async login(_u: string, _p: string): Promise<any> { return { success: false }; }
  async getWorkflows(_pageSize?: number, _pageNum?: number): Promise<any> { return { items: [], total: 0 }; }
  async invokeWorkflow(
    _id: string,
    _inputs: any,
    _stream?: boolean,
    _sessionId?: string,
    _messageId?: string,
    _inputNodeId?: string
  ): Promise<any> {
    // 未实现直连流；按照调用方的 try/catch 逻辑抛错由上层处理
    throw new Error('bisheng_invoke_not_implemented');
  }
  async stopWorkflow(_wid: string, _sid?: string): Promise<void> { return; }
  isAuthenticated(): boolean { return false; }
  getProxyStatus(): any { return { connected: false }; }
  async testWorkflowList(): Promise<any> { return { success: true, items: [] }; }
  async testWorkflowInvoke(_id: string): Promise<any> { return { success: true }; }
  async runConnectionTests(): Promise<any> { return { success: true }; }
}

export class ShortcutService extends BaseService {
  private deps?: any;
  constructor(config?: any, logger?: any, deps?: any) {
    super(config, logger);
    this.deps = deps;
  }
}

export class ServiceHealthChecker extends BaseService {
  private timeoutMs: number | undefined;
  constructor(logger?: any, timeoutMs?: number) {
    // 适配 main 中的调用签名：new ServiceHealthChecker(this.logger, 5000)
    super(undefined, logger);
    this.timeoutMs = timeoutMs;
  }
  async checkAllServices(_config?: any): Promise<{ services: Array<{ name: string; status: 'healthy'|'unhealthy'|'unreachable' }> }> {
    // 返回空列表，调用方会据此提示
    return { services: [] };
  }
}
