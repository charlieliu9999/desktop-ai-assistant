import React, { useState } from 'react';
import { useConfigStore } from '../stores/configStore';
import type { WebSearchConfig } from '../../shared/types';

interface WebSearchSettingsProps {
  onClose?: () => void;
}

export const WebSearchSettings: React.FC<WebSearchSettingsProps> = ({ onClose }) => {
  const { config, updateConfig } = useConfigStore();
  const [webSearchConfig, setWebSearchConfig] = useState<WebSearchConfig>(
    config.ai.webSearch || {
      enabled: false,
      provider: 'duckduckgo',
      apiKey: '',
      apiUrl: '',
      searchEngineId: '',
      maxResults: 5,
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimitRpm: 30,
      safeSearch: true,
      language: 'zh-CN',
      region: 'CN'
    }
  );

  const handleConfigChange = (key: keyof WebSearchConfig, value: any) => {
    const newConfig = { ...webSearchConfig, [key]: value };
    setWebSearchConfig(newConfig);
    updateConfig({
      ai: {
        ...config.ai,
        webSearch: newConfig
      }
    });
  };

  const handleSave = () => {
    updateConfig({
      ai: {
        ...config.ai,
        webSearch: webSearchConfig,
        toolsEnabled: webSearchConfig.enabled
      }
    });
    onClose?.();
  };

  const searchProviders = [
    { value: 'duckduckgo', label: 'DuckDuckGo (免费，无需 API Key)', requiresKey: false },
    { value: 'google', label: 'Google Custom Search', requiresKey: true, requiresEngineId: true },
    { value: 'bing', label: 'Bing Search API', requiresKey: true },
    { value: 'serpapi', label: 'SerpAPI', requiresKey: true },
    { value: 'custom', label: '自定义 API', requiresKey: false, requiresUrl: true }
  ];

  const selectedProvider = searchProviders.find(p => p.value === webSearchConfig.provider);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              网络搜索设置
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* 启用网络搜索 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  启用网络搜索
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  允许 AI 助手搜索网络获取最新信息
                </p>
              </div>
              <input
                type="checkbox"
                checked={webSearchConfig.enabled}
                onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            {webSearchConfig.enabled && (
              <>
                {/* 搜索提供商 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    搜索提供商
                  </label>
                  <select
                    value={webSearchConfig.provider}
                    onChange={(e) => handleConfigChange('provider', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {searchProviders.map(provider => (
                      <option key={provider.value} value={provider.value}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {selectedProvider?.requiresKey && '需要 API Key'}
                    {selectedProvider?.requiresEngineId && ' 和搜索引擎 ID'}
                    {selectedProvider?.requiresUrl && ' 需要自定义 API URL'}
                    {!selectedProvider?.requiresKey && !selectedProvider?.requiresUrl && ' 无需配置'}
                  </p>
                </div>

                {/* API Key */}
                {selectedProvider?.requiresKey && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={webSearchConfig.apiKey || ''}
                      onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                      placeholder="请输入 API Key"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
                    />
                  </div>
                )}

                {/* 搜索引擎 ID (Google) */}
                {selectedProvider?.requiresEngineId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      搜索引擎 ID
                    </label>
                    <input
                      type="text"
                      value={webSearchConfig.searchEngineId || ''}
                      onChange={(e) => handleConfigChange('searchEngineId', e.target.value)}
                      placeholder="请输入 Google Custom Search Engine ID"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      在 <a href="https://cse.google.com/cse/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Custom Search</a> 创建搜索引擎
                    </p>
                  </div>
                )}

                {/* 自定义 API URL */}
                {selectedProvider?.requiresUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      自定义 API URL
                    </label>
                    <input
                      type="url"
                      value={webSearchConfig.apiUrl || ''}
                      onChange={(e) => handleConfigChange('apiUrl', e.target.value)}
                      placeholder="https://your-api.com/search"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
                    />
                  </div>
                )}

                {/* 最大结果数 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    最大结果数
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={webSearchConfig.maxResults}
                    onChange={(e) => handleConfigChange('maxResults', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
                  />
                </div>

                {/* 语言和地区 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      语言
                    </label>
                    <select
                      value={webSearchConfig.language}
                      onChange={(e) => handleConfigChange('language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="zh-TW">繁体中文</option>
                      <option value="en-US">English</option>
                      <option value="ja-JP">日本語</option>
                      <option value="ko-KR">한국어</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      地区
                    </label>
                    <select
                      value={webSearchConfig.region}
                      onChange={(e) => handleConfigChange('region', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
                    >
                      <option value="CN">中国</option>
                      <option value="US">美国</option>
                      <option value="JP">日本</option>
                      <option value="KR">韩国</option>
                      <option value="TW">台湾</option>
                      <option value="HK">香港</option>
                    </select>
                  </div>
                </div>

                {/* 安全搜索 */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      启用安全搜索
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      过滤不适当的内容
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={webSearchConfig.safeSearch}
                    onChange={(e) => handleConfigChange('safeSearch', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                {/* 高级设置 */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    高级设置
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        超时时间 (ms)
                      </label>
                      <input
                        type="number"
                        min="1000"
                        max="60000"
                        value={webSearchConfig.timeout}
                        onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        重试次数
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={webSearchConfig.retryAttempts}
                        onChange={(e) => handleConfigChange('retryAttempts', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
