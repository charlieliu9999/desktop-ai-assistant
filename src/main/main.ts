import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, Notification } from 'electron';
import { join } from 'path';
import { Logger } from '../utils/logger';
import { ConfigService } from '../services/config';
import { WindowManager } from './window-manager';
import { VoiceService } from '../services/legacy/voice';
import { AIService } from '../services/legacy/ai';
import { AIServiceAdapter, setBackendApiOrigin } from '../services/adapters/ai-adapter';
import { MedicalIntegrationService } from '../services/legacy/medical-integration';
import { DesktopRecognitionService } from '../services/legacy/desktop-recognition';
import { ShortcutService } from '../services/shortcut';
import { ScreenshotService } from '../services/legacy/screenshot';
import { BishengService } from '../services/legacy/bisheng';
import { AgentServiceAdapter } from '../services/adapters/agent-adapter';
import { ServiceHealthChecker } from '../services/service-health-checker';
import type {
  AppConfig,
  VoiceConfig,
  AIConfig,
  MedicalConfig,
  DesktopRecognitionConfig,
  ShortcutConfig,
  BishengConfig
} from '../shared/types';

// 应用程序主类
class DesktopAIAssistant {
  private logger: Logger;
  private configService: ConfigService;
  private windowManager: WindowManager;
  private voiceService: VoiceService;
  private aiService: AIService; // legacy
  private aiAdapter: AIServiceAdapter | null = null; // backend route
  private medicalService: MedicalIntegrationService;
  private desktopRecognitionService: DesktopRecognitionService;
  private shortcutService: ShortcutService;
  private screenshotService: ScreenshotService;
  private bishengService: BishengService | null = null;
  private agentAdapter: AgentServiceAdapter | null = null;
  private tray: Tray | null = null;
  private isQuitting = false;
  private isInitialized = false;
  private appStatus: 'initializing' | 'ready' | 'error' = 'initializing';
  private ipcRegistered = false;

  constructor() {
    this.logger = new Logger();
    this.configService = new ConfigService(this.logger);

    // 初始化服务（稍后在initialize中完成）
    this.windowManager = null as any;
    this.voiceService = null as any;
    this.aiService = null as any;
    this.medicalService = null as any;
    this.desktopRecognitionService = null as any;
    this.shortcutService = null as any;
    this.screenshotService = new ScreenshotService(this.logger);
  }

  /**
   * 初始化应用程序
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Desktop AI Assistant...');
    this.appStatus = 'initializing';
    
    try {
      // 设置应用程序事件监听器
      this.setupAppEventListeners();
      
      // 初始化配置服务
      await this.configService.initialize();
      
      // 获取配置
      let config = await this.configService.getConfig();
      // 从环境变量覆盖路由模式（可选），便于脚本启动时指定
      const envRouting = (process.env.APP_ROUTING_MODE || '').toLowerCase();
      if (envRouting === 'backend' || envRouting === 'frontend') {
        try {
          await this.configService.updateConfig({ ai: { routingMode: envRouting as any } } as any);
          config = await this.configService.getConfig();
          this.logger.info(`Applied routing mode from env: ${envRouting}`);
        } catch (e) {
          this.logger.warn('Failed to apply APP_ROUTING_MODE from env:', e);
        }
      }
      this.logger.info('Retrieved config:', { 
        hasVoice: !!config.voice, 
        voiceEnabled: config.voice?.enabled,
        configKeys: Object.keys(config)
      });

      // 优先注册 IPC 处理器，确保渲染进程在加载时即可获取配置
      this.setupIPCHandlers();

      // 初始化窗口管理器（在 IPC 可用之后）
      this.windowManager = new WindowManager(this.configService, this.logger);
      await this.windowManager.initialize();
      
      // 初始化语音服务
      console.log('Debug - config.voice:', JSON.stringify(config.voice, null, 2));
      console.log('Debug - config.voice type:', typeof config.voice);
      console.log('Debug - config.voice.enabled:', config.voice?.enabled);
      
      if (!config.voice) {
        throw new Error('config.voice is undefined');
      }
      
      this.voiceService = new VoiceService(config.voice as VoiceConfig, this.logger);
      
      // 初始化AI服务（同时准备后端适配器，按 routingMode 切换）
      this.aiService = new AIService(config.ai as AIConfig, this.logger);
      await this.aiService.initialize();
      // 计算后端基址 origin，并传给适配器
      try {
        const apiBase = (config?.medical?.apiUrl || 'http://127.0.0.1:8010/api');
        const u = new URL(apiBase);
        setBackendApiOrigin(u.origin);
      } catch {}
      this.aiAdapter = new AIServiceAdapter(config.ai as AIConfig, this.logger);
      try { await this.aiAdapter.initialize(); } catch {}
      
      // 初始化医疗集成服务
      this.medicalService = new MedicalIntegrationService(config.medical as MedicalConfig, this.logger);
      await this.medicalService.initialize();
      
      // 初始化桌面识别服务
      this.desktopRecognitionService = new DesktopRecognitionService(
        config.desktopRecognition as DesktopRecognitionConfig, 
        this.logger
      );
      await this.desktopRecognitionService.initialize();
      
      // 初始化快捷键服务
      this.shortcutService = new ShortcutService(
        config.shortcuts as ShortcutConfig,
        this.logger,
        {
          windowManager: this.windowManager,
          voiceService: this.voiceService,
          aiService: this.aiService,
          desktopRecognitionService: this.desktopRecognitionService
        }
      );
      await this.shortcutService.initialize();

      // 初始化 Bisheng 服务 (总是初始化,但只在启用时启动代理)
      this.bishengService = new BishengService(config.bisheng as BishengConfig, this.logger);
      if (config.bisheng?.enabled) {
        await this.bishengService.initialize();
      } else {
        this.logger.info('Bisheng service created but not enabled');
      }

      // 初始化后端智能体适配器（统一代理 /v1/agent），使用配置中的后端基址 origin
      try {
        const cfg = await this.configService.getConfig();
        const apiBase = (cfg?.medical?.apiUrl || 'http://127.0.0.1:8010/api');
        let origin = 'http://127.0.0.1:8010';
        try { const u = new URL(apiBase); origin = u.origin; } catch {}
        this.agentAdapter = new AgentServiceAdapter(origin);
        try {
          const health = await this.agentAdapter.healthCheck();
          this.logger.info('Agent backend initialized, health:', health?.success);
        } catch (e) {
          this.logger.warn('Agent backend health check failed:', e as any);
        }
      } catch (e) {
        this.logger.warn('Failed to initialize AgentServiceAdapter:', e as any);
        this.agentAdapter = null;
      }
      
      // 注册开发者工具快捷键（仅开发模式）
      if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        const { globalShortcut } = require('electron');
        globalShortcut.register('CommandOrControl+Shift+I', () => {
          this.logger.info('Dev tools shortcut triggered');
          this.windowManager.openDevTools('main');
        });
        
        globalShortcut.register('F12', () => {
          this.logger.info('F12 dev tools shortcut triggered');
          this.windowManager.openDevTools('main');
        });
        
        this.logger.info('Developer tools shortcuts registered (Ctrl+Shift+I, F12)');
      }
      
      // 设置服务间的事件监听
      this.setupServiceEventListeners();

      // IPC 已在上方注册，此处不再重复注册

      // 创建系统托盘
      this.createTray();

      // 设置应用菜单
      this.setupApplicationMenu();

      // 执行服务健康检查
      await this.performHealthCheck(config);

      // 根据配置决定是否显示窗口
      // 默认显示主窗口,除非配置了启动时最小化到托盘
      if (!config.startup?.minimizeToTray) {
        this.windowManager.showMainWindow();
      }

      // 如果配置了启动时显示浮动窗口
      if (config.startup?.showFloatingWindow) {
        this.windowManager.showFloatingWindow();
      }

      this.isInitialized = true;
      this.appStatus = 'ready';
      this.logger.info('Desktop AI Assistant initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Desktop AI Assistant:', error);
      this.appStatus = 'error';
      throw error;
    }
  }

  /**
   * 执行服务健康检查
   */
  private async performHealthCheck(config: AppConfig): Promise<void> {
    try {
      const healthChecker = new ServiceHealthChecker(this.logger, 5000);
      const result = await healthChecker.checkAllServices(config);

      // 如果有服务不可用，显示通知
      const unhealthyServices = result.services.filter(
        s => s.status === 'unhealthy' || s.status === 'unreachable'
      );

      if (unhealthyServices.length > 0 && Notification.isSupported()) {
        const notification = new Notification({
          title: '服务状态提醒',
          body: `${unhealthyServices.length} 个服务不可用，部分功能可能受限`,
          silent: false
        });
        notification.show();
      }
    } catch (error) {
      this.logger.error('Health check failed:', error);
    }
  }

