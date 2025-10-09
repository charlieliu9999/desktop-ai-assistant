/**
 * 语音输入窗口组件
 * 提供语音识别和语音合成功能
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceServiceState } from '../../shared/types';

interface VoiceInputWindowProps {
  voiceState: VoiceServiceState;
}

interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  confidence: number;
  isProcessing: boolean;
  response: string;
  isSpeaking: boolean;
  volume: number;
  error: string | null;
  history: Array<{
    id: string;
    transcript: string;
    response: string;
    timestamp: number;
    confidence: number;
  }>;
}

const VoiceInputWindow: React.FC<VoiceInputWindowProps> = ({ voiceState }) => {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    transcript: '',
    confidence: 0,
    isProcessing: false,
    response: '',
    isSpeaking: false,
    volume: 0,
    error: null,
    history: []
  });

  const animationRef = useRef<number>();
  const volumeRef = useRef<HTMLDivElement>(null);

  // 开始语音识别
  const startListening = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, transcript: '', confidence: 0 }));
      
      if (window.electronAPI) {
        const result = await window.electronAPI.voice.startRecognition();
        if (result.success) {
          setState(prev => ({ ...prev, isListening: true }));
        } else {
          setState(prev => ({ ...prev, error: result.error || '启动语音识别失败' }));
        }
      }
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      setState(prev => ({ ...prev, error: '语音识别启动失败' }));
    }
  }, []);

  // 停止语音识别
  const stopListening = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.voice.stopRecognition();
        setState(prev => ({ ...prev, isListening: false }));
        
        if (result.transcript) {
          setState(prev => ({ 
            ...prev, 
            transcript: result.transcript,
            confidence: result.confidence || 0
          }));
          
          // 自动处理识别结果
          await processTranscript(result.transcript, result.confidence || 0);
        }
      }
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
      setState(prev => ({ ...prev, isListening: false, error: '停止语音识别失败' }));
    }
  }, []);

  // 处理语音识别结果
  const processTranscript = useCallback(async (transcript: string, confidence: number) => {
    if (!transcript.trim()) return;

    setState(prev => ({ ...prev, isProcessing: true, response: '' }));

    try {
      if (window.electronAPI) {
        // 发送到AI处理
        const aiResponse = await window.electronAPI.ai.processMessage(transcript);
        
        if (aiResponse.success && aiResponse.content) {
          setState(prev => ({ ...prev, response: aiResponse.content }));
          
          // 语音合成回复
          await speakResponse(aiResponse.content);
          
          // 添加到历史记录
          const historyItem = {
            id: `voice-${Date.now()}`,
            transcript,
            response: aiResponse.content,
            timestamp: Date.now(),
            confidence
          };
          
          setState(prev => ({
            ...prev,
            history: [historyItem, ...prev.history.slice(0, 9)],
            isProcessing: false
          }));
        } else {
          setState(prev => ({ 
            ...prev, 
            error: aiResponse.error || '处理失败',
            isProcessing: false
          }));
        }
      }
    } catch (error) {
      console.error('Failed to process transcript:', error);
      setState(prev => ({ 
        ...prev, 
        error: '处理语音输入失败',
        isProcessing: false
      }));
    }
  }, []);

  // 语音合成
  const speakResponse = useCallback(async (text: string) => {
    try {
      setState(prev => ({ ...prev, isSpeaking: true }));
      
      if (window.electronAPI) {
        const result = await window.electronAPI.voice.speak(text);
        if (!result.success) {
          console.error('Speech synthesis failed:', result.error);
        }
      }
    } catch (error) {
      console.error('Failed to speak response:', error);
    } finally {
      setState(prev => ({ ...prev, isSpeaking: false }));
    }
  }, []);

  // 停止语音合成
  const stopSpeaking = useCallback(async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.voice.stopSpeaking();
        setState(prev => ({ ...prev, isSpeaking: false }));
      }
    } catch (error) {
      console.error('Failed to stop speaking:', error);
    }
  }, []);

  // 切换监听状态
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 关闭窗口
  const handleClose = useCallback(async () => {
    // 停止所有语音操作
    if (state.isListening) {
      await stopListening();
    }
    if (state.isSpeaking) {
      await stopSpeaking();
    }
    
    try {
      if (window.electronAPI) {
        await window.electronAPI.window.hide();
      }
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  }, [state.isListening, state.isSpeaking, stopListening, stopSpeaking]);

  // 监听语音状态变化
  useEffect(() => {
    if (window.electronAPI) {
      const handleVoiceUpdate = (data: any) => {
        if (data.type === 'transcript') {
          setState(prev => ({ 
            ...prev, 
            transcript: data.transcript,
            confidence: data.confidence || 0
          }));
        } else if (data.type === 'volume') {
          setState(prev => ({ ...prev, volume: data.volume }));
        } else if (data.type === 'error') {
          setState(prev => ({ 
            ...prev, 
            error: data.error,
            isListening: false
          }));
        }
      };

      window.electronAPI.voice.onUpdate(handleVoiceUpdate);
      
      return () => {
        // 清理监听器
        if (window.electronAPI.voice.removeListener) {
          window.electronAPI.voice.removeListener(handleVoiceUpdate);
        }
      };
    }
  }, []);

  // 音量可视化动画
  useEffect(() => {
    if (state.isListening && volumeRef.current) {
      const animate = () => {
        if (volumeRef.current) {
          const scale = 1 + (state.volume * 0.5);
          volumeRef.current.style.transform = `scale(${scale})`;
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else if (volumeRef.current) {
      volumeRef.current.style.transform = 'scale(1)';
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state.isListening, state.volume]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        toggleListening();
      } else if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleListening, handleClose]);

  return (
    <div className="voice-input-window">
      {/* 头部 */}
      <div className="voice-header">
        <div className="voice-title">
          <span>语音助手</span>
          <div className={`voice-status status-${voiceState.status}`}>
            {voiceState.status === 'ready' && '就绪'}
            {voiceState.status === 'listening' && '监听中'}
            {voiceState.status === 'processing' && '处理中'}
            {voiceState.status === 'speaking' && '播放中'}
            {voiceState.status === 'error' && '错误'}
          </div>
        </div>
        <button className="close-btn" onClick={handleClose}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      {/* 错误提示 */}
      {state.error && (
        <div className="voice-error">
          <span>{state.error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      {/* 主要控制区域 */}
      <div className="voice-main">
        {/* 麦克风按钮 */}
        <div className="voice-control">
          <button 
            className={`mic-btn ${
              state.isListening ? 'listening' : ''
            } ${
              state.isProcessing ? 'processing' : ''
            }`}
            onClick={toggleListening}
            disabled={state.isProcessing}
          >
            <div ref={volumeRef} className="mic-icon">
              {state.isListening ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              )}
            </div>
            {state.isProcessing && <div className="processing-spinner"></div>}
          </button>
          
          <div className="mic-hint">
            {state.isListening ? '点击停止或按空格键' : '点击开始或按空格键'}
          </div>
        </div>

        {/* 音量指示器 */}
        {state.isListening && (
          <div className="volume-indicator">
            <div className="volume-bars">
              {Array.from({ length: 5 }, (_, i) => (
                <div 
                  key={i}
                  className={`volume-bar ${
                    state.volume > (i * 0.2) ? 'active' : ''
                  }`}
                ></div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 识别结果 */}
      {state.transcript && (
        <div className="voice-transcript">
          <div className="transcript-header">
            <span>识别结果</span>
            {state.confidence > 0 && (
              <span className="confidence">
                置信度: {Math.round(state.confidence * 100)}%
              </span>
            )}
          </div>
          <div className="transcript-content">{state.transcript}</div>
        </div>
      )}

      {/* AI回复 */}
      {state.response && (
        <div className="voice-response">
          <div className="response-header">
            <span>AI回复</span>
            {state.isSpeaking && (
              <button className="stop-speaking-btn" onClick={stopSpeaking}>
                停止播放
              </button>
            )}
          </div>
          <div className="response-content">{state.response}</div>
        </div>
      )}

      {/* 历史记录 */}
      {state.history.length > 0 && (
        <div className="voice-history">
          <div className="history-header">历史记录</div>
          <div className="history-list">
            {state.history.slice(0, 3).map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-time">
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="history-content">
                  <div className="history-transcript">
                    <strong>你说:</strong> {item.transcript}
                  </div>
                  <div className="history-response">
                    <strong>AI:</strong> {item.response}
                  </div>
                </div>
                <button 
                  className="replay-btn"
                  onClick={() => speakResponse(item.response)}
                  disabled={state.isSpeaking}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInputWindow;