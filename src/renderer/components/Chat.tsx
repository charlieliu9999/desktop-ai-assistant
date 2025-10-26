import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Paperclip, MoreVertical, Trash2, Copy, RefreshCw, X, Zap, Globe, StopCircle } from 'lucide-react';
import { useConfigStore } from '../stores/configStore';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import '../styles/chat-components.css';
import { screenshotService } from '../services/screenshot';
import { apiClient } from '../../services/api-client';
import { visionAdapter } from '../../services/adapters/vision-adapter';
import { UNIFIED_TEXTAREA_STYLES } from '../styles/unified-input-styles';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: {
    type: 'image' | 'file';
    name: string;
    url: string;
    size?: number;
  }[];
}

interface ChatProps {
  className?: string;
}

// Storage key for chat messages
const CHAT_STORAGE_KEY = 'app:chat:messages';

const ensureText = (value: any): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(ensureText).join('');
  }
  if (typeof value === 'object') {
    if ('text' in value) return ensureText((value as Record<string, unknown>).text);
    if ('content' in value) return ensureText((value as Record<string, unknown>).content);
    return JSON.stringify(value);
  }
  return String(value);
};

const Chat: React.FC<ChatProps> = ({ className = '' }) => {
  const { config } = useConfigStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Restore messages from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        const restored = JSON.parse(raw);
        if (Array.isArray(restored) && restored.length > 0) {
          setMessages(restored.map((m: any) => ({
            ...m,
            content: ensureText(m.content),
            attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
            timestamp: new Date(m.timestamp),
          })));
          console.log('[Chat] Restored', restored.length, 'messages from storage');
        }
      } else {
        // 初次不注入系统说明，按你的要求取消开场白
        setMessages([]);
      }
    } catch (e) {
      console.warn('Failed to restore chat messages:', e);
    }
  }, []);

  // Auto scroll to bottom when new messages arrive + persist to localStorage
  useEffect(() => {
    const el = messagesEndRef.current as any;
    if (el && typeof el.scrollIntoView === 'function') {
      try { el.scrollIntoView({ behavior: 'smooth' }); } catch {}
    }
    try {
      const serializable = messages.map(m => ({
        ...m,
        content: ensureText(m.content),
      }));
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.warn('Failed to save chat messages:', e);
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 当配置启用了网络搜索时，默认开启“网络搜索模式”（后端路由无需 toolsEnabled）
  useEffect(() => {
    try {
      const enabled = !!(config?.ai?.webSearch?.enabled);
      setUseWebSearch(enabled);
    } catch {}
  }, [config?.ai?.webSearch?.enabled]);

  // 构造包含附件文本的增强内容
  const buildAugmentedContent = async (base: string, files: File[]): Promise<string> => {
    if (!files || files.length === 0) return base;
    const parts: string[] = [base];
    for (const file of files) {
      try {
        const isText = file.type.startsWith('text/') ||
          ['application/json', 'application/xml'].includes(file.type) ||
          /\.(txt|md|csv|json|xml)$/i.test(file.name);
        if (isText) {
          const content = await file.text();
          const trimmed = content.length > 8000 ? content.slice(0, 8000) + "\n...<截断>" : content;
          parts.push(`\n\n[附件:${file.name}]\n\n\`\`\`\n${trimmed}\n\`\`\`\n`);
        } else if (/\.docx$/i.test(file.name)) {
          // 尝试使用 mammoth 提取 docx 文本（需额外依赖）
          try {
            // @ts-ignore - 动态依赖；使用 vite-ignore 避免预打包/解析
            const mammoth = await import(/* @vite-ignore */ 'mammoth');
            const arrayBuffer = await file.arrayBuffer();
            const res: any = await (mammoth as any).extractRawText({ arrayBuffer });
            const text = (res?.value || '').toString();
            const trimmed = text.length > 8000 ? text.slice(0, 8000) + "\n...<截断>" : text;
            parts.push(`\n\n[附件:${file.name}] (docx 文本)\n\n\`\`\`\n${trimmed}\n\`\`\`\n`);
          } catch (e) {
            parts.push(`\n\n[附件:${file.name}] 需要安装依赖以解析 .docx（建议: npm i mammoth）。暂以占位说明代替。`);
          }
        } else if (file.type.startsWith('image/')) {
          parts.push(`\n\n[附件图片:${file.name}] 当前对话为文本模型，无法直接读取图片内容。`);
        } else {
          parts.push(`\n\n[附件:${file.name}] 非文本类型，暂不解析。`);
        }
      } catch {
        parts.push(`\n\n[附件:${file.name}] 读取失败。`);
      }
    }
    return parts.join('');
  };

  // Handle sending message
  const sendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      attachments: attachments.map(file => ({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
      })),
    };

    setMessages(prev => [...prev, userMessage]);
    try {
      const { saveChatMessage } = await import('../services/persistence');
      saveChatMessage({ id: userMessage.id, session_id: 'assistant-global', role: 'user', content: userMessage.content, created_at: userMessage.timestamp.getTime() });
    } catch {}
    setInputValue('');
    setAttachments([]);
    setIsLoading(true);

    // 准备注入附件文本的扩展内容
    const augmentedContent = await buildAugmentedContent(userMessage.content, attachments);

    // 创建一个空的助手消息，用于流式更新
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, assistantMessage]);

    let cleanupListeners = () => {};
    try {
      // 设置流式更新监听器
      const unsubscribeChunk = window.electronAPI?.ai?.onStreamChunk?.((chunk: string) => {
        const safeChunk = ensureText(chunk);
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: (msg.content || '') + safeChunk }
            : msg
        ));
      });

      const unsubscribeEnd = window.electronAPI?.ai?.onStreamEnd?.(async (result: any) => {
        let finalContent = '';
        if (!result.success && result.error) {
          console.error('Stream error:', result.error);
          toast.error('AI响应出错');
        }

        setMessages(prev => prev.map(msg => {
          if (msg.id !== assistantMessageId) return msg;
          if (!result.success && result.error) {
            const fallback = msg.content || '抱歉，处理您的消息时出现错误。请稍后再试。';
            finalContent = fallback;
            return { ...msg, content: fallback, type: 'system' as const };
          }
          finalContent = ensureText(result?.content ?? msg.content);
          return { ...msg, content: finalContent };
        }));

        try {
          const { saveChatMessage } = await import('../services/persistence');
          saveChatMessage({
            id: assistantMessageId,
            session_id: 'assistant-global',
            role: 'assistant',
            content: finalContent || '',
            created_at: Date.now(),
          });
        } catch {}

        setIsLoading(false);
        cleanupListeners();
      });
      cleanupListeners = () => {
        unsubscribeChunk?.();
        unsubscribeEnd?.();
      };

      // 调用API：根据是否启用网络搜索切换路径
      if (useWebSearch && window.electronAPI?.ai?.processMessageWithTools) {
        const content = await window.electronAPI.ai.processMessageWithTools(augmentedContent);
        const safeContent = ensureText(content);
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: safeContent }
            : msg
        ));
        setIsLoading(false);
        // 保存最终助手消息
        try {
          const { saveChatMessage } = await import('../services/persistence');
          saveChatMessage({ id: assistantMessageId, session_id: 'assistant-global', role: 'assistant', content: safeContent, created_at: Date.now() });
        } catch {}
        cleanupListeners();
      } else if (window.electronAPI?.ai?.processMessageStream) {
        await window.electronAPI.ai.processMessageStream(augmentedContent);
      } else {
        // 降级到非流式API
        const responseText: string = ensureText(
          (await window.electronAPI?.ai?.processMessage?.(augmentedContent))
          || '抱歉，我现在无法处理您的请求。请稍后再试。'
        );
        
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: responseText }
            : msg
        ));
        setIsLoading(false);
        cleanupListeners();
      }
    } catch (error) {
      console.error('Failed to process message:', error);
      toast.error('消息发送失败');
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              content: '抱歉，处理您的消息时出现错误。请检查网络连接后重试。',
              type: 'system' as const
            }
          : msg
      ));
      setIsLoading(false);
      cleanupListeners();
    }
  };

  // One-click: 自动截屏 → 识别 → 推荐（合并流式）
  const runOneClickWorkflow = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // 预创建一个助手消息用于流式输出
    const assistantMessageId = `auto_${Date.now()}`;
    setMessages(prev => [...prev, { id: assistantMessageId, type: 'assistant', content: '', timestamp: new Date() }]);

    try {
      // 截图权限 + 截屏
      const hasPerm = await screenshotService.checkPermissions();
      if (!hasPerm) throw new Error('没有屏幕录制权限，请在系统设置中授权');
      const shot = await screenshotService.captureScreen({ noCache: true });

      // 识别患者信息：若视觉走后端（scene化），则调用 /v1/vision/understand
      const { config } = useConfigStore.getState();
      let piRaw: any = {};
      try {
        const aiImage: any = (config as any).aiImage || {};
        const routing: string = aiImage.routingMode || 'inherit';
        if (routing === 'backend') {
          // 从 dataURL 中提取 MIME
          const mimeMatch = /^data:(.*?);base64,/.exec(shot.dataUrl || '');
          const imageMime = mimeMatch ? mimeMatch[1] : 'image/png';
          const provider = aiImage.backendProvider || 'dashscope';
          const scene = aiImage.backendScene || (provider === 'dashscope' ? 'screen_recognition_aliyun' : 'screen_recognition');
          const result = await visionAdapter.understandImage({
            imageData: shot.dataUrl,
            imageMime,
            prompt: '提取患者信息，输出严格 JSON（patient_info_v1）。',
            provider: provider as any,
            model: aiImage.backendModel || undefined,
            strictJson: true,
            allowFallback: true,
            schemaName: 'patient_info_v1',
            scene,
          });
          // 从统一结果中读取结构化信息
          const structured = (result?.details as any)?.structured || {};
          piRaw = structured || {};
        } else {
          // 兼容：旧路径（前端直连本地/云模型）
          const resp = await apiClient.extractPatientInfo(shot.dataUrl, aiImage);
          piRaw = resp.patient_info || {};
        }
      } catch (e) {
        console.warn('Patient info extraction failed, fallback to API client:', e);
        const resp = await apiClient.extractPatientInfo(shot.dataUrl, (config as any).aiImage);
        piRaw = resp.patient_info || {};
      }
      const patient = {
        name: piRaw.name || '',
        age: typeof piRaw.age === 'number' ? piRaw.age : parseInt(String(piRaw.age || '0')) || 0,
        gender: piRaw.gender || '',
        patient_id: piRaw.patient_id || piRaw.patientId || `PID_${Date.now()}`,
        department: piRaw.department || '',
        chief_complaint: piRaw.chief_complaint || piRaw.chiefComplaint || '',
        diagnosis: piRaw.diagnosis || '',
        medical_history: piRaw.medical_history || piRaw.medicalHistory || piRaw.medicalNow || ''
      };

      // 合并流式推荐（如未启用则回退非流式）
      const aiRec = config.aiRecommend;
      if (aiRec?.enabled) {
        let combined = '';
        const res = await apiClient.generateCombinedRecommendationsStream(
          patient as any,
          aiRec as any,
          (chunk) => {
            combined += chunk;
            setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: (m.content || '') + chunk } : m));
          }
        );

        const finalMd = (res?.recommendations as any)?.combined || combined;
        // 保存患者记录 + 对话消息
        try {
          const { savePatientRecord, saveChatMessage } = await import('../services/persistence');
          savePatientRecord({ id: `rec_${Date.now()}`, patient_id: patient.patient_id, patient_name: patient.name, created_at: Date.now(), screenshot: shot.dataUrl, markdown: finalMd, raw: { patient, res } });
          saveChatMessage({ id: `m_${Date.now()}`, session_id: patient.patient_id, role: 'assistant', content: finalMd, created_at: Date.now() });
        } catch {}
      } else {
        const res = await apiClient.generateRecommendations(patient as any, ['diagnosis','exam','medication']);
        const md = `## 诊断建议\n\n${JSON.stringify(res.recommendations?.diagnosis || [], null, 2)}\n\n## 检查项目推荐\n\n${JSON.stringify(res.recommendations?.exam || [], null, 2)}\n\n## 用药建议\n\n${JSON.stringify(res.recommendations?.medication || [], null, 2)}`;
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: md } : m));
        try {
          const { savePatientRecord, saveChatMessage } = await import('../services/persistence');
          savePatientRecord({ id: `rec_${Date.now()}`, patient_id: patient.patient_id, patient_name: patient.name, created_at: Date.now(), screenshot: shot.dataUrl, markdown: md, raw: { patient, res } });
          saveChatMessage({ id: `m_${Date.now()}`, session_id: patient.patient_id, role: 'assistant', content: md, created_at: Date.now() });
        } catch {}
      }
    } catch (e) {
      console.error('一键完成失败:', e);
      toast.error(e instanceof Error ? e.message : '一键完成失败');
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, type: 'system', content: '一键完成失败，请检查权限/配置。' } : m));
    } finally {
      setIsLoading(false);
    }
  };

  // Renderer-side Web Speech recognition for Chat input
  const buildRecognition = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error('当前环境不支持语音识别');
      return null;
    }
    const rec = new SR();
    const recLang = (config as any)?.voice?.recognition?.language || (config as any)?.voice?.language || 'zh-CN';
    const recContinuous = !!((config as any)?.voice?.recognition?.continuous ?? (config as any)?.voice?.continuous);
    const maxAlt = (config as any)?.voice?.recognition?.maxAlternatives ?? (config as any)?.voice?.maxAlternatives ?? 1;
    rec.lang = recLang;
    rec.continuous = recContinuous;
    rec.interimResults = true;
    rec.maxAlternatives = Math.min(3, Math.max(1, maxAlt));

    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = (e: any) => {
      console.warn('Speech recognition error:', e?.error || e);
      setIsListening(false);
      toast.error(`语音识别错误: ${e?.error || 'unknown'}`);
    };
    rec.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      const text = (finalText || interim || '').trim();
      if (text) setInputValue(prev => prev + (prev ? ' ' : '') + text);
      if (!rec.continuous && finalText) {
        try { rec.stop(); } catch {}
        setIsListening(false);
      }
    };
    return rec;
  };

  const toggleVoiceInput = async () => {
    if (!config.voice?.enabled) {
      toast.error('语音功能未启用，请在设置中开启');
      return;
    }

    if (isListening) {
      try { recognitionRef.current?.stop?.(); } catch {}
      setIsListening(false);
    } else {
      try {
        // ensure mic permission for UX
        try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {}
        if (!recognitionRef.current) recognitionRef.current = buildRecognition();
        if (!recognitionRef.current) return;
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        toast.error('语音识别失败');
      }
    }
  };

  // Handle file attachment
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`文件 ${file.name} 超过10MB限制`);
        return false;
      }
      return true;
    });
    
    setAttachments(prev => [...prev, ...validFiles]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Copy message content
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('已复制到剪贴板');
  };

  // Delete message
  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    toast.success('消息已删除');
  };

  // Regenerate response
  const regenerateResponse = async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.type !== 'user') return;

    setIsLoading(true);
    try {
      const responseText: string = await window.electronAPI?.ai?.processMessage?.(userMessage.content)
        || '抱歉，我现在无法处理您的请求。请稍后再试。';

      const newMessage: Message = {
        ...messages[messageIndex],
        content: responseText,
        timestamp: new Date(),
      };

      setMessages(prev => prev.map(msg => msg.id === messageId ? newMessage : msg));
      try {
        const { saveChatMessage } = await import('../services/persistence');
        saveChatMessage({ id: `m_${Date.now()}`, session_id: 'assistant-global', role: 'assistant', content: responseText, created_at: Date.now() });
      } catch {}
    } catch (error) {
      console.error('Failed to regenerate response:', error);
      toast.error('重新生成失败');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat + reset AI session/history
  const clearChat = async () => {
    if (!confirm('确定要清空聊天记录并开始新会话吗？')) return;
    try {
      setMessages([]);
      setAttachments([]);
      setInputValue('');
      localStorage.removeItem(CHAT_STORAGE_KEY);
      await window.electronAPI?.ai?.clearHistory?.();
      toast.success('已清空，并开始新会话');
      console.log('[Chat] Chat cleared and new session started');
    } catch (e) {
      console.warn('Failed to clear AI history:', e);
      toast.success('已清空对话');
    }
  };

  // Stop generation
  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      toast.info('已停止生成');
      console.log('[Chat] Generation stopped by user');
    }
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Hide <think> blocks from think-enabled models
  const stripThink = (s: string) => {
    if (!s) return s;
    try {
      return s.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() || s;
    } catch {
      return s;
    }
  };

  const isGlass = config.theme === 'glass' || config.windows?.main?.glassEffect?.enabled;

  return (
    // 玻璃主题下使用透明背景 + 卡片玻璃
    <div className={`flex flex-col h-full ${isGlass ? 'bg-transparent' : 'bg-white dark:bg-gray-900'} ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold">AI助手对话</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {config.ai?.routingMode === 'backend' ? (
              <>
                路由：后端 · 提供商：{(config as any)?.ai?.backendProvider || '后端默认'} · 模型：{(config as any)?.ai?.backendModel || '由场景决定'}
              </>
            ) : (
              <>
                路由：前端 · 提供商：{config.ai?.provider ?? 'local'} · 模型：{config.ai?.model ?? '未设置'}
              </>
            )}
          </p>
        </div>
        
      <div className="flex items-center space-x-2">
          <button
            onClick={() => setUseWebSearch(v => !v)}
            className={`p-2 rounded-lg border transition-colors ${useWebSearch ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="切换网络搜索模式"
          >
            <Globe className="h-4 w-4" />
          </button>
          {config.oneClick?.exposeInAssistant && (
            <button
              onClick={runOneClickWorkflow}
              className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="一键完成：截屏→识别→推荐（流式）"
              disabled={isLoading}
            >
              <Zap className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={clearChat}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="清空聊天"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-4 ${isGlass ? '' : ''}`}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex justify-start`}
          >
            <div
              className={`w-full rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-gray-380 dark:bg-gray-600 text-white'
                  : message.type === 'system'
                  ? (isGlass
                      ? 'glass text-gray-700 dark:text-gray-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300')
                  : (isGlass
                      ? 'glass dark:text-gray-100'
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-gray-100')
              }`}
            >
              {/* Message content */}
              <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                {message.type === 'user' ? (
                  <div className="whitespace-pre-wrap">{stripThink(message.content)}</div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      // 自定义代码块样式
                      code: ({ node, inline, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline ? (
                          <code
                            className={`${className} block bg-gray-900 dark:bg-gray-800 text-gray-100 p-3 rounded-md overflow-x-auto`}
                            {...props}
                          >
                            {children}
                          </code>
                        ) : (
                          <code
                            className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      // 自定义链接样式
                      a: ({ node, children, ...props }: any) => (
                        <a
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        >
                          {children}
                        </a>
                      ),
                      // 自定义表格样式
                      table: ({ node, children, ...props }: any) => (
                        <div className="overflow-x-auto my-2">
                          <table className="min-w-full border border-gray-300 dark:border-gray-600" {...props}>
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ node, children, ...props }: any) => (
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-700" {...props}>
                          {children}
                        </th>
                      ),
                      td: ({ node, children, ...props }: any) => (
                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2" {...props}>
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {stripThink(message.content)}
                  </ReactMarkdown>
                )}
              </div>

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 p-2 bg-gray-400/50 dark:bg-gray-500/50 rounded border border-gray-400/30 dark:border-gray-500/30"
                    >
                      {attachment.type === 'image' ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.name}</p>
                        {attachment.size && (
                          <p className="text-xs text-primary-200">
                            {formatFileSize(attachment.size)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Message footer */}
              <div className="flex items-center justify-end mt-2 space-x-2">
                <span className="text-xs text-primary-200">
                  {formatTime(message.timestamp)}
                </span>
                
                {message.type !== 'system' && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => copyMessage(message.content)}
                      className="p-1 rounded hover:bg-gray-400/50 dark:hover:bg-gray-500/50 transition-colors"
                      title="复制"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    
                    {message.type === 'assistant' && (
                      <button
                        onClick={() => regenerateResponse(message.id)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="重新生成"
                        disabled={isLoading}
                      >
                        <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    
                    <button
                      onClick={() => deleteMessage(message.id)}
                      className="p-1 rounded hover:bg-gray-400/50 dark:hover:bg-gray-500/50 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator with stop button */}
        {isLoading && (
          <div className="flex items-center space-x-2">
            <div className="flex justify-start">
              <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[rgb(var(--primary))]"></div>
                  <span className="text-sm text-[rgb(var(--muted-foreground))]">AI正在思考...</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={stopGeneration}
              className="p-2 rounded-lg bg-[rgb(var(--error))] text-white hover:opacity-90 transition-all"
              title="停止生成"
            >
              <StopCircle className="h-4 w-4" />
            </button>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-2"
              >
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Input controls */}
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter发送，Shift+Enter换行)"
              className={UNIFIED_TEXTAREA_STYLES}
              rows={1}
              style={{
                minHeight: '40px',
                maxHeight: '120px',
                height: 'auto',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="添加附件"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          
          <button
            onClick={toggleVoiceInput}
            className={`p-2 rounded-lg border transition-colors ${
              isListening
                ? 'bg-red-500 text-white border-red-500'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={isListening ? '停止录音' : '语音输入'}
            disabled={!config.voice?.enabled}
          >
            {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
          
          <button
            onClick={sendMessage}
            disabled={(!inputValue.trim() && attachments.length === 0) || isLoading}
            className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="发送消息"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
