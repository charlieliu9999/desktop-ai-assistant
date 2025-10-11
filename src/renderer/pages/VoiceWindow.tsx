import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, X, Volume2, VolumeX } from 'lucide-react';
import { useConfigStore } from '../stores/configStore';
import { toast } from 'sonner';

interface VoiceWindowProps {
  // Props can be passed from main process
}

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  transcript: string;
  confidence: number;
  volume: number;
}

const VoiceWindow: React.FC<VoiceWindowProps> = () => {
  const { config } = useConfigStore();
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    transcript: '',
    confidence: 0,
    volume: 0,
  });
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();

  // recognition instance (Web Speech API)
  const recognitionRef = useRef<any>(null);

  // Initialize voice window
  useEffect(() => {
    const initializeWindow = async () => {
      try {
        // Set up keyboard shortcuts
        document.addEventListener('keydown', handleKeyDown);

        // Initialize audio visualization (mic level)
        initializeAudioVisualization();

        return () => {
          document.removeEventListener('keydown', handleKeyDown);
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
          if (audioContextRef.current) audioContextRef.current.close();
          try { stopListening(); } catch {}
        };
      } catch (error) {
        console.error('Failed to initialize voice window:', error);
      }
    };

    initializeWindow();
  }, []);

  // Initialize audio visualization
  const initializeAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      startVisualization();
    } catch (error) {
      console.error('Failed to initialize audio visualization:', error);
    }
  };

  // Start audio visualization
  const startVisualization = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      setVoiceState(prev => ({ ...prev, volume: average / 255 }));

      // Draw waveform
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 20;
      
      ctx.strokeStyle = voiceState.isListening ? '#3B82F6' : '#6B7280';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i < bufferLength; i++) {
        const angle = (i / bufferLength) * 2 * Math.PI;
        const amplitude = (dataArray[i] / 255) * 30;
        const x = centerX + Math.cos(angle) * (radius + amplitude);
        const y = centerY + Math.sin(angle) * (radius + amplitude);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.stroke();
      
      // Draw center circle
      ctx.fillStyle = voiceState.isListening ? '#3B82F6' : '#6B7280';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 10 + average / 10, 0, 2 * Math.PI);
      ctx.fill();
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
  };

  // Web Speech API lifecycle
  const buildRecognition = () => {
    try {
      const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        console.warn('[Voice] SpeechRecognition API not available');
        toast.error('当前环境不支持语音识别');
        return null;
      }

      console.log('[Voice] Creating SpeechRecognition instance');
      const rec = new SR();
      const recLang = (config as any)?.voice?.recognition?.language || (config as any)?.voice?.language || 'zh-CN';
      const recContinuous = !!((config as any)?.voice?.recognition?.continuous ?? (config as any)?.voice?.continuous);
      const maxAlt = (config as any)?.voice?.recognition?.maxAlternatives ?? (config as any)?.voice?.maxAlternatives ?? 1;

      rec.lang = recLang;
      rec.continuous = recContinuous;
      rec.interimResults = true;
      rec.maxAlternatives = Math.min(3, Math.max(1, maxAlt));

      console.log('[Voice] SpeechRecognition configured:', { lang: recLang, continuous: recContinuous, maxAlternatives: rec.maxAlternatives });

    rec.onstart = () => {
      setVoiceState(prev => ({ ...prev, isListening: true, transcript: '', confidence: 0 }));
    };
    rec.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      let conf = 0;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          finalText += r[0].transcript;
          conf = r[0].confidence || conf;
        } else {
          interim += r[0].transcript;
          conf = r[0].confidence || conf;
        }
      }
      const text = finalText || interim;
      setVoiceState(prev => ({ ...prev, transcript: (text || '').trim(), confidence: conf || 0 }));

      // If non-continuous and got final, stop and process
      if (!rec.continuous && finalText) {
        stopListening();
        if (finalText.trim()) processVoiceInput(finalText.trim());
      }
    };
      rec.onerror = (e: any) => {
        console.error('[Voice] Speech recognition error:', e?.error || e, e);
        setVoiceState(prev => ({ ...prev, isListening: false }));

        // 不同错误类型的处理
        const errorType = e?.error || 'unknown';
        if (errorType === 'no-speech') {
          toast.warning('未检测到语音，请重试');
        } else if (errorType === 'audio-capture') {
          toast.error('无法访问麦克风，请检查权限');
        } else if (errorType === 'not-allowed') {
          toast.error('麦克风权限被拒绝');
        } else if (errorType === 'network') {
          toast.error('网络错误，请检查连接');
        } else {
          toast.error(`语音识别错误: ${errorType}`);
        }

        // 清理识别实例，避免状态混乱
        try {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
          }
        } catch (cleanupError) {
          console.warn('[Voice] Error during recognition cleanup:', cleanupError);
        }
      };

      rec.onend = () => {
        console.log('[Voice] Speech recognition ended');
        setVoiceState(prev => ({ ...prev, isListening: false }));
      };

      return rec;

    } catch (error) {
      console.error('[Voice] Failed to build SpeechRecognition:', error);
      toast.error('创建语音识别失败');
      return null;
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeWindow();
    } else if (e.key === ' ' && !voiceState.isListening) {
      e.preventDefault();
      startListening();
    } else if (e.key === 'Enter' && e.ctrlKey && voiceState.transcript) {
      sendMessage();
    }
  };

  // Start voice recognition
  const startListening = async () => {
    if (!config.voice?.enabled) {
      toast.error('语音功能未启用');
      return;
    }

    try {
      console.log('[Voice] Starting voice recognition...');

      // 请求麦克风权限
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[Voice] Microphone permission granted');
        // 立即停止流，我们只是需要权限
        stream.getTracks().forEach(track => track.stop());
      } catch (permError) {
        console.error('[Voice] Microphone permission denied:', permError);
        toast.error('无法访问麦克风，请检查权限');
        return;
      }

      // 创建或重用识别实例
      if (!recognitionRef.current) {
        console.log('[Voice] Building new recognition instance');
        recognitionRef.current = buildRecognition();
      }

      if (!recognitionRef.current) {
        console.error('[Voice] Failed to create recognition instance');
        return;
      }

      // 启动识别
      console.log('[Voice] Starting recognition...');
      recognitionRef.current.start();
      console.log('[Voice] Recognition started successfully');

    } catch (error: any) {
      console.error('[Voice] Failed to start voice recognition:', error);

      // 详细的错误处理
      if (error.name === 'InvalidStateError') {
        console.warn('[Voice] Recognition already started, stopping and restarting...');
        try {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
          }
          // 短暂延迟后重试
          setTimeout(() => startListening(), 100);
        } catch (retryError) {
          console.error('[Voice] Retry failed:', retryError);
          toast.error('语音识别启动失败，请重试');
        }
      } else {
        toast.error(`无法启动语音识别: ${error.message || '未知错误'}`);
      }
    }
  };

  // Stop voice recognition
  const stopListening = async () => {
    try {
      console.log('[Voice] Stopping voice recognition...');
      const rec = recognitionRef.current;
      if (rec) {
        rec.stop();
        console.log('[Voice] Recognition stopped');
      } else {
        console.warn('[Voice] No recognition instance to stop');
      }
      setVoiceState(prev => ({ ...prev, isListening: false }));
    } catch (error) {
      console.error('[Voice] Failed to stop voice recognition:', error);
      // 即使停止失败，也要重置状态
      setVoiceState(prev => ({ ...prev, isListening: false }));
    }
  };

  // Process voice input
  const processVoiceInput = async (transcript: string) => {
    try {
      // Add user message
      const userMessage = {
        role: 'user' as const,
        content: transcript,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Try handle quick voice commands locally
      if (await handleVoiceCommand(transcript)) {
        setVoiceState(prev => ({ ...prev, isProcessing: false, transcript: '' }));
        return;
      }

      // Process with AI
      if (window.electronAPI?.processWithAI) {
        const response = await window.electronAPI.processWithAI({
          type: 'text',
          content: transcript,
          context: messages.slice(-5),
        });

        if (response) {
          const assistantMessage = {
            role: 'assistant' as const,
            content: response,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);

          // Speak response if audio enabled
          if (audioEnabled && config.voice?.enabled) {
            speakResponse(response);
          }
        }
      }
    } catch (error) {
      console.error('Failed to process voice input:', error);
      toast.error('处理语音输入失败');
    } finally {
      setVoiceState(prev => ({ ...prev, isProcessing: false, transcript: '' }));
    }
  };

  // Speak AI response
  const speakResponse = async (text: string) => {
    try {
      setVoiceState(prev => ({ ...prev, isSpeaking: true }));
      // Use browser TTS to avoid main-process speech API issues
      const u = new SpeechSynthesisUtterance(text);
      const syn = (config as any)?.voice?.synthesis || {};
      const lang = (config as any)?.voice?.recognition?.language || (config as any)?.voice?.language || 'zh-CN';
      u.lang = lang;
      u.rate = typeof syn.rate === 'number' ? syn.rate : 1.0;
      u.pitch = typeof syn.pitch === 'number' ? syn.pitch : 1.0;
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find(v => v.lang?.toLowerCase().includes((u.lang || '').toLowerCase()));
      if (matched) u.voice = matched;
      await new Promise<void>((resolve) => {
        u.onend = () => resolve();
        try { window.speechSynthesis.cancel(); } catch {}
        window.speechSynthesis.speak(u);
      });
    } catch (error) {
      console.error('Failed to speak response:', error);
    } finally {
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
    }
  };

  // Send message manually
  const sendMessage = () => {
    if (voiceState.transcript.trim()) {
      processVoiceInput(voiceState.transcript);
    }
  };

  // Close voice window
  const closeWindow = async () => {
    try {
      if (voiceState.isListening) {
        await stopListening();
      }
      // 使用新预加载API
      if (window.electronAPI?.windows?.hideVoiceInput) {
        await window.electronAPI.windows.hideVoiceInput();
      }
    } catch (error) {
      console.error('Failed to close voice window:', error);
    }
  };

  // Very simple command handler (Chinese intents)
  const handleVoiceCommand = async (text: string): Promise<boolean> => {
    const t = text.trim();
    const contains = (w: string) => t.includes(w);

    // Close voice window
    if (contains('关闭') && contains('语音')) {
      await closeWindow();
      toast.success('已关闭语音窗口');
      return true;
    }
    // Start/stop listening
    if ((contains('开始') || contains('启动')) && (contains('录音') || contains('监听') || contains('语音'))) {
      await startListening();
      toast.success('开始监听');
      return true;
    }
    if ((contains('停止') || contains('结束')) && (contains('录音') || contains('监听') || contains('语音'))) {
      await stopListening();
      toast.success('已停止');
      return true;
    }
    // Floating window show/hide
    if ((contains('显示') || contains('打开')) && (contains('浮动') || contains('悬浮'))) {
      try { await window.electronAPI?.windows?.showFloating?.(); toast.success('已显示浮动窗口'); } catch {}
      return true;
    }
    if ((contains('隐藏') || contains('关闭')) && (contains('浮动') || contains('悬浮'))) {
      try { await window.electronAPI?.windows?.hideFloating?.(); toast.success('已隐藏浮动窗口'); } catch {}
      return true;
    }
    // Voice window show/hide
    if ((contains('打开') || contains('显示')) && (contains('语音'))) {
      try { await window.electronAPI?.windows?.showVoiceInput?.(); } catch {}
      return true;
    }
    if ((contains('隐藏') || contains('关闭')) && (contains('语音'))) {
      await closeWindow();
      return true;
    }
    return false;
  };

  return (
    <div className="w-full h-full bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Mic className="h-5 w-5 text-primary" />
          <span className="font-medium">语音助手</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title={audioEnabled ? '关闭语音播放' : '开启语音播放'}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          
          <button
            onClick={closeWindow}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title="关闭 (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Audio visualization */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="rounded-full"
          />
          
          {/* Status overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {voiceState.isListening && (
                <div className="text-primary font-medium mb-2">正在监听...</div>
              )}
              {voiceState.isProcessing && (
                <div className="text-yellow-500 font-medium mb-2">处理中...</div>
              )}
              {voiceState.isSpeaking && (
                <div className="text-green-500 font-medium mb-2">正在播放...</div>
              )}
              
              {voiceState.confidence > 0 && (
                <div className="text-sm text-muted-foreground">
                  置信度: {Math.round(voiceState.confidence * 100)}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transcript and controls */}
      <div className="p-4 border-t border-border space-y-4">
        {/* Current transcript */}
        {voiceState.transcript && (
          <div className="bg-card p-3 rounded-lg border border-border">
            <div className="text-sm text-muted-foreground mb-1">识别结果:</div>
            <div className="text-foreground">{voiceState.transcript}</div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={voiceState.isListening ? stopListening : startListening}
            disabled={voiceState.isProcessing}
            className={`p-4 rounded-full transition-all ${
              voiceState.isListening
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={voiceState.isListening ? '停止录音' : '开始录音 (空格键)'}
          >
            {voiceState.isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
          
          {voiceState.transcript && (
            <button
              onClick={sendMessage}
              disabled={voiceState.isProcessing}
              className="p-3 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="发送消息 (Ctrl+Enter)"
            >
              <Send className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-muted-foreground">
          <p>按空格键开始录音，Esc键关闭窗口</p>
          <p>Ctrl+Enter发送当前识别结果</p>
        </div>
      </div>

      {/* Recent messages */}
      {messages.length > 0 && (
        <div className="max-h-32 overflow-y-auto p-4 border-t border-border">
          <div className="text-sm text-muted-foreground mb-2">最近对话:</div>
          <div className="space-y-2">
            {messages.slice(-3).map((message, index) => (
              <div key={index} className="text-xs">
                <span className={`font-medium ${
                  message.role === 'user' ? 'text-blue-500' : 'text-green-500'
                }`}>
                  {message.role === 'user' ? '你' : 'AI'}:
                </span>
                <span className="ml-2 text-muted-foreground">
                  {message.content.substring(0, 50)}
                  {message.content.length > 50 ? '...' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceWindow;
