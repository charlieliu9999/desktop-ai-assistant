/**
 * 浮动窗口组件
 * 显示简洁的AI助手界面，用于快速交互
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppStatus } from '../../shared/types';

interface FloatingWindowProps {
  status: AppStatus;
}

interface FloatingWindowState {
  isExpanded: boolean;
  inputValue: string;
  isProcessing: boolean;
  suggestions: string[];
  recentActions: Array<{
    id: string;
    title: string;
    description: string;
    timestamp: number;
  }>;
}

const FloatingWindow: React.FC<FloatingWindowProps> = ({ status }) => {
  const [state, setState] = useState<FloatingWindowState>({
    isExpanded: false,
    inputValue: '',
    isProcessing: false,
    suggestions: [
      '分析当前屏幕内容',
      '查询医疗数据',
      '生成报告摘要',
      '设置提醒'
    ],
    recentActions: [
      {
        id: '1',
        title: '屏幕内容分析',
        description: '分析了当前显示的医疗报告',
        timestamp: Date.now() - 300000
      },
      {
        id: '2',
        title: '数据查询',
        description: '查询了患者基本信息',
        timestamp: Date.now() - 600000
      }
    ]
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // 切换展开状态
  const toggleExpanded = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: !prev.isExpanded }));
    
    // 展开时聚焦输入框
    if (!state.isExpanded) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [state.isExpanded]);

  // 处理快速操作
  const handleQuickAction = useCallback(async (action: string) => {
    setState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      if (window.electronAPI) {
        let result;
        
        switch (action) {
          case '分析当前屏幕内容':
            result = await (window as any).electronAPI?.screen?.captureAndAnalyze?.();
            break;
          case '查询医疗数据':
            result = await (window as any).electronAPI?.medical?.quickSearch?.('');
            break;
          case '生成报告摘要':
            result = await (window as any).electronAPI?.ai?.generateSummary?.();
            break;
          case '设置提醒':
            result = await (window as any).electronAPI?.app?.createReminder?.();
            break;
          default:
            result = { success: false, message: '未知操作' };
        }
        
        if (result.success) {
          // 添加到最近操作
          const newAction = {
            id: `action-${Date.now()}`,
            title: action,
            description: result.message || '操作完成',
            timestamp: Date.now()
          };
          
          setState(prev => ({
            ...prev,
            recentActions: [newAction, ...prev.recentActions.slice(0, 4)],
            isProcessing: false
          }));
        }
      }
    } catch (error) {
      console.error('Quick action failed:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, []);

  // 处理输入提交
  const handleSubmit = useCallback(async () => {
    if (!state.inputValue.trim() || state.isProcessing) return;

    const query = state.inputValue.trim();
    setState(prev => ({ ...prev, inputValue: '', isProcessing: true }));

    try {
      if (window.electronAPI) {
      const response = await (window as any).electronAPI?.ai?.processMessage?.(query);
        
        // 添加到最近操作
        const newAction = {
          id: `query-${Date.now()}`,
          title: '自定义查询',
          description: query,
          timestamp: Date.now()
        };
        
        setState(prev => ({
          ...prev,
          recentActions: [newAction, ...prev.recentActions.slice(0, 4)],
          isProcessing: false
        }));
        
        // 如果有结果，显示通知
        const text = typeof response === 'string' ? response : (response?.content || '');
        if (text) {
          (window as any).electronAPI?.app?.showNotification?.({
            title: 'AI助手',
            body: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            silent: false
          });
        }
      }
    } catch (error) {
      console.error('Failed to process query:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [state.inputValue, state.isProcessing]);

  // 处理键盘事件
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === 'Escape') {
      setState(prev => ({ ...prev, isExpanded: false }));
    }
  }, [handleSubmit]);

  // 关闭窗口
  const handleClose = useCallback(async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.window.hide();
      }
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  }, []);

  // 打开主窗口
  const openMainWindow = useCallback(async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.window.showMain();
      }
    } catch (error) {
      console.error('Failed to open main window:', error);
    }
  }, []);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (windowRef.current && !windowRef.current.contains(event.target as Node)) {
        setState(prev => ({ ...prev, isExpanded: false }));
      }
    };

    if (state.isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [state.isExpanded]);

  return (
    <div ref={windowRef} className={`floating-window ${state.isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* 折叠状态 */}
      {!state.isExpanded && (
        <div className="floating-collapsed" onClick={toggleExpanded}>
          <div className="floating-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div className={`status-indicator status-${status}`}></div>
        </div>
      )}

      {/* 展开状态 */}
      {state.isExpanded && (
        <div className="floating-expanded">
          {/* 头部 */}
          <div className="floating-header">
            <div className="floating-title">
              <span>AI助手</span>
              <div className={`status-dot status-${status}`}></div>
            </div>
            <div className="floating-controls">
              <button 
                className="control-btn" 
                onClick={openMainWindow}
                title="打开主窗口"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </button>
              <button 
                className="control-btn" 
                onClick={toggleExpanded}
                title="折叠"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
              <button 
                className="control-btn" 
                onClick={handleClose}
                title="关闭"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* 输入区域 */}
          <div className="floating-input">
            <input
              ref={inputRef}
              type="text"
              value={state.inputValue}
              onChange={(e) => setState(prev => ({ ...prev, inputValue: e.target.value }))}
              onKeyPress={handleKeyPress}
              placeholder="输入指令或问题..."
              disabled={state.isProcessing}
            />
            <button 
              className="submit-btn"
              onClick={handleSubmit}
              disabled={!state.inputValue.trim() || state.isProcessing}
            >
              {state.isProcessing ? (
                <div className="spinner"></div>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>

          {/* 快速操作 */}
          <div className="floating-suggestions">
            <div className="suggestions-title">快速操作</div>
            <div className="suggestions-list">
              {state.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-btn"
                  onClick={() => handleQuickAction(suggestion)}
                  disabled={state.isProcessing}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* 最近操作 */}
          {state.recentActions.length > 0 && (
            <div className="floating-recent">
              <div className="recent-title">最近操作</div>
              <div className="recent-list">
                {state.recentActions.slice(0, 3).map((action) => (
                  <div key={action.id} className="recent-item">
                    <div className="recent-content">
                      <div className="recent-item-title">{action.title}</div>
                      <div className="recent-item-desc">{action.description}</div>
                    </div>
                    <div className="recent-time">
                      {new Date(action.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FloatingWindow;
