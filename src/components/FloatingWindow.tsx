import React, { useState, useEffect } from 'react';
import { StatusBar } from './StatusBar';
import { AppStatus } from '../shared/types';

interface FloatingWindowProps {
  status: AppStatus;
  isListening?: boolean;
  onVoiceToggle?: () => void;
  onScreenCapture?: () => void;
  onShowMain?: () => void;
  onClose?: () => void;
  suggestions?: Array<{
    id: string;
    title: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  status,
  isListening = false,
  onVoiceToggle,
  onScreenCapture,
  onShowMain,
  onClose,
  suggestions = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // 处理拖拽
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        
        // 通过 Electron API 移动窗口
        if (window.electronAPI?.window?.setPosition) {
          window.electronAPI.window.setPosition(x, y);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
  const hasImportantSuggestions = highPrioritySuggestions.length > 0;

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-16'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
    >
      {/* 拖拽手柄和主控制区 */}
      <div className="drag-handle p-3 flex items-center justify-between">
        {isExpanded ? (
          <>
            <div className="flex items-center space-x-2">
              <StatusBar status={status} size="sm" showText={false} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                AI助手
              </span>
              {hasImportantSuggestions && (
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="收起"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose?.();
                }}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                title="关闭"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors relative"
            title="展开AI助手"
          >
            <StatusBar status={status} size="sm" showText={false} />
            {hasImportantSuggestions && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        )}
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* 快速操作按钮 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onVoiceToggle}
              className={`p-2 rounded-lg border transition-all duration-200 ${
                isListening
                  ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-900/20 dark:text-red-400'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:bg-blue-900/20'
              }`}
              title={isListening ? '停止语音' : '开始语音'}
            >
              <div className="flex flex-col items-center space-y-1">
                <svg className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">{isListening ? '停止' : '语音'}</span>
              </div>
            </button>
            
            <button
              onClick={onScreenCapture}
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 transition-all duration-200"
              title="截取屏幕"
            >
              <div className="flex flex-col items-center space-y-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">截屏</span>
              </div>
            </button>
          </div>

          {/* 重要建议提示 */}
          {hasImportantSuggestions && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-700 dark:text-red-400">
                  {highPrioritySuggestions.length} 个重要建议
                </span>
              </div>
              
              <button
                onClick={onShowMain}
                className="mt-2 w-full text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 py-1 px-2 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
              >
                查看详情
              </button>
            </div>
          )}

          {/* 普通建议计数 */}
          {suggestions.length > 0 && !hasImportantSuggestions && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  {suggestions.length} 个建议
                </span>
                <button
                  onClick={onShowMain}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  查看
                </button>
              </div>
            </div>
          )}

          {/* 打开主窗口按钮 */}
          <button
            onClick={onShowMain}
            className="w-full p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            打开主界面
          </button>
        </div>
      )}
    </div>
  );
};

export default FloatingWindow;