/**
 * Bisheng 智能体服务
 * 提供 Bisheng 平台的集成功能，包括 API 调用和 iframe 代理
 */

import * as http from 'http';
import * as httpProxy from 'http-proxy';
import { Logger } from '../utils/logger';
import type { BishengConfig, BishengWorkflow, BishengSession } from '../shared/types';

export class BishengService {
  private logger: Logger;
  private config: BishengConfig;
  private proxyServer: http.Server | null = null;
  private proxy: httpProxy | null = null;
  private isProxyRunning: boolean = false;

  constructor(config: BishengConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Bisheng service...', {
      enabled: this.config.enabled,
      baseUrl: this.config.baseUrl,
      mode: this.config.mode,
    });

    if (!this.config.enabled) {
      this.logger.info('Bisheng service is disabled');
      return;
    }

    // 如果是 iframe 模式，启动代理服务器
    if (this.config.mode === 'iframe') {
      await this.startIframeProxy();
    }

    this.logger.info('Bisheng service initialized successfully');
  }

  /**
   * 启动 iframe 代理服务器
   */
  async startIframeProxy(): Promise<void> {
    if (this.isProxyRunning) {
      this.logger.warn('Iframe proxy is already running');
      return;
    }

    try {
      const httpProxyModule = await import('http-proxy');
      this.proxy = httpProxyModule.createProxyServer({});

      // 代理错误处理
      this.proxy.on('error', (err, req, res) => {
        this.logger.error('Proxy error:', err);
        if (res && !res.headersSent) {
          (res as http.ServerResponse).writeHead(500, {
            'Content-Type': 'text/plain',
          });
          (res as http.ServerResponse).end('代理服务器错误');
        }
      });

      // 创建 HTTP 服务器
      this.proxyServer = http.createServer((req, res) => {
        // 移除 X-Frame-Options 响应头
        this.proxy?.once('proxyRes', (proxyRes) => {
          delete proxyRes.headers['x-frame-options'];
          
          // 添加 CORS 头
          proxyRes.headers['access-control-allow-origin'] = '*';
          proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
          proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
          
          // 添加 Content-Security-Policy 允许 iframe 嵌入
          proxyRes.headers['content-security-policy'] = "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*";
        });

        // 代理请求到 Bisheng 前端
        const target = new URL(this.config.frontendUrl);
        this.proxy?.web(req, res, {
          target: `${target.protocol}//${target.host}`,
          changeOrigin: true,
          ws: true,
        });
      });

      // WebSocket 支持
      this.proxyServer.on('upgrade', (req, socket, head) => {
        const target = new URL(this.config.frontendUrl);
        this.proxy?.ws(req, socket, head, {
          target: `${target.protocol}//${target.host}`,
          changeOrigin: true,
        });
      });

      // 启动服务器
      await new Promise<void>((resolve, reject) => {
        this.proxyServer?.listen(this.config.iframeProxyPort, () => {
          this.logger.info(`Iframe proxy server started on port ${this.config.iframeProxyPort}`);
          this.isProxyRunning = true;
          resolve();
        });

        this.proxyServer?.on('error', (err) => {
          this.logger.error('Failed to start iframe proxy server:', err);
          reject(err);
        });
      });
    } catch (error) {
      this.logger.error('Error starting iframe proxy:', error);
      throw error;
    }
  }

  /**
   * 停止 iframe 代理服务器
   */
  async stopIframeProxy(): Promise<void> {
    if (!this.isProxyRunning || !this.proxyServer) {
      return;
    }

    return new Promise<void>((resolve) => {
      this.proxyServer?.close(() => {
        this.logger.info('Iframe proxy server stopped');
        this.isProxyRunning = false;
        this.proxyServer = null;
        this.proxy = null;
        resolve();
      });
    });
  }

  /**
   * 用户登录
   * 注意：当前 Bisheng 服务器登录接口返回 "Decryption failed" 错误
   * 建议使用硬编码的有效 token 或从配置文件读取
   */
  async login(username: string, password: string): Promise<{ token: string; expiry: number }> {
    try {
      this.logger.info('Attempting login', { username });

      const response = await fetch(`${this.config.baseUrl}/api/v1/user/login`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: username,
          password: password,
        }),
      });

      const data = await response.json();
      this.logger.info('Login response received', {
        status: response.status,
        statusCode: data.status_code,
        statusMessage: data.status_message
      });

      // 检查响应状态
      if (!response.ok || data.status_code !== 200) {
        const errorMsg = data.status_message || `HTTP ${response.status}`;
        this.logger.error('Login failed', { error: errorMsg, data });
        throw new Error(`登录失败: ${errorMsg}`);
      }

      // 从响应中提取 token（Bisheng 标准格式: data.data.access_token）
      const token = data?.data?.access_token;

      if (!token) {
        this.logger.error('No access token in response', { data });
        throw new Error('登录响应中未找到访问令牌');
      }

      // 计算过期时间（默认24小时）
      const expiry = Date.now() + 86400000;

      // 更新配置
      this.config.accessToken = token;
      this.config.tokenExpiry = expiry;

      this.logger.info('Login successful');
      return { token, expiry };
    } catch (error) {
      this.logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * 获取工作流列表
   */
  async getWorkflows(pageSize: number = 10, pageNum: number = 1): Promise<BishengWorkflow[]> {
    try {
      const url = `${this.config.baseUrl}/api/v1/workflow/list?page_size=${pageSize}&page_num=${pageNum}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get workflows failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // 处理不同的响应格式
      let workflows: BishengWorkflow[] = [];
      if (result.data && result.data.data && Array.isArray(result.data.data)) {
        workflows = result.data.data;
      } else if (result.data && result.data.items) {
        workflows = result.data.items;
      } else if (Array.isArray(result.data)) {
        workflows = result.data;
      } else if (Array.isArray(result)) {
        workflows = result;
      }

      this.logger.info(`Retrieved ${workflows.length} workflows`);
      return workflows;
    } catch (error) {
      this.logger.error('Get workflows error:', error);
      throw error;
    }
  }

  /**
   * 调用工作流
   * @param workflowId 工作流 ID
   * @param input 输入数据，格式为 { user_input: string } 或其他字段
   * @param stream 是否使用流式响应
   * @param sessionId 会话 ID（继续对话时必需）
   * @param messageId 消息 ID（继续对话时必需）
   * @param inputNodeId 输入节点 ID（继续对话时必需）
   * @returns ReadableStream 用于读取 SSE 事件流
   */
  async invokeWorkflow(
    workflowId: string,
    input: Record<string, any>,
    stream: boolean = true,
    sessionId?: string,
    messageId?: string,
    inputNodeId?: string
  ): Promise<ReadableStream> {
    try {
      const url = `${this.config.baseUrl}/api/v2/workflow/invoke`;

      // 构建请求体
      const body: any = {
        workflow_id: workflowId,
        stream: stream,
      };

      // 首次调用：不传递 input 参数，让工作流自动启动
      // 继续对话：传递 {node_id: {user_input: "..."}} 格式
      if (sessionId && inputNodeId) {
        // 继续对话
        body.session_id = sessionId;
        body.message_id = messageId ? parseInt(messageId, 10) : 0;
        body.input = {
          [inputNodeId]: input
        };
        this.logger.info('Continuing workflow conversation', {
          workflowId,
          sessionId,
          messageId,
          inputNodeId,
          inputKeys: Object.keys(input)
        });
      } else {
        // 首次调用，不传递 input
        this.logger.info('Starting new workflow', {
          workflowId
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Invoke workflow failed', {
          status: response.status,
          error: errorText
        });
        throw new Error(`工作流调用失败: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      this.logger.info('Workflow invoked successfully, returning stream');
      return response.body;
    } catch (error) {
      this.logger.error('Invoke workflow error:', error);
      throw error;
    }
  }

  /**
   * 停止工作流
   * @param workflowId 工作流 ID
   * @param sessionId 会话 ID
   */
  async stopWorkflow(workflowId: string, sessionId: string): Promise<void> {
    try {
      const url = `${this.config.baseUrl}/api/v2/workflow/stop`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Stop workflow failed', {
          status: response.status,
          error: errorText
        });
        throw new Error(`停止工作流失败: ${response.status} - ${errorText}`);
      }

      this.logger.info('Workflow stopped successfully', { workflowId, sessionId });
    } catch (error) {
      this.logger.error('Stop workflow error:', error);
      throw error;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<BishengConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Bisheng config updated');
  }

  /**
   * 获取当前配置
   */
  getConfig(): BishengConfig {
    return { ...this.config };
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    if (!this.config.accessToken) {
      return false;
    }

    if (this.config.tokenExpiry && this.config.tokenExpiry < Date.now()) {
      this.logger.warn('Token expired');
      return false;
    }

    return true;
  }

  /**
   * 测试工作流列表 API
   */
  async testWorkflowList(): Promise<{ success: boolean; statusCode: number; data?: any; workflows?: BishengWorkflow[]; error?: string }> {
    try {
      const url = `${this.config.baseUrl}/api/v1/workflow/list?page_size=10&page_num=1`;
      
      this.logger.info('Testing workflow list API:', { url });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      });

      this.logger.info('Workflow list API response status:', response.status);

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          data: data
        };
      }

      // 处理不同的响应格式
      let workflows: BishengWorkflow[] = [];
      if (data.data && data.data.data && Array.isArray(data.data.data)) {
        workflows = data.data.data;
      } else if (data.data && data.data.items) {
        workflows = data.data.items;
      } else if (Array.isArray(data.data)) {
        workflows = data.data;
      } else if (Array.isArray(data)) {
        workflows = data;
      }

      this.logger.info(`Retrieved ${workflows.length} workflows for testing`);
      
      return {
        success: response.ok && (data.status_code === 200 || data.code === 0),
        statusCode: response.status,
        data: data,
        workflows: workflows
      };
    } catch (error) {
      this.logger.error('Test workflow list error:', error);
      return {
        success: false,
        statusCode: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 测试工作流调用 API
   */
  async testWorkflowInvoke(workflowId: string): Promise<{ success: boolean; statusCode: number; data?: any; isStream?: boolean; error?: string }> {
    try {
      const url = `${this.config.baseUrl}/api/v2/workflow/invoke`;
      
      this.logger.info('Testing workflow invoke API:', { url, workflowId });
      
      const requestBody = {
        workflow_id: workflowId,
        stream: true,
        user_input: {
          query: "你好，这是一个测试消息"
        },
        message_id: 0,
        session_id: "test-session-" + Date.now()
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: JSON.stringify(requestBody)
      });

      this.logger.info('Workflow invoke API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const responseText = await response.text();
      
      // 处理流式响应 (Server-Sent Events)
      if (responseText.startsWith('data: ')) {
        this.logger.info('Processing streaming response');
        const lines = responseText.split('\n');
        let sessionId = '';
        let messageId = '';
        let answer = '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.substring(6));
              if (jsonData.session_id) sessionId = jsonData.session_id;
              if (jsonData.data) {
                if (jsonData.data.message_id) messageId = jsonData.data.message_id;
                if (jsonData.data.output_schema && jsonData.data.output_schema.message) {
                  answer += Array.isArray(jsonData.data.output_schema.message) 
                    ? jsonData.data.output_schema.message.join(' ') 
                    : jsonData.data.output_schema.message;
                }
              }
            } catch (e) {
              // 忽略解析错误，继续处理下一行
            }
          }
        }
        
        return {
          success: true,
          statusCode: response.status,
          data: { session_id: sessionId, message_id: messageId, answer: answer },
          isStream: true
        };
      } else {
        // 处理普通 JSON 响应
        try {
          const result = JSON.parse(responseText);
          return {
            success: response.status === 200 && result.code === 0,
            statusCode: response.status,
            data: result,
            isStream: false
          };
        } catch (e) {
          return {
            success: false,
            statusCode: response.status,
            error: 'Failed to parse response as JSON',
            data: responseText
          };
        }
      }
    } catch (error) {
      this.logger.error('Test workflow invoke error:', error);
      return {
        success: false,
        statusCode: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 运行完整的连接测试
   */
  async runConnectionTests(): Promise<{
    overall: boolean;
    login: { success: boolean; error?: string };
    workflowList: { success: boolean; count: number; error?: string };
    workflowInvoke?: { success: boolean; error?: string };
    details: string[];
  }> {
    const details: string[] = [];
    let loginSuccess = false;
    let workflowListSuccess = false;
    let workflowInvokeSuccess = false;
    let workflowCount = 0;

    try {
      // 1. 测试登录
      details.push('🔍 开始测试 Bisheng API 连接...');
      
      try {
        const loginResult = await this.login(this.config.username, this.config.password);
        if (loginResult && loginResult.token) {
          loginSuccess = true;
          details.push('✅ 登录测试通过');
        } else {
          details.push('❌ 登录失败: 未获取到访问令牌');
          return {
            overall: false,
            login: { success: false, error: '未获取到访问令牌' },
            workflowList: { success: false, count: 0, error: '跳过，登录失败' },
            details
          };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        details.push(`❌ 登录失败: ${errorMsg}`);
        return {
          overall: false,
          login: { success: false, error: errorMsg },
          workflowList: { success: false, count: 0, error: '跳过，登录失败' },
          details
        };
      }

      // 2. 测试工作流列表
      try {
        const workflowResult = await this.testWorkflowList();
        if (workflowResult.success && workflowResult.workflows) {
          workflowListSuccess = true;
          workflowCount = workflowResult.workflows.length;
          details.push(`✅ 工作流列表测试通过，找到 ${workflowCount} 个工作流`);
          
          // 3. 测试工作流调用（如果有工作流）
          if (workflowResult.workflows.length > 0) {
            const firstWorkflow = workflowResult.workflows[0];
            details.push(`🔄 测试工作流调用: ${firstWorkflow.name} (${firstWorkflow.id})`);
            
            try {
              const invokeResult = await this.testWorkflowInvoke(firstWorkflow.id);
              if (invokeResult.success) {
                workflowInvokeSuccess = true;
                details.push('✅ 工作流调用测试通过');
                if (invokeResult.data && invokeResult.data.answer) {
                  details.push(`💬 AI 回复: ${invokeResult.data.answer.substring(0, 100)}...`);
                }
              } else {
                details.push(`❌ 工作流调用失败: ${invokeResult.error}`);
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              details.push(`❌ 工作流调用异常: ${errorMsg}`);
            }
          } else {
            details.push('⚠️ 跳过工作流调用测试，没有可用的工作流');
          }
        } else {
          details.push(`❌ 工作流列表测试失败: ${workflowResult.error}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        details.push(`❌ 工作流列表测试异常: ${errorMsg}`);
      }

      const overall = loginSuccess && workflowListSuccess;
      
      if (overall) {
        details.push('🎉 所有测试通过！Bisheng API 连接正常。');
      } else {
        details.push('⚠️ 部分测试失败，请检查配置和服务状态。');
      }

      return {
        overall,
        login: { success: loginSuccess },
        workflowList: { success: workflowListSuccess, count: workflowCount },
        workflowInvoke: workflowInvokeSuccess ? { success: true } : undefined,
        details
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      details.push(`💥 测试过程发生异常: ${errorMsg}`);
      
      return {
        overall: false,
        login: { success: loginSuccess },
        workflowList: { success: workflowListSuccess, count: workflowCount },
        details
      };
    }
  }

  /**
   * 获取代理状态
   */
  getProxyStatus(): { running: boolean; port: number } {
    return {
      running: this.isProxyRunning,
      port: this.config.iframeProxyPort,
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Bisheng service...');
    
    if (this.isProxyRunning) {
      await this.stopIframeProxy();
    }

    this.logger.info('Bisheng service cleanup complete');
  }
}

