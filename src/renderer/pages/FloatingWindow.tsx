import React, { useState, useEffect, useRef } from 'react';
import { X, Minimize2, Settings, Mic, Camera, MessageSquare } from 'lucide-react';
import { useConfigStore } from '../stores/configStore';
import { useFloatingGlassEffect } from '../hooks/useFloatingGlassEffect';
import { toast } from 'sonner';

interface FloatingWindowProps {
  // Props can be passed from main process
}

const FloatingWindow: React.FC<FloatingWindowProps> = () => {
  const { config } = useConfigStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [quickMessage, setQuickMessage] = useState('');
  const dragRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Apply glass variables for floating window
  useFloatingGlassEffect();

  // Initialize floating window
  useEffect(() => {
    const initializeWindow = async () => {
      try {
        // Notify main process that floating window is ready
        if (window.electronAPI?.windowReady) {
          await window.electronAPI.windowReady('floating');
        }

        // Set up window controls
        if (window.electronAPI?.onWindowControl) {
          window.electronAPI.onWindowControl((action: string) => {
            handleWindowControl(action);
          });
        }

        // Set up voice activation
        if (window.electronAPI?.onVoiceActivation) {
          window.electronAPI.onVoiceActivation(() => {
            startVoiceInput();
          });
        }

        // Focus input if not minimized
        if (!isMinimized && inputRef.current) {
          inputRef.current.focus();
        }
      } catch (error) {
        console.error('Failed to initialize floating window:', error);
      }
    };

    initializeWindow();
  }, [isMinimized]);

  // Handle window controls
  const handleWindowControl = (action: string) => {
    switch (action) {
      case 'minimize':
        setIsMinimized(true);
        break;
      case 'restore':
        setIsMinimized(false);
        if (inputRef.current) {
          inputRef.current.focus();
        }
        break;
      case 'close':
        closeWindow();
        break;
    }
  };

  // Close floating window
  const closeWindow = async () => {
    try {
      if (window.electronAPI?.closeWindow) {
        await window.electronAPI.closeWindow('floating');
      }
    } catch (error) {
      console.error('Failed to close floating window:', error);
    }
  };

  // Minimize/restore window
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (window.electronAPI?.setWindowSize) {
      const size = isMinimized ? { width: 400, height: 300 } : { width: 60, height: 60 };
      window.electronAPI.setWindowSize('floating', size.width, size.height);
    }
  };

  // Start voice input
  const startVoiceInput = async () => {
    if (!config.voice?.enabled) {
      toast.error('语音功能未启用');
      return;
    }

    try {
      setIsListening(true);
      if (window.electronAPI?.startVoiceRecognition) {
        const result = await window.electronAPI.startVoiceRecognition();
        if (result) {
          setQuickMessage(result);
          // Auto-send if configured
          if (config.voice?.autoStop) {
            setTimeout(() => {
              sendMessage(result);
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error('Voice recognition failed:', error);
      toast.error('语音识别失败');
    } finally {
      setIsListening(false);
    }
  };

  // Capture desktop
  const captureDesktop = async () => {
    try {
      if (window.electronAPI?.screen?.capture) {
        const result = await window.electronAPI.screen.capture();
        if (result && result.dataURL) {
          // Process screenshot with AI
          await processScreenshot(result.dataURL);
        }
      }
    } catch (error) {
      console.error('Desktop capture failed:', error);
      toast.error('桌面截图失败');
    }
  };

  // Process screenshot with AI
  const processScreenshot = async (imageDataURL: string) => {
    try {
      if (window.electronAPI?.processWithAI) {
        const analysis = await window.electronAPI.processWithAI({
          message: '分析这个桌面截图，提供有用的建议或信息',
          attachments: [{
            type: 'image',
            name: 'desktop-screenshot.png',
            url: imageDataURL,
          }],
          context: 'desktop-analysis',
        });
        
        if (analysis) {
          toast.success('桌面分析完成');
          // Show analysis in main window or floating tooltip
          showAnalysisResult(analysis);
        }
      }
    } catch (error) {
      console.error('AI processing failed:', error);
      toast.error('AI分析失败');
    }
  };

  // Show analysis result
  const showAnalysisResult = (analysis: string) => {
    // Could open main window or show in floating tooltip
    if (window.electronAPI?.showNotification) {
      window.electronAPI.showNotification({
        title: '桌面分析结果',
        body: analysis.substring(0, 100) + (analysis.length > 100 ? '...' : ''),
        actions: [{ text: '查看详情', action: 'open-main' }],
      });
    }
  };

  // Send message
  const sendMessage = async (message?: string) => {
    const messageToSend = message || quickMessage;
    if (!messageToSend.trim()) return;

    try {
      if (window.electronAPI?.sendMessage) {
        await window.electronAPI.sendMessage({
          content: messageToSend,
          type: 'text',
          source: 'floating',
        });
        setQuickMessage('');
        toast.success('消息已发送');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('发送失败');
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'Escape') {
      closeWindow();
    }
  };

  // Minimized view
  if (isMinimized) {
    return (
      <div className="w-15 h-15 bg-primary rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform"
           onClick={toggleMinimize}
           title="点击展开">
        <MessageSquare className="h-6 w-6 text-primary-foreground" />
      </div>
    );
  }

  const isGlass = config.theme === 'glass' || config.windows?.floating?.glassEffect?.enabled;

  // Full floating window
  return (
    <div className={`w-full h-full ${isGlass ? 'floating-window-glass' : 'bg-background/95 backdrop-blur-sm border border-border'} rounded-lg shadow-xl overflow-hidden`}>
      {/* Header with drag area */}
      <div 
        ref={dragRef}
        className="flex items-center justify-between p-3 bg-card border-b border-border cursor-move"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          <span className="text-sm font-medium">AI助手</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={toggleMinimize}
            className="p-1 rounded hover:bg-accent transition-colors"
            title="最小化"
          >
            <Minimize2 className="h-3 w-3" />
          </button>
          <button
            onClick={closeWindow}
            className="p-1 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
            title="关闭"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Quick input */}
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="text"
            value={quickMessage}
            onChange={(e) => setQuickMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="输入消息或按 Ctrl+Enter 发送..."
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={startVoiceInput}
              disabled={!config.voice?.enabled || isListening}
              className={`p-2 rounded-md transition-colors ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-accent hover:bg-accent/80'
              }`}
              title="语音输入"
            >
              <Mic className="h-4 w-4" />
            </button>
            
            <button
              onClick={captureDesktop}
              className="p-2 rounded-md bg-accent hover:bg-accent/80 transition-colors"
              title="桌面截图"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => sendMessage()}
            disabled={!quickMessage.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>

        {/* Status indicator */}
        {isListening && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>正在监听...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingWindow;