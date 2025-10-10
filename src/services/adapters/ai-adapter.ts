/**
 * AI服务适配器
 * 
 * 提供统一的AI服务接口，支持新旧实现切换
 * - 新实现: 调用后端API (/api/v1/ai/)
 * - 旧实现: 调用legacy/ai.ts
 */

import type { Logger } from '../../utils/logger';
import type { AIConfig, AIMessage, AIResponse } from '../../shared/types';
import { AIService } from '../legacy/ai';

// 功能开关
const FEATURE_FLAGS = {
  USE_BACKEND_AI: false, // 默认禁用，待测试通过后启用
};

// API配置
const API_CONFIG = {
  baseURL: 'http://localhost:8010',
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
  private legacyService: AIService;
  private logger: Logger;
  private config: AIConfig;

  constructor(config: AIConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.useBackend = FEATURE_FLAGS.USE_BACKEND_AI;
    this.legacyService = new AIService(config, logger);

    this.logger.info(`AI Service Adapter initialized, useBackend: ${this.useBackend}`);
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

    if (!this.useBackend) {
      this.logger.info('Initializing legacy AI service...');
      await this.legacyService.initialize();
    }
  }

  /**
   * 测试后端连接
   */
  private async testBackendConnection(): Promise<void> {
    const response = await fetch(`${API_CONFIG.baseURL}/api/v1/ai/providers`, {
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
    if (this.useBackend) {
      return this.processMessageWithBackend(message, context);
    } else {
      return this.legacyService.processMessage(message, context);
    }
  }

  /**
   * 使用后端API处理消息
   */
  private async processMessageWithBackend(message: string, context?: string[]): Promise<string> {
    try {
      // 构建消息列表
      const messages: Message[] = [];

      // 添加上下文
      if (context && context.length > 0) {
        context.forEach((ctx) => {
          messages.push({ role: 'user', content: ctx });
        });
      }

      // 添加当前消息
      messages.push({ role: 'user', content: message });

      // 调用后端API
      const response = await fetch(`${API_CONFIG.baseURL}/api/v1/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          options: {
            temperature: this.config.temperature || 0.7,
            max_tokens: this.config.maxTokens || 2000,
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
      this.logger.error('Backend AI processing failed, falling back to legacy', error);
      // 故障转移到legacy实现
      return this.legacyService.processMessage(message, context);
    }
  }

  /**
   * 流式对话
   */
  async *chatStream(message: string, context?: string[]): AsyncIterableIterator<string> {
    if (this.useBackend) {
      yield* this.chatStreamWithBackend(message, context);
    } else {
      yield* this.legacyService.chatStream(message, context);
    }
  }

  /**
   * 使用后端API进行流式对话
   */
  private async *chatStreamWithBackend(
    message: string,
    context?: string[]
  ): AsyncIterableIterator<string> {
    try {
      // 构建消息列表
      const messages: Message[] = [];

      if (context && context.length > 0) {
        context.forEach((ctx) => {
          messages.push({ role: 'user', content: ctx });
        });
      }

      messages.push({ role: 'user', content: message });

      // 调用流式API
      const response = await fetch(`${API_CONFIG.baseURL}/api/v1/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          options: {
            temperature: this.config.temperature || 0.7,
            max_tokens: this.config.maxTokens || 2000,
            stream: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend stream API error: ${response.status}`);
      }

      // 解析SSE流
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

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
            } catch (e) {
              // 忽略解析错误
            }
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
  async analyzeContent(content: string, analysisType: string): Promise<any> {
    if (this.useBackend) {
      return this.analyzeContentWithBackend(content, analysisType);
    } else {
      // Legacy实现可能没有analyzeContent方法，使用processMessage代替
      const prompt = `请分析以下内容（类型：${analysisType}）：\n\n${content}`;
      const response = await this.legacyService.processMessage(prompt);
      return { analysis: response };
    }
  }

  /**
   * 使用后端API进行内容分析
   */
  private async analyzeContentWithBackend(content: string, analysisType: string): Promise<any> {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/v1/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          analysis_type: analysisType,
          options: {
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
    if (!this.useBackend) {
      await this.legacyService.cleanup();
    }
  }
}

