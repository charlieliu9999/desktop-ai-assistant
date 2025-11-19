import React, { useState, useEffect } from 'react';
import { Settings, MessageSquare, Monitor, Activity, Bot, X, Minus, Square } from 'lucide-react';
import Chat from './Chat';
import DesktopRecognition from './DesktopRecognition';
import MedicalSystem from './MedicalSystem';
import SettingsPanel from './SettingsPanel';
import AgentService from '../pages/AgentService';
import { useConfigStore } from '../stores/configStore';
import { useThemeStore } from '../stores/themeStore';

type TabType = 'chat' | 'desktop' | 'medical' | 'agent' | 'settings';

interface MainWindowProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

const MainWindow: React.FC<MainWindowProps> = ({ onClose, onMinimize, onMaximize }) => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isMaximized, setIsMaximized] = useState(false);
  const { config } = useConfigStore();
  const { mode: themeMode } = useThemeStore();

  // Handle window controls
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow();
    }
  };

  const handleMinimize = () => {
    if (onMinimize) {
      onMinimize();
    } else if (window.electronAPI?.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (onMaximize) {
      onMaximize();
    } else if (window.electronAPI?.maximizeWindow) {
      window.electronAPI.maximizeWindow();
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + W to close
      if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
        event.preventDefault();
        handleClose();
      }
      
      // Ctrl/Cmd + M to minimize
      if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
        event.preventDefault();
        handleMinimize();
      }
      
      // Tab switching shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '5') {
        event.preventDefault();
        const tabIndex = parseInt(event.key) - 1;
        const tabs: TabType[] = ['chat', 'desktop', 'medical', 'agent', 'settings'];
        setActiveTab(tabs[tabIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const tabs = [
    {
      id: 'chat' as TabType,
      name: 'AI对话',
      icon: MessageSquare,
      enabled: true
    },
    {
      id: 'desktop' as TabType,
      name: '桌面识别',
      icon: Monitor,
      enabled: config.desktopRecognition.enabled
    },
    {
      id: 'medical' as TabType,
      name: '医疗系统',
      icon: Activity,
      enabled: config.medical.enabled
    },
    {
      id: 'agent' as TabType,
      name: '智能体',
      icon: Bot,
      enabled: config.bisheng?.enabled || false
    },
    {
      id: 'settings' as TabType,
      name: '设置',
      icon: Settings,
      enabled: true
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <Chat />;
      case 'desktop':
        return <DesktopRecognition />;
      case 'medical':
        return <MedicalSystem />;
      case 'agent':
        return <AgentService />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <Chat />;
    }
  };

  const isGlass = themeMode === 'glass' || config.theme === 'glass' || config.windows?.main?.glassEffect?.enabled;

  return (
    <div className={`flex flex-col h-screen ${isGlass ? 'bg-transparent' : 'bg-gray-50 dark:bg-gray-900'}`}>
      {/* Custom title bar with glass effect */}
      <div
        className="glass flex items-center justify-between px-4 py-2 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* App title */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">🤖 AI助手</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">不打扰、隐身、谁叫谁出</span>
        </div>

        {/* 移除重复的设置图标，只保留标签栏中的设置 */}
      </div>

      {/* Tab navigation with glass effect */}
      <div
        className="glass flex border-b border-gray-200/50 dark:border-gray-700/50"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDisabled = !tab.enabled;

          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => tab.enabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              className={`
                flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all
                ${isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                  : isDisabled
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/30'
                }
              `}
              title={isDisabled ? `${tab.name} (未启用)` : `${tab.name} (Cmd+${tabs.indexOf(tab) + 1})`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
              {isDisabled && (
                <span className="text-xs text-gray-400 dark:text-gray-600">(未启用)</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className={`flex-1 overflow-hidden glass-scrollbar ${isGlass ? 'glass' : ''}`}>
        {renderContent()}
      </div>

      {/* Status bar with glass effect */}
      <div className="glass flex items-center justify-between px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>就绪</span>
          </span>
          {config.voice.enabled && (
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>语音</span>
            </span>
          )}
          {config.desktopRecognition.enabled && (
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>桌面识别</span>
            </span>
          )}
          {config.medical.enabled && (
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>医疗系统</span>
            </span>
          )}
          {config.bisheng?.enabled && (
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>智能体</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
};

export default MainWindow;
