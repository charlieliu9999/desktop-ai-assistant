import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  data?: any;
  source?: string;
  category?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  stack?: string;
}

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  filePath?: string;
  maxFileSize: number; // MB
  maxFiles: number;
  remoteEndpoint?: string;
  remoteApiKey?: string;
  format: 'json' | 'text';
  includeStack: boolean;
  enablePerformance: boolean;
  enableSensitiveDataMasking: boolean;
  sensitiveFields: string[];
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: string;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * 日志统计接口
 */
export interface LogStats {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  errorRate: number;
  avgResponseTime: number;
  lastError?: LogEntry;
  uptime: number;
}

/**
 * 高性能日志记录器类
 */
export class Logger extends EventEmitter {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private performanceBuffer: PerformanceMetrics[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private fileStream: fs.WriteStream | null = null;
  // private currentLogFile: string = '';
  private stats: LogStats;
  private sessionId: string;
  private startTime: number;
  private isInitialized = false;

  constructor(config?: Partial<LoggerConfig>) {
    super();
    
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      enableRemote: false,
      maxFileSize: 10, // 10MB
      maxFiles: 5,
      format: 'json',
      includeStack: true,
      enablePerformance: true,
      enableSensitiveDataMasking: true,
      sensitiveFields: ['password', 'token', 'apiKey', 'secret', 'auth'],
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.stats = this.initializeStats();
    
    this.initialize();
  }

  /**
   * 初始化日志器
   */
  private async initialize(): Promise<void> {
    try {
      // 设置日志文件路径
      if (this.config.enableFile && !this.config.filePath) {
        const userDataPath = app?.getPath('userData') || process.cwd();
        const logsDir = path.join(userDataPath, 'logs');
        
        // 确保日志目录存在
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        
        this.config.filePath = path.join(logsDir, 'app.log');
      }
      
      // 初始化文件流
      if (this.config.enableFile && this.config.filePath) {
        await this.initializeFileStream();
      }
      
      // 启动定期刷新
      this.startFlushInterval();
      
      // 清理旧日志文件
      if (this.config.enableFile) {
        await this.cleanupOldLogs();
      }
      
      this.isInitialized = true;
      this.info('Logger initialized successfully', {
        sessionId: this.sessionId,
        config: this.sanitizeConfig(this.config)
      });
    } catch (error) {
      console.error('Failed to initialize logger:', error);
      this.isInitialized = false;
    }
  }

  /**
   * 初始化文件流
   */
  private async initializeFileStream(): Promise<void> {
    if (!this.config.filePath) return;
    
    try {
      // 检查文件大小
      if (fs.existsSync(this.config.filePath)) {
        const stats = fs.statSync(this.config.filePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        if (fileSizeMB > this.config.maxFileSize) {
          await this.rotateLogFile();
        }
      }
      
      // this.currentLogFile = this.config.filePath;
      this.fileStream = fs.createWriteStream(this.config.filePath, { flags: 'a' });
      
      this.fileStream.on('error', (error) => {
        console.error('Log file stream error:', error);
        this.emit('fileError', error);
      });
    } catch (error) {
      console.error('Failed to initialize file stream:', error);
      throw error;
    }
  }

  /**
   * 轮转日志文件
   */
  private async rotateLogFile(): Promise<void> {
    if (!this.config.filePath) return;
    
    try {
      // 关闭当前文件流
      if (this.fileStream) {
        this.fileStream.end();
        this.fileStream = null;
      }
      
      const logDir = path.dirname(this.config.filePath);
      const logName = path.basename(this.config.filePath, '.log');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = path.join(logDir, `${logName}-${timestamp}.log`);
      
      // 重命名当前日志文件
      if (fs.existsSync(this.config.filePath)) {
        fs.renameSync(this.config.filePath, rotatedFile);
      }
      
      // 重新初始化文件流
      await this.initializeFileStream();
      
      this.info('Log file rotated', { rotatedFile });
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * 清理旧日志文件
   */
  private async cleanupOldLogs(): Promise<void> {
    if (!this.config.filePath) return;
    
    try {
      const logDir = path.dirname(this.config.filePath);
      const logName = path.basename(this.config.filePath, '.log');
      
      const files = fs.readdirSync(logDir)
        .filter(file => file.startsWith(logName) && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          stats: fs.statSync(path.join(logDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
      
      // 保留最新的文件，删除超出限制的文件
      if (files.length > this.config.maxFiles) {
        const filesToDelete = files.slice(this.config.maxFiles);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          this.debug('Deleted old log file', { file: file.name });
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * 启动定期刷新
   */
  private startFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000); // 每5秒刷新一次
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 初始化统计信息
   */
  private initializeStats(): LogStats {
    return {
      totalLogs: 0,
      logsByLevel: {
        TRACE: 0,
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0,
        FATAL: 0
      },
      errorRate: 0,
      avgResponseTime: 0,
      uptime: 0
    };
  }

  /**
   * 清理敏感配置信息
   */
  private sanitizeConfig(config: LoggerConfig): Partial<LoggerConfig> {
    const sanitized = { ...config };
    if (sanitized.remoteApiKey) {
      sanitized.remoteApiKey = '***';
    }
    return sanitized;
  }

  /**
   * 掩码敏感数据
   */
  private maskSensitiveData(data: any): any {
    if (!this.config.enableSensitiveDataMasking || !data) {
      return data;
    }
    
    if (typeof data === 'string') {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }
    
    if (typeof data === 'object') {
      const masked = { ...data };
      
      for (const field of this.config.sensitiveFields) {
        if (masked[field]) {
          masked[field] = '***';
        }
      }
      
      // 递归处理嵌套对象
      for (const key in masked) {
        if (typeof masked[key] === 'object' && masked[key] !== null) {
          masked[key] = this.maskSensitiveData(masked[key]);
        }
      }
      
      return masked;
    }
    
    return data;
  }

  /**
   * 创建日志条目
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: any,
    source?: string
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      message,
      sessionId: this.sessionId,
      source: source || this.getCallerInfo()
    };
    
    if (data !== undefined) {
      entry.data = this.maskSensitiveData(data);
    }
    
    if (this.config.includeStack && level >= LogLevel.ERROR) {
      const stack = new Error().stack;
      if (stack) {
        entry.stack = stack;
      }
    }
    
    return entry;
  }

  /**
   * 获取调用者信息
   */
  private getCallerInfo(): string {
    try {
      const stack = new Error().stack;
      if (!stack) return 'unknown';
      
      const lines = stack.split('\n');
      // 跳过当前方法和log方法
      const callerLine = lines[4] || lines[3] || lines[2];
      
      const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        const [, functionName, fileName, lineNumber] = match;
        return `${path.basename(fileName)}:${lineNumber} (${functionName})`;
      }
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (level < this.config.level) {
      return;
    }
    
    const entry = this.createLogEntry(level, message, data, source);
    
    // 更新统计信息
    this.updateStats(entry);
    
    // 添加到缓冲区
    this.logBuffer.push(entry);
    
    // 控制台输出
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }
    
    // 触发事件
    this.emit('log', entry);
    
    // 如果是错误级别，立即刷新
    if (level >= LogLevel.ERROR) {
      this.flush();
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(entry: LogEntry): void {
    this.stats.totalLogs++;
    this.stats.logsByLevel[entry.levelName]++;
    this.stats.uptime = Date.now() - this.startTime;
    
    if (entry.level >= LogLevel.ERROR) {
      this.stats.lastError = entry;
      this.stats.errorRate = (this.stats.logsByLevel.ERROR + this.stats.logsByLevel.FATAL) / this.stats.totalLogs;
    }
  }

  /**
   * 控制台输出
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.levelName}] [${entry.source}]`;
    
    let output: string;
    if (this.config.format === 'json') {
      output = JSON.stringify(entry, null, 2);
    } else {
      output = `${prefix} ${entry.message}`;
      if (entry.data) {
        output += ` ${JSON.stringify(entry.data)}`;
      }
    }
    
    switch (entry.level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
    }
  }

  /**
   * 刷新缓冲区
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }
    
    const entries = [...this.logBuffer];
    this.logBuffer = [];
    
    // 写入文件
    if (this.config.enableFile && this.fileStream) {
      try {
        for (const entry of entries) {
          const line = JSON.stringify(entry) + '\n';
          this.fileStream.write(line);
        }
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
    
    // 发送到远程服务
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      try {
        await this.sendToRemote(entries);
      } catch (error) {
        console.error('Failed to send logs to remote:', error);
      }
    }
  }

  /**
   * 发送日志到远程服务
   */
  private async sendToRemote(entries: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) return;
    
    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.config.remoteApiKey ? `Bearer ${this.config.remoteApiKey}` : ''
        },
        body: JSON.stringify({ logs: entries })
      });
      
      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to remote:', error);
    }
  }

  /**
   * 记录性能指标
   */
  private recordPerformance(metrics: PerformanceMetrics): void {
    if (!this.config.enablePerformance) {
      return;
    }
    
    this.performanceBuffer.push(metrics);
    
    // 限制缓冲区大小
    if (this.performanceBuffer.length > 1000) {
      this.performanceBuffer = this.performanceBuffer.slice(-500);
    }
    
    this.emit('performance', metrics);
  }

  // 公共日志方法
  trace(message: string, data?: any, source?: string): void {
    this.log(LogLevel.TRACE, message, data, source);
  }

  debug(message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, data, source);
  }

  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  error(message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, message, data, source);
  }

  fatal(message: string, data?: any, source?: string): void {
    this.log(LogLevel.FATAL, message, data, source);
  }

  /**
   * 性能计时器
   */
  time(operation: string): (success?: boolean, metadata?: Record<string, any>) => void {
    const startTime = Date.now();
    
    return (success: boolean = true, metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      
      this.recordPerformance({
        operation,
        duration,
        timestamp: new Date().toISOString(),
        success,
        metadata: metadata || {}
      });
      
      this.debug(`Performance: ${operation}`, {
        duration: `${duration}ms`,
        success,
        metadata
      });
    };
  }

  /**
   * 异步操作包装器
   */
  async withTiming<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const timer = this.time(operation);
    
    try {
      const result = await fn();
      timer(true, metadata || {});
      return result;
    } catch (error) {
      timer(false, { ...(metadata || {}), error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): LogStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceBuffer];
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.info('Log level changed', { level: LogLevel[level] });
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };
    
    this.info('Logger configuration updated', {
      changes: Object.keys(config),
      oldConfig: this.sanitizeConfig(oldConfig),
      newConfig: this.sanitizeConfig(this.config)
    });
    
    // 如果文件配置改变，重新初始化
    if (config.enableFile !== undefined || config.filePath) {
      this.initialize();
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      // 刷新剩余日志
      await this.flush();
      
      // 停止定期刷新
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
        this.flushInterval = null;
      }
      
      // 关闭文件流
      if (this.fileStream) {
        this.fileStream.end();
        this.fileStream = null;
      }
      
      // 清除事件监听器
      this.removeAllListeners();
      
      this.info('Logger cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup logger:', error);
    }
  }

  /**
   * 导出日志
   */
  async exportLogs(
    startDate?: Date,
    endDate?: Date,
    levels?: LogLevel[]
  ): Promise<LogEntry[]> {
    // 这里应该从文件中读取日志并过滤
    // 简化实现，返回当前缓冲区的日志
    let logs = [...this.logBuffer];
    
    if (startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= startDate);
    }
    
    if (endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= endDate);
    }
    
    if (levels && levels.length > 0) {
      logs = logs.filter(log => levels.includes(log.level));
    }
    
    return logs;
  }

  /**
   * 检查日志器状态
   */
  isHealthy(): boolean {
    return this.isInitialized && 
           (!this.config.enableFile || this.fileStream !== null);
  }
}

// 默认日志器实例
export const logger = new Logger();

// 便捷方法
export const trace = (message: string, data?: any) => logger.trace(message, data);
export const debug = (message: string, data?: any) => logger.debug(message, data);
export const info = (message: string, data?: any) => logger.info(message, data);
export const warn = (message: string, data?: any) => logger.warn(message, data);
export const error = (message: string, data?: any) => logger.error(message, data);
export const fatal = (message: string, data?: any) => logger.fatal(message, data);