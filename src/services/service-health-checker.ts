/**
 * 服务健康检查工具
 * 用于在应用启动时检查各个依赖服务的状态
 */

import type { Logger } from '../utils/logger';

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unreachable' | 'disabled';
  url?: string;
  message?: string;
  details?: any;
}

export interface HealthCheckResult {
  allHealthy: boolean;
  services: ServiceStatus[];
  timestamp: string;
}

export class ServiceHealthChecker {
  private logger: Logger;
  private timeout: number;

  constructor(logger: Logger, timeout: number = 5000) {
    this.logger = logger;
    this.timeout = timeout;
  }

  /**
   * 检查所有服务的健康状态
   */
  async checkAllServices(config: any): Promise<HealthCheckResult> {
    this.logger.info('开始服务健康检查...');
    
    const services: ServiceStatus[] = [];

    // 检查后端服务
    if (config.medical?.enabled && config.medical?.apiUrl) {
      const backendStatus = await this.checkBackendService(config.medical.apiUrl);
      services.push(backendStatus);
    } else {
      services.push({
        name: '后端服务',
        status: 'disabled',
        message: '未配置或已禁用'
      });
    }

    // 检查Bisheng服务
    if (config.bisheng?.enabled && config.bisheng?.baseUrl) {
      const bishengStatus = await this.checkBishengService(config.bisheng.baseUrl);
      services.push(bishengStatus);
    } else {
      services.push({
        name: 'Bisheng服务',
        status: 'disabled',
        message: '未配置或已禁用'
      });
    }

    // 检查本地AI服务
    if (config.ai?.enabled && config.ai?.apiUrl) {
      const aiStatus = await this.checkLocalAIService(config.ai.apiUrl);
      services.push(aiStatus);
    } else {
      services.push({
        name: '本地AI服务',
        status: 'disabled',
        message: '未配置或已禁用'
      });
    }

    const allHealthy = services.every(s => 
      s.status === 'healthy' || s.status === 'disabled'
    );

    const result: HealthCheckResult = {
      allHealthy,
      services,
      timestamp: new Date().toISOString()
    };

    this.logHealthCheckResult(result);
    return result;
  }

  /**
   * 检查后端服务
   */
  private async checkBackendService(apiUrl: string): Promise<ServiceStatus> {
    const healthUrl = `${apiUrl.replace(/\/api$/, '')}/health`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          name: '后端服务',
          status: 'healthy',
          url: healthUrl,
          message: '连接正常',
          details: data
        };
      } else {
        return {
          name: '后端服务',
          status: 'unhealthy',
          url: healthUrl,
          message: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error: any) {
      return {
        name: '后端服务',
        status: 'unreachable',
        url: healthUrl,
        message: error.name === 'AbortError' ? '连接超时' : error.message
      };
    }
  }

  /**
   * 检查Bisheng服务
   */
  private async checkBishengService(baseUrl: string): Promise<ServiceStatus> {
    const healthUrl = `${baseUrl}/health`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          name: 'Bisheng服务',
          status: 'healthy',
          url: healthUrl,
          message: '连接正常'
        };
      } else {
        return {
          name: 'Bisheng服务',
          status: 'unhealthy',
          url: healthUrl,
          message: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error: any) {
      return {
        name: 'Bisheng服务',
        status: 'unreachable',
        url: healthUrl,
        message: error.name === 'AbortError' ? '连接超时' : error.message
      };
    }
  }

  /**
   * 检查本地AI服务 (Ollama)
   */
  private async checkLocalAIService(apiUrl: string): Promise<ServiceStatus> {
    // Ollama的健康检查端点
    const baseUrl = apiUrl.replace(/\/v1\/chat\/completions$/, '');
    const healthUrl = `${baseUrl}/api/tags`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const modelCount = data.models?.length || 0;
        return {
          name: '本地AI服务',
          status: 'healthy',
          url: healthUrl,
          message: `连接正常，可用模型: ${modelCount}`,
          details: { modelCount }
        };
      } else {
        return {
          name: '本地AI服务',
          status: 'unhealthy',
          url: healthUrl,
          message: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error: any) {
      return {
        name: '本地AI服务',
        status: 'unreachable',
        url: healthUrl,
        message: error.name === 'AbortError' ? '连接超时' : error.message
      };
    }
  }

  /**
   * 记录健康检查结果
   */
  private logHealthCheckResult(result: HealthCheckResult): void {
    this.logger.info('=' .repeat(60));
    this.logger.info('服务健康检查结果');
    this.logger.info('=' .repeat(60));

    for (const service of result.services) {
      const icon = this.getStatusIcon(service.status);
      const statusText = this.getStatusText(service.status);
      
      this.logger.info(`${icon} ${service.name}: ${statusText}`);
      
      if (service.url) {
        this.logger.info(`  URL: ${service.url}`);
      }
      
      if (service.message) {
        this.logger.info(`  消息: ${service.message}`);
      }
      
      if (service.details) {
        this.logger.info(`  详情: ${JSON.stringify(service.details)}`);
      }
    }

    this.logger.info('=' .repeat(60));
    
    if (result.allHealthy) {
      this.logger.info('✓ 所有必需服务运行正常');
    } else {
      this.logger.warn('⚠ 部分服务不可用，某些功能可能受限');
    }
    
    this.logger.info('=' .repeat(60));
  }

  /**
   * 获取状态图标
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'unhealthy':
        return '✗';
      case 'unreachable':
        return '⚠';
      case 'disabled':
        return '○';
      default:
        return '?';
    }
  }

  /**
   * 获取状态文本
   */
  private getStatusText(status: string): string {
    switch (status) {
      case 'healthy':
        return '正常';
      case 'unhealthy':
        return '异常';
      case 'unreachable':
        return '不可达';
      case 'disabled':
        return '已禁用';
      default:
        return '未知';
    }
  }
}

