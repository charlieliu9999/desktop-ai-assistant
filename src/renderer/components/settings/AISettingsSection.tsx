import React from 'react';
import { toast } from 'sonner';
import { apiClient } from '../../../services/api-client';
import type { AppConfig, AIConfig } from '../../../shared/types';

interface AISettingsSectionProps {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
  disabled?: boolean;
}

interface BackendProvider {
  name: string;
  models: string[];
  base_url?: string;
}

const PROVIDER_ENDPOINTS: Record<string, string> = {
  local: 'http://127.0.0.1:11434/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  claude: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
};

const PROVIDER_LABELS: Record<AIConfig['provider'], string> = {
  local: '本地（Ollama / OpenAI 兼容）',
  openai: 'OpenAI',
  claude: 'Anthropic Claude',
  gemini: 'Google Gemini',
};

export const AISettingsSection: React.FC<AISettingsSectionProps> = ({ config, onChange, disabled = false }) => {
  const [providers, setProviders] = React.useState<BackendProvider[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const aiCfg: AIConfig = config.ai;
  const routingMode = aiCfg.routingMode ?? 'frontend';
  const backendProvider = aiCfg.backendProvider ?? '';
  const backendModel = aiCfg.backendModel ?? '';
  const backendScene = (aiCfg as any)?.backendScene || (backendProvider === 'dashscope' ? 'ai_chat_aliyun' : 'ai_chat');
  const provider = aiCfg.provider ?? 'local';
  const isLocked = disabled;

  React.useEffect(() => {
    let mounted = true;
    const loadProviders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.getAIModels();
        if (!mounted) return;
        setProviders(res?.data?.providers || []);
      } catch (err: any) {
        if (!mounted) return;
        const msg = err?.message || '加载失败';
        setError(msg);
        toast.error(`加载后端模型失败：${msg}`);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadProviders();
    return () => {
      mounted = false;
    };
  }, []);

  const updateAI = (patch: Partial<AIConfig>) => {
    if (isLocked) {
      toast.info('当前设置已锁定，请联系管理员修改。');
      return;
    }
    onChange({
      ...config,
      ai: {
        ...aiCfg,
        ...patch,
      },
    });
  };

  const selectedBackendProvider = providers.find((item) => item.name === backendProvider);
  const availableBackendModels = selectedBackendProvider?.models ?? [];

  const frontendWarnings = React.useMemo(() => {
    if (routingMode !== 'frontend') return [];
    const warnings: string[] = [];
    if (!aiCfg.apiUrl?.trim()) {
      warnings.push('前端直连模式需要填写 API 地址。');
    }
    if (provider !== 'local' && !aiCfg.apiKey?.trim()) {
      warnings.push('当前提供商需要 API Key。');
    }
    return warnings;
  }, [aiCfg.apiKey, aiCfg.apiUrl, provider, routingMode]);

  const API_ORIGIN = React.useMemo(() => {
    try {
      const base = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8010/api';
      const url = new URL(base);
      return url.origin;
    } catch {
      return 'http://127.0.0.1:8010';
    }
  }, []);

  const handleTestBackend = async () => {
    if (isLocked) {
      toast.info('当前设置已锁定，请联系管理员修改。');
      return;
    }
    try {
      const scene = backendScene || (backendProvider === 'dashscope' ? 'ai_chat_aliyun' : 'ai_chat');
      const body = {
        provider: backendProvider || undefined,
        messages: [
          { role: 'system', content: '你是一个连通性测试助手。' },
          { role: 'user', content: '请回复「OK」' },
        ],
        options: {
          model: backendModel || undefined,
          temperature: 0,
          max_tokens: 32,
        },
      };
      const start = performance.now();
      const response = await fetch(`${API_ORIGIN}/v1/ai/chat?scene=${encodeURIComponent(scene)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const duration = Math.round(performance.now() - start);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      toast.success(`后端对话连通成功 (${duration}ms)`);
    } catch (err: any) {
      toast.error(`后端对话连通失败：${err?.message || err}`);
    }
  };

  const handleProviderChange = (nextProvider: AIConfig['provider']) => {
    if (isLocked) {
      toast.info('当前设置已锁定，请联系管理员修改。');
      return;
    }
    const defaults = PROVIDER_ENDPOINTS[nextProvider];
    const nextApiUrl = routingMode === 'frontend' && defaults ? defaults : (aiCfg.apiUrl ?? '');
    const patch: Partial<AIConfig> = { provider: nextProvider };
    if (routingMode === 'frontend') {
      (patch as any).apiUrl = nextApiUrl;
    }
    updateAI(patch);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">启用 AI 对话能力</div>
          <div className="text-xs text-muted-foreground mt-1">
            关闭后所有文本对话功能将被禁用。
          </div>
        </div>
        <input
          type="checkbox"
          checked={!!aiCfg.enabled}
          onChange={(event) => updateAI({ enabled: event.target.checked })}
          className="rounded"
          disabled={isLocked}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">调用路由模式</label>
        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center space-x-2">
            <input
              type="radio"
              name="ai-routing-mode"
              checked={routingMode === 'frontend'}
              onChange={() => updateAI({ routingMode: 'frontend' })}
              disabled={isLocked}
            />
            <span className="text-sm">前端直连（本地/云模型）</span>
          </label>
          <label className="inline-flex items-center space-x-2">
            <input
              type="radio"
              name="ai-routing-mode"
              checked={routingMode === 'backend'}
              onChange={() => updateAI({ routingMode: 'backend' })}
              disabled={isLocked}
            />
            <span className="text-sm">后端转发（由后端统一管控）</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          推荐使用「后端转发」模式，由后端统一控制模型、提示词和限流策略；若需连接本地 Ollama 或自定义云端，请选择「前端直连」。
        </p>
      </div>

      {routingMode === 'backend' ? (
        <div className="space-y-5 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">后端提供商</div>
              <div className="text-xs text-muted-foreground mt-1">不选择时使用后端场景默认。</div>
            </div>
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline disabled:text-muted-foreground"
              disabled={isLocked || loading}
              onClick={() => {
                if (isLocked) return;
                setLoading(true);
                setError(null);
                apiClient
                  .getAIModels()
                  .then((res) => setProviders(res?.data?.providers || []))
                  .catch((err: any) => {
                    const msg = err?.message || '加载失败';
                    setError(msg);
                    toast.error(`刷新失败：${msg}`);
                  })
                  .finally(() => setLoading(false));
              }}
            >
              {loading ? '刷新中…' : '刷新列表'}
            </button>
          </div>

          {error && <div className="text-xs text-red-500">{error}</div>}

          <label className="block">
            <span className="block text-sm font-medium mb-2">Provider</span>
            <select
              value={backendProvider}
              onChange={(event) => updateAI({ backendProvider: event.target.value, backendModel: '' })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              disabled={loading || isLocked}
            >
              <option value="">（使用后端默认）</option>
              {providers.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-medium mb-2">业务场景（scene）</span>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              value={backendScene}
              onChange={(event) => updateAI({ backendScene: event.target.value } as any)}
              placeholder="ai_chat / ai_chat_aliyun"
              disabled={isLocked}
            />
            <span className="text-xs text-muted-foreground mt-1">
              默认为 ai_chat；DashScope 场景可使用 ai_chat_aliyun。
            </span>
          </label>

          <label className="block">
            <span className="block text-sm font-medium mb-2">后端模型（可选）</span>
            <select
              value={backendModel}
              onChange={(event) => updateAI({ backendModel: event.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              disabled={loading || (!backendProvider && availableBackendModels.length === 0) || isLocked}
            >
              <option value="">（使用场景默认）</option>
              {availableBackendModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleTestBackend}
              className="px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground"
              disabled={isLocked}
            >
              测试后端连通
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block">
            <span className="block text-sm font-medium mb-2">模型提供商</span>
            <select
              value={provider}
              onChange={(event) => handleProviderChange(event.target.value as AIConfig['provider'])}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              disabled={isLocked}
            >
              {(Object.keys(PROVIDER_LABELS) as AIConfig['provider'][]).map((key) => (
                <option key={key} value={key}>
                  {PROVIDER_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-medium mb-2">API 地址</span>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              value={aiCfg.apiUrl ?? ''}
              onChange={(event) => updateAI({ apiUrl: event.target.value })}
              placeholder={PROVIDER_ENDPOINTS[provider] || 'https://...'}
              disabled={isLocked}
            />
          </label>

          {provider !== 'local' && (
            <label className="block">
              <span className="block text-sm font-medium mb-2">API Key</span>
              <input
                type="password"
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                value={aiCfg.apiKey ?? ''}
                onChange={(event) => updateAI({ apiKey: event.target.value })}
                placeholder="sk-..."
                disabled={isLocked}
              />
              <span className="text-xs text-muted-foreground mt-1">
                密钥仅存储于本地配置文件，请注意权限管理。
              </span>
            </label>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium mb-2">模型名称</span>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                value={aiCfg.model ?? ''}
                onChange={(event) => updateAI({ model: event.target.value })}
                placeholder="qwen2.5:32b / gpt-4o / claude-3-opus"
                disabled={isLocked}
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium mb-2">温度（Temperature）</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                value={aiCfg.temperature ?? 0.7}
                onChange={(event) => updateAI({ temperature: Number(event.target.value) })}
                disabled={isLocked}
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium mb-2">最大 Tokens</span>
              <input
                type="number"
                min={256}
                step={64}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                value={aiCfg.maxTokens ?? 2048}
                onChange={(event) => updateAI({ maxTokens: Number(event.target.value) })}
                disabled={isLocked}
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium mb-2">上下文消息条数</span>
              <input
                type="number"
                min={0}
                max={20}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                value={aiCfg.maxHistory ?? 10}
                onChange={(event) => updateAI({ maxHistory: Number(event.target.value) })}
                disabled={isLocked}
              />
            </label>
          </div>

          {frontendWarnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-400/50 dark:bg-amber-900/20 dark:text-amber-200">
              {frontendWarnings.map((warn) => (
                <div key={warn}>{warn}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">系统提示词（System Prompt）</label>
        <textarea
          className="w-full min-h-[140px] px-3 py-2 border border-border rounded-md bg-background text-sm"
          value={aiCfg.systemPrompt ?? ''}
          onChange={(event) => updateAI({ systemPrompt: event.target.value })}
          placeholder="为 AI 配置统一角色与回复规范..."
          disabled={isLocked}
        />
      </div>

      {isLocked && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-400/50 dark:bg-blue-900/20 dark:text-blue-200">
          后端已开启模型锁定，当前设置仅供查看。如需修改请联系管理员或关闭模型锁定。
        </div>
      )}
    </div>
  );
};

export default AISettingsSection;
