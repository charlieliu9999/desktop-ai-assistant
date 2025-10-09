import React, { useState, useEffect } from 'react';
import { AppConfig } from '../shared/types';

interface SettingsPanelProps {
  config?: Partial<AppConfig>;
  onConfigChange?: (config: Partial<AppConfig>) => void;
  onResetConfig?: () => void;
  onExportConfig?: () => void;
  onImportConfig?: (file: File) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config = {},
  onConfigChange,
  onResetConfig,
  onExportConfig,
  onImportConfig,
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [localConfig, setLocalConfig] = useState<Partial<AppConfig>>(config);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  const handleConfigUpdate = (path: string, value: any) => {
    const newConfig = { ...localConfig };
    const keys = path.split('.');
    let current: any = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setLocalConfig(newConfig);
    setHasChanges(true);
  };

  const handleSave = () => {
    onConfigChange?.(localConfig);
    setHasChanges(false);
  };

  const handleReset = () => {
    onResetConfig?.();
    setHasChanges(false);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportConfig?.(file);
    }
  };

  const tabs = [
    { id: 'general', name: '常规', icon: '⚙️' },
    { id: 'shortcuts', name: '快捷键', icon: '⌨️' },
    { id: 'voice', name: '语音', icon: '🎤' },
    { id: 'ai', name: 'AI设置', icon: '🤖' },
    { id: 'medical', name: '医疗集成', icon: '🏥' },
    { id: 'privacy', name: '隐私', icon: '🔒' },
    { id: 'advanced', name: '高级', icon: '🔧' },
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">应用设置</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">开机自启动</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">系统启动时自动运行AI助手</p>
            </div>
            <input
              type="checkbox"
              checked={localConfig.app?.autoStart || false}
              onChange={(e) => handleConfigUpdate('app.autoStart', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">最小化到系统托盘</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">关闭窗口时保持后台运行</p>
            </div>
            <input
              type="checkbox"
              checked={localConfig.app?.minimizeToTray || false}
              onChange={(e) => handleConfigUpdate('app.minimizeToTray', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">显示通知</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">显示系统通知和提醒</p>
            </div>
            <input
              type="checkbox"
              checked={localConfig.app?.showNotifications || false}
              onChange={(e) => handleConfigUpdate('app.showNotifications', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">主题设置</h4>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">主题模式</label>
            <select
              value={localConfig.app?.theme || 'system'}
              onChange={(e) => handleConfigUpdate('app.theme', e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="system">跟随系统</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderShortcutSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">快捷键设置</h3>
      
      <div className="space-y-4">
        {[
          { key: 'toggleAssistant', name: '显示/隐藏助手', default: 'Cmd+Shift+H' },
          { key: 'voiceActivation', name: '语音激活', default: 'Cmd+Shift+A' },
          { key: 'screenCapture', name: '屏幕截取', default: 'Cmd+Shift+S' },
          { key: 'quickSearch', name: '快速搜索', default: 'Cmd+Shift+F' },
        ].map((shortcut) => (
          <div key={shortcut.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{shortcut.name}</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={localConfig.shortcuts?.[shortcut.key as keyof typeof localConfig.shortcuts] || shortcut.default}
                onChange={(e) => handleConfigUpdate(`shortcuts.${shortcut.key}`, e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={shortcut.default}
              />
              <button
                onClick={() => handleConfigUpdate(`shortcuts.${shortcut.key}`, shortcut.default)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                重置
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ 修改快捷键后需要重启应用才能生效
        </p>
      </div>
    </div>
  );

  const renderVoiceSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">语音设置</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用语音识别</label>
            <p className="text-xs text-gray-500 dark:text-gray-400">允许通过语音控制助手</p>
          </div>
          <input
            type="checkbox"
            checked={localConfig.voice?.enabled || false}
            onChange={(e) => handleConfigUpdate('voice.enabled', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">语音识别语言</label>
          <select
            value={localConfig.voice?.language || 'zh-CN'}
            onChange={(e) => handleConfigUpdate('voice.language', e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="zh-CN">中文（简体）</option>
            <option value="zh-TW">中文（繁体）</option>
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
          </select>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            语音敏感度: {localConfig.voice?.sensitivity || 0.5}
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={localConfig.voice?.sensitivity || 0.5}
            onChange={(e) => handleConfigUpdate('voice.sensitivity', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">语音合成</label>
            <p className="text-xs text-gray-500 dark:text-gray-400">启用文本转语音功能</p>
          </div>
          <input
            type="checkbox"
            checked={localConfig.voice?.ttsEnabled || false}
            onChange={(e) => handleConfigUpdate('voice.ttsEnabled', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderAISettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">AI设置</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">AI服务提供商</label>
          <select
            value={localConfig.ai?.provider || 'openai'}
            onChange={(e) => handleConfigUpdate('ai.provider', e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="local">本地模型</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">API密钥</label>
          <input
            type="password"
            value={localConfig.ai?.apiKey || ''}
            onChange={(e) => handleConfigUpdate('ai.apiKey', e.target.value)}
            placeholder="输入您的API密钥"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">模型</label>
          <input
            type="text"
            value={localConfig.ai?.model || ''}
            onChange={(e) => handleConfigUpdate('ai.model', e.target.value)}
            placeholder="例如: gpt-4, claude-3-sonnet"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            温度设置: {localConfig.ai?.temperature || 0.7}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={localConfig.ai?.temperature || 0.7}
            onChange={(e) => handleConfigUpdate('ai.temperature', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>保守</span>
            <span>创造性</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMedicalSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">医疗系统集成</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">API端点</label>
          <input
            type="url"
            value={localConfig.medical?.apiEndpoint || ''}
            onChange={(e) => handleConfigUpdate('medical.apiEndpoint', e.target.value)}
            placeholder="https://api.medical-system.com"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">API密钥</label>
          <input
            type="password"
            value={localConfig.medical?.apiKey || ''}
            onChange={(e) => handleConfigUpdate('medical.apiKey', e.target.value)}
            placeholder="输入医疗系统API密钥"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用缓存</label>
            <p className="text-xs text-gray-500 dark:text-gray-400">缓存医疗数据以提高性能</p>
          </div>
          <input
            type="checkbox"
            checked={localConfig.medical?.enableCache || false}
            onChange={(e) => handleConfigUpdate('medical.enableCache', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">隐私设置</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">本地数据处理</label>
            <p className="text-xs text-gray-500 dark:text-gray-400">优先使用本地处理，减少数据传输</p>
          </div>
          <input
            type="checkbox"
            checked={localConfig.privacy?.localProcessing || false}
            onChange={(e) => handleConfigUpdate('privacy.localProcessing', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">数据加密</label>
            <p className="text-xs text-gray-500 dark:text-gray-400">加密存储的敏感数据</p>
          </div>
          <input
            type="checkbox"
            checked={localConfig.privacy?.encryptData || false}
            onChange={(e) => handleConfigUpdate('privacy.encryptData', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            数据保留期限（天）
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={localConfig.privacy?.dataRetentionDays || 30}
            onChange={(e) => handleConfigUpdate('privacy.dataRetentionDays', parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">高级设置</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">开发者模式</label>
            <p className="text-xs text-gray-500 dark:text-gray-400">启用调试功能和详细日志</p>
          </div>
          <input
            type="checkbox"
            checked={localConfig.app?.developerMode || false}
            onChange={(e) => handleConfigUpdate('app.developerMode', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">日志级别</label>
          <select
            value={localConfig.app?.logLevel || 'info'}
            onChange={(e) => handleConfigUpdate('app.logLevel', e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="debug">调试</option>
            <option value="info">信息</option>
            <option value="warn">警告</option>
            <option value="error">错误</option>
          </select>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">配置管理</h4>
          <div className="flex space-x-3">
            <button
              onClick={onExportConfig}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              导出配置
            </button>
            
            <label className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors cursor-pointer">
              导入配置
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
            
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              重置配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings();
      case 'shortcuts': return renderShortcutSettings();
      case 'voice': return renderVoiceSettings();
      case 'ai': return renderAISettings();
      case 'medical': return renderMedicalSettings();
      case 'privacy': return renderPrivacySettings();
      case 'advanced': return renderAdvancedSettings();
      default: return renderGeneralSettings();
    }
  };

  return (
    <div className="flex h-full">
      {/* 侧边栏 */}
      <div className="w-48 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">设置</h2>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-sm font-medium">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6 overflow-y-auto">
          {renderTabContent()}
        </div>
        
        {/* 底部操作栏 */}
        {hasChanges && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                您有未保存的更改
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setLocalConfig(config);
                    setHasChanges(false);
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  保存更改
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;