  /**
   * 设置应用程序事件监听器
   */
  private setupAppEventListeners(): void {
    // 当所有窗口关闭时
    app.on('window-all-closed', () => {
      // 在macOS上，除非用户明确退出，否则应用程序保持活动状态
      if (process.platform !== 'darwin') {
        this.quit();
      }
    });

    // 当应用程序激活时（macOS）
    app.on('activate', () => {
      if (this.isInitialized && BrowserWindow.getAllWindows().length === 0) {
        this.windowManager.showMainWindow();
      }
    });

    // 应用程序即将退出
    app.on('before-quit', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.quit();
      }
    });

    // 处理第二个实例
    app.on('second-instance', () => {
      // 如果用户尝试打开另一个实例，聚焦到主窗口
      if (this.windowManager) {
        this.windowManager.showMainWindow();
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.focus();
        }
      }
    });

    // 处理协议URL（如果需要）
    app.setAsDefaultProtocolClient('desktop-ai-assistant');
  }

  /**
   * 设置服务间的事件监听
   */
  private setupServiceEventListeners(): void {
    // 语音识别结果处理
    this.voiceService.on('recognition-result', async (result: string) => {
      this.logger.info(`Voice recognition result: ${result}`);
      
      // 将语音识别结果发送给AI服务处理
      try {
        const aiMessage = {
          role: 'user' as const,
          content: result,
          timestamp: Date.now()
        };
        const response = await this.aiService.processMessage(aiMessage);
        
        // 将AI响应转换为语音
        if (response && this.voiceService) {
          try {
            const voiceState = this.voiceService.getState();
            if (voiceState.synthesisState === 'idle') {
              await this.voiceService.speak(response.content);
            }
          } catch (error) {
            this.logger.warn('Failed to get voice state or speak response:', error);
          }
        }
        
        // 发送结果到渲染进程
        this.broadcastToRenderers('voice-recognition-result', { 
          input: result, 
          response 
        });
      } catch (error) {
        this.logger.error('Error processing voice recognition result:', error);
      }
    });

    // 桌面识别结果处理
    this.desktopRecognitionService.on('analysis-complete', (analysis: any) => {
      this.logger.info('Desktop analysis completed');
      
      // 发送分析结果到渲染进程
      this.broadcastToRenderers('desktop-analysis-result', analysis);
    });

    // AI服务响应处理
    this.aiService.on('response', (response: string) => {
      this.logger.info('AI service response received');
      
      // 发送AI响应到渲染进程
      this.broadcastToRenderers('ai-response', response);
    });

    // 医疗服务搜索结果处理
    this.medicalService.on('search-complete', (results: any) => {
      this.logger.info('Medical search completed');
      
      // 发送搜索结果到渲染进程
      this.broadcastToRenderers('medical-search-result', results);
    });

    // 快捷键触发处理
    this.shortcutService.on('shortcut-triggered', (action: any, shortcut: string) => {
      this.logger.info(`Shortcut triggered: ${shortcut}`);
      
      // 发送快捷键事件到渲染进程
      this.broadcastToRenderers('shortcut-triggered', { action, shortcut });
    });

    // 配置变化处理 - 注释掉，因为 ConfigService 可能没有事件发射器
    // this.configService.on('config-changed', async (key: string, value: any) => {
    //   this.logger.info(`Configuration changed: ${key}`);
    //   
    //   // 根据配置变化更新相应服务
    //   await this.handleConfigChange(key, value);
    //   
    //   // 发送配置变化到渲染进程
    //   this.broadcastToRenderers('config-changed', { key, value });
    // });
  }

  /**
   * 设置IPC处理器
   */
  private setupIPCHandlers(): void {
    if (this.ipcRegistered) return;
    // 获取应用状态
    ipcMain.handle('get-app-state', async () => {
      try {
        const cfg = await this.configService.getConfig();
        return {
          voice: this.voiceService?.getState() || null,
          ai: this.aiService?.getState() || null,
          medical: this.medicalService?.getState() || null,
          desktop: this.desktopRecognitionService?.getState() || null,
          shortcuts: this.shortcutService?.getState() || null,
          config: cfg,
        };
      } catch (error) {
        this.logger.error('Error getting app state:', error);
        const cfg = await this.configService.getConfig();
        return {
          voice: null,
          ai: null,
          medical: null,
          desktop: null,
          shortcuts: null,
          config: cfg,
        };
      }
    });

    // 简单应用状态（字符串）
    ipcMain.handle('get-app-status', () => this.appStatus);

    // 语音控制
    ipcMain.handle('voice-start-recognition', async () => {
      return await this.voiceService.startRecognition();
    });

    ipcMain.handle('voice-stop-recognition', async () => {
      return await this.voiceService.stopRecognition();
    });

    ipcMain.handle('voice-speak', async (_, text: string) => {
      return await this.voiceService.speak(text);
    });

    ipcMain.handle('voice-stop-speaking', async () => {
      return await this.voiceService.stopSpeaking();
    });

    // 语音识别统一测试（Whisper/FunASR/Browser占位）
    ipcMain.handle('voice-test-all-models', async (_event, audioData: ArrayBuffer) => {
      const start = Date.now();
      const cfg = await this.configService.getConfig();
      const toBuffer = (ab: ArrayBuffer) => Buffer.from(new Uint8Array(ab));
      const buf = toBuffer(audioData);

      const results: any[] = [];

      // Browser 占位（主进程无法直接识别）
      results.push({
        model: 'browser',
        success: false,
        accuracy: 0,
        latency: Date.now() - start,
        text: '',
        confidence: 0,
        error: '浏览器原生识别需在渲染进程测试',
        timestamp: Date.now()
      });

      // Whisper
      try {
        const whisperUrl = (cfg as any)?.voice?.recognition?.whisper?.apiUrl;
        if (whisperUrl) {
          const wstart = Date.now();
          const resp = await fetch(whisperUrl, { method: 'POST', body: buf as any, headers: { 'Content-Type': 'audio/wav' } });
          if (resp.ok) {
            const data = await resp.json().catch(() => ({}));
            results.push({
              model: 'whisper',
              success: true,
              accuracy: data.accuracy ?? 0.9,
              latency: Date.now() - wstart,
              text: data.text ?? data.result ?? data.transcript ?? '',
              confidence: data.confidence ?? 0.9,
              timestamp: Date.now()
            });
          } else {
            const txt = await resp.text();
            results.push({
              model: 'whisper', success: false, accuracy: 0, latency: Date.now() - start, text: '', confidence: 0, error: `HTTP ${resp.status} ${resp.statusText}: ${txt}`, timestamp: Date.now()
            });
          }
        } else {
          results.push({ model: 'whisper', success: false, accuracy: 0, latency: 0, text: '', confidence: 0, error: '未配置 whisper.apiUrl', timestamp: Date.now() });
        }
      } catch (e: any) {
        results.push({ model: 'whisper', success: false, accuracy: 0, latency: 0, text: '', confidence: 0, error: e?.message || String(e), timestamp: Date.now() });
      }

      // FunASR
      try {
        const funasrUrl = (cfg as any)?.voice?.recognition?.funasr?.apiUrl;
        if (funasrUrl) {
          const fstart = Date.now();
          const resp = await fetch(funasrUrl, { method: 'POST', body: buf as any, headers: { 'Content-Type': 'audio/wav' } });
          if (resp.ok) {
            const data = await resp.json().catch(() => ({}));
            results.push({
              model: 'funasr',
              success: true,
              accuracy: data.accuracy ?? 0.9,
              latency: Date.now() - fstart,
              text: data.text ?? data.result ?? data.transcript ?? '',
              confidence: data.confidence ?? 0.9,
              timestamp: Date.now()
            });
          } else {
            const txt = await resp.text();
            results.push({
              model: 'funasr', success: false, accuracy: 0, latency: Date.now() - start, text: '', confidence: 0, error: `HTTP ${resp.status} ${resp.statusText}: ${txt}`, timestamp: Date.now()
            });
          }
        } else {
          results.push({ model: 'funasr', success: false, accuracy: 0, latency: 0, text: '', confidence: 0, error: '未配置 funasr.apiUrl', timestamp: Date.now() });
        }
      } catch (e: any) {
        results.push({ model: 'funasr', success: false, accuracy: 0, latency: 0, text: '', confidence: 0, error: e?.message || String(e), timestamp: Date.now() });
      }

      return results;
    });

    // AI服务控制
    ipcMain.handle('ai-process-message', async (_, message: string) => {
      // 读取路由模式
      const cfg = await this.configService.getConfig();
      const routing = cfg?.ai?.routingMode || 'frontend';
      const sysPrompt = cfg?.ai?.systemPrompt || undefined;

      if (routing === 'backend' && this.aiAdapter) {
        // 后端模式：通过适配器转发到后端（适配器会自动注入 systemPrompt）
        const content = await this.aiAdapter.processMessage(message, undefined);
        return content;
      } else {
        // 前端直连（legacy）
        const aiMessage = { role: 'user' as const, content: message, timestamp: Date.now() };
        const response = await this.aiService.processMessage(aiMessage, sysPrompt ? { systemPrompt: sysPrompt } : { });
        return response.content;
      }
    });

    // AI服务控制（含工具调用，非流式）
    ipcMain.handle('ai-process-with-tools', async (_, message: string) => {
      const cfg = await this.configService.getConfig();
      const routing = cfg?.ai?.routingMode || 'frontend';
      const sysPrompt = cfg?.ai?.systemPrompt || undefined;

      // 前端直连：使用 legacy 内置工具调用（支持 web_search）
      if (routing !== 'backend') {
        const aiMessage = { role: 'user' as const, content: message, timestamp: Date.now() };
        const response = await this.aiService.processMessageWithTools(aiMessage, sysPrompt ? { systemPrompt: sysPrompt } : {});
        return response.content;
      }

      // 后端路由：后端当前未内置工具调用，这里编排“生成查询 → 后端搜索 → 汇总回答”的混合流程
      if (!this.aiAdapter) {
        // 后备：无适配器则退化为普通对话
        return await this.aiService.processMessage({ role: 'user', content: message, timestamp: Date.now() } as any).then(r => r.content);
      }

      // 计算后端基址 origin
      const origin = (() => {
        try {
          const apiBase = (cfg?.medical?.apiUrl || 'http://127.0.0.1:8010/api');
          const u = new URL(apiBase);
          return u.origin;
        } catch {
          return 'http://127.0.0.1:8010';
        }
      })();

      // 1) 让后端模型生成一个简洁的搜索查询词（JSON输出）
      let searchQuery = '';
      try {
        const queryPrompt = [
          '你将收到一条用户消息。请为网络搜索生成一个尽量简短且有效的查询词（不超过15个字/10个英文单词）。',
          '只输出JSON，格式如：{"query":"..."}，不要输出其它任何文字。',
          '若无需搜索，请将 query 设置为原问题的核心关键词。'
        ].join('\n');
        const ask = `${queryPrompt}\n\n用户消息：\n${message}`;
        const queryJson = await this.aiAdapter.processMessage(ask, undefined);
        try {
          const parsed = JSON.parse((queryJson || '').trim());
          if (parsed && typeof parsed.query === 'string' && parsed.query.trim()) {
            searchQuery = parsed.query.trim();
          }
        } catch {
          // 粗略提取：去掉换行，截断
          searchQuery = (queryJson || message || '').replace(/\s+/g, ' ').slice(0, 50);
        }
      } catch (e) {
        this.logger.warn('Generate search query failed, fallback to raw message');
        searchQuery = (message || '').slice(0, 50);
      }
      if (!searchQuery) searchQuery = (message || '').slice(0, 50);

      // 2) 调用后端搜索接口（支持 duckduckgo / serpapi）
      const provider = (cfg?.ai as any)?.webSearch?.provider || 'duckduckgo';
      const maxResults = (cfg?.ai as any)?.webSearch?.maxResults || 5;
      let results: Array<{ title: string; url: string; snippet: string } > = [];
      try {
        const r = await fetch(`${origin}/v1/tools/search?q=${encodeURIComponent(searchQuery)}&provider=${encodeURIComponent(provider)}&max_results=${encodeURIComponent(String(maxResults))}`);
        const data = await r.json();
        if (data?.success) {
          results = (data?.data?.results || []) as typeof results;
        } else {
          this.logger.warn('Backend web search failed:', data?.error || 'unknown');
        }
      } catch (e) {
        this.logger.warn('Call backend tools/search failed:', e as any);
      }

      // 3) 将检索结果注入上下文，请求后端模型生成最终回答
      if (!Array.isArray(results) || results.length === 0) {
        // 无检索结果：直接生成普通回答
        return await this.aiAdapter.processMessage(message, undefined);
      }

      const contextLines = results.map((it, idx) => `【${idx + 1}】${it.title} \n${it.url}\n${(it.snippet || '').slice(0, 280)}`).join('\n\n');
      const finalPrompt = [
        sysPrompt ? `系统说明：${sysPrompt}` : '',
        '请基于以下最新网络检索结果，回答用户问题：',
        contextLines,
        '要求：',
        '- 明确标注依据（可在文末用(见条目#编号)引用）',
        '- 中文输出；如无法从检索结果得到答案，请说明原因并给出建议',
        `用户问题：${message}`
      ].filter(Boolean).join('\n\n');

      const content = await this.aiAdapter.processMessage(finalPrompt, undefined);
      return content;
    });

    // AI服务控制（流式）
    ipcMain.handle('ai-process-message-stream', async (event, message: string) => {
      // 使用当前配置
      const cfg = await this.configService.getConfig();
      const routing = cfg?.ai?.routingMode || 'frontend';
      const sysPrompt = cfg?.ai?.systemPrompt || undefined;

      // 定义chunk回调函数（legacy）
      const onChunkLegacy = (chunk: string) => {
        event.sender.send('ai-stream-chunk', chunk);
      };

      try {
        if (routing === 'backend' && this.aiAdapter) {
          // 后端流式：转发SSE
          let full = '';
          for await (const chunk of this.aiAdapter.chatStream(message, undefined)) {
            full += chunk;
            event.sender.send('ai-stream-chunk', chunk);
          }
          event.sender.send('ai-stream-end', { success: true, content: full });
          return { success: true, content: full };
        } else {
          const aiMessage = { role: 'user' as const, content: message, timestamp: Date.now() };
          const response = await this.aiService.processMessageStream(
            aiMessage,
            onChunkLegacy,
            sysPrompt ? { systemPrompt: sysPrompt } : {}
          );
          event.sender.send('ai-stream-end', { success: true, content: response.content });
          return { success: true, content: response.content };
        }
      } catch (error: any) {
        event.sender.send('ai-stream-end', { success: false, error: error.message });
        throw error;
      }
    });

    ipcMain.handle('ai-clear-history', async () => {
      return this.aiService.clearHistory();
    });

    ipcMain.handle('ai-generate-summary', async (_, text: string) => {
      return await this.aiService.generateSummary(text);
    });

    // AI: 简单网络搜索测试（使用当前 WebSearch 配置）
    ipcMain.handle('ai-search-web', async (_event, query: string, maxResults?: number) => {
      try {
        if (!this.aiService) throw new Error('AI service not initialized');
        const res = await this.aiService.searchWeb(query || '测试', maxResults || 3);
        return { success: true, data: res };
      } catch (error: any) {
        this.logger.warn('Web search test failed:', error);
        return { success: false, error: error?.message || String(error) };
      }
    });

    // 桌面识别控制
    ipcMain.handle('desktop-capture-screen', async (_, options: any) => {
      return await this.desktopRecognitionService.captureScreen(options);
    });

    ipcMain.handle('desktop-analyze-screen', async (_, options: any) => {
      return await this.desktopRecognitionService.captureAndAnalyze(options);
    });

    ipcMain.handle('desktop-get-displays', () => {
      return this.desktopRecognitionService.getAvailableDisplays();
    });

    // 医疗服务控制
    ipcMain.handle('medical-search-patients', async (_, query: string, options: any) => {
      return await this.medicalService.searchPatients(query, options);
    });

    ipcMain.handle('medical-get-patient', async (_, patientId: string) => {
      return await this.medicalService.getPatientRecord(patientId);
    });

    // 配置管理
    ipcMain.handle('config-get', async (_event, key?: string) => {
      const cfg = await this.configService.getConfig();
      if (!key) return cfg;
      // 支持顶层键检索；更深层检索可扩展为按路径解析
      return (cfg as any)[key];
    });

    ipcMain.handle('config-set', async (_, key: string, value: any) => {
      return this.configService.updateConfig({ [key]: value });
    });

    ipcMain.handle('config-update', async (_, updates: Partial<AppConfig>) => {
      const prev = await this.configService.getConfig();
      
      // 记录更新的配置用于调试
      this.logger.info('Updating config:', { 
        updates: JSON.stringify(updates, null, 2),
        affectsTheme: !!updates.theme,
        affectsWindows: !!updates.windows
      });
      
      const result = await this.configService.updateConfig(updates);
      const next = await this.configService.getConfig();

      // 将与服务相关的更新应用到对应服务（无需重启应用）
      try {
        if (updates.ai) {
          await this.aiService.updateConfig(updates.ai as Partial<AIConfig>);
          try { this.aiAdapter?.updateConfig(updates.ai as Partial<AIConfig>); } catch {}
          this.logger.info('AI service config updated');
        }
        // 若医疗后端基址发生变化，更新适配器基址
        const candidateApiBase =
          (updates.ai && (updates.ai as any).backendBaseUrl) ||
          (next.ai && (next.ai as any).backendBaseUrl) ||
          (updates.medical && (updates.medical as any).apiUrl) ||
          next.medical?.apiUrl ||
          process.env.APP_BACKEND_URL ||
          'http://127.0.0.1:8010/api';
        try {
          const parsed = new URL(candidateApiBase);
          setBackendApiOrigin(parsed.origin);
          this.logger.info('AI backend origin updated', { origin: parsed.origin });
        } catch (e) {
          this.logger.warn('Failed to update AI backend origin from config', {
            candidateApiBase,
            error: (e as Error).message,
          });
        }
        if (updates.voice) {
          await this.voiceService.updateConfig(updates.voice as Partial<VoiceConfig>);
          this.logger.info('Voice service config updated');
        }
        if (updates.medical) {
          await this.medicalService.updateConfig(updates.medical as Partial<MedicalConfig>);
          this.logger.info('Medical service config updated');
        }
        if (updates.desktopRecognition) {
          await this.desktopRecognitionService.updateConfig(updates.desktopRecognition as any);
          this.logger.info('Desktop recognition service config updated');
        }
        if (updates.bisheng) {
          // 如果 Bisheng 服务尚未初始化，先创建它
          if (!this.bishengService) {
            this.bishengService = new BishengService(next.bisheng as BishengConfig, this.logger);
            this.logger.info('Bisheng service created');
          }

          // 更新配置
          this.bishengService.updateConfig(updates.bisheng);
          this.logger.info('Bisheng service config updated');

          // 如果启用了服务，确保已初始化
          if (updates.bisheng.enabled) {
            await this.bishengService.initialize();
            this.logger.info('Bisheng service initialized');
          }
        }
      } catch (e) {
        this.logger.warn('Failed to apply live service config update:', e as any);
      }

      // 通知渲染进程配置已变化（带上新的完整配置）
      try {
        this.broadcastToRenderers('config-changed', { config: next });
      } catch {}

      // 检测是否需要重建窗口（当主题或窗口设置发生变化时）
      const needsWindowRecreate = this.checkIfWindowRecreateNeeded(prev, next, updates);

      if (needsWindowRecreate) {
        try {
          this.logger.info('Window settings changed, recreating windows...');
          await this.windowManager.cleanup();
          await this.windowManager.initialize();
          // 恢复主窗口可见
          await this.windowManager.showMainWindow();
          this.logger.info('Windows recreated successfully');
        } catch (e) {
          this.logger.error('Failed to recreate windows after config change:', e);
        }
      }

      return result;
    });

    ipcMain.handle('config-reset', async () => {
      return this.configService.initialize();
    });

    // Bisheng 智能体服务控制
    ipcMain.handle('bisheng-login', async (_, username: string, password: string) => {
      // 优先使用后端 /v1/agent 登录
      if (this.agentAdapter) {
        try {
          return await this.agentAdapter.login(username, password);
        } catch (e) {
          this.logger.warn('Agent backend login failed, fallback to legacy:', e as any);
        }
      }
      if (!this.bishengService) throw new Error('Bisheng service not initialized');
      return await this.bishengService.login(username, password);
    });

    ipcMain.handle('bisheng-get-workflows', async (_, pageSize?: number, pageNum?: number) => {
      // 优先走后端 /v1/agent/workflows
      const cfg = await this.configService.getConfig();
      const token = cfg?.bisheng?.accessToken || '';
      if (this.agentAdapter && token) {
        try {
          return await this.agentAdapter.getWorkflows(token, pageSize || 50, pageNum || 1);
        } catch (e) {
          this.logger.warn('Agent backend getWorkflows failed, fallback:', e as any);
        }
      }
      if (!this.bishengService) throw new Error('Bisheng service not initialized');
      return await this.bishengService.getWorkflows(pageSize, pageNum);
    });

    /**
     * Bisheng 工作流调用 IPC 处理器
     * 负责调用工作流并将 SSE 流式响应转发到渲染进程
     */
    ipcMain.handle('bisheng-invoke-workflow', async (
      event,
      workflowId: string,
      input: Record<string, any>,
      stream: boolean = true,
      sessionId?: string,
      messageId?: string,
      inputNodeId?: string
    ) => {
      // 生成唯一的流 ID
      const streamId = `bisheng-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const webContents = event.sender;

      this.logger.info('IPC: bisheng-invoke-workflow', {
        streamId,
        workflowId,
        hasSessionId: !!sessionId,
        hasMessageId: !!messageId,
        hasInputNodeId: !!inputNodeId
      });

      // 立即返回 streamId，然后在后台处理流（渲染侧先注册监听器）
      setImmediate(async () => {
        try {
          const cfg = await this.configService.getConfig();
          const token = cfg?.bisheng?.accessToken || '';
          if (this.agentAdapter && token) {
            // /v1/agent 后端转发
            webContents.send('bisheng-stream-start', { streamId, workflowId });
            await this.agentAdapter.invokeWorkflow(
              { workflow_id: workflowId, input, stream: stream !== false, session_id: sessionId, message_id: messageId, input_node_id: inputNodeId },
              token,
              (data: any) => {
                try {
                  const json = JSON.stringify(data);
                  const chunk = `data: ${json}\n`;
                  webContents.send('bisheng-stream-chunk', { streamId, chunk });
                } catch {}
              }
            );
            webContents.send('bisheng-stream-end', { streamId, success: true });
            return;
          }

          // 回退到 legacy 直连 Bisheng
          if (!this.bishengService) throw new Error('Bisheng service not initialized');
          const responseStream = await this.bishengService.invokeWorkflow(
            workflowId,
            input,
            stream,
            sessionId,
            messageId,
            inputNodeId
          );

          webContents.send('bisheng-stream-start', { streamId, workflowId });
          const reader = responseStream.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunkText = decoder.decode(value, { stream: true });
            if (chunkText) webContents.send('bisheng-stream-chunk', { streamId, chunk: chunkText });
          }
          webContents.send('bisheng-stream-end', { streamId, success: true });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Error in bisheng-invoke-workflow', { streamId, error: errorMessage });

          // 发送错误事件
          webContents.send('bisheng-stream-end', {
            streamId,
            success: false,
            error: errorMessage
          });
        }
      });

      // 立即返回 streamId，让渲染进程可以注册事件监听器
      return { streamId };
    });

    /**
     * Bisheng 停止工作流 IPC 处理器
     */
    ipcMain.handle('bisheng-stop-workflow', async (
      event,
      workflowId: string,
      sessionId: string
    ) => {
      this.logger.info('IPC: bisheng-stop-workflow', { workflowId, sessionId });
      // 优先使用后端 /v1/agent 停止
      try {
        const cfg = await this.configService.getConfig();
        const token = cfg?.bisheng?.accessToken || '';
        if (this.agentAdapter && token) {
          const ok = await this.agentAdapter.stopWorkflow(workflowId, sessionId, token);
          if (ok) return { success: true };
        }
      } catch (e) {
        this.logger.warn('Agent backend stopWorkflow failed, fallback to legacy:', e as any);
      }
      if (!this.bishengService) throw new Error('Bisheng service not initialized');
      try {
        await this.bishengService.stopWorkflow(workflowId, sessionId);
        this.logger.info('Workflow stopped successfully', { workflowId, sessionId });
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error('Error stopping workflow', { workflowId, sessionId, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    });

    ipcMain.handle('bisheng-get-config', async () => {
      // 优先从后端读取当前配置/状态
      if (this.agentAdapter) {
        try {
          return await this.agentAdapter.getConfig();
        } catch (e) {
          this.logger.warn('Agent backend getConfig failed, fallback to legacy:', e as any);
        }
      }
      if (!this.bishengService) return null;
      return this.bishengService.getConfig();
    });

    ipcMain.handle('bisheng-update-config', async (_, config: any) => {
      if (!this.bishengService) {
        throw new Error('Bisheng service not initialized');
      }
      this.bishengService.updateConfig(config);
      
      // 更新到配置服务
      const fullConfig = await this.configService.getConfig();
      fullConfig.bisheng = { ...fullConfig.bisheng, ...config };
      await this.configService.updateConfig(fullConfig);
      
      return true;
    });

    ipcMain.handle('bisheng-is-authenticated', async () => {
      if (this.agentAdapter) {
        try {
          const health = await this.agentAdapter.healthCheck();
          const ok = !!(health?.success && Object.values(health.services || {}).some(s => (s as any)?.authenticated));
          return ok;
        } catch (e) {
          this.logger.warn('Agent backend isAuthenticated failed, fallback:', e as any);
        }
      }
      if (!this.bishengService) return false;
      return this.bishengService.isAuthenticated();
    });

    ipcMain.handle('bisheng-get-proxy-status', () => {
      if (!this.bishengService) {
        return { running: false, port: 0 };
      }
      return this.bishengService.getProxyStatus();
    });

    // 服务健康检查
    ipcMain.handle('service-health-check', async () => {
      try {
        const config = await this.configService.getConfig();
        const healthChecker = new ServiceHealthChecker(this.logger, 5000);
        return await healthChecker.checkAllServices(config);
      } catch (error) {
        this.logger.error('Health check failed:', error);
        throw error;
      }
    });

    // Bisheng 连接测试
    ipcMain.handle('bisheng-test-workflow-list', async () => {
      if (!this.bishengService) {
        throw new Error('Bisheng service not initialized');
      }
      return await this.bishengService.testWorkflowList();
    });

    ipcMain.handle('bisheng-test-workflow-invoke', async (_, workflowId: string) => {
      if (!this.bishengService) {
        throw new Error('Bisheng service not initialized');
      }
      return await this.bishengService.testWorkflowInvoke(workflowId);
    });

    ipcMain.handle('bisheng-run-connection-tests', async () => {
      if (!this.bishengService) {
        throw new Error('Bisheng service not initialized');
      }
      return await this.bishengService.runConnectionTests();
    });

    // 窗口控制
    ipcMain.handle('window-show-main', () => {
      this.windowManager.showMainWindow();
    });

    ipcMain.handle('window-hide-main', () => {
      this.windowManager.hideMainWindow();
    });

    ipcMain.handle('window-toggle-main', () => {
      this.windowManager.toggleMainWindow();
    });

    ipcMain.handle('window-show-floating', () => {
      this.windowManager.showFloatingWindow();
    });

    ipcMain.handle('window-hide-floating', () => {
      this.windowManager.hideFloatingWindow();
    });

    ipcMain.handle('window-show-voice', () => {
      this.windowManager.showVoiceWindow();
    });

    // 窗口基础控制（聚焦窗口）
    ipcMain.handle('window-minimize', () => {
      const win = BrowserWindow.getFocusedWindow() || this.windowManager.getMainWindow?.();
      win?.minimize();
    });

    ipcMain.handle('window-close', () => {
      const win = BrowserWindow.getFocusedWindow() || this.windowManager.getMainWindow?.();
      win?.close();
    });

    ipcMain.handle('window-toggle-always-on-top', () => {
      const win = BrowserWindow.getFocusedWindow() || this.windowManager.getMainWindow?.();
      if (!win) return false;
      const next = !win.isAlwaysOnTop();
      win.setAlwaysOnTop(next);
      return next;
    });

    // 应用控制
    ipcMain.handle('app-quit', () => {
      this.quit();
    });

    ipcMain.handle('app-minimize-to-tray', () => {
      this.windowManager.hideMainWindow();
    });

    ipcMain.handle('app-get-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('app-set-visibility', (_event, visible: boolean) => {
      // 页面可见性变化处理
      this.logger.info(`Page visibility changed: ${visible}`);
      // 可以在这里添加额外的逻辑,比如暂停/恢复某些服务
      return Promise.resolve();
    });

    // 应用控制 (冒号格式)
    ipcMain.handle('app:setVisibility', (_event, visible: boolean) => {
      this.logger.info(`Setting app visibility: ${visible}`);
      // 可以在这里添加额外的逻辑,比如暂停/恢复某些服务
      return Promise.resolve();
    });

    ipcMain.handle('app:reportError', (_event, error: any) => {
      this.logger.error('Error reported from renderer:', error);
      // 可以在这里添加错误报告逻辑，比如发送到错误监控服务
      return Promise.resolve();
    });

    // 应用性能上报（记录日志）
    ipcMain.handle('app:reportPerformance', (_event, payload: any) => {
      try {
        this.logger.info('Renderer performance report', payload);
      } catch (e) {
        // ignore
      }
    });

    // 应用重启
    ipcMain.handle('app:restart', () => {
      try {
        app.relaunch();
        app.exit(0);
      } catch (e) {
        this.logger.error('Failed to restart app:', e);
      }
    });

    // DevTools 控制
    ipcMain.handle('dev-toggle-devtools', () => {
      const win = BrowserWindow.getFocusedWindow() || this.windowManager.getMainWindow?.();
      if (!win) return;
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools({ mode: 'detach' });
      }
    });
    ipcMain.handle('dev-open-devtools', () => {
      const win = BrowserWindow.getFocusedWindow() || this.windowManager.getMainWindow?.();
      win?.webContents.openDevTools({ mode: 'detach' });
    });
    ipcMain.handle('dev-reload', () => {
      const win = BrowserWindow.getFocusedWindow() || this.windowManager.getMainWindow?.();
      win?.webContents.reloadIgnoringCache();
    });

    // 通知
    ipcMain.handle('notification-show', (_event, options: { title: string; body: string; silent?: boolean }) => {
      try {
        const notif = new Notification({
          title: options?.title || '桌面AI助手',
          body: options?.body || '',
          silent: !!options?.silent,
        });
        notif.show();
      } catch (e) {
        this.logger.warn('Failed to show notification:', e);
      }
    });

    // 示例提醒
    ipcMain.handle('app:createReminder', () => {
      try {
        const notif = new Notification({ title: '提醒', body: '提醒已创建', silent: false });
        notif.show();
        return { success: true, message: '提醒已创建' };
      } catch (e) {
        this.logger.warn('Failed to create reminder:', e);
        return { success: false, message: '创建提醒失败' };
      }
    });

    // 屏幕截图
    ipcMain.handle('screenshot:capture', async (_event, options) => {
      try {
        this.logger.info('Capturing screenshot with options:', options);
        const result = await this.screenshotService.captureScreen(options);
        return { success: true, data: result };
      } catch (error) {
        this.logger.error('Screenshot capture failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('screenshot:captureWindow', async (_event, windowTitle) => {
      try {
        this.logger.info('Capturing window:', windowTitle);
        const result = await this.screenshotService.captureWindow(windowTitle);
        return { success: true, data: result };
      } catch (error) {
        this.logger.error('Window capture failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('screenshot:checkPermissions', async () => {
      try {
        const hasPermission = await this.screenshotService.checkPermissions();
        return { success: true, hasPermission };
      } catch (error) {
        this.logger.error('Permission check failed:', error);
        return { success: false, hasPermission: false };
      }
    });

    ipcMain.handle('screenshot:getDisplays', () => {
      try {
        const displays = this.screenshotService.getDisplays();
        return { success: true, displays };
      } catch (error) {
        this.logger.error('Get displays failed:', error);
        return { success: false, displays: [] };
      }
    });
  }

  /**
   * 检测是否需要重建窗口
   * @param prev 之前的配置
   * @param next 新的配置
   * @param updates 更新的配置项
   * @returns 是否需要重建窗口
   */
  private checkIfWindowRecreateNeeded(
    prev: AppConfig,
    next: AppConfig,
    updates: Partial<AppConfig>
  ): boolean {
    // 只有以下情况需要重建窗口：
    // 1. 主题变化（light/dark/glass 切换）
    // 2. 窗口 transparent 属性变化
    // 3. 玻璃效果的启用/禁用状态变化
    
    // 注意：玻璃效果的参数变化（opacity, blur等）不需要重建窗口，
    // 这些参数可以通过配置更新事件实时应用到渲染进程

    // 1. 主题变化
    if (updates.theme && prev.theme !== next.theme) {
      this.logger.info('Theme changed, needs window recreate');
      return true;
    }

    // 2. 窗口透明度属性变化
    if (updates.windows) {
      const prevMain = prev.windows?.main;
      const nextMain = next.windows?.main;

      // 检查 transparent 属性变化（影响窗口创建）
      if (prevMain?.transparent !== nextMain?.transparent) {
        this.logger.info('Window transparent property changed, needs window recreate');
        return true;
      }

      // 检查玻璃效果启用状态变化（影响窗口创建）
      if (prevMain?.glassEffect?.enabled !== nextMain?.glassEffect?.enabled) {
        this.logger.info('Glass effect enabled state changed, needs window recreate');
        return true;
      }

      // 玻璃效果参数变化（opacity, blur, saturation 等）不需要重建窗口
      // 这些参数会通过 config-changed 事件发送到渲染进程，实时更新样式
    }

    return false;
  }

  /**
   * 处理配置变化
   */
  // private async handleConfigChange(key: string, value: any): Promise<void> {
  //   try {
  //     if (key.startsWith('voice.')) {
  //       await this.voiceService.updateConfig(value);
  //     } else if (key.startsWith('ai.')) {
  //       await this.aiService.updateConfig(value);
  //     } else if (key.startsWith('medical.')) {
  //       await this.medicalService.updateConfig(value);
  //     } else if (key.startsWith('desktopRecognition.')) {
  //       await this.desktopRecognitionService.updateConfig(value);
  //     } else if (key.startsWith('shortcuts.')) {
  //       await this.shortcutService.updateConfig(value);
  //     }
  //   } catch (error) {
  //     this.logger.error(`Error handling config change for ${key}:`, error);
  //   }
  // }

  /**
   * 广播消息到所有渲染进程
   */
  private broadcastToRenderers(channel: string, data: any): void {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }

  /**
   * 创建系统托盘
   */
  private createTray(): void {
    try {
      const iconPath = join(__dirname, '../../assets/icons/tray-icon.png');
      const trayIcon = nativeImage.createFromPath(iconPath);
      
      this.tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
      this.tray.setToolTip('Desktop AI Assistant');
      
      const contextMenu = Menu.buildFromTemplate([
        {
          label: '显示主窗口',
          click: () => this.windowManager.showMainWindow()
        },
        {
          label: '显示浮动窗口',
          click: () => this.windowManager.showFloatingWindow()
        },
        {
          label: '语音助手',
          click: () => this.windowManager.showVoiceWindow()
        },
        { type: 'separator' },
        {
          label: '开始语音识别',
          click: async () => {
            try {
              await this.voiceService.startRecognition();
            } catch (error) {
              this.logger.error('Failed to start voice recognition from tray:', error);
            }
          }
        },
        {
          label: '停止语音识别',
          click: async () => {
            try {
              await this.voiceService.stopRecognition();
            } catch (error) {
              this.logger.error('Failed to stop voice recognition from tray:', error);
            }
          }
        },
        { type: 'separator' },
        {
          label: '设置',
          click: () => {
            this.windowManager.showMainWindow();
            // 发送消息到渲染进程显示设置页面
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', '/settings');
            }
          }
        },
        {
          label: '退出',
          click: () => this.quit()
        }
      ]);
      
      this.tray.setContextMenu(contextMenu);
      
      // 双击托盘图标显示主窗口
      this.tray.on('double-click', () => {
        this.windowManager.toggleMainWindow();
      });
      
      this.logger.info('System tray created');
    } catch (error) {
      this.logger.warn('Failed to create system tray:', error);
    }
  }

  /**
   * 设置应用程序菜单
   */
  private setupApplicationMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: '应用',
        submenu: [
          {
            label: '关于 Desktop AI Assistant',
            role: 'about'
          },
          { type: 'separator' },
          {
            label: '设置',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.windowManager.showMainWindow();
              const mainWindow = this.windowManager.getMainWindow();
              if (mainWindow) {
                mainWindow.webContents.send('navigate-to', '/settings');
              }
            }
          },
          { type: 'separator' },
          {
            label: '隐藏应用',
            accelerator: 'CmdOrCtrl+H',
            role: 'hide'
          },
          {
            label: '隐藏其他',
            accelerator: 'CmdOrCtrl+Shift+H',
            role: 'hideOthers'
          },
          {
            label: '显示全部',
            role: 'unhide'
          },
          { type: 'separator' },
          {
            label: '退出',
            accelerator: 'CmdOrCtrl+Q',
            click: () => this.quit()
          }
        ]
      },
      {
        label: '编辑',
        submenu: [
          { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
          { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
          { type: 'separator' },
          { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
          { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
          { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
          { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
        ]
      },
      {
        label: '窗口',
        submenu: [
          {
            label: '主窗口',
            accelerator: 'CmdOrCtrl+1',
            click: () => this.windowManager.toggleMainWindow()
          },
          {
            label: '浮动窗口',
            accelerator: 'CmdOrCtrl+2',
            click: () => this.windowManager.toggleFloatingWindow()
          },
          {
            label: '语音窗口',
            accelerator: 'CmdOrCtrl+3',
            click: () => this.windowManager.showVoiceWindow()
          },
          { type: 'separator' },
          { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
          { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
        ]
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '学习更多',
            click: async () => {
              const { shell } = require('electron');
              await shell.openExternal('https://github.com/your-repo/desktop-ai-assistant');
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  /**
   * 退出应用程序
   */
  async quit(): Promise<void> {
    if (this.isQuitting) {
      return;
    }
    
    this.isQuitting = true;
    this.logger.info('Quitting Desktop AI Assistant...');
    
    try {
      // 清理所有服务
      if (this.shortcutService) {
        await this.shortcutService.cleanup();
      }
      
      // 清理开发者工具快捷键
      if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        const { globalShortcut } = require('electron');
        globalShortcut.unregister('CommandOrControl+Shift+I');
        globalShortcut.unregister('F12');
        this.logger.info('Developer tools shortcuts unregistered');
      }
      
      if (this.desktopRecognitionService) {
        await this.desktopRecognitionService.cleanup();
      }
      
      if (this.medicalService) {
        await this.medicalService.cleanup();
      }
      
      if (this.bishengService) {
        await this.bishengService.cleanup();
      }
      
      if (this.aiService) {
        await this.aiService.cleanup();
      }
      
      if (this.voiceService) {
        await this.voiceService.cleanup();
      }
      
      if (this.windowManager) {
        await this.windowManager.cleanup();
      }
      
      // 销毁托盘
      if (this.tray) {
        this.tray.destroy();
        this.tray = null;
      }
      
      this.logger.info('Desktop AI Assistant cleanup completed');
      
      // 退出应用
      app.quit();
    } catch (error) {
      this.logger.error('Error during application cleanup:', error);
      app.quit();
    }
  }
}

// 应用程序入口点
console.log('Creating DesktopAIAssistant instance...');
const desktopAIAssistant = new DesktopAIAssistant();

// 确保只有一个实例运行
console.log('Requesting single instance lock...');
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running, quitting...');
  app.quit();
} else {
  console.log('Got single instance lock, waiting for app ready...');
  
  // 当应用程序准备就绪时初始化
  app.whenReady().then(async () => {
    try {
      console.log('App is ready, starting initialization...');
      await desktopAIAssistant.initialize();
      console.log('Application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
      // 不要立即退出，让用户看到错误信息
      setTimeout(() => {
        app.quit();
      }, 5000);
    }
  });
}

// 导出应用实例（用于测试）
export { desktopAIAssistant };
