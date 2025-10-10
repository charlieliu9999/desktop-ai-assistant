/**
 * 网络搜索服务
 * 支持多种搜索提供商：Google、Bing、DuckDuckGo、SerpAPI等
 */

import { EventEmitter } from 'events';
import type { Logger } from '../utils/logger';
import type { WebSearchConfig, WebSearchResponse, WebSearchResult } from '../shared/types';

export class WebSearchService extends EventEmitter {
  private logger: Logger;
  private config: WebSearchConfig;
  private isEnabled: boolean = false;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue: boolean = false;
  private lastRequestTime: number = 0;
  private rateLimitDelay: number = 1000; // 1秒

  constructor(config: WebSearchConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.isEnabled = config.enabled;
  }

  /**
   * 初始化网络搜索服务
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing web search service...');

    try {
      if (!this.isEnabled) {
        this.logger.info('Web search service is disabled');
        return;
      }

      // 验证配置
      await this.validateConfig();

      this.logger.info(`Web search service initialized with ${this.config.provider} provider`);
    } catch (error) {
      this.logger.error('Failed to initialize web search service:', error);
      this.isEnabled = false;
    }
  }

  /**
   * 验证配置
   */
  private async validateConfig(): Promise<void> {
    if (!this.config.apiKey && this.config.provider !== 'duckduckgo') {
      throw new Error(`API key is required for ${this.config.provider} provider`);
    }

    if (this.config.provider === 'google' && !this.config.searchEngineId) {
      throw new Error('Search Engine ID is required for Google provider');
    }

    this.logger.info(`Web search config validated for ${this.config.provider}`);
  }

