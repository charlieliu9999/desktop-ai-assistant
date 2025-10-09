import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient, { ModelConfig, ModelTestResponse } from '../../services/api-client';

interface ModelConfigPanelProps {
  onSave?: () => void;
}

const ModelConfigPanel: React.FC<ModelConfigPanelProps> = ({ onSave }) => {
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [scenarioDescriptions, setScenarioDescriptions] = useState<Record<string, string>>({});
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ModelTestResponse | null>(null);

  // 加载场景列表
  useEffect(() => {
    loadScenarios();
  }, []);

  // 加载选中场景的配置
  useEffect(() => {
    if (selectedScenario) {
      loadScenarioConfig(selectedScenario);
    }
  }, [selectedScenario]);

  const loadScenarios = async () => {
    try {
      const ok = await apiClient.ping();
      if (!ok) {
        throw new Error('backend-unavailable');
      }
      const data = await apiClient.getScenarios();
      setScenarios(data.scenarios);
      setScenarioDescriptions(data.descriptions);
      if (data.scenarios.length > 0) {
        setSelectedScenario(data.scenarios[0]);
      }
    } catch (error) {
      if ((error as any)?.message === 'backend-unavailable') {
        // 静默降级：只提示一次
        toast.error('后台未启动（端口 8010），模型场景配置暂不可用');
      } else {
        toast.error('加载场景列表失败');
      }
    }
  };

  const loadScenarioConfig = async (scenario: string) => {
    setIsLoading(true);
    try {
      const data = await apiClient.getScenarioConfig(scenario);
      setConfig(data);
      setTestResult(null);
    } catch (error) {
      toast.error('加载配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (field: keyof ModelConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const handleTestConnection = async () => {
    if (!config) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await apiClient.testModelConnection({
        model_name: config.model_name,
        base_url: config.base_url,
        timeout: 30,
      });
      setTestResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('测试连接失败');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!config || !selectedScenario) return;

    try {
      await apiClient.updateScenarioConfig(selectedScenario, config);
      toast.success('配置已保存');
      if (onSave) onSave();
    } catch (error) {
      toast.error('保存配置失败');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          AI 模型配置
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          为不同的使用场景配置独立的 AI 模型参数
        </p>
      </div>

      {/* 场景选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          使用场景
        </label>
        <select
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
        >
          {scenarios.map((scenario) => (
            <option key={scenario} value={scenario}>
              {scenarioDescriptions[scenario] || scenario}
            </option>
          ))}
        </select>
      </div>

      {config && (
        <>
          {/* 模型名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              模型名称
            </label>
            <input
              type="text"
              value={config.model_name}
              onChange={(e) => handleConfigChange('model_name', e.target.value)}
              placeholder="例如: qwen2.5:32b"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Ollama 模型名称
            </p>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API 地址
            </label>
            <input
              type="url"
              value={config.base_url}
              onChange={(e) => handleConfigChange('base_url', e.target.value)}
              placeholder="http://127.0.0.1:11434"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              温度 (Temperature): {config.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature}
              onChange={(e) =>
                handleConfigChange('temperature', parseFloat(e.target.value))
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>精确 (0)</span>
              <span>创造 (2)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              最大 Tokens
            </label>
            <input
              type="number"
              min="100"
              max="32000"
              step="100"
              value={config.max_tokens}
              onChange={(e) =>
                handleConfigChange('max_tokens', parseInt(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
          </div>

          {/* 测试连接按钮 */}
          <div>
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  测试中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  测试连接
                </>
              )}
            </button>
          </div>

          {/* 测试结果 */}
          {testResult && (
            <div
              className={`p-4 rounded-md ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                    }`}
                  >
                    {testResult.message}
                  </p>
                  {testResult.model_info && (
                    <div className="mt-2 text-xs text-green-700 dark:text-green-300 space-y-1">
                      <p>模型: {testResult.model_info.name}</p>
                      <p>大小: {testResult.model_info.size}</p>
                      <p>参数: {testResult.model_info.parameter_size}</p>
                      <p>量化: {testResult.model_info.quantization}</p>
                    </div>
                  )}
                  {testResult.error && (
                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                      {testResult.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 保存按钮 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Save className="w-4 h-4 mr-2" />
              保存配置
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ModelConfigPanel;
