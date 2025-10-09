/**
 * 智能体 iframe 模式组件
 * 通过 iframe 嵌入 Bisheng 原生界面
 */

import React, { useState, useEffect } from 'react';
import { ExternalLink, Maximize2, Minimize2, X, AlertCircle } from 'lucide-react';
import type { BishengWorkflow } from '../../src/shared/types';

interface AgentIframeProps {
  workflow: BishengWorkflow;
  onClose?: () => void;
}

const AgentIframe: React.FC<AgentIframeProps> = ({ workflow, onClose }) => {
  const [iframeUrl, setIframeUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proxyStatus, setProxyStatus] = useState<{ running: boolean; port: number }>({
    running: false,
    port: 0,
  });

  // 获取代理状态和构建 URL
  useEffect(() => {
    const initIframe = async () => {
      try {
        const status = await window.electronAPI.bisheng.getProxyStatus();
        setProxyStatus(status);

        if (!status.running) {
          setError('iframe 代理服务未运行，请检查配置');
          return;
        }

        // 构建 iframe URL (通过代理访问 Bisheng 前端)
        const url = `http://localhost:${status.port}/build/workflow/${workflow.id}`;
        setIframeUrl(url);
      } catch (err: any) {
        console.error('Failed to get proxy status:', err);
        setError(err?.message || '获取代理状态失败');
      }
    };

    initIframe();
  }, [workflow.id]);

  // 处理 iframe 加载
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('加载 iframe 失败，请检查代理服务');
  };

  // 在新窗口打开
  const openInBrowser = () => {
    window.open(iframeUrl, '_blank');
  };

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            无法加载智能体界面
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              请确保:
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-500 text-left list-disc list-inside">
              <li>Bisheng 服务正在运行</li>
              <li>iframe 代理模式已启用</li>
              <li>代理端口配置正确 (默认: 3002)</li>
            </ul>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              关闭
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* 工具栏 */}
      <div className="px-4 py-2 border-b border-gray-200/50 dark:border-gray-700/50 glass flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {workflow.name}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (iframe 模式)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={openInBrowser}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:glass rounded-md transition-all"
            title="在浏览器中打开"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:glass rounded-md transition-all"
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:glass rounded-md transition-all"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* iframe 容器 */}
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400">加载中...</p>
            </div>
          </div>
        )}

        {iframeUrl && (
          <iframe
            src={iframeUrl}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            allow="clipboard-read; clipboard-write"
            title={`Bisheng - ${workflow.name}`}
          />
        )}
      </div>
    </div>
  );
};

export default AgentIframe;

