import { EventEmitter } from 'events';
import type { Logger } from '../utils/logger';
import type { AIConfig, AIState, AIMessage, AIResponse } from '../shared/types';
import { WebSearchService } from './web-search';

// AI服务状态
export type AIServiceState = 'idle' | 'processing' | 'error';

// AI事件
export interface AIEvents {
  'processing-start': () => void;
  'processing-end': () => void;
  'processing-error': (error: Error) => void;
  'response-received': (response: AIResponse) => void;
  'state-change': (state: AIState) => void;
}

// OpenAI API响应接口
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Claude API响应接口
interface ClaudeResponse {
  content: Array<{
    text: string;
    type: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AIService extends EventEmitter {
  private logger: Logger;
  private config: AIConfig;
  private state: AIServiceState = 'idle';
  private isEnabled: boolean = false;
  private conversationHistory: AIMessage[] = [];
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue: boolean = false;
  private rateLimitDelay: number = 1000; // 1秒
  private lastRequestTime: number = 0;
  private webSearchService?: WebSearchService;

  constructor(config: AIConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.isEnabled = config.enabled;
  }

  /**
   * 初始化AI服务
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing AI service...');

    try {
      if (!this.isEnabled) {
        this.logger.info('AI service is disabled');
        return;
      }

      // 对于本地提供商（Ollama/OpenAI兼容端点），不需要 API Key
      if (this.config.provider !== 'local') {
        // 验证API密钥 - 如果没有配置,禁用服务但不抛出错误
        const apiKey = this.getApiKey();
        if (!apiKey) {
          this.logger.warn('AI API key not configured, service will be disabled');
          this.isEnabled = false;
          return;
        }
      }

      // 验证API密钥格式
      await this.validateApiKey();

      // 仅云端 provider 预连通测试，本地 provider 跳过
      if (this.config.provider !== 'local') {
        await this.testConnection();
      } else {
        this.logger.info('Skip connection test for local provider');
      }

      // 初始化网络搜索服务
      if (this.config.webSearch?.enabled) {
        this.webSearchService = new WebSearchService(this.config.webSearch, this.logger);
        await this.webSearchService.initialize();
        this.logger.info('Web search service initialized');
      }

      this.logger.info('AI service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AI service:', error);
      if (this.config.provider === 'local') {
        // 本地 provider 初始化失败时不禁用，允许稍后重试
        this.logger.warn('Local provider init failed; keeping AI service enabled for later retry');
      } else {
        // 云端 provider 失败时禁用
        this.isEnabled = false;
        this.logger.warn('AI service has been disabled due to initialization failure');
      }
    }
  }

  /**
   * 验证API密钥
   */
  private async validateApiKey(): Promise<void> {
    if (this.config.provider === 'local') {
      // 本地提供商无需校验密钥
      return;
    }
    const apiKey = this.getApiKey();
    if (!apiKey) return;
    if (apiKey.startsWith('sk-') && apiKey.length < 20) {
      throw new Error('Invalid API key format');
    }
    this.logger.info(`API key validated for ${this.config.provider}`);
  }

  /**
   * 获取API密钥
   */
  private getApiKey(): string {
    return this.config.apiKey || '';
  }

  /**
   * 获取API端点
   */
  private getApiEndpoint(): string {
    switch (this.config.provider) {
      case 'openai':
        return this.config.apiUrl || 'https://api.openai.com/v1/chat/completions';
      case 'local':
        // Ollama 的 OpenAI 兼容端点
        return this.config.apiUrl || 'http://localhost:11434/v1/chat/completions';
      case 'claude':
        return 'https://api.anthropic.com/v1/messages';
      case 'gemini':
        return `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent`;
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * 测试连接
   */
  private async testConnection(): Promise<void> {
    try {
      const testMessage: AIMessage = {
        role: 'user',
        content: 'Hello, this is a connection test.',
        timestamp: Date.now()
      };
      
      await this.processMessage(testMessage, { skipHistory: true });
      this.logger.info('AI service connection test passed');
    } catch (error) {
      this.logger.error('AI service connection test failed:', error);
      throw new Error(`Failed to connect to ${this.config.provider}: ${error}`);
    }
  }

  /**
   * 处理消息
   */
  async processMessage(
    message: AIMessage, 
    options: { skipHistory?: boolean; systemPrompt?: string; onChunk?: (chunk: string) => void } = {}
  ): Promise<AIResponse> {
    if (!this.isEnabled) {
      throw new Error('AI service is not enabled');
    }
    
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const response = await this.executeRequest(message, options);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  /**
   * 处理消息（流式）
   */
  async processMessageStream(
    message: AIMessage,
    onChunk: (chunk: string) => void,
    options: { skipHistory?: boolean; systemPrompt?: string } = {}
  ): Promise<AIResponse> {
    if (!this.isEnabled) {
      throw new Error('AI service is not enabled');
    }

    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const response = await this.executeRequestStream(message, onChunk, options);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * 处理请求队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        // 实施速率限制
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.rateLimitDelay) {
          await new Promise(resolve => 
            setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
          );
        }
        
        await request();
        this.lastRequestTime = Date.now();
      }
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * 执行请求
   */
  private async executeRequest(
    message: AIMessage, 
    options: { skipHistory?: boolean; systemPrompt?: string; onChunk?: (chunk: string) => void } = {}
  ): Promise<AIResponse> {
    this.state = 'processing';
    this.emit('processing-start');
    this.emitStateChange();
    
    try {
      // 添加到对话历史
      if (!options.skipHistory) {
        this.conversationHistory.push(message);
        
        // 限制历史长度
        if (this.conversationHistory.length > this.config.maxHistory) {
          this.conversationHistory = this.conversationHistory.slice(-this.config.maxHistory);
        }
      }
      
      // 构建请求
      const requestBody = this.buildRequestBody(message, options.systemPrompt, false);
      
      // 发送请求
      const response = await this.sendRequest(requestBody);
      
      // 解析响应
      const aiResponse = this.parseResponse(response);
      
      // 添加助手回复到历史
      if (!options.skipHistory) {
        this.conversationHistory.push({
          role: 'assistant',
          content: aiResponse.content,
          timestamp: Date.now()
        });
      }
      
      this.state = 'idle';
      this.emit('processing-end');
      this.emit('response-received', aiResponse);
      this.emitStateChange();
      
      this.logger.info(`AI response generated (${aiResponse.usage?.totalTokens || 0} tokens)`);
      
      return aiResponse;
    } catch (error) {
      this.state = 'error';
      this.emit('processing-error', error as Error);
      this.emitStateChange();
      this.logger.error('Failed to process AI message:', error);
      throw error;
    }
  }

  /**
   * 执行请求（流式）
   */
  private async executeRequestStream(
    message: AIMessage,
    onChunk: (chunk: string) => void,
    options: { skipHistory?: boolean; systemPrompt?: string } = {}
  ): Promise<AIResponse> {
    this.state = 'processing';
    this.emit('processing-start');
    this.emitStateChange();

    try {
      // 添加到对话历史
      if (!options.skipHistory) {
        this.conversationHistory.push(message);

        // 限制历史长度
        if (this.conversationHistory.length > this.config.maxHistory) {
          this.conversationHistory = this.conversationHistory.slice(-this.config.maxHistory);
        }
      }

      // 构建请求（启用流式）
      const requestBody = this.buildRequestBody(message, options.systemPrompt, true);

      // 发送流式请求
      const response = await this.sendRequestStream(requestBody, onChunk);

      // 添加助手回复到历史
      if (!options.skipHistory) {
        this.conversationHistory.push({
          role: 'assistant',
          content: response.content,
          timestamp: Date.now()
        });
      }

      this.state = 'idle';
      this.emit('processing-end');
      this.emit('response-received', response);
      this.emitStateChange();

      this.logger.info(`AI response generated (streaming, ${response.usage?.totalTokens || 0} tokens)`);

      return response;
    } catch (error) {
      this.state = 'error';
      this.emit('processing-error', error as Error);
      this.emitStateChange();
      this.logger.error('Failed to process AI message (stream):', error);
      throw error;
    }
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(message: AIMessage, systemPrompt?: string, stream: boolean = false): any {
    const messages = [...this.conversationHistory, message];
    const thinkDirective = '重要: 如果产生 “<think>...</think>” 思考过程，请仅在该标签内部书写思考，不要把思考内容放在最终输出正文中。请在思考后提供清晰的最终答案，并确保最终答案不在 <think> 标签内。';
    
    // 添加系统提示
    if (systemPrompt) {
      messages.unshift({
        role: 'system',
        content: `${systemPrompt}\n\n${thinkDirective}`,
        timestamp: Date.now()
      });
    } else {
      messages.unshift({ role: 'system', content: thinkDirective, timestamp: Date.now() });
    }
    
    switch (this.config.provider) {
      case 'openai':
      case 'local':
        const requestBody: any = {
          model: this.config.model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          top_p: this.config.topP,
          frequency_penalty: this.config.frequencyPenalty,
          presence_penalty: this.config.presencePenalty,
          stream: stream && this.config.streamResponse
        };

        // 添加工具调用支持
        if (this.config.toolsEnabled && this.webSearchService) {
          requestBody.tools = this.getAvailableTools();
        }

        return requestBody;
        
      case 'claude':
        return {
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          top_p: this.config.topP,
          messages: messages.filter(msg => msg.role !== 'system').map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          system: `${systemPrompt || ''}${systemPrompt ? '\n\n' : ''}${thinkDirective}`,
          stream: stream && this.config.streamResponse
        };
        
      case 'gemini':
        return {
          contents: messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          })),
          generationConfig: {
            maxOutputTokens: this.config.maxTokens,
            temperature: this.config.temperature,
            topP: this.config.topP
          }
        };
        
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * 发送请求
   */
  private async sendRequest(requestBody: any): Promise<any> {
    const apiKey = this.getApiKey();
    let endpoint = this.getApiEndpoint();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // 设置认证头
    switch (this.config.provider) {
      case 'openai':
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'local':
        // 本地接口无需认证
        break;
      case 'claude':
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'gemini':
        // Gemini使用查询参数
        break;
    }

    // prefer IPv4 for localhost
    if (this.config.provider === 'local' && (endpoint.includes('localhost') || endpoint.includes('[::1]'))) {
      endpoint = endpoint.replace('localhost', '127.0.0.1').replace('[::1]', '127.0.0.1');
    }

    const url = this.config.provider === 'gemini'
      ? `${endpoint}?key=${apiKey}`
      : endpoint;

    const doFetch = async (target: string) => fetch(target, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    let response: Response | null = null;
    try {
      response = await doFetch(url);
    } catch (err: any) {
      // IPv6 -> IPv4 回退
      if (this.config.provider === 'local' && (url.includes('localhost') || url.includes('::1'))) {
        const ipv4Url = url.replace('localhost', '127.0.0.1').replace('[::1]', '127.0.0.1');
        this.logger.warn(`Local provider fetch failed, retrying via IPv4: ${ipv4Url}`);
        response = await doFetch(ipv4Url);
      } else {
        throw err;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (this.config.provider === 'local') {
        // 1) Try OpenAI completions fallback
        try {
          const fbUrl = url.replace('/v1/chat/completions', '/v1/completions');
          const prompt = this.buildCompletionPromptFromBody(requestBody);
          const fbResp = await fetch(fbUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: this.config.model,
              prompt,
              max_tokens: this.config.maxTokens,
              temperature: this.config.temperature,
              stream: false,
            }),
          });
          if (fbResp.ok) {
            const data = await fbResp.json();
            return this.wrapCompletionAsChat(data);
          }
        } catch {}

        // 2) Try native /api/chat
        try {
          const origin = new URL(url).origin;
          const apiChat = `${origin}/api/chat`;
          const messages = Array.isArray((requestBody as any)?.messages)
            ? (requestBody as any).messages
            : [];
          const nativeBody = {
            model: this.config.model,
            messages: messages,
            stream: false,
          };
          const nb = await fetch(apiChat, {
            method: 'POST',
            headers,
            body: JSON.stringify(nativeBody),
          });
          if (nb.ok) {
            const data = await nb.json();
            const text = data?.message?.content || data?.response || data?.text || '';
            return this.wrapCompletionAsChat({
              choices: [{ text }],
              usage: data?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            });
          }
        } catch {}

        // 3) Try native /api/generate with a plain prompt
        try {
          const origin = new URL(url).origin;
          const apiGen = `${origin}/api/generate`;
          const prompt = this.buildCompletionPromptFromBody(requestBody);
          const nb = await fetch(apiGen, {
            method: 'POST',
            headers,
            body: JSON.stringify({ model: this.config.model, prompt, stream: false }),
          });
          if (nb.ok) {
            const data = await nb.json();
            const text = data?.response || data?.output || '';
            return this.wrapCompletionAsChat({ choices: [{ text }], usage: data?.usage || {} });
          }
        } catch {}
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  private buildCompletionPromptFromBody(body: any): string {
    try {
      const msgs = Array.isArray(body?.messages) ? body.messages : [];
      const lines: string[] = [];
      for (const m of msgs) {
        if (!m || !m.role) continue;
        const role = m.role === 'assistant' ? 'Assistant' : m.role === 'system' ? 'System' : 'User';
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        lines.push(`${role}: ${content}`);
      }
      lines.push('Assistant:');
      return lines.join('\n');
    } catch {
      return 'Assistant:';
    }
  }

  private wrapCompletionAsChat(data: any): any {
    const text = data?.choices?.[0]?.text ?? '';
    const usage = data?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    return {
      choices: [
        {
          message: { content: text, role: 'assistant' },
          finish_reason: 'stop',
        },
      ],
      usage,
    } as any;
  }

  /**
   * 发送流式请求
   */
  private async sendRequestStream(requestBody: any, onChunk: (chunk: string) => void): Promise<AIResponse> {
    const apiKey = this.getApiKey();
    let endpoint = this.getApiEndpoint();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // 设置认证头
    switch (this.config.provider) {
      case 'openai':
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'local':
        // 本地接口无需认证
        break;
      case 'claude':
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'gemini':
        // Gemini使用查询参数
        break;
    }

    // prefer IPv4 for localhost
    if (this.config.provider === 'local' && (endpoint.includes('localhost') || endpoint.includes('[::1]'))) {
      endpoint = endpoint.replace('localhost', '127.0.0.1').replace('[::1]', '127.0.0.1');
    }

    const url = this.config.provider === 'gemini'
      ? `${endpoint}?key=${apiKey}`
      : endpoint;

    const doFetch = async (target: string) => fetch(target, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    let response: Response | null = null;
    try {
      response = await doFetch(url);
    } catch (err: any) {
      // IPv6 -> IPv4 回退
      if (this.config.provider === 'local' && (url.includes('localhost') || url.includes('::1'))) {
        const ipv4Url = url.replace('localhost', '127.0.0.1').replace('[::1]', '127.0.0.1');
        this.logger.warn(`Local provider fetch failed, retrying via IPv4: ${ipv4Url}`);
        response = await doFetch(ipv4Url);
      } else {
        throw err;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // 处理流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder('utf-8');
    let fullContent = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const jsonStr = trimmed.substring(6); // 移除 'data: ' 前缀
            const data = JSON.parse(jsonStr);

            // 解析不同提供商的流式响应格式
            let content = '';
            switch (this.config.provider) {
              case 'openai':
              case 'local':
                content = data.choices?.[0]?.delta?.content || '';
                break;
              case 'claude':
                if (data.type === 'content_block_delta') {
                  content = data.delta?.text || '';
                }
                break;
              case 'gemini':
                content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                break;
            }

            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch (e) {
            this.logger.warn('Failed to parse stream chunk:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // 返回完整响应
    return {
      content: fullContent,
      provider: this.config.provider,
      model: this.config.model,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      timestamp: Date.now()
    };
  }

  /**
   * 解析响应
   */
  private parseResponse(response: any): AIResponse {
    switch (this.config.provider) {
      case 'openai':
      case 'local':
        return this.parseOpenAIResponse(response as OpenAIResponse);
      case 'claude':
        return this.parseClaudeResponse(response as ClaudeResponse);
      case 'gemini':
        return this.parseGeminiResponse(response);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * 解析OpenAI响应
   */
  private parseOpenAIResponse(response: OpenAIResponse): AIResponse {
    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response from OpenAI');
    }
    
    return {
      content: choice.message.content,
      provider: 'openai',
      model: this.config.model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      },
      timestamp: Date.now()
    };
  }

  /**
   * 解析Claude响应
   */
  private parseClaudeResponse(response: ClaudeResponse): AIResponse {
    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('No text response from Claude');
    }
    
    return {
      content: content.text,
      provider: 'claude',
      model: this.config.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      },
      timestamp: Date.now()
    };
  }

  /**
   * 解析Gemini响应
   */
  private parseGeminiResponse(response: any): AIResponse {
    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content) {
      throw new Error('No response from Gemini');
    }
    
    const text = candidate.content.parts?.[0]?.text;
    if (!text) {
      throw new Error('No text in Gemini response');
    }
    
    return {
      content: text,
      provider: 'gemini',
      model: this.config.model,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      },
      timestamp: Date.now()
    };
  }

  /**
   * 生成摘要
   */
  async generateSummary(text: string, maxLength: number = 200): Promise<string> {
    const summaryPrompt = `请为以下文本生成一个简洁的摘要，长度不超过${maxLength}个字符：\n\n${text}`;
    
    const message: AIMessage = {
      role: 'user',
      content: summaryPrompt,
      timestamp: Date.now()
    };
    
    const response = await this.processMessage(message, { skipHistory: true });
    return response.content;
  }

  /**
   * 分析桌面内容
   */
  async analyzeDesktopContent(
    content: string, 
    context: string = ''
  ): Promise<AIResponse> {
    const analysisPrompt = `作为桌面AI助手，请分析以下桌面内容并提供有用的建议或操作：

桌面内容：
${content}

${context ? `上下文：${context}` : ''}

请提供：
1. 内容分析
2. 可能的操作建议
3. 相关信息或提醒`;
    
    const message: AIMessage = {
      role: 'user',
      content: analysisPrompt,
      timestamp: Date.now()
    };
    
    return await this.processMessage(message);
  }

  /**
   * 清除对话历史
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.logger.info('Conversation history cleared');
  }

  /**
   * 获取对话历史
   */
  getHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<AIConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.isEnabled = this.config.enabled;
    
    // 如果更改了提供商或API密钥，重新验证
    if (config.provider || config.apiKey) {
      await this.validateApiKey();
    }
    
    // 更新网络搜索服务
    if (config.webSearch && this.webSearchService) {
      await this.webSearchService.updateConfig(config.webSearch);
    } else if (config.webSearch?.enabled && !this.webSearchService) {
      // 如果启用了网络搜索但服务不存在，创建它
      this.webSearchService = new WebSearchService(config.webSearch, this.logger);
      await this.webSearchService.initialize();
    }
    
    this.logger.info('AI service config updated');
    this.emitStateChange();
  }

  /**
   * 获取当前状态
   */
  getState(): AIState {
    return {
      enabled: this.isEnabled,
      state: this.state,
      provider: this.config.provider,
      model: this.config.model,
      historyLength: this.conversationHistory.length,
      queueLength: this.requestQueue.length,
      config: this.config
    };
  }

  /**
   * 获取可用的AI提供商
   */
  getAvailableProviders(): string[] {
    return ['local', 'openai', 'claude', 'gemini'];
  }

  /**
   * 发送消息到指定提供商
   */
  async sendMessage(provider: string, messages: AIMessage[]): Promise<AIResponse> {
    // 临时切换提供商
    const originalProvider = this.config.provider;
    this.config.provider = provider as any;
    
    try {
      // 处理最后一条消息
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) {
        throw new Error('No messages provided');
      }
      const response = await this.processMessage(lastMessage, { skipHistory: true });
      return response;
    } finally {
      // 恢复原始提供商
      this.config.provider = originalProvider;
    }
  }

  /**
   * 分析内容
   */
  async analyzeContent(content: string, context?: string): Promise<AIResponse> {
    return this.analyzeDesktopContent(content, context || '');
  }

  /**
   * 发送状态变化事件
   */
  private emitStateChange(): void {
    this.emit('state-change', this.getState());
  }

  /**
   * 获取可用工具列表
   */
  private getAvailableTools(): any[] {
    const tools = [];
    
    if (this.webSearchService) {
      tools.push({
        type: 'function',
        function: {
          name: 'web_search',
          description: '搜索网络获取最新信息，用于回答需要实时数据的问题',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: '搜索查询词'
              },
              maxResults: {
                type: 'number',
                description: '最大结果数量',
                default: 5
              }
            },
            required: ['query']
          }
        }
      });
    }
    
    return tools;
  }

  /**
   * 处理工具调用
   */
  private async handleToolCall(toolCall: any): Promise<string> {
    const { name, arguments: args } = toolCall.function;
    
    try {
      switch (name) {
        case 'web_search':
          if (!this.webSearchService) {
            return '网络搜索服务未启用';
          }
          
          const searchQuery = JSON.parse(args).query;
          const maxResults = JSON.parse(args).maxResults || 5;
          
          this.logger.info(`执行网络搜索: "${searchQuery}"`);
          
          const searchResponse = await this.webSearchService.search(searchQuery, { maxResults });
          
          if (!searchResponse.success) {
            return `网络搜索失败: ${searchResponse.error}`;
          }
          
          // 格式化搜索结果
          let result = `网络搜索结果 (${searchResponse.results.length} 条):\n\n`;
          searchResponse.results.forEach((item, index) => {
            result += `${index + 1}. **${item.title}**\n`;
            result += `   ${item.snippet}\n`;
            result += `   来源: ${item.url}\n\n`;
          });
          
          return result;
          
        default:
          return `未知工具: ${name}`;
      }
    } catch (error) {
      this.logger.error(`工具调用失败 (${name}):`, error);
      return `工具调用失败: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  /**
   * 处理带工具调用的消息
   */
  async processMessageWithTools(
    message: AIMessage,
    options: { skipHistory?: boolean; systemPrompt?: string; onChunk?: (chunk: string) => void } = {}
  ): Promise<AIResponse> {
    if (!this.isEnabled) {
      throw new Error('AI service is not enabled');
    }

    if (!this.config.toolsEnabled || !this.webSearchService) {
      // 如果没有启用工具，使用普通处理
      return this.processMessage(message, options);
    }

    this.state = 'processing';
    this.emit('processing-start');
    this.emitStateChange();

    try {
      // 添加到对话历史
      if (!options.skipHistory) {
        this.conversationHistory.push(message);
        
        // 限制历史长度
        if (this.conversationHistory.length > this.config.maxHistory) {
          this.conversationHistory = this.conversationHistory.slice(-this.config.maxHistory);
        }
      }

      // 构建请求体（包含工具）
      const requestBody = this.buildRequestBody(message, options.systemPrompt, false);
      
      // 发送请求
      const response = await this.sendRequest(requestBody);
      
      // 检查是否有工具调用
      const choice = response.choices?.[0];
      if (choice?.message?.tool_calls) {
        // 处理工具调用
        let toolResults = '';
        for (const toolCall of choice.message.tool_calls) {
          const toolResult = await this.handleToolCall(toolCall);
          toolResults += toolResult + '\n\n';
        }
        
        // 将工具结果作为新的用户消息发送给 AI
        const toolMessage: AIMessage = {
          role: 'user',
          content: `基于以下搜索结果，请回答用户的问题：\n\n${toolResults}`,
          timestamp: Date.now()
        };
        
        // 递归调用处理工具结果
        const finalResponse = await this.processMessage(toolMessage, { skipHistory: true });
        
        this.state = 'idle';
        this.emit('processing-end');
        this.emit('response-received', finalResponse);
        this.emitStateChange();
        
        return finalResponse;
      } else {
        // 没有工具调用，正常处理
        const aiResponse = this.parseResponse(response);
        
        // 添加助手回复到历史
        if (!options.skipHistory) {
          this.conversationHistory.push({
            role: 'assistant',
            content: aiResponse.content,
            timestamp: Date.now()
          });
        }
        
        this.state = 'idle';
        this.emit('processing-end');
        this.emit('response-received', aiResponse);
        this.emitStateChange();
        
        return aiResponse;
      }
    } catch (error) {
      this.state = 'error';
      this.emit('processing-error', error as Error);
      this.emitStateChange();
      this.logger.error('Failed to process AI message with tools:', error);
      throw error;
    }
  }

  /**
   * 直接执行网络搜索
   */
  async searchWeb(query: string, maxResults: number = 5): Promise<any> {
    if (!this.webSearchService) {
      throw new Error('Web search service is not enabled');
    }
    
    return await this.webSearchService.search(query, { maxResults });
  }


  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up AI service...');
    
    // 清空请求队列
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // 清除对话历史
    this.clearHistory();
    
    // 清理网络搜索服务
    if (this.webSearchService) {
      await this.webSearchService.cleanup();
    }
    
    // 移除所有监听器
    this.removeAllListeners();
    
    this.logger.info('AI service cleanup completed');
  }
}
