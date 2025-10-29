// Minimal but functional adapter for main process.
// Supports backend routing (/v1/*) and a simple frontend-direct (OpenAI-compatible) mode.

let BACKEND_ORIGIN = 'http://127.0.0.1:8010';
export function setBackendApiOrigin(origin: string) { BACKEND_ORIGIN = origin || BACKEND_ORIGIN; }

type LoggerLike = { info?: (...a: any[]) => void; warn?: (...a: any[]) => void; error?: (...a: any[]) => void };

export class AIServiceAdapter {
  private config: any;
  private logger: any;

  constructor(config?: any, logger?: LoggerLike) {
    this.config = config || {};
    this.logger = logger || {};
  }

  async initialize(): Promise<void> { /* no-op */ }
  updateConfig(patch?: any): void { this.config = { ...(this.config || {}), ...(patch || {}) }; }
  getState(): 'backend' | 'frontend' { return (this.config?.routingMode || 'frontend') === 'backend' ? 'backend' : 'frontend'; }

  private buildBackendScene(): string {
    const p = this.config?.backendProvider || '';
    return this.config?.backendScene || (p === 'dashscope' ? 'ai_chat_aliyun' : 'ai_chat');
  }

  private buildBackendHeaders(): Record<string,string> { return { 'Content-Type': 'application/json' }; }

  private buildFrontendHeaders(): Record<string,string> {
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    const provider = this.config?.provider || 'local';
    const apiKey = this.config?.apiKey || '';
    if (provider !== 'local' && apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    return headers;
  }

  async processMessage(message: string, sysPrompt?: string): Promise<string> {
    const routing = this.config?.routingMode || 'frontend';
    if (routing === 'backend') {
      const scene = this.buildBackendScene();
      const ver = (this.config?.apiVersion === 'v2') ? 'v2' : 'v1';
      const url = `${BACKEND_ORIGIN}/${ver}/ai/chat?scene=${encodeURIComponent(scene)}`;
      const body: any = {
        provider: this.config?.backendProvider || undefined,
        messages: [
          ...(sysPrompt ? [{ role: 'system', content: sysPrompt }] : []),
          { role: 'user', content: message }
        ],
        options: {
          model: this.config?.backendModel || undefined,
          temperature: 0.7,
          max_tokens: 1024,
        },
      };
      const resp = await fetch(url, { method: 'POST', headers: this.buildBackendHeaders(), body: JSON.stringify(body) });
      if (!resp.ok) throw new Error(`http_${resp.status}`);
      const data = await resp.json().catch(() => ({}));
      const content = data?.data?.message?.content || data?.message?.content || data?.response || '';
      return typeof content === 'string' ? content : String(content || '');
    } else {
      // Frontend-direct (OpenAI compatible)
      const endpoint = (this.config?.apiUrl || 'http://127.0.0.1:11434/v1/chat/completions').replace('localhost','127.0.0.1').replace('[::1]','127.0.0.1');
      const payload = {
        model: this.config?.model || 'qwen3:7b-instruct',
        messages: [
          ...(sysPrompt ? [{ role: 'system', content: sysPrompt }] : []),
          { role: 'user', content: message }
        ],
        stream: false,
      };
      const resp = await fetch(endpoint, { method: 'POST', headers: this.buildFrontendHeaders(), body: JSON.stringify(payload) });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`http_${resp.status} ${text}`);
      }
      const data = await resp.json().catch(() => ({}));
      const content = data?.choices?.[0]?.message?.content || '';
      return typeof content === 'string' ? content : String(content || '');
    }
  }

  async *chatStream(message: string, sysPrompt?: string): AsyncIterableIterator<string> {
    // Streaming only for backend routing to /v1/ai/chat_stream
    const scene = this.buildBackendScene();
    const ver = (this.config?.apiVersion === 'v2') ? 'v2' : 'v1';
    const url = `${BACKEND_ORIGIN}/${ver}/ai/chat/stream?scene=${encodeURIComponent(scene)}`;
    const body: any = {
      provider: this.config?.backendProvider || undefined,
      messages: [
        ...(sysPrompt ? [{ role: 'system', content: sysPrompt }] : []),
        { role: 'user', content: message }
      ],
      options: { model: this.config?.backendModel || undefined },
    };
    const resp = await fetch(url, { method: 'POST', headers: this.buildBackendHeaders(), body: JSON.stringify(body) });
    if (!resp.ok) throw new Error(`http_${resp.status}`);
    const reader = (resp.body as any)?.getReader?.();
    if (!reader) return;
    const decoder = new TextDecoder('utf-8');
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
            const jsonStr = trimmed.substring(6);
            const frame = JSON.parse(jsonStr);
            // v1 SSE: { type, content? }
            // v2 SSE: { type, data?:{content?}, error?:{code,message} }
            const typ = frame?.type;
            if (typ === 'chunk') {
              const chunk = frame?.content ?? frame?.data?.content ?? frame?.choices?.[0]?.delta?.content || '';
              if (chunk) yield chunk;
            } else if (typ === 'error') {
              const msg = typeof frame?.error === 'string' ? frame.error : (frame?.error?.message || 'Stream error');
              throw new Error(msg);
            }
          } catch { /* ignore */ }
        }
      }
    } finally {
      try { reader.releaseLock(); } catch {}
    }
  }

  async clearHistory(): Promise<void> { /* no-op */ }
  async generateSummary(text: string): Promise<string> { return await this.processMessage(`请为以下文本生成简洁摘要：\n\n${text}`); }
  async searchWeb(query: string, maxResults = 3): Promise<any> {
    const url = `${BACKEND_ORIGIN}/v1/tools/search?q=${encodeURIComponent(query)}&limit=${maxResults}`;
    const resp = await fetch(url, { headers: this.buildBackendHeaders() });
    if (!resp.ok) throw new Error(`http_${resp.status}`);
    const data = await resp.json().catch(() => ({}));
    return data?.data || { results: [] };
  }
  async getAvailableProviders(): Promise<any[]> {
    const resp = await fetch(`${BACKEND_ORIGIN}/v1/registry/providers`, { headers: this.buildBackendHeaders() });
    if (!resp.ok) return [];
    const data = await resp.json().catch(() => ({}));
    const arr = Array.isArray(data?.data) ? data.data : [];
    return arr;
  }
  async cleanup(): Promise<void> { /* no-op */ }
}

export class AgentServiceAdapter { [key: string]: any; constructor(..._args: any[]) {} }
