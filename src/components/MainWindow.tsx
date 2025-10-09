import React, { useState, useEffect } from 'react';
import { WindowState, AppStatus, Suggestion, Notification } from '../shared/types';
import { SuggestionPanel } from './SuggestionPanel';
import { NotificationCenter } from './NotificationCenter';
import { StatusBar } from './StatusBar';
import { QuickActions } from './QuickActions';

interface MainWindowProps {
  windowState: WindowState;
  appStatus: AppStatus;
  suggestions: Suggestion[];
  notifications: Notification[];
  onClose: () => void;
  onMinimize: () => void;
  onToggleAlwaysOnTop: () => void;
}

export const MainWindow: React.FC<MainWindowProps> = ({
  windowState,
  appStatus,
  suggestions,
  notifications,
  onClose,
  onMinimize,
  onToggleAlwaysOnTop,
}) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'history' | 'settings'>('suggestions');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // 监听键盘快捷键
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 'w':
            event.preventDefault();
            onClose();
            break;
          case 'm':
            event.preventDefault();
            onMinimize();
            break;
          case 't':
            event.preventDefault();
            onToggleAlwaysOnTop();
            break;
          case '1':
            event.preventDefault();
            setActiveTab('suggestions');
            break;
          case '2':
            event.preventDefault();
            setActiveTab('history');
            break;
          case '3':
            event.preventDefault();
            setActiveTab('settings');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onMinimize, onToggleAlwaysOnTop]);

  const handleTabChange = (tab: 'suggestions' | 'history' | 'settings') => {
    setActiveTab(tab);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="main-window h-full flex flex-col bg-white dark:bg-gray-900 shadow-2xl rounded-lg overflow-hidden">
      {/* 标题栏 */}
      <div className="title-bar flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <button
              onClick={onClose}
              className="w-3 h-3 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
              title="关闭 (⌘W)"
            />
            <button
              onClick={onMinimize}
              className="w-3 h-3 bg-yellow-500 hover:bg-yellow-600 rounded-full transition-colors"
              title="最小化 (⌘M)"
            />
            <button
              onClick={handleToggleCollapse}
              className="w-3 h-3 bg-green-500 hover:bg-green-600 rounded-full transition-colors"
              title="折叠/展开"
            />
          </div>
          <h1 className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">
            桌面AI助手
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <StatusBar status={appStatus} />
          <button
            onClick={onToggleAlwaysOnTop}
            className={`p-1 rounded transition-colors ${
              windowState.alwaysOnTop
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="置顶 (⌘T)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2L3 9h4v9h6V9h4l-7-7z" />
            </svg>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* 标签栏 */}
          <div className="tab-bar flex border-b border-gray-200 dark:border-gray-700">
            {[
              { key: 'suggestions', label: '智能建议', shortcut: '⌘1' },
              { key: 'history', label: '历史记录', shortcut: '⌘2' },
              { key: 'settings', label: '设置', shortcut: '⌘3' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key as any)}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title={`${tab.label} (${tab.shortcut})`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 主内容区域 */}
          <div className="content flex-1 overflow-hidden">
            {activeTab === 'suggestions' && (
              <div className="h-full flex flex-col">
                <SuggestionPanel suggestions={suggestions} />
                <QuickActions />
              </div>
            )}
            
            {activeTab === 'history' && (
              <div className="p-4 h-full overflow-y-auto">
                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm">历史记录功能即将推出</p>
                </div>
              </div>
            )}
            
            {activeTab === 'settings' && (
              <div className="p-4 h-full overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">基础设置</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 dark:text-gray-300">开机自启动</label>
                        <input type="checkbox" className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 dark:text-gray-300">语音激活</label>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 dark:text-gray-300">桌面识别</label>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">隐私设置</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 dark:text-gray-300">本地处理优先</label>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 dark:text-gray-300">数据加密</label>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 通知中心 */}
      <NotificationCenter notifications={notifications} />
    </div>
  );
};

export default MainWindow;