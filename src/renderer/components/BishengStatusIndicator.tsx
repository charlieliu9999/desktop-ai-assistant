import React, { useEffect, useState } from 'react';

interface BishengStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'error';

interface StatusInfo {
  status: ConnectionStatus;
  message: string;
  authenticated: boolean;
  proxyRunning: boolean;
  lastChecked?: Date;
}

export const BishengStatusIndicator: React.FC<BishengStatusIndicatorProps> = ({
  className = '',
  showLabel = true,
  autoRefresh = true,
  refreshInterval = 30000, // 30秒
}) => {
  const [statusInfo, setStatusInfo] = useState<StatusInfo>({
    status: 'checking',
    message: '检查中...',
    authenticated: false,
    proxyRunning: false,
  });

  const checkStatus = async () => {
    try {
      setStatusInfo(prev => ({ ...prev, status: 'checking' }));

      // 获取配置
      const config = await window.electronAPI.bisheng.getConfig();
      
      if (!config || !config.enabled) {
        setStatusInfo({
          status: 'disconnected',
          message: 'Bisheng 服务未启用',
          authenticated: false,
          proxyRunning: false,
          lastChecked: new Date(),
        });
        return;
      }

      // 检查认证状态
      const authenticated = await window.electronAPI.bisheng.isAuthenticated();
      
      // 检查代理状态
      const proxyStatus = await window.electronAPI.bisheng.getProxyStatus();

      // 尝试获取工作流列表来验证连接
      try {
        await window.electronAPI.bisheng.getWorkflows(1, 1);
        
        setStatusInfo({
          status: 'connected',
          message: authenticated ? '已连接并认证' : '已连接但未认证',
          authenticated,
          proxyRunning: proxyStatus.running,
          lastChecked: new Date(),
        });
      } catch (error) {
        setStatusInfo({
          status: 'error',
          message: '连接失败',
          authenticated: false,
          proxyRunning: proxyStatus.running,
          lastChecked: new Date(),
        });
      }
    } catch (error) {
      console.error('检查 Bisheng 状态失败:', error);
      setStatusInfo({
        status: 'error',
        message: '状态检查失败',
        authenticated: false,
        proxyRunning: false,
        lastChecked: new Date(),
      });
    }
  };

  useEffect(() => {
    // 初始检查
    checkStatus();

    // 自动刷新
    if (autoRefresh) {
      const interval = setInterval(checkStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = () => {
    switch (statusInfo.status) {
      case 'connected':
        return statusInfo.authenticated ? 'bg-green-500' : 'bg-yellow-500';
      case 'disconnected':
        return 'bg-gray-400';
      case 'checking':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (statusInfo.status) {
      case 'connected':
        return statusInfo.authenticated ? '✓' : '⚠';
      case 'disconnected':
        return '○';
      case 'checking':
        return '⟳';
      case 'error':
        return '✗';
      default:
        return '?';
    }
  };

  const getTooltip = () => {
    const parts = [
      `状态: ${statusInfo.message}`,
      `认证: ${statusInfo.authenticated ? '是' : '否'}`,
      `代理: ${statusInfo.proxyRunning ? '运行中' : '未运行'}`,
    ];
    
    if (statusInfo.lastChecked) {
      parts.push(`最后检查: ${statusInfo.lastChecked.toLocaleTimeString()}`);
    }
    
    return parts.join('\n');
  };

  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
      title={getTooltip()}
    >
      {/* 状态指示灯 */}
      <div className="relative">
        <div 
          className={`w-3 h-3 rounded-full ${getStatusColor()} transition-colors duration-300`}
        >
          {statusInfo.status === 'checking' && (
            <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75"></div>
          )}
        </div>
      </div>

      {/* 状态文本 */}
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Bisheng {getStatusIcon()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {statusInfo.message}
          </span>
        </div>
      )}

      {/* 刷新按钮 */}
      <button
        onClick={checkStatus}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        title="刷新状态"
      >
        <svg 
          className="w-4 h-4 text-gray-600 dark:text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
      </button>
    </div>
  );
};

// 简化版本 - 只显示指示灯
export const BishengStatusDot: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <BishengStatusIndicator className={className} showLabel={false} />;
};

// 详细版本 - 显示完整信息
export const BishengStatusPanel: React.FC = () => {
  const [statusInfo, setStatusInfo] = useState<StatusInfo>({
    status: 'checking',
    message: '检查中...',
    authenticated: false,
    proxyRunning: false,
  });

  const [config, setConfig] = useState<any>(null);

  const checkStatus = async () => {
    try {
      const cfg = await window.electronAPI.bisheng.getConfig();
      setConfig(cfg);

      if (!cfg || !cfg.enabled) {
        setStatusInfo({
          status: 'disconnected',
          message: 'Bisheng 服务未启用',
          authenticated: false,
          proxyRunning: false,
          lastChecked: new Date(),
        });
        return;
      }

      const authenticated = await window.electronAPI.bisheng.isAuthenticated();
      const proxyStatus = await window.electronAPI.bisheng.getProxyStatus();

      try {
        await window.electronAPI.bisheng.getWorkflows(1, 1);
        setStatusInfo({
          status: 'connected',
          message: '服务正常',
          authenticated,
          proxyRunning: proxyStatus.running,
          lastChecked: new Date(),
        });
      } catch (error) {
        setStatusInfo({
          status: 'error',
          message: '连接失败',
          authenticated: false,
          proxyRunning: proxyStatus.running,
          lastChecked: new Date(),
        });
      }
    } catch (error) {
      console.error('检查状态失败:', error);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Bisheng 服务状态
      </h3>

      <div className="space-y-3">
        {/* 连接状态 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">连接状态</span>
          <BishengStatusIndicator showLabel={false} autoRefresh={false} />
        </div>

        {/* 认证状态 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">认证状态</span>
          <span className={`text-sm font-medium ${statusInfo.authenticated ? 'text-green-600' : 'text-gray-500'}`}>
            {statusInfo.authenticated ? '已认证 ✓' : '未认证'}
          </span>
        </div>

        {/* 代理状态 */}
        {config?.mode === 'iframe' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">代理服务</span>
            <span className={`text-sm font-medium ${statusInfo.proxyRunning ? 'text-green-600' : 'text-gray-500'}`}>
              {statusInfo.proxyRunning ? '运行中 ✓' : '未运行'}
            </span>
          </div>
        )}

        {/* 服务地址 */}
        {config && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">服务地址</span>
            <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
              {config.baseUrl}
            </span>
          </div>
        )}

        {/* 最后检查时间 */}
        {statusInfo.lastChecked && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">最后检查</span>
            <span className="text-sm text-gray-500">
              {statusInfo.lastChecked.toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* 刷新按钮 */}
        <button
          onClick={checkStatus}
          className="w-full mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
        >
          刷新状态
        </button>
      </div>
    </div>
  );
};

