import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Check, AlertTriangle } from 'lucide-react';
import { useConfigStore } from '../stores/configStore';
import { ThemeSettings } from '../components/ThemeSettings';
import { toast } from 'sonner';
import type { AppConfig } from '../../shared/types';

interface SettingsWindowProps {
  // Props can be passed from main process
}

type SettingsTab = 'general' | 'voice' | 'shortcuts' | 'ui' | 'theme' | 'privacy' | 'medical' | 'ai' | 'desktop';

const SettingsWindow: React.FC<SettingsWindowProps> = () => {
  const { config, updateConfig, resetConfig } = useConfigStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Settings tabs
  const settingsTabs = [
    { id: 'general' as const, label: '常规设置', icon: '⚙️' },
    { id: 'voice' as const, label: '语音设置', icon: '🎤' },
    { id: 'shortcuts' as const, label: '快捷键', icon: '⌨️' },
    { id: 'ui' as const, label: '界面设置', icon: '🎨' },
    { id: 'theme' as const, label: '主题设置', icon: '🌈' },
    { id: 'privacy' as const, label: '隐私设置', icon: '🔒' },
    { id: 'medical' as const, label: '医疗集成', icon: '🏥' },
    { id: 'ai' as const, label: 'AI设置', icon: '🤖' },
    { id: 'desktop' as const, label: '桌面识别', icon: '🖥️' },
  ];

  // Initialize settings window
  useEffect(() => {
    const initializeWindow = async () => {
      try {
        // Notify main process that settings window is ready
        if (window.electronAPI?.windowReady) {
          await window.electronAPI.windowReady('settings');
        }

        // Set up keyboard shortcuts
        document.addEventListener('keydown', handleKeyDown);

        return () => {
          document.removeEventListener('keydown', handleKeyDown);
        };
      } catch (error) {
        console.error('Failed to initialize settings window:', error);
      }
    };

    initializeWindow();
  }, []);

  // Sync local config with store
  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeWindow();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveSettings();
    }
  };

  // Update local config
  const updateLocalConfig = (updates: Partial<AppConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  // Save settings
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await updateConfig(localConfig);
      setHasChanges(false);
      toast.success('设置已保存');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('保存设置失败');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset settings
  const handleResetSettings = async () => {
    if (confirm('确定要重置所有设置吗？此操作不可撤销。')) {
      try {
        await resetConfig();
        toast.success('设置已重置');
      } catch (error) {
        console.error('Failed to reset settings:', error);
        toast.error('重置设置失败');
      }
    }
  };

  // Close settings window
  const closeWindow = async () => {
    if (hasChanges) {
      const shouldSave = confirm('有未保存的更改，是否保存后关闭？');
      if (shouldSave) {
        await saveSettings();
      }
    }

    try {
      if (window.electronAPI?.closeWindow) {
        await window.electronAPI.closeWindow('settings');
      }
    } catch (error) {
      console.error('Failed to close settings window:', error);
    }
  };

  // Render settings content based on active tab
  const renderSettingsContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">开机启动</label>
              <input
                type="checkbox"
                checked={localConfig.general?.startOnBoot || false}
                onChange={(e) => updateLocalConfig({
                  general: { ...localConfig.general, startOnBoot: e.target.checked }
                })}
                className="rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">系统启动时自动运行</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">最小化到托盘</label>
              <input
                type="checkbox"
                checked={localConfig.general?.minimizeToTray || false}
                onChange={(e) => updateLocalConfig({
                  general: { ...localConfig.general, minimizeToTray: e.target.checked }
                })}
                className="rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">关闭窗口时最小化到系统托盘</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">显示通知</label>
              <input
                type="checkbox"
                checked={localConfig.general?.showNotifications || false}
                onChange={(e) => updateLocalConfig({
                  general: { ...localConfig.general, showNotifications: e.target.checked }
                })}
                className="rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">显示系统通知</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">语言</label>
              <select
                value={localConfig.general?.language || 'zh-CN'}
                onChange={(e) => updateLocalConfig({
                  general: { ...localConfig.general, language: e.target.value }
                })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">自动更新</label>
              <input
                type="checkbox"
                checked={localConfig.general?.autoUpdate || false}
                onChange={(e) => updateLocalConfig({
                  general: { ...localConfig.general, autoUpdate: e.target.checked }
                })}
                className="rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">自动检查并安装更新</span>
            </div>
          </div>
        );

      case 'voice':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">启用语音功能</label>
              <input
                type="checkbox"
                checked={localConfig.voice?.enabled || false}
                onChange={(e) => updateLocalConfig({
                  voice: { ...localConfig.voice, enabled: e.target.checked }
                })}
                className="rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">启用语音识别和语音合成</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">语音语言</label>
              <select
                value={localConfig.voice?.language || 'zh-CN'}
                onChange={(e) => updateLocalConfig({
                  voice: { ...localConfig.voice, language: e.target.value }
                })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="zh-CN">中文（简体）</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">语音激活快捷键</label>
              <input
                type="text"
                value={localConfig.voice?.hotkey || ''}
                onChange={(e) => updateLocalConfig({
                  voice: { ...localConfig.voice, hotkey: e.target.value }
                })}
                placeholder="CommandOrControl+Shift+V"
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">语音敏感度</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={localConfig.voice?.sensitivity || 0.7}
                onChange={(e) => updateLocalConfig({
                  voice: { ...localConfig.voice, sensitivity: parseFloat(e.target.value) }
                })}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground mt-1">
                当前值: {localConfig.voice?.sensitivity || 0.7}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">唤醒词</label>
              <input
                type="text"
                value={localConfig.voice?.wakeWord || ''}
                onChange={(e) => updateLocalConfig({
                  voice: { ...localConfig.voice, wakeWord: e.target.value }
                })}
                placeholder="小助手"
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              />
            </div>
          </div>
        );

      case 'ui':
        return (
          <div className="space-y-6">

            <div>
              <label className="block text-sm font-medium mb-2">字体大小</label>
              <select
                value={localConfig.ui?.fontSize || 'medium'}
                onChange={(e) => updateLocalConfig({
                  ui: { ...localConfig.ui, fontSize: e.target.value as any }
                })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">界面密度</label>
              <select
                value={localConfig.ui?.density || 'comfortable'}
                onChange={(e) => updateLocalConfig({
                  ui: { ...localConfig.ui, density: e.target.value as any }
                })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="compact">紧凑</option>
                <option value="comfortable">舒适</option>
                <option value="spacious">宽松</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">启用动画</label>
              <input
                type="checkbox"
                checked={localConfig.ui?.animations || false}
                onChange={(e) => updateLocalConfig({
                  ui: { ...localConfig.ui, animations: e.target.checked }
                })}
                className="rounded"
              />
              <span className="ml-2 text-sm text-muted-foreground">启用界面动画效果</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">窗口透明度</label>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={localConfig.ui?.transparency || 0.95}
                onChange={(e) => updateLocalConfig({
                  ui: { ...localConfig.ui, transparency: parseFloat(e.target.value) }
                })}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground mt-1">
                当前值: {Math.round((localConfig.ui?.transparency || 0.95) * 100)}%
              </div>
            </div>
          </div>
        );

      case 'theme':
        return <ThemeSettings />;

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">此设置页面正在开发中</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 glass">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">设置</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">配置AI助手的各项功能</p>
        </div>

        <div className="flex items-center space-x-2">
          {hasChanges && (
            <div className="flex items-center space-x-2 text-sm text-yellow-600 dark:text-yellow-500">
              <AlertTriangle className="h-4 w-4" />
              <span>有未保存的更改</span>
            </div>
          )}

          <button
            onClick={closeWindow}
            className="p-2 rounded-lg hover:glass transition-all"
            title="关闭 (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200/50 dark:border-gray-700/50 glass p-4">
          <nav className="space-y-2">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500/20 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 backdrop-blur-sm border border-blue-400/50 dark:border-blue-500/50'
                    : 'text-gray-700 dark:text-gray-300 hover:glass dark:hover:glass-dark'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl glass p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
                {settingsTabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              {renderSettingsContent()}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200/50 dark:border-gray-700/50 glass p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleResetSettings}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>重置所有设置</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setLocalConfig(config);
                    setHasChanges(false);
                  }}
                  disabled={!hasChanges}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                
                <button
                  onClick={saveSettings}
                  disabled={!hasChanges || isSaving}
                  className="flex items-center space-x-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isSaving ? '保存中...' : '保存设置'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsWindow;