import React from 'react';
import { AppStatus } from '../shared/types';

interface StatusBarProps {
  status: AppStatus;
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBar: React.FC<StatusBarProps> = ({
  status,
  className = '',
  showText = true,
  size = 'md',
}) => {
  const getStatusConfig = (status: AppStatus) => {
    switch (status) {
      case 'initializing':
        return {
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500',
          text: '初始化中',
          icon: (
            <svg className="animate-spin" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          ),
        };
      case 'ready':
        return {
          color: 'text-green-500',
          bgColor: 'bg-green-500',
          text: '就绪',
          icon: (
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
        };
      case 'busy':
        return {
          color: 'text-blue-500',
          bgColor: 'bg-blue-500',
          text: '处理中',
          icon: (
            <svg className="animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          ),
        };
      case 'error':
        return {
          color: 'text-red-500',
          bgColor: 'bg-red-500',
          text: '错误',
          icon: (
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
        };
      case 'shutdown':
        return {
          color: 'text-gray-500',
          bgColor: 'bg-gray-500',
          text: '已关闭',
          icon: (
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          ),
        };
      default:
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-400',
          text: '未知',
          icon: (
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          ),
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          container: 'text-xs',
          icon: 'w-3 h-3',
          dot: 'w-2 h-2',
          spacing: 'space-x-1',
        };
      case 'lg':
        return {
          container: 'text-base',
          icon: 'w-6 h-6',
          dot: 'w-3 h-3',
          spacing: 'space-x-3',
        };
      case 'md':
      default:
        return {
          container: 'text-sm',
          icon: 'w-4 h-4',
          dot: 'w-2.5 h-2.5',
          spacing: 'space-x-2',
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);

  return (
    <div className={`flex items-center ${sizeClasses.spacing} ${sizeClasses.container} ${className}`}>
      {/* 状态指示点 */}
      <div className="relative">
        <div className={`${sizeClasses.dot} ${statusConfig.bgColor} rounded-full`} />
        {(status === 'initializing' || status === 'busy') && (
          <div className={`absolute inset-0 ${sizeClasses.dot} ${statusConfig.bgColor} rounded-full animate-ping opacity-75`} />
        )}
      </div>
      
      {/* 状态图标 */}
      <div className={`${sizeClasses.icon} ${statusConfig.color}`}>
        {statusConfig.icon}
      </div>
      
      {/* 状态文本 */}
      {showText && (
        <span className={`font-medium ${statusConfig.color}`}>
          {statusConfig.text}
        </span>
      )}
    </div>
  );
};

export default StatusBar;