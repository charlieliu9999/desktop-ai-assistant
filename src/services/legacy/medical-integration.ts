// @ts-nocheck - Legacy code, type checking disabled
import { EventEmitter } from 'events';
import type { Logger } from '../../utils/logger';
import {
  MedicalConfig,
  MedicalState,
  PatientRecord,
  MedicalSearchResult,
  MedicalApiResponse
} from '../../shared/types';

// 医疗服务状态
export type MedicalServiceState = 'idle' | 'connecting' | 'connected' | 'searching' | 'error';

// 医疗事件
export interface MedicalEvents {
  'connection-established': () => void;
  'connection-lost': () => void;
  'search-start': () => void;
  'search-complete': (results: MedicalSearchResult[]) => void;
  'search-error': (error: Error) => void;
  'patient-record-loaded': (record: PatientRecord) => void;
  'state-change': (state: MedicalState) => void;
}

// 缓存项接口
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// 搜索缓存
interface SearchCache {
  [query: string]: CacheItem<MedicalSearchResult[]>;
}

// 患者记录缓存
interface PatientCache {
  [patientId: string]: CacheItem<PatientRecord>;
}

export class MedicalIntegrationService extends EventEmitter {
  private logger: Logger;
  private config: MedicalConfig;
  private state: MedicalServiceState = 'idle';
  private isEnabled: boolean = false;
  private searchCache: SearchCache = {};
  private patientCache: PatientCache = {};
  private connectionRetryCount: number = 0;
  private maxRetries: number = 3;
  private retryDelay: number = 5000; // 5秒
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue: boolean = false;
  private rateLimitDelay: number = 500; // 500ms
  private lastRequestTime: number = 0;

  constructor(config: MedicalConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.isEnabled = config.enabled;
  }

  /**
   * 初始化医疗集成服务
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing medical integration service...');
    
    try {
      if (!this.isEnabled) {
        this.logger.info('Medical integration service is disabled');
        return;
      }

      // 验证配置
      this.validateConfig();
      
      // 建立连接
      await this.establishConnection();
      
      // 仅在连接成功且配置完整时启动健康检查
      if (this.state === 'connected' && this.config.apiUrl && (this.config.apiKey || (this.config.username && this.config.password))) {
        this.startHealthCheck();
      } else {
        this.logger.info('Skip health check (service not connected or config incomplete)');
      }
      
      this.logger.info('Medical integration service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize medical integration service:', error);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    if (!this.config.apiUrl) {
      this.logger.warn('Medical API URL is not configured, service will be limited');
      return;
    }
    
    if (!this.config.apiKey) {
      this.logger.warn('API key is not configured for medical integration, service will be limited');
      return;
    }
    
    // 验证URL格式
    try {
      new URL(this.config.apiUrl);
    } catch {
      this.logger.warn('Invalid medical API URL format, service will be limited');
      return;
    }
    
    this.logger.info('Medical integration config validated');
  }

  /**
   * 建立连接
   */
  private async establishConnection(): Promise<void> {
    // 检查配置是否完整
    if (!this.config.apiUrl || !this.config.apiKey) {
      this.logger.info('Medical integration configuration incomplete, skipping connection');
      this.state = 'idle';
      this.emitStateChange();
      return;
    }
    
    this.state = 'connecting';
    this.emitStateChange();
    
    try {
      // 测试连接
      const response = await this.makeRequest('/health', 'GET');
      const healthy = response.status === 'ok' || response.status === 'healthy';
      
      if (healthy) {
        this.state = 'connected';
        this.connectionRetryCount = 0;
        this.emit('connection-established');
        this.logger.info('Medical integration connection established');
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      this.state = 'error';
      this.logger.error('Failed to establish medical integration connection:', error);
      
      // 重试连接
      if (this.connectionRetryCount < this.maxRetries) {
        this.connectionRetryCount++;
        this.logger.info(`Retrying connection (${this.connectionRetryCount}/${this.maxRetries})...`);
        
        setTimeout(() => {
          this.establishConnection();
        }, this.retryDelay);
      } else {
        this.emit('connection-lost');
        this.logger.warn('Failed to establish medical integration connection after retries, service will be limited');
      }
    } finally {
      this.emitStateChange();
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    // 如果未启用或配置不完整，直接跳过
    if (!this.isEnabled || !this.config.apiUrl || (!this.config.apiKey && !(this.config.username && this.config.password))) {
      return;
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const resp = await this.makeRequest('/health', 'GET');
        const ok = resp.status === 'ok' || resp.status === 'healthy';
        
        if (ok && this.state !== 'connected') {
          this.state = 'connected';
          this.emit('connection-established');
          this.emitStateChange();
        }
      } catch (error) {
        this.logger.warn('Health check failed:', error);
        
        if (this.state === 'connected') {
          this.state = 'error';
          this.emit('connection-lost');
          this.emitStateChange();
          
          // 尝试重新连接
          this.establishConnection();
        }
      }
    }, 30000); // 30秒检查一次
  }

  /**
   * 搜索患者
   */
  async searchPatients(query: string, options: {
    limit?: number;
    offset?: number;
    filters?: Record<string, any>;
    useCache?: boolean;
  } = {}): Promise<MedicalSearchResult[]> {
    if (!this.isEnabled || this.state !== 'connected') {
      throw new Error('Medical integration service is not available');
    }
    
    const { limit = 10, offset = 0, filters = {}, useCache = true } = options;
    const cacheKey = this.generateCacheKey(query, { limit, offset, filters });
    
    // 检查缓存
    if (useCache && this.searchCache[cacheKey]) {
      const cached = this.searchCache[cacheKey];
      if (Date.now() < cached.expiresAt) {
        this.logger.debug(`Returning cached search results for: ${query}`);
        return cached.data;
      } else {
        delete this.searchCache[cacheKey];
      }
    }
    
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const results = await this.executeSearch(query, { limit, offset, filters });
          
          // 缓存结果
          if (useCache && this.config.cacheEnabled) {
            this.searchCache[cacheKey] = {
              data: results,
              timestamp: Date.now(),
              expiresAt: Date.now() + (this.config.cacheTtl * 1000)
            };
          }
          
          resolve(results);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  /**
   * 执行搜索
   */
  private async executeSearch(
    query: string, 
    options: { limit: number; offset: number; filters: Record<string, any> }
  ): Promise<MedicalSearchResult[]> {
    this.state = 'searching';
    this.emit('search-start');
    this.emitStateChange();
    
    try {
      const searchParams = new URLSearchParams({
        q: query,
        limit: options.limit.toString(),
        offset: options.offset.toString(),
        ...options.filters
      });
      
      const response = await this.makeRequest(`/patients/search?${searchParams}`, 'GET');
      
      const results: MedicalSearchResult[] = response.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        dateOfBirth: item.dateOfBirth,
        gender: item.gender,
        mrn: item.mrn, // Medical Record Number
        phone: item.phone,
        email: item.email,
        lastVisit: item.lastVisit,
        status: item.status,
        relevanceScore: item.relevanceScore || 1.0,
        matchedFields: item.matchedFields || []
      }));
      
      this.state = 'connected';
      this.emit('search-complete', results);
      this.emitStateChange();
      
      this.logger.info(`Found ${results.length} patients for query: ${query}`);
      
      return results;
    } catch (error) {
      this.state = 'error';
      this.emit('search-error', error as Error);
      this.emitStateChange();
      this.logger.error('Patient search failed:', error);
      throw error;
    }
  }

  /**
   * 获取患者记录
   */
  async getPatientRecord(patientId: string, useCache: boolean = true): Promise<PatientRecord> {
    if (!this.isEnabled || this.state !== 'connected') {
      throw new Error('Medical integration service is not available');
    }
    
    // 检查缓存
    if (useCache && this.patientCache[patientId]) {
      const cached = this.patientCache[patientId];
      if (Date.now() < cached.expiresAt) {
        this.logger.debug(`Returning cached patient record for: ${patientId}`);
        return cached.data;
      } else {
        delete this.patientCache[patientId];
      }
    }
    
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const record = await this.fetchPatientRecord(patientId);
          
          // 缓存记录
          if (useCache && this.config.cacheEnabled) {
            this.patientCache[patientId] = {
              data: record,
              timestamp: Date.now(),
              expiresAt: Date.now() + (this.config.cacheTtl * 1000)
            };
          }
          
          resolve(record);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  /**
   * 获取患者记录详情
   */
  private async fetchPatientRecord(patientId: string): Promise<PatientRecord> {
    try {
      const response = await this.makeRequest(`/patients/${patientId}`, 'GET');
      
      const record: PatientRecord = {
        id: response.data.id || `record_${Date.now()}`,
        patientId: response.data.id,
        type: 'diagnosis',
        date: new Date(response.data.lastUpdated || Date.now()),
        provider: response.data.provider || 'Unknown',
        description: `Patient record for ${response.data.name || 'Unknown'}`,
        data: {
          name: response.data.name,
          dateOfBirth: response.data.dateOfBirth,
          gender: response.data.gender,
          mrn: response.data.mrn,
          phone: response.data.phone,
          email: response.data.email,
          address: response.data.address,
          emergencyContact: response.data.emergencyContact,
          insurance: response.data.insurance,
          allergies: response.data.allergies || [],
          medications: response.data.medications || [],
          conditions: response.data.conditions || [],
          visits: response.data.visits || [],
          appointments: response.data.appointments || [],
          labResults: response.data.labResults || [],
          imaging: response.data.imaging || [],
          notes: response.data.notes || []
        },
        attachments: response.data.attachments || []
      };
      
      this.emit('patient-record-loaded', record);
      this.logger.info(`Patient record loaded for: ${patientId}`);
      
      return record;
    } catch (error) {
      this.logger.error('Failed to fetch patient record:', error);
      throw error;
    }
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
   * 发送HTTP请求
   */
  private async makeRequest(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<MedicalApiResponse> {
    // 统一根路径选择：/v1/* 与 /health 走服务根（避免 /api/health 404）
    let base = this.config.apiUrl || '';
    try {
      const origin = new URL(base).origin;
      if (endpoint === '/health' || endpoint.startsWith('/v1/')) {
        base = origin;
      }
    } catch {
      // ignore URL parse error; fallback to original base
    }
    const url = `${base.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Desktop-AI-Assistant/1.0'
    };
    
    // 添加认证
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else if (this.config.username && this.config.password) {
      const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }
    
    const requestOptions: RequestInit = {
      method,
      headers
    };
    
    // 使用AbortController处理超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 10000);
    requestOptions.signal = controller.signal;
    
    if (body && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(body);
    }
    
    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Medical API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Medical API request timeout');
      }
      throw error;
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(query: string, options: any): string {
    return `${query}:${JSON.stringify(options)}`;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.searchCache = {};
    this.patientCache = {};
    this.logger.info('Medical integration cache cleared');
  }



  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    searchCacheSize: number;
    patientCacheSize: number;
    totalCacheSize: number;
  } {
    return {
      searchCacheSize: Object.keys(this.searchCache).length,
      patientCacheSize: Object.keys(this.patientCache).length,
      totalCacheSize: Object.keys(this.searchCache).length + Object.keys(this.patientCache).length
    };
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<MedicalConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.isEnabled = this.config.enabled;
    
    // 如果更改了关键配置，重新建立连接
    if (config.apiUrl || config.apiKey) {
      await this.establishConnection();
    }
    
    this.logger.info('Medical integration config updated');
    this.emitStateChange();
  }

  /**
   * 获取当前状态
   */
  getState(): MedicalState {
    return {
      enabled: this.isEnabled,
      state: this.state,
      connected: this.state === 'connected',
      cacheStats: this.getCacheStats(),
      queueLength: this.requestQueue.length,
      config: this.config
    };
  }

  /**
   * 分析内容
   */
  async analyzeContent(content: string): Promise<any> {
    if (!this.isEnabled || this.state !== 'connected') {
      throw new Error('Medical integration service is not available');
    }

    try {
      const response = await this.makeRequest('/analyze', 'POST', { content });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to analyze content:', error);
      throw error;
    }
  }

  /**
   * 获取患者信息
   */
  async getPatient(patientId: string): Promise<any> {
    if (!this.isEnabled || this.state !== 'connected') {
      throw new Error('Medical integration service is not available');
    }

    try {
      const response = await this.makeRequest(`/patients/${patientId}`, 'GET');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get patient:', error);
      throw error;
    }
  }

  /**
   * 搜索研究
   */
  async searchStudies(query: string, options: any = {}): Promise<any> {
    if (!this.isEnabled || this.state !== 'connected') {
      throw new Error('Medical integration service is not available');
    }

    try {
      const response = await this.makeRequest('/studies/search', 'POST', { query, ...options });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to search studies:', error);
      throw error;
    }
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
    this.logger.info('Cleaning up medical integration service...');
    
    // 停止健康检查
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // 清空请求队列
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // 清除缓存
    this.clearCache();
    
    // 移除所有监听器
    this.removeAllListeners();
    
    this.state = 'idle';
    
    this.logger.info('Medical integration service cleanup completed');
  }
}
