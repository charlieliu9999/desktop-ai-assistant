/**
 * AI服务适配器
 * 
 * 提供统一的AI服务接口，支持新旧实现切换
 * - 新实现: 调用后端API (/api/v1/ai/)
 * - 旧实现: 调用legacy/ai.ts
 */

import type { Logger } from '../../utils/logger';
import type { AIConfig } from '../../shared/types';
// Legacy AI 已移除：不再依赖 ../legacy/ai；如需前端直连，请走主进程 adapter（src/main/stubs/adapters.ts）

let API_BASE_OVERRIDE: string | null = null;

export function setBackendApiOrigin(origin: string) {
  if (origin && typeof origin === 'string') {
    API_BASE_OVERRIDE = origin.replace(/\/$/, '');
  }
}

// API配置（后端基址）
const API_CONFIG = {
  get baseURL() {
    if (API_BASE_OVERRIDE) return API_BASE_OVERRIDE;
    // 从环境或全局变量读取（避免 import.meta 依赖，兼容 CJS 编译）
    const envVal = (typeof process !== 'undefined' && (process as any).env && (process as any).env.VITE_API_BASE_URL) || (globalThis as any)?.VITE_API_BASE_URL;
    const raw = envVal || 'http://127.0.0.1:8010/api';
    try { const u = new URL(raw); return u.origin; } catch { return 'http://127.0.0.1:8010'; }
  },
  timeout: 30000,
  retryAttempts: 3,
};

// API响应类型
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    request_id: string;
    timestamp: string;
    processing_time_ms?: number;
  };
}

// 消息类型
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 对话选项
interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// 流式响应块
interface StreamChunk {
  type: 'start' | 'chunk' | 'done' | 'error';
  content?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
  request_id?: string;
}

export class AIServiceAdapter {
  private useBackend: boolean;
  private logger: Logger;
  private config: AIConfig;

  constructor(config: AIConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    // 根据配置决定是否走后端
    this.useBackend = (config as any)?.routingMode === 'backend';
    this.logger.info(`AI Service Adapter initialized, routingMode=${(config as any)?.routingMode || 'frontend'}, useBackend=${this.useBackend}`);
  }

  /** 更新配置（运行期） */
  updateConfig(updates: Partial<AIConfig>) {
    this.config = { ...this.config, ...(updates as any) } as AIConfig;
    const prev = this.useBackend;
    this.useBackend = (this.config as any)?.routingMode === 'backend';
    if (prev !== this.useBackend) {
      this.logger.info(`AI Adapter routing switched to ${this.useBackend ? 'backend' : 'frontend'}`);
    }
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.useBackend) {
      this.logger.info('Initializing backend AI service...');
      // 测试后端连接
      try {
        await this.testBackendConnection();
        this.logger.info('Backend AI service connected successfully');
      } catch (error) {
        this.logger.error('Backend AI service connection failed, falling back to legacy', error);
        this.useBackend = false;
      }
    }

