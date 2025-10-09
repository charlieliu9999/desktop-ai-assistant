import React, { useState, useEffect, useRef } from 'react';
import { VoiceServiceState } from '../shared/types';

interface VoiceInputWindowProps {
  isVisible: boolean;
  voiceState: VoiceServiceState;
  isListening?: boolean;
  transcript?: string;
  confidence?: number;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onClose?: () => void;
  onSubmit?: (text: string) => void;
}

export const VoiceInputWindow: React.FC<VoiceInputWindowProps> = ({
  isVisible,
  voiceState,
  isListening = false,
  transcript = '',
  confidence = 0,
  onStartListening,
  onStopListening,
  onClose,
  onSubmit,
}) => {
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // 模拟音频级别动画
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isListening) {
      interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
    } else {
      setAudioLevel(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening]);

  // 自动聚焦文本框
  useEffect(() => {
    if (showManualInput && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showManualInput]);

  // 处理键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSubmit();
      } else if (e.key === ' ' && !showManualInput) {
        e.preventDefault();
        if (isListening) {
          onStopListening?.();
        } else {
          onStartListening?.();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isListening, showManualInput]);

  const handleSubmit = () => {
    const text = showManualInput ? manualText : transcript;
    if (text.trim()) {
      onSubmit?.(text.trim());
      setManualText('');
      setShowManualInput(false);
    }
  };

  const getStateText = () => {
    switch (voiceState) {
      case 'initializing':
        return '正在初始化语音服务...';
      case 'ready':
        return isListening ? '正在聆听...' : '准备就绪，按空格键开始';
      case 'listening':
        return '正在聆听您的语音...';
      case 'processing':
        return '正在处理语音...';
      case 'error':
        return '语音服务出现错误';
      case 'disabled':
        return '语音服务已禁用';
      default:
        return '未知状态';
    }
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-96 max-w-[90vw]">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            语音输入
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* 主内容区 */}
        <div className="p-6 space-y-6">
          {/* 语音可视化 */}
          <div className="flex flex-col items-center space-y-4">
            {/* 麦克风图标和音频可视化 */}
            <div className="relative">
              <button
                onClick={isListening ? onStopListening : onStartListening}
                disabled={voiceState === 'initializing' || voiceState === 'error'}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                  {isListening ? (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v6a1 1 0 11-2 0V7zM12 9a1 1 0 012 0v2a1 1 0 11-2 0V9z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  )}
                </svg>
              </button>
              
              {/* 音频级别环 */}
              {isListening && (
                <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping" />
              )}
              
              {/* 音频级别指示器 */}
              {isListening && (
                <div className="absolute -inset-4 flex items-center justify-center">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`absolute w-1 bg-red-400 rounded-full transition-all duration-100`}
                      style={{
                        height: `${Math.max(4, (audioLevel / 100) * 20 + Math.random() * 10)}px`,
                        transform: `rotate(${i * 45}deg) translateY(-40px)`,
                        opacity: audioLevel > i * 12.5 ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 状态文本 */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getStateText()}
              </p>
              {confidence > 0 && (
                <p className={`text-xs mt-1 ${getConfidenceColor()}`}>
                  识别置信度: {Math.round(confidence * 100)}%
                </p>
              )}
            </div>
          </div>

          {/* 转录文本显示 */}
          {(transcript || showManualInput) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {showManualInput ? '手动输入' : '语音转录'}
                </label>
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  {showManualInput ? '切换到语音' : '手动输入'}
                </button>
              </div>
              
              {showManualInput ? (
                <textarea
                  ref={textareaRef}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="请输入您的指令..."
                  className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[6rem]">
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {transcript || '等待语音输入...'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between space-x-3">
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                取消
              </button>
            </div>
            
            <div className="flex space-x-2">
              {(transcript || manualText) && (
                <button
                  onClick={() => {
                    setManualText('');
                    // 清除转录文本的逻辑需要通过 API 实现
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  清除
                </button>
              )}
              
              <button
                onClick={handleSubmit}
                disabled={!(transcript || manualText.trim())}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                提交
              </button>
            </div>
          </div>

          {/* 快捷键提示 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
            <p>空格键: 开始/停止录音</p>
            <p>⌘+Enter: 提交 | Esc: 关闭</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceInputWindow;