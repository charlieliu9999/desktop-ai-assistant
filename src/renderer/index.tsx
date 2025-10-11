/**
 * 渲染进程入口文件
 * 负责初始化React应用并处理全局错误
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import FloatingWindowPage from './pages/FloatingWindow';
import VoiceWindow from './pages/VoiceWindow';
import './index.css';
import './App.css';
import './styles/glass-effect.css';
import './styles/chat-components.css';

// 为全局 window 增加 electronAPI 可选类型，避免在浏览器预览环境下的类型报错
declare global {
  interface Window {
    electronAPI?: any;
  }
}

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // 向主进程报告错误
    if (window.electronAPI) {
      window.electronAPI.app.reportError({
        message: error.message,
        stack: error.stack || '',
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      }).catch(console.error);
    }
    
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleRestart = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.app.restart();
      }
    } catch (error) {
      console.error('Failed to restart app:', error);
      this.handleReload();
    }
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="error-boundary__title">应用程序遇到错误</h1>
          <p className="error-boundary__message">
            很抱歉，应用程序遇到了一个意外错误。您可以尝试重新加载页面或重启应用程序。
          </p>
          
          {this.state.error && (
            <details className="error-boundary__details">
              <summary>错误详情</summary>
              <pre>
                {this.state.error.message}\n
                {this.state.error.stack}
                
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          
          <div className="error-boundary__actions">
            <button 
              className="btn btn-primary" 
              onClick={this.handleReload}
            >
              重新加载
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={this.handleRestart}
            >
              重启应用
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  if (window.electronAPI) {
    window.electronAPI.app.reportError({
      message: event.error?.message || event.message,
      stack: event.error?.stack || '',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    }).catch(console.error);
  }
});

// 未处理的Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  if (window.electronAPI) {
    window.electronAPI.app.reportError({
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack || '',
      type: 'unhandledrejection',
      timestamp: new Date().toISOString()
    }).catch(console.error);
  }
});

// 性能监控
if (typeof window.performance !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = window.performance.timing;
      const loadTime = perfData.loadEventEnd - perfData.navigationStart;
      
      console.log(`Page load time: ${loadTime}ms`);
      
      if (window.electronAPI && loadTime > 3000) {
        window.electronAPI.app.reportPerformance({
          type: 'slow_load',
          duration: loadTime,
          timestamp: new Date().toISOString()
        }).catch(console.error);
      }
    }, 0);
  });
}

// 页面可见性变化监听
document.addEventListener('visibilitychange', () => {
  try {
    const visible = !document.hidden;
    if (window.electronAPI?.app?.setVisibility) {
      window.electronAPI.app.setVisibility(visible).catch(console.error);
    } else if (window.electronAPI?.invoke) {
      // 兼容旧版 preload，直接走通道调用
      window.electronAPI.invoke('app:setVisibility', visible).catch(console.error);
    }
  } catch (err) {
    console.error('setVisibility failed:', err);
  }
});

// 开发模式下的快捷键（在非Electron浏览器预览时，process 可能不存在）
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  document.addEventListener('keydown', (event) => {
    // Ctrl/Cmd + Shift + I: 打开开发者工具
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'I') {
      event.preventDefault();
      if (window.electronAPI) {
        window.electronAPI.app.toggleDevTools().catch(console.error);
      }
    }
    
    // Ctrl/Cmd + R: 重新加载
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
      window.location.reload();
    }
    
    // F5: 重新加载
    if (event.key === 'F5') {
      event.preventDefault();
      window.location.reload();
    }
  });
}

// 初始化应用
function initializeApp() {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root container not found');
  }

  const root = createRoot(container);
  const modeParam = new URLSearchParams(window.location.search).get('mode') || 'main';
  const content = (() => {
    switch (modeParam) {
      case 'floating':
        // 在浏览器中模拟悬浮效果：固定在右下角，设置浮窗尺寸
        return (
          <div className="fixed bottom-4 right-4 w-[360px] h-[420px]">
            <FloatingWindowPage />
          </div>
        );
      case 'voice':
        return (
          <div className="fixed bottom-4 right-4 w-[420px] h-[520px]">
            <VoiceWindow />
          </div>
        );
      case 'main':
      default:
        return <App />;
    }
  })();
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        {content}
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// 等待DOM加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// 开发模式指示器（在非Electron浏览器预览时，process 可能不存在）
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  const devIndicator = document.createElement('div');
  devIndicator.className = 'dev-indicator';
  devIndicator.innerHTML = '<span>DEV</span>';
  document.body.appendChild(devIndicator);
}

// 导出类型定义（用于类型检查）
export type { ErrorBoundary };