    // 非后端模式下，本适配器不执行前端直连；请改用主进程适配器。
  }

  /**
   * 测试后端连接
   */
  private async testBackendConnection(): Promise<void> {
    const response = await fetch(`${API_CONFIG.baseURL}/v1/ai/providers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend connection test failed: ${response.status}`);
    }
  }

  /**
   * 处理消息 - 标准模式
   */
  async processMessage(message: string, context?: string[]): Promise<string> {
    if (!this.useBackend) throw new Error('frontend_direct_not_supported_in_renderer');
    return this.processMessageWithBackend(message, context);
  }

  /**
   * 统一获取安全的 max_tokens，避免超过提供商限制。
   */
  private getSafeMaxTokens(): number | undefined {
    const raw = (this.config as any)?.maxTokens;
    const fallback = 2000;
    const numeric = typeof raw === 'number' ? raw : parseInt(String(raw ?? fallback), 10);
    const value = Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
    const provider = ((this.config as any)?.backendProvider || '').toLowerCase();
    const model = ((this.config as any)?.backendModel || '').toLowerCase();
    // DashScope/Qwen 与 DeepSeek 均限制在 8192 以内
    if (provider === 'dashscope' || provider === 'aliyun' || model.includes('qwen')) {
      return Math.min(value, 8192);
    }
    if (provider === 'deepseek' || (model.includes('deepseek'))) {
      return Math.min(value, 8192);
    }
    if (value <= 0) return fallback;
    return value;
  }

  /**
   * 使用后端API处理消息
   */
  private async processMessageWithBackend(message: string, context?: string[]): Promise<string> {
    try {
      // 构建消息列表
      const messages: Message[] = [];

      // 系统提示
      if (this.config?.systemPrompt) {
        messages.push({ role: 'system', content: this.config.systemPrompt });
      }

      // 添加上下文
      if (context && context.length > 0) {
        context.forEach((ctx) => {
          messages.push({ role: 'user', content: ctx });
        });
      }

      // 添加当前消息
      messages.push({ role: 'user', content: message });

      // 调用后端API
      const scene = (this.config as any)?.backendScene
        || (((this.config as any)?.backendProvider) === 'dashscope' ? 'ai_chat_aliyun' : 'ai_chat');
      const maxTokens = this.getSafeMaxTokens();
      const response = await fetch(`${API_CONFIG.baseURL}/v1/ai/chat?scene=${encodeURIComponent(scene)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: (this.config as any)?.backendProvider || (this.config as any)?.provider || undefined,
          messages,
          // 不携带 provider 与 model，交给后端默认与场景配置决定
          options: {
            model: (this.config as any)?.backendModel || (this.config as any)?.model || undefined,
            temperature: this.config.temperature || 0.7,
            max_tokens: maxTokens || 2000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const result: APIResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Backend API returned no data');
      }

      return result.data.message.content;
    } catch (error) {
      this.logger.error('Backend AI processing failed', error);
      throw error;
    }
  }

  /**
   * 流式对话
   */
  async *chatStream(message: string, context?: string[]): AsyncIterableIterator<string> {
    if (!this.useBackend) throw new Error('frontend_direct_stream_not_supported_in_renderer');
    yield* this.chatStreamWithBackend(message, context);
  }

  /**
   * 使用后端API进行流式对话
   */
  private async *chatStreamWithBackend(
    message: string,
    context?: string[]
  ): AsyncIterableIterator<string> {
    try {
      // 诊断信息（开发时查看控制台）
      try {
        console.info('[AIAdapter] backend stream', {
          baseURL: API_CONFIG.baseURL,
          provider: (this.config as any)?.backendProvider || 'default',
          model: (this.config as any)?.backendModel || 'scene/default',
          scene: (this.config as any)?.backendScene || (((this.config as any)?.backendProvider) === 'dashscope' ? 'ai_chat_aliyun' : 'ai_chat')
        });
      } catch {}
      // 构建消息列表
      const messages: Message[] = [];

      // 系统提示
      if (this.config?.systemPrompt) {
        messages.push({ role: 'system', content: this.config.systemPrompt });
      }

      if (context && context.length > 0) {
        context.forEach((ctx) => {
          messages.push({ role: 'user', content: ctx });
        });
      }

      messages.push({ role: 'user', content: message });

      // 调用流式API
      const scene = (this.config as any)?.backendScene
        || (((this.config as any)?.backendProvider) === 'dashscope' ? 'ai_chat_aliyun' : 'ai_chat');
      const maxTokens = this.getSafeMaxTokens();
      const response = await fetch(`${API_CONFIG.baseURL}/v1/ai/chat/stream?scene=${encodeURIComponent(scene)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          provider: (this.config as any)?.backendProvider || (this.config as any)?.provider || undefined,
          messages,
          options: {
            model: (this.config as any)?.backendModel || (this.config as any)?.model || undefined,
            temperature: this.config.temperature || 0.7,
            max_tokens: maxTokens || 2000,
            stream: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend stream API error: ${response.status}`);
      }

      // 解析SSE流
      const reader = (response as any).body?.getReader?.();
      if (reader && typeof reader.read === 'function') {
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const chunk: StreamChunk = JSON.parse(data);

                if (chunk.type === 'chunk' && chunk.content) {
                  yield chunk.content;
                } else if (chunk.type === 'error') {
                  throw new Error(chunk.error || 'Stream error');
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      } else {
        // 兼容环境：不支持 getReader，一次性读取并解析
        const text = await response.text();
        const lines = text.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const json = line.slice(6);
            const chunk: StreamChunk = JSON.parse(json);
            if (chunk.type === 'chunk' && chunk.content) {
              yield chunk.content;
            } else if (chunk.type === 'error') {
              throw new Error(chunk.error || 'Stream error');
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch (error) {
      this.logger.error('Backend stream failed, falling back to legacy', error);
      // 故障转移到legacy实现
      yield* this.legacyService.chatStream(message, context);
    }
  }

  /**
   * 内容分析
   */
  async analyzeContent(content: string, analysisTypeOrContext?: any): Promise<any> {
    const analysisType = typeof analysisTypeOrContext === 'string' ? analysisTypeOrContext : 'general';
    if (!this.useBackend) throw new Error('frontend_direct_analyze_not_supported_in_renderer');
    return this.analyzeContentWithBackend(content, analysisType);
  }

  /**
   * 使用后端API进行内容分析
   */
  private async analyzeContentWithBackend(content: string, analysisType: string): Promise<any> {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/v1/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: (this.config as any)?.backendProvider || undefined,
          content,
          analysis_type: analysisType,
          options: {
            model: (this.config as any)?.backendModel || undefined,
            temperature: 0.3, // 分析任务使用较低温度
            max_tokens: 2000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend analyze API error: ${response.status}`);
      }

      const result: APIResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Backend API returned no data');
      }

      return result.data.extracted_data;
    } catch (error) {
      this.logger.error('Backend analyze failed, falling back to legacy', error);
      // 故障转移
      const prompt = `请分析以下内容（类型：${analysisType}）：\n\n${content}`;
      const response = await this.legacyService.processMessage(prompt);
      return { analysis: response };
    }
  }

  /**
   * 获取服务状态
   */
  getState(): string {
    if (this.useBackend) {
      return 'backend';
    } else {
      return this.legacyService.getState();
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // no-op
  }

  /**
   * 获取可用的 Provider 列表（用于设置页诊断）
   */
  async getAvailableProviders(): Promise<any> {
    if (this.useBackend) {
      try {
        // 切换到注册中心的标准端点
        const resp = await fetch(`${API_CONFIG.baseURL}/v1/registry/providers`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!resp.ok) throw new Error(`http_${resp.status}`);
        const result: APIResponse = await resp.json();
        // registry 返回形如 { success, data: Provider[] }
        return (Array.isArray((result as any).data) ? (result as any).data : []) || [];
      } catch (e) {
        this.logger.warn('getAvailableProviders failed:', e as any);
        return [];
      }
    }
    // 遵循“无回退/无硬编码”：legacy 模式不返回默认 provider，让上层显示空态
    return [];
  }

  /**
   * 发送消息（兼容旧调用点）：接受聚合消息并返回统一响应
   */
  async sendMessage(_provider: any, messages: Array<{ role: string; content: string }>): Promise<any> {
    const userParts = messages?.map(m => `${m.role}: ${m.content}`).join('\n\n') || '';
    const content = await this.processMessage(userParts);
    const resp = {
      content,
          provider: (this.config as any)?.backendProvider || (this.config as any)?.provider,
          model: (this.config as any)?.backendModel || (this.config as any)?.model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      timestamp: Date.now(),
    };
    return resp;
  }

  /**
   * 简单网络搜索接口（用于诊断/设置页）
   */
  async searchWeb(query: string, maxResults = 3): Promise<any> {
    if (this.useBackend) {
      try {
        const url = `${API_CONFIG.baseURL}/v1/tools/search?q=${encodeURIComponent(query)}&limit=${maxResults}`;
        const resp = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
        if (!resp.ok) throw new Error(`http_${resp.status}`);
        const result: APIResponse = await resp.json();
        return result.data || { results: [] };
      } catch (e) {
        this.logger.warn('searchWeb failed:', e as any);
        return { results: [] };
      }
    }
    return { results: [] };
  }
}