  /**
   * 执行网络搜索
   */
  async search(query: string, options: {
    maxResults?: number;
    language?: string;
    region?: string;
    safeSearch?: boolean;
  } = {}): Promise<WebSearchResponse> {
    if (!this.isEnabled) {
      throw new Error('Web search service is not enabled');
    }

    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const response = await this.executeSearch(query, options);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * 执行搜索请求
   */
  private async executeSearch(query: string, options: any): Promise<WebSearchResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Executing web search: "${query}" with ${this.config.provider}`);

      // 实施速率限制
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.rateLimitDelay) {
        await new Promise(resolve => 
          setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
        );
      }

      let results: WebSearchResult[] = [];
      
      // 根据提供商执行搜索
      switch (this.config.provider) {
        case 'google':
          results = await this.searchWithGoogle(query, options);
          break;
        case 'bing':
          results = await this.searchWithBing(query, options);
          break;
        case 'duckduckgo':
          results = await this.searchWithDuckDuckGo(query, options);
          break;
        case 'serpapi':
          results = await this.searchWithSerpAPI(query, options);
          break;
        case 'custom':
          results = await this.searchWithCustomAPI(query, options);
          break;
        default:
          throw new Error(`Unsupported search provider: ${this.config.provider}`);
      }

      this.lastRequestTime = Date.now();
      const searchTime = Date.now() - startTime;

      const response: WebSearchResponse = {
        success: true,
        results,
        totalResults: results.length,
        searchTime,
        provider: this.config.provider,
        query
      };

      this.logger.info(`Web search completed: ${results.length} results in ${searchTime}ms`);
      return response;

    } catch (error) {
      this.logger.error('Web search failed:', error);
      return {
        success: false,
        results: [],
        totalResults: 0,
        searchTime: Date.now() - startTime,
        provider: this.config.provider,
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Google 搜索
   */
  private async searchWithGoogle(query: string, options: any): Promise<WebSearchResult[]> {
    const maxResults = options.maxResults || this.config.maxResults;
    const url = `https://www.googleapis.com/customsearch/v1?key=${this.config.apiKey}&cx=${this.config.searchEngineId}&q=${encodeURIComponent(query)}&num=${maxResults}&safe=${this.config.safeSearch ? 'active' : 'off'}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.customHeaders
      }
    });

    if (!response.ok) {
      throw new Error(`Google search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.items || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      publishedDate: item.pagemap?.metatags?.[0]?.['article:published_time'],
      source: this.extractDomain(item.link),
      relevanceScore: 1.0 // Google 不提供相关性分数
    }));
  }

  /**
   * Bing 搜索
   */
  private async searchWithBing(query: string, options: any): Promise<WebSearchResult[]> {
    const maxResults = options.maxResults || this.config.maxResults;
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${maxResults}&mkt=${this.config.region || 'zh-CN'}&safeSearch=${this.config.safeSearch ? 'Strict' : 'Off'}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': this.config.apiKey!,
        'Content-Type': 'application/json',
        ...this.config.customHeaders
      }
    });

    if (!response.ok) {
      throw new Error(`Bing search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.webPages?.value || []).map((item: any) => ({
      title: item.name,
      url: item.url,
      snippet: item.snippet,
      publishedDate: item.dateLastCrawled,
      source: this.extractDomain(item.url),
      relevanceScore: item.rankingScore || 1.0
    }));
  }

  /**
   * DuckDuckGo 搜索（无需 API Key）
   */
  private async searchWithDuckDuckGo(query: string, options: any): Promise<WebSearchResult[]> {
    const maxResults = options.maxResults || this.config.maxResults;
    
    // 使用 DuckDuckGo Instant Answer API
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.customHeaders
      }
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const results: WebSearchResult[] = [];

    // 处理相关主题
    if (data.RelatedTopics) {
      data.RelatedTopics.slice(0, maxResults).forEach((topic: any) => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0],
            url: topic.FirstURL,
            snippet: topic.Text,
            source: this.extractDomain(topic.FirstURL),
            relevanceScore: 0.8
          });
        }
      });
    }

    // 处理抽象信息
    if (data.Abstract && data.AbstractURL) {
      results.unshift({
        title: data.Heading || 'DuckDuckGo Result',
        url: data.AbstractURL,
        snippet: data.Abstract,
        source: this.extractDomain(data.AbstractURL),
        relevanceScore: 1.0
      });
    }

    // 若 Instant Answer 无结果，尝试 HTML 备选抓取
    if (results.length === 0) {
      try {
        const htmlResults = await this.searchDuckDuckGoHTML(query, maxResults);
        if (htmlResults.length > 0) {
          return htmlResults;
        }
      } catch (e) {
        this.logger.warn('DuckDuckGo HTML fallback failed:', e);
      }

      // 可选：如配置含 SerpAPI Key，回退到 SerpAPI
      try {
        if (this.config.apiKey) {
          const serp = await this.searchWithSerpAPI(query, options);
          if (serp.length > 0) return serp.slice(0, maxResults);
        }
      } catch (e) {
        this.logger.warn('SerpAPI fallback failed:', e);
      }
    }

    return results.slice(0, maxResults);
  }

  /**
   * DuckDuckGo HTML 抓取回退（非官方API，结构可能变化）
   */
  private async searchDuckDuckGoHTML(query: string, maxResults: number): Promise<WebSearchResult[]> {
    // 使用简化 HTML 端点，避免 JS 渲染
    const htmlUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&kp=${this.config.safeSearch ? '1' : '-1'}&kl=${encodeURIComponent(this.config.region || 'cn-zh-hans')}`;
    const resp = await fetch(htmlUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DesktopAIAssistant/1.0)',
        ...this.config.customHeaders,
      }
    });
    if (!resp.ok) {
      throw new Error(`DuckDuckGo HTML search failed: ${resp.status} ${resp.statusText}`);
    }
    const html = await resp.text();
    const results: WebSearchResult[] = [];

    // 粗略解析结果链接
    const anchorRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gim;
    const snippetRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/im;
    const decode = (s: string) => s
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    let match: RegExpExecArray | null;
    const seen = new Set<string>();
    while ((match = anchorRegex.exec(html)) && results.length < maxResults) {
      const href = match[1];
      const titleRaw = match[2];
      if (!href || seen.has(href)) continue;
      seen.add(href);
      const title = decode(titleRaw);

      // 尝试读取附近片段
      let snippet = '';
      try {
        const chunkStart = Math.max(0, match.index - 500);
        const chunk = html.slice(chunkStart, match.index + 500);
        const sn = snippetRegex.exec(chunk);
        if (sn && sn[2]) snippet = decode(sn[2]);
      } catch {}

      results.push({
        title: title || 'DuckDuckGo Result',
        url: href,
        snippet: snippet || '',
        source: this.extractDomain(href),
        relevanceScore: 0.7,
      });
    }
    return results;
  }

  /**
   * SerpAPI 搜索
   */
  private async searchWithSerpAPI(query: string, options: any): Promise<WebSearchResult[]> {
    const maxResults = options.maxResults || this.config.maxResults;
    const url = `https://serpapi.com/search?api_key=${this.config.apiKey}&q=${encodeURIComponent(query)}&num=${maxResults}&engine=google&safe=${this.config.safeSearch ? 'active' : 'off'}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.customHeaders
      }
    });

    if (!response.ok) {
      throw new Error(`SerpAPI search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.organic_results || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      publishedDate: item.date,
      source: this.extractDomain(item.link),
      relevanceScore: item.position ? (1 / item.position) : 1.0
    }));
  }

  /**
   * 自定义 API 搜索
   */
  private async searchWithCustomAPI(query: string, options: any): Promise<WebSearchResult[]> {
    if (!this.config.apiUrl) {
      throw new Error('Custom API URL is required for custom provider');
    }

    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.customHeaders
      },
      body: JSON.stringify({
        query,
        maxResults: options.maxResults || this.config.maxResults,
        language: options.language || this.config.language,
        region: options.region || this.config.region,
        safeSearch: options.safeSearch ?? this.config.safeSearch
      })
    });

    if (!response.ok) {
      throw new Error(`Custom API search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * 从 URL 提取域名
   */
  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'unknown';
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
        await request();
      }
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<WebSearchConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.isEnabled = this.config.enabled;
    
    if (config.provider || config.apiKey) {
      await this.validateConfig();
    }
    
    this.logger.info('Web search config updated');
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      enabled: this.isEnabled,
      provider: this.config.provider,
      queueLength: this.requestQueue.length,
      config: this.config
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up web search service...');
    
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.removeAllListeners();
    
    this.logger.info('Web search service cleanup completed');
  }
}
