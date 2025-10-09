import React, { useState } from 'react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
}

interface QuickActionsProps {
  onCaptureScreen?: () => void;
  onStartVoice?: () => void;
  onSearchMedical?: () => void;
  onOpenSettings?: () => void;
  onToggleFloating?: () => void;
  onRefreshSuggestions?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onCaptureScreen,
  onStartVoice,
  onSearchMedical,
  onOpenSettings,
  onToggleFloating,
  onRefreshSuggestions,
}) => {
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  const handleActionClick = async (actionId: string, action: () => void) => {
    if (executingAction) return;
    
    setExecutingAction(actionId);
    try {
      await action();
    } catch (error) {
      console.error('执行快速操作失败:', error);
    } finally {
      setExecutingAction(null);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'capture-screen',
      title: '截取屏幕',
      description: '捕获当前屏幕内容进行分析',
      shortcut: '⌘⇧S',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      ),
      action: () => onCaptureScreen?.(),
      disabled: !onCaptureScreen,
    },
    {
      id: 'start-voice',
      title: '语音输入',
      description: '开始语音识别和命令处理',
      shortcut: '⌘⇧A',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
        </svg>
      ),
      action: () => onStartVoice?.(),
      disabled: !onStartVoice,
    },
    {
      id: 'search-medical',
      title: '医疗搜索',
      description: '搜索医疗系统数据',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: () => onSearchMedical?.(),
      disabled: !onSearchMedical,
    },
    {
      id: 'toggle-floating',
      title: '浮动模式',
      description: '切换到浮动窗口模式',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      ),
      action: () => onToggleFloating?.(),
      disabled: !onToggleFloating,
    },
    {
      id: 'refresh-suggestions',
      title: '刷新建议',
      description: '重新分析当前内容并生成建议',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
      ),
      action: () => onRefreshSuggestions?.(),
      disabled: !onRefreshSuggestions,
    },
    {
      id: 'open-settings',
      title: '设置',
      description: '打开应用程序设置',
      shortcut: '⌘,',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      action: () => onOpenSettings?.(),
      disabled: !onOpenSettings,
    },
  ];

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">快速操作</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">使用快捷键快速执行</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {quickActions.map((action) => {
          const isExecuting = executingAction === action.id;
          const isDisabled = action.disabled || isExecuting;
          
          return (
            <button
              key={action.id}
              onClick={() => handleActionClick(action.id, action.action)}
              disabled={isDisabled}
              className={`group relative p-3 rounded-lg border transition-all duration-200 ${
                isDisabled
                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400'
              }`}
              title={`${action.title}${action.shortcut ? ` (${action.shortcut})` : ''}`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className={`w-6 h-6 transition-transform duration-200 ${
                  isExecuting ? 'animate-pulse' : 'group-hover:scale-110'
                }`}>
                  {isExecuting ? (
                    <svg className="w-6 h-6 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    action.icon
                  )}
                </div>
                
                <div className="text-center">
                  <div className="text-xs font-medium leading-tight">
                    {action.title}
                  </div>
                  {action.shortcut && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {action.shortcut}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 悬停提示 */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {action.description}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            </button>
          );
        })}
      </div>
      
      {/* 快捷键提示 */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          <span>⌘ = Cmd</span>
          <span>⇧ = Shift</span>
          <span>⌥ = Option</span>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;