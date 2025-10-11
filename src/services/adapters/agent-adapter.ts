/**
 * 智能体服务适配器
 * 
 * 提供统一的智能体服务接口，支持新旧实现切换
 */

import { FEATURE_FLAGS } from './feature-flags';
import type { BishengService } from '../../bisheng-integration/services/bisheng';

/**
 * 智能体工作流
 */
export interface AgentWorkflow {
  id: string;
  name: string;
  description?: string;
  status?: string;
  create_time?: string;
  update_time?: string;
}

/**
 * 智能体调用请求
 */
export interface AgentInvokeRequest {
  workflow_id: string;
  input: Record<string, any>;
  stream?: boolean;
  session_id?: string;
  message_id?: string;
  input_node_id?: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  success: boolean;
  token?: string;
  expiry?: number;
  error?: string;
}

/**
 * 智能体健康状态
 */
export interface AgentHealthStatus {
  service_name: string;
  healthy: boolean;
  connected: boolean;
  authenticated: boolean;
  last_check: string;
  error?: string;
}

/**
 * 智能体配置
 */
export interface AgentConfig {
  enabled: boolean;
  base_url: string;
  mode: 'api' | 'iframe';
}

/**
 * 智能体服务适配器
 */
export class AgentServiceAdapter {
  private useBackend: boolean;
  private backendUrl: string;
  private legacyService?: BishengService;

  constructor(backendUrl: string = 'http://localhost:8010') {
    this.useBackend = FEATURE_FLAGS.USE_BACKEND_AGENT;
    this.backendUrl = backendUrl;
    
    // 如果不使用后端，初始化legacy服务
    if (!this.useBackend) {
      this.initLegacyService();
    }
  }

  /**
   * 初始化legacy服务
   */
  private async initLegacyService(): Promise<void> {
    try {
      // 动态导入legacy服务
      const { BishengService } = await import('../../bisheng-integration/services/bisheng');
      this.legacyService = new BishengService();
    } catch (error) {
      console.error('Failed to initialize legacy Bisheng service:', error);
    }
  }

  /**
   * 登录
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.backendUrl}/v1/agent/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Backend login failed:', error);
        // 降级到legacy实现
        return this.loginLegacy(username, password);
      }
    } else {
      return this.loginLegacy(username, password);
    }
  }

  /**
   * Legacy登录实现
   */
  private async loginLegacy(username: string, password: string): Promise<LoginResponse> {
    if (!this.legacyService) {
      await this.initLegacyService();
    }

    if (!this.legacyService) {
      return {
        success: false,
        error: 'Legacy service not available',
      };
    }

    try {
      const result = await this.legacyService.login(username, password);
      return {
        success: result.success,
        token: result.access_token,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取工作流列表
   */
  async getWorkflows(
    token: string,
    pageSize: number = 50,
    pageNum: number = 1
  ): Promise<AgentWorkflow[]> {
    if (this.useBackend) {
      try {
        const response = await fetch(
          `${this.backendUrl}/v1/agent/workflows?page_size=${pageSize}&page_num=${pageNum}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Backend getWorkflows failed:', error);
        // 降级到legacy实现
        return this.getWorkflowsLegacy(token, pageSize, pageNum);
      }
    } else {
      return this.getWorkflowsLegacy(token, pageSize, pageNum);
    }
  }

  /**
   * Legacy获取工作流列表实现
   */
  private async getWorkflowsLegacy(
    token: string,
    pageSize: number,
    pageNum: number
  ): Promise<AgentWorkflow[]> {
    if (!this.legacyService) {
      await this.initLegacyService();
    }

    if (!this.legacyService) {
      return [];
    }

    try {
      const result = await this.legacyService.getWorkflows(pageSize, pageNum, token);
      return result.data || [];
    } catch (error) {
      console.error('Legacy getWorkflows failed:', error);
      return [];
    }
  }

  /**
   * 调用工作流
   */
  async invokeWorkflow(
    request: AgentInvokeRequest,
    token: string,
    onMessage?: (data: any) => void
  ): Promise<void> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.backendUrl}/v1/agent/invoke`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // 处理SSE流
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                onMessage?.(data);
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Backend invokeWorkflow failed:', error);
        // 降级到legacy实现
        return this.invokeWorkflowLegacy(request, token, onMessage);
      }
    } else {
      return this.invokeWorkflowLegacy(request, token, onMessage);
    }
  }

  /**
   * Legacy调用工作流实现
   */
  private async invokeWorkflowLegacy(
    request: AgentInvokeRequest,
    token: string,
    onMessage?: (data: any) => void
  ): Promise<void> {
    if (!this.legacyService) {
      await this.initLegacyService();
    }

    if (!this.legacyService) {
      throw new Error('Legacy service not available');
    }

    try {
      await this.legacyService.invokeWorkflow(
        request.workflow_id,
        request.input,
        token,
        request.session_id,
        request.message_id,
        request.input_node_id,
        onMessage
      );
    } catch (error) {
      console.error('Legacy invokeWorkflow failed:', error);
      throw error;
    }
  }

  /**
   * 停止工作流
   */
  async stopWorkflow(
    workflowId: string,
    sessionId: string,
    token: string
  ): Promise<boolean> {
    if (this.useBackend) {
      try {
        const response = await fetch(
          `${this.backendUrl}/v1/agent/stop?workflow_id=${workflowId}&session_id=${sessionId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        return result.success;
      } catch (error) {
        console.error('Backend stopWorkflow failed:', error);
        return false;
      }
    } else {
      // Legacy实现没有停止功能
      return false;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ success: boolean; services: Record<string, AgentHealthStatus> }> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.backendUrl}/v1/agent/health`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Backend health check failed:', error);
        return {
          success: false,
          services: {},
        };
      }
    } else {
      // Legacy实现没有健康检查
      return {
        success: true,
        services: {},
      };
    }
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<AgentConfig | null> {
    if (this.useBackend) {
      try {
        const response = await fetch(`${this.backendUrl}/v1/agent/config`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Backend getConfig failed:', error);
        return null;
      }
    } else {
      // Legacy实现返回默认配置
      return {
        enabled: true,
        base_url: 'http://localhost:7860',
        mode: 'api',
      };
    }
  }
}

// 导出单例
export const agentService = new AgentServiceAdapter();

