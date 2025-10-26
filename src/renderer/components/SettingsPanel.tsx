import React, { useEffect, useRef, useState } from 'react';
import { Save, RefreshCw, Download, Upload, AlertCircle, CheckCircle, Settings, Volume2, Monitor, Activity, Search, Mic, TestTube, Bot } from 'lucide-react';
import { useConfigStore } from '../stores/configStore';
import { ThemeSettings } from './ThemeSettings';
import { toast } from 'sonner';
import ModelConfigPanel from './ModelConfigPanel';
import { WebSearchSettings } from './WebSearchSettings';
import { VoiceRecognitionTest } from './VoiceRecognitionTest';
import { BishengStatusIndicator } from './BishengStatusIndicator';
import { apiClient } from '../../services/api-client';
import { AISettingsSection } from './settings/AISettingsSection';

type SettingsSection = 'general' | 'theme' | 'voice' | 'ai' | 'aiImage' | 'aiRecommend' | 'oneClick' | 'desktop' | 'medical' | 'bisheng' | 'websearch' | 'advanced';

const SettingsPanel: React.FC = () => {
  const { config, updateConfig, resetConfig } = useConfigStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showWebSearchSettings, setShowWebSearchSettings] = useState(false);
  const [showVoiceRecognitionTest, setShowVoiceRecognitionTest] = useState(false);

  // Diagnostics state
  const [webSearchTesting, setWebSearchTesting] = useState(false);
  const [webSearchTestResult, setWebSearchTestResult] = useState<null | { ok: boolean; detail: string }>(null);
  const [voiceDiag, setVoiceDiag] = useState<{
    support?: boolean | null; // SpeechRecognition + speechSynthesis
    mic?: 'granted' | 'denied' | 'prompt' | 'error' | null;
    tts?: boolean | null;
    error?: string;
  }>({ support: null, mic: null, tts: null });
  const recognitionRef = useRef<any>(null);
  const [recTesting, setRecTesting] = useState(false);
  const [recTranscript, setRecTranscript] = useState<string>('');
  const [recError, setRecError] = useState<string>('');
  // Mic audio input test (no Web Speech dependency)
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const [micTesting, setMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0); // 0-100
  const [micError, setMicError] = useState('');
  // 最近一次后端视觉识别结果（用于调试展示）
  const [lastVisionResult, setLastVisionResult] = useState<any | null>(null);

  const [modelLock, setModelLock] = useState<boolean>(false);
  const API_ORIGIN = (() => {
    try {
      const raw = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8010/api';
      const u = new URL(raw);
      return u.origin;
    } catch {
      return 'http://127.0.0.1:8010';
    }
  })();

  const stopMicTest = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try { analyserRef.current?.disconnect(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    setMicTesting(false);
  };

  useEffect(() => {
    return () => {
      // cleanup on unmount
      try { recognitionRef.current?.stop?.(); } catch {}
      stopMicTest();
    };
  }, []);

  // 读取后端 flags（model lock）
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${API_ORIGIN}/v1/config/flags`);
        if (resp.ok) {
          const data = await resp.json();
          setModelLock(!!data?.data?.model_lock);
        }
      } catch {}
    })();
  }, []);

  // Handle config changes
  const handleConfigChange = (path: string, value: any) => {
    const keys = path.split('.');
    const newConfig = { ...config } as any;
    let current = newConfig;

    // Ensure all nested objects exist
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    updateConfig(newConfig);
    setHasUnsavedChanges(true);
  };

  // Save configuration
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to main process config store if available
      if (window.electronAPI?.config?.update) {
        await window.electronAPI.config.update(config);
      } else {
        // Fallback to store persistence
        console.warn('Main config bridge not available, using local store');
      }

      setHasUnsavedChanges(false);
      toast.success('设置已保存');
    } catch (error) {
      toast.error('保存设置失败');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    if (confirm('确定要重置所有设置到默认值吗？')) {
      resetConfig();
      setHasUnsavedChanges(true);
      toast.success('设置已重置');
    }
  };

  // Export configuration
  const handleExport = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'desktop-ai-assistant-config.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('配置已导出');
  };

  // Import configuration
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        updateConfig(importedConfig);
        setHasUnsavedChanges(true);
        toast.success('配置已导入');
      } catch (error) {
        toast.error('导入配置失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  };

  const sections = [
    { id: 'general' as SettingsSection, name: '常规设置', icon: Settings },
    { id: 'theme' as SettingsSection, name: '主题设置', icon: Activity },
    { id: 'voice' as SettingsSection, name: '语音设置', icon: Volume2 },
    { id: 'ai' as SettingsSection, name: 'AI 模型', icon: Activity },
    { id: 'aiImage' as SettingsSection, name: 'AI 图片', icon: Activity },
    { id: 'aiRecommend' as SettingsSection, name: 'AI 推荐', icon: Activity },
    { id: 'websearch' as SettingsSection, name: '网络搜索', icon: Search },
    { id: 'oneClick' as SettingsSection, name: '一键流程', icon: Activity },
    { id: 'desktop' as SettingsSection, name: '桌面识别', icon: Monitor },
    { id: 'medical' as SettingsSection, name: '医疗系统', icon: Activity },
    { id: 'bisheng' as SettingsSection, name: '智能体设置', icon: Bot },
    { id: 'advanced' as SettingsSection, name: '高级设置', icon: AlertCircle }
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">应用设置</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">开机自启动</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">应用程序随系统启动</p>
            </div>
            <input
              type="checkbox"
              checked={config?.startup?.autoStart ?? false}
              onChange={(e) => handleConfigChange('startup.autoStart', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">最小化到系统托盘</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">关闭窗口时最小化到托盘而不是退出</p>
            </div>
            <input
              type="checkbox"
              checked={config?.startup?.minimizeToTray ?? true}
              onChange={(e) => handleConfigChange('startup.minimizeToTray', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          {/* 窗口尺寸配置 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">窗口设置</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">窗口宽度</label>
                <input
                  type="number"
                  min="400"
                  max="1200"
                  value={config?.windows?.main?.width ?? 480}
                  onChange={(e) => handleConfigChange('windows.main.width', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">建议范围：400-1200px</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">窗口高度</label>
                <input
                  type="number"
                  min="600"
                  max="1200"
                  value={config?.windows?.main?.height ?? 996}
                  onChange={(e) => handleConfigChange('windows.main.height', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">建议范围：600-1200px</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">靠右显示</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">窗口自动靠屏幕右侧显示</p>
                </div>
                <input
                  type="checkbox"
                  checked={config?.windows?.main?.alignRight ?? true}
                  onChange={(e) => handleConfigChange('windows.main.alignRight', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">语言</label>
            <select
              value={config?.language ?? 'zh-CN'}
              onChange={(e) => handleConfigChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">快捷键设置</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">全局唤醒快捷键</label>
            <input
              type="text"
              value={config?.shortcuts?.toggleMainWindow ?? 'CommandOrControl+Shift+A'}
              onChange={(e) => handleConfigChange('shortcuts.toggleMainWindow', e.target.value)}
              placeholder="例如: Ctrl+Shift+A"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">设置全局快捷键来快速唤醒AI助手</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVoiceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">语音功能</h3>
        {/* 后端语音模型（当后端供给时可一键设置） */}
        <BackendVoiceSection />
        
        {/* 语音识别模型选择 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                语音识别模型
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                当前模型: {config?.voice?.recognition?.model === 'browser' ? '浏览器原生' : 
                          config?.voice?.recognition?.model === 'whisper' ? 'Whisper' : 
                          config?.voice?.recognition?.model === 'funasr' ? 'FunASR' : '未知'}
              </p>
            </div>
            <button
              onClick={() => setShowVoiceRecognitionTest(true)}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <TestTube className="w-4 h-4" />
              <span>模型测试</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                选择模型
              </label>
              <select
                value={config?.voice?.recognition?.model || 'browser'}
                onChange={(e) => handleConfigChange('voice.recognition.model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
              >
                <option value="browser">浏览器原生</option>
                <option value="whisper">Whisper</option>
                <option value="funasr">FunASR</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                语言
              </label>
              <select
                value={config?.voice?.recognition?.language || 'zh-CN'}
                onChange={(e) => handleConfigChange('voice.recognition.language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
              >
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁体中文</option>
                <option value="en-US">English</option>
                <option value="ja-JP">日本語</option>
                <option value="ko-KR">한국어</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setShowVoiceRecognitionTest(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Mic className="w-4 h-4" />
                <span>测试所有模型</span>
              </button>
            </div>
          </div>

          {/* Whisper/FunASR 服务端点（可选）*/}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Whisper API URL</label>
              <input
                type="url"
                placeholder="http://127.0.0.1:9000/transcribe"
                value={config?.voice?.recognition?.whisper?.apiUrl || ''}
                onChange={(e) => handleConfigChange('voice.recognition.whisper.apiUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">FunASR API URL</label>
              <input
                type="url"
                placeholder="http://127.0.0.1:10095/inference"
                value={config?.voice?.recognition?.funasr?.apiUrl || ''}
                onChange={(e) => handleConfigChange('voice.recognition.funasr.apiUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用语音识别</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">允许通过语音与AI助手交互</p>
            </div>
            <input
              type="checkbox"
              checked={!!config.voice?.enabled}
              onChange={(e) => handleConfigChange('voice.enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用语音播放（TTS）</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">允许朗读AI回复内容</p>
            </div>
            <input
              type="checkbox"
              checked={!!config.voice?.synthesis?.enabled}
              onChange={(e) => handleConfigChange('voice.synthesis.enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">语音唤醒词</label>
            <input
              type="text"
              value={config?.voice?.recognition?.hotwords?.[0] ?? '小助手'}
              onChange={(e) => handleConfigChange('voice.recognition.hotwords', [e.target.value])}
              placeholder="例如: 小助手"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
          </div>

          {/* 语音诊断 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">语音诊断</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">一键检测浏览器语音能力、麦克风权限和TTS播放</p>
            <div className="flex items-center space-x-3 mb-3">
              <button
                type="button"
                onClick={async () => {
                  setVoiceDiag({ support: null, mic: null, tts: null, error: undefined });
                  try {
                    // Check support
                    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    const hasSR = !!SR;
                    const hasTTS = typeof window.speechSynthesis !== 'undefined';
                    // Mic permission via getUserMedia
                    let micStatus: 'granted' | 'denied' | 'prompt' | 'error' = 'prompt';
                    try {
                      if (navigator?.permissions && (navigator.permissions as any).query) {
                        const p: any = await (navigator.permissions as any).query({ name: 'microphone' as any });
                        micStatus = p.state as any;
                      }
                    } catch {}
                    // Request stream to actually ensure
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                      micStatus = 'granted';
                      stream.getTracks().forEach(t => t.stop());
                    } catch (e) {
                      micStatus = 'denied';
                    }
                    // TTS quick test (non-blocking)
                    let ttsOk = false;
                    if (hasTTS) {
                      try {
                        const u = new SpeechSynthesisUtterance('这是语音测试。This is a voice test.');
                        u.lang = config?.voice?.recognition?.language || 'zh-CN';
                        u.rate = 1;
                        u.volume = 1;
                        u.onstart = () => { ttsOk = true; };
                        window.speechSynthesis.speak(u);
                        // Cancel after a short delay to avoid long playback
                        setTimeout(() => {
                          try { window.speechSynthesis.cancel(); } catch {}
                        }, 1500);
                      } catch { ttsOk = false; }
                    }
                    setVoiceDiag({ support: hasSR && hasTTS, mic: micStatus, tts: hasTTS && ttsOk });
                    if (!(hasSR && hasTTS)) {
                      toast.error('当前环境不支持浏览器语音识别或合成');
                    } else if (micStatus !== 'granted') {
                      toast.error('麦克风权限未授予，请在系统设置中授权');
                    } else if (!(hasTTS && ttsOk)) {
                      toast.error('TTS 播放测试失败');
                    } else {
                      toast.success('语音诊断通过');
                    }
                  } catch (err: any) {
                    setVoiceDiag(prev => ({ ...prev, error: err?.message || String(err) }));
                    toast.error('语音诊断失败');
                  }
                }}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                运行语音测试
              </button>
              {voiceDiag && (
                <div className="text-xs text-gray-600 dark:text-gray-400 space-x-4">
                  <span>支持: {voiceDiag.support == null ? '-' : voiceDiag.support ? '是' : '否'}</span>
                  <span>麦克风: {voiceDiag.mic ?? '-'}</span>
                  <span>TTS: {voiceDiag.tts == null ? '-' : voiceDiag.tts ? '可用' : '不可用'}</span>
                </div>
              )}
            </div>
            {voiceDiag?.error && (
              <div className="text-xs text-red-600 dark:text-red-400">{voiceDiag.error}</div>
            )}

            {/* 麦克风音频输入测试（不依赖 Web Speech） */}
            <div className="mt-4">
              <div className="flex items-center space-x-3 mb-2">
                <button
                  type="button"
                  onClick={async () => {
                    setMicError('');
                    if (micTesting) {
                      stopMicTest();
                      return;
                    }
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                      micStreamRef.current = stream;
                      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
                      const ctx = new Ctx();
                      audioCtxRef.current = ctx;
                      const src = ctx.createMediaStreamSource(stream);
                      const analyser = ctx.createAnalyser();
                      analyser.fftSize = 2048;
                      analyserRef.current = analyser;
                      src.connect(analyser);
                      const data = new Uint8Array(analyser.frequencyBinCount);
                      const update = () => {
                        if (!analyserRef.current) return;
                        analyserRef.current.getByteTimeDomainData(data);
                        // Compute RMS from time-domain data
                        let sum = 0;
                        for (let i = 0; i < data.length; i++) {
                          const v = (data[i] - 128) / 128; // -1..1
                          sum += v * v;
                        }
                        const rms = Math.sqrt(sum / data.length); // 0..1
                        setMicLevel(Math.min(100, Math.round(rms * 140)));
                        rafRef.current = requestAnimationFrame(update);
                      };
                      setMicTesting(true);
                      update();
                    } catch (e: any) {
                      setMicError(e?.message || '启动麦克风测试失败');
                      setMicTesting(false);
                    }
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${micTesting ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  {micTesting ? '停止麦克风测试' : '开始麦克风测试'}
                </button>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded">
                  <div
                    className="h-2 rounded bg-green-500 transition-all"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
                <span className="text-xs w-10 text-right text-gray-600 dark:text-gray-400">{micLevel}%</span>
              </div>
              {micError && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">{micError}</div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">此测试验证音频输入与电平，不做语音转文字。可结合 Whisper/FunASR 服务做识别。</p>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">提示：语音识别依赖浏览器的 Web Speech API。在部分系统/Electron 版本中可能不可用。</p>
          </div>
        </div>
      </div>
    </div>
  );

  const BackendVoiceSection: React.FC = () => {
    const [sttModels, setSttModels] = useState<string[]>([]);
    const [ttsModels, setTtsModels] = useState<string[]>([]);
    const [sttSel, setSttSel] = useState<string>('');
    const [ttsSel, setTtsSel] = useState<string>('');
    useEffect(()=>{
      (async()=>{
        try{
          const res = await apiClient.getVoiceModels();
          if (res?.success){
            setSttModels(res.data.stt.models||[]); setTtsModels(res.data.tts.models||[]);
            setSttSel(res.data.stt.default||''); setTtsSel(res.data.tts.default||'');
          }
        }catch{}
      })();
    },[]);
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">后端语音模型</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-2">STT 模型</label>
            <select value={sttSel} onChange={(e)=>setSttSel(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300">
              {sttModels.map(m=> <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">TTS 模型</label>
            <select value={ttsSel} onChange={(e)=>setTtsSel(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300">
              {ttsModels.map(m=> <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={async()=>{
                try{
                  const cfg = await apiClient.getModelsConfig();
                  const data = cfg?.data || {};
                  data.voice = data.voice || {}; data.voice.stt = data.voice.stt || {}; data.voice.tts = data.voice.tts || {};
                  data.voice.stt.selected_model = sttSel; data.voice.tts.selected_model = ttsSel;
                  await apiClient.updateModelsConfig(data);
                  toast.success('已设置后端默认语音模型');
                }catch(e:any){ toast.error('设置后端语音模型失败: ' + (e?.message || String(e))); }
              }}
              className="px-3 py-2 h-10 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              设为后端默认（语音）
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAISettings = () => (
    <AISettingsSection
      config={config}
      disabled={modelLock}
      onChange={(next) => {
        updateConfig({ ai: next.ai });
        setHasUnsavedChanges(true);
      }}
    />
  );

  const renderAIImageSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">AI 图片识别配置</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 路由模式（继承/前端/后端） */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">调用路由</label>
            <select
              value={config?.aiImage?.routingMode ?? 'inherit'}
              onChange={(e) => handleConfigChange('aiImage.routingMode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="inherit">继承全局</option>
              <option value="frontend">前端直连（图片模型）</option>
              <option value="backend">后端服务（使用后端场景模型）</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={!!config?.aiImage?.enabled}
                onChange={(e) => handleConfigChange('aiImage.enabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">启用 AI 图片识别</span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">提供商</label>
            <select
              value={config?.aiImage?.provider ?? 'local'}
              onChange={(e) => handleConfigChange('aiImage.provider', e.target.value)}
              disabled={config?.aiImage?.routingMode === 'backend' || modelLock}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="local">本地（Ollama）</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">选择图片识别使用的模型提供商</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">模型</label>
            <input
              type="text"
              value={config?.aiImage?.model ?? 'qwen2.5vl:latest'}
              onChange={(e) => handleConfigChange('aiImage.model', e.target.value)}
              disabled={config?.aiImage?.routingMode === 'backend' || modelLock}
              placeholder="例如: qwen2.5vl:latest"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">支持视觉的多模态模型</p>
          </div>

          {config?.aiImage?.routingMode === 'backend' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">后端提供商</label>
                <select
                  value={(config as any)?.aiImage?.backendProvider || ''}
                  onChange={(e)=>handleConfigChange('aiImage.backendProvider', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                >
                  <option value="">（由后端默认/场景决定）</option>
                  <option value="dashscope">dashscope（阿里云）</option>
                  <option value="local">local（Ollama）</option>
                </select>
              </div>
              <BackendVisionSelector />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API 地址</label>
            <input
              type="text"
              value={config?.aiImage?.apiUrl ?? 'http://127.0.0.1:11434/api/generate'}
              onChange={(e) => handleConfigChange('aiImage.apiUrl', e.target.value)}
              disabled={config?.aiImage?.routingMode === 'backend' || modelLock}
              placeholder="http://127.0.0.1:11434/api/generate (Ollama)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API 密钥</label>
            <input
              type="password"
              value={config?.aiImage?.apiKey ?? ''}
              onChange={(e) => handleConfigChange('aiImage.apiKey', e.target.value)}
              disabled={config?.aiImage?.routingMode === 'backend' || modelLock}
              placeholder="输入API密钥（本地模型可为空）"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">温度 (0.0-2.0)</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config?.aiImage?.temperature ?? 0.1}
              onChange={(e) => handleConfigChange('aiImage.temperature', parseFloat(e.target.value))}
              className="w-full"
              disabled={modelLock}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">当前: {config?.aiImage?.temperature ?? 0.1}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">最大 Token</label>
            <input
              type="number"
              min="100"
              max="8000"
              value={config?.aiImage?.maxTokens ?? 1000}
              onChange={(e) => handleConfigChange('aiImage.maxTokens', parseInt(e.target.value))}
              disabled={modelLock}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
          </div>

          {((config?.aiImage as any)?.routingMode || 'inherit') !== 'backend' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">系统提示词（图片识别专用）</label>
              <textarea
                value={config?.aiImage?.systemPrompt ?? ''}
                onChange={(e) => handleConfigChange('aiImage.systemPrompt', e.target.value)}
                rows={4}
                placeholder="你是一个专业的医疗信息提取助手。请从医疗文档截图中提取患者信息，包括姓名、年龄、性别、患者ID、科室、主诉、诊断和病史。请以JSON格式返回结果。"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">专门用于图片识别的提示词（仅前端直连模式生效）。后端转发模式请在下方“后端视觉提示词”中编辑。</p>
            </div>
          )}

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  toast.info('正在测试图片识别连接...');
                  // 创建一张简单测试图（用于连通性校验）
                  const canvas = document.createElement('canvas');
                  canvas.width = 200; canvas.height = 100;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, 200, 100);
                    ctx.fillStyle = '#333'; ctx.font = '16px Arial';
                    ctx.fillText('测试图片', 50, 50); ctx.fillText('Test Image', 50, 70);
                  }
                  const testImageData = canvas.toDataURL('image/png');

                  const routing = (config?.aiImage as any)?.routingMode || 'inherit';
                  const globalRouting = (config?.ai as any)?.routingMode || 'frontend';
                  const useBackend = routing === 'backend' || (routing === 'inherit' && globalRouting === 'backend');

                  if (useBackend) {
                    // 后端模式：通过 visionAdapter 调用 /v1/vision/understand
                    const { visionAdapter } = await import('../../services/adapters/vision-adapter');
                    const backendProvider = (config as any)?.aiImage?.backendProvider || 'dashscope';
                    const backendModel = (config as any)?.aiImage?.backendModel || undefined;
                    const scene = (config as any)?.aiImage?.backendScene || (backendProvider === 'dashscope' ? 'screen_recognition_aliyun' : 'screen_recognition');
                    const res = await visionAdapter.understandImage({
                      imageData: testImageData,
                      imageMime: 'image/png',
                      prompt: (config?.aiImage as any)?.systemPrompt || '请提取患者核心信息（姓名/性别/年龄/病历号/主诉/诊断/病史）并返回严格 JSON',
                      provider: backendProvider as any,
                      model: backendModel,
                      strictJson: true,
                      schemaName: 'patient_info_v1',
                      scene,
                    });
                    console.log('✅ 后端模式识别成功：', res);
                    const desc = (res as any)?.description || '';
                    toast.success(`后端识别成功（${backendProvider}/${backendModel||'默认'}）：${desc.substring(0, 120)}...`);
                  } else {
                    // 前端直连：保留原逻辑（本地/OAI 兼容）
                    const isLocal = (config?.aiImage?.provider || 'local') === 'local';
                    let endpoint = config?.aiImage?.apiUrl || (isLocal ? 'http://127.0.0.1:11434/api/generate' : '');
                    if (isLocal) {
                      try { const u = new URL(endpoint);
                        if (u.pathname.startsWith('/v1')) endpoint = `${u.origin}/api/generate`;
                        else if (!u.pathname.startsWith('/api/generate')) endpoint = `${u.origin}/api/generate`;
                      } catch { endpoint = 'http://127.0.0.1:11434/api/generate'; }
                    }
                    let payload: any;
                    if (isLocal) {
                      payload = {
                        model: config?.aiImage?.model || 'qwen2.5vl:latest',
                        prompt: (config?.aiImage?.systemPrompt || '请描述图片内容并指出可识别的信息。'),
                        images: [testImageData.split(',')[1]],
                        stream: false,
                        format: 'json',
                        options: { temperature: config?.aiImage?.temperature || 0.1, num_predict: config?.aiImage?.maxTokens || 1000 }
                      };
                    } else {
                      payload = {
                        model: config?.aiImage?.model || 'gpt-4o-mini',
                        messages: [
                          { role: 'system', content: config?.aiImage?.systemPrompt || '你是一个专业的医疗信息提取助手。' },
                          { role: 'user', content: [ { type: 'text', text: '请描述这张图片的内容，并说明你能识别哪些信息。' }, { type: 'image_url', image_url: { url: testImageData } } ] }
                        ],
                        temperature: config?.aiImage?.temperature || 0.1,
                        max_tokens: config?.aiImage?.maxTokens || 1000,
                        stream: false
                      };
                    }
                    console.log('🔍 发送图片识别测试请求:', { endpoint, payload });
                    const response = await fetch(endpoint || (config?.aiImage?.apiUrl ?? ''), {
                      method: 'POST', headers: { 'Content-Type': 'application/json', ...(config?.aiImage?.apiKey && { 'Authorization': `Bearer ${config.aiImage.apiKey}` }) }, body: JSON.stringify(payload)
                    });
                    console.log('🔍 图片识别测试响应状态:', response.status);
                    if (!response.ok) { const errorText = await response.text(); throw new Error(`HTTP ${response.status}: ${errorText}`); }
                    const result = await response.json();
                    console.log('✅ 图片识别测试成功:', result);
                    const content = isLocal ? (result?.response || '') : (result.choices?.[0]?.message?.content || '');
                    toast.success(`前端直连识别成功：${content.substring(0, 120)}...`);
                  }
                } catch (e) {
                  console.error('❌ 图片识别测试失败:', e);
                  toast.error(`测试图片识别失败: ${e instanceof Error ? e.message : '未知错误'}`);
                }
              }}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              测试图片识别连接
            </button>
          </div>

          {config?.aiImage?.routingMode === 'backend' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择本地图片（后端识别测试）</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-gray-700 dark:text-gray-300"
                onChange={async (e)=>{
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try{
                    // 使用 FileReader 以避免大文件触发最大调用栈
                    const dataUrl: string = await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result || ''));
                      reader.onerror = (err) => reject(err);
                      reader.readAsDataURL(file);
                    });
                    const scene = ((config as any)?.aiImage?.backendScene) || (((config as any)?.aiImage?.backendProvider)==='dashscope' ? 'screen_recognition_aliyun' : 'screen_recognition');
                    const { visionAdapter } = await import('../../services/adapters/vision-adapter');
                    const res = await visionAdapter.understandImage({
                      imageData: dataUrl,
                      imageMime: file.type || 'image/png',
                      // 后端模式下不再从前端注入系统提示词，完全由后端场景提示词控制
                      prompt: '',
                      provider: (((config as any)?.aiImage?.backendProvider)||'dashscope') as any,
                      model: ((config as any)?.aiImage?.backendModel)||undefined,
                      strictJson: true,
                      // 启用兜底（OCR+LLM / 正则）以提升结构化命中
                      allowFallback: true,
                      scene,
                      schemaName: 'patient_info_v1',
                    });
                    console.log('✅ 后端识别详情：', res);
                    setLastVisionResult(res);
                    toast.success('后端识别成功：' + (res?.description||'')?.slice(0,120));
                  }catch(err:any){
                    setLastVisionResult(null);
                    toast.error('后端识别失败：' + (err?.message||String(err)));
                  }
                }}
              />
              {lastVisionResult && (
                <div className="mt-3 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <div className="text-xs text-muted-foreground mb-1">后端识别结果（调试）</div>
                  <div className="text-sm whitespace-pre-wrap break-words mb-2">{lastVisionResult.description || ''}</div>
                  {lastVisionResult.details?.structured && (
                    <pre className="text-xs overflow-auto max-h-48 p-2 rounded bg-white/50 dark:bg-black/30 border border-gray-200 dark:border-gray-700">
{JSON.stringify(lastVisionResult.details.structured, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 后端视觉提示词（来自 /v1/scenarios -> prompt_id -> /v1/prompts/{id}） */}
      {config?.aiImage?.routingMode === 'backend' && (
        <BackendVisionPromptEditor />
      )}
    </div>
  );

  const BackendVisionSelector: React.FC = () => {
    const [visionModels, setVisionModels] = useState<string[]>([]);
    const [selected, setSelected] = useState<string>('');
    useEffect(()=>{
      (async()=>{
        try{
          const res = await apiClient.getVisionModels();
          if (res?.success){
            setVisionModels(res.data.models||[]);
            setSelected(res.data.default||'');
          }
        }catch{}
      })();
    },[]);
    return (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">后端视觉模型</label>
          <select value={selected} onChange={(e)=>setSelected(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300">
            {visionModels.map(m=> <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={async ()=>{
              try{
                await apiClient.applyModelPreset({ screen_recognition: { model_name: selected } });
                toast.success('已设置后端默认视觉模型');
              }catch(e:any){ toast.error('设置后端视觉模型失败: ' + (e?.message||String(e))); }
            }}
            className="px-3 py-2 h-10 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            设为后端默认（视觉）
          </button>
        </div>
      </>
    );
  };

  const BackendVisionPromptEditor: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [promptId, setPromptId] = useState<string>('');
    const [activeVersion, setActiveVersion] = useState<string>('');
    const [systemText, setSystemText] = useState<string>('');
    const [saveMsg, setSaveMsg] = useState<string>('');

    useEffect(() => {
      (async () => {
        try {
          setLoading(true);
          // 1) 读取场景，定位 screen_recognition_aliyun 优先
          const scRes = await fetch(`${API_ORIGIN}/v1/scenarios`);
          const scJson = scRes.ok ? await scRes.json() : { data: [] };
          const scenes = (scJson?.data || []) as any[];
          const sceneName = (config as any)?.aiImage?.backendScene || 'screen_recognition_aliyun';
          const s = scenes.find(x => x.name === sceneName) || scenes.find(x => x.name === 'screen_recognition');
          const pid = s?.prompt_id || 'screen_recognition_cn';
          setPromptId(pid);
          // 2) 读取 prompt 内容
          const pRes = await fetch(`${API_ORIGIN}/v1/prompts/${pid}`);
          if (pRes.ok) {
            const pJson = await pRes.json();
            const p = pJson?.data;
            const ver = p?.active_version || (p?.versions?.[0]?.version || '');
            setActiveVersion(ver);
            const verObj = (p?.versions || []).find((v: any) => v.version === ver) || p?.versions?.[0];
            setSystemText(verObj?.system || '');
          }
        } catch (e) {
          console.warn('Load backend vision prompt failed', e);
        } finally {
          setLoading(false);
        }
      })();
    }, [config?.aiImage?.backendScene]);

    const save = async () => {
      try {
        setSaveMsg(''); setLoading(true);
        const newVer = new Date().toISOString().replace(/[:.Z-]/g, '').slice(0,14);
        // 写入新版本
        await fetch(`${API_ORIGIN}/v1/prompts/${promptId}/versions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: newVer, language: 'zh-CN', system: systemText, metadata: { updated_by: 'ui' } })
        });
        // 发布为 active_version
        await fetch(`${API_ORIGIN}/v1/prompts/${promptId}/publish?version=${encodeURIComponent(newVer)}`, { method: 'POST' });
        setActiveVersion(newVer);
        setSaveMsg('已保存并发布');
        toast.success('后端视觉提示词已更新');
      } catch (e: any) {
        setSaveMsg('保存失败: ' + (e?.message || String(e)));
        toast.error('保存提示词失败');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="mt-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">后端视觉提示词（场景注入）</h4>
          <div className="text-xs text-gray-500 dark:text-gray-400">{loading ? '加载中…' : `Prompt: ${promptId} · 版本: ${activeVersion || '-'}`}</div>
        </div>
        <textarea
          value={systemText}
          onChange={(e)=>setSystemText(e.target.value)}
          className="w-full h-40 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          placeholder="请在此定义结构化抽取规则与返回格式（仅系统提示词）"
        />
        <div className="mt-2 flex items-center space-x-2">
          <button type="button" onClick={save} disabled={loading} className="px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">保存并发布</button>
          {saveMsg && <span className="text-xs text-gray-500 dark:text-gray-400">{saveMsg}</span>}
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">提示：后端将优先使用此处提示词（来自场景绑定的 prompt）。前端不再注入系统提示词。</p>
      </div>
    );
  };

  const renderAIRecommendSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">AI 推荐配置</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={!!config?.aiRecommend?.enabled}
                onChange={(e) => handleConfigChange('aiRecommend.enabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">启用 AI 推荐（诊断/用药/检查）</span>
            </label>
          </div>

          {/* 路由模式（继承/前端/后端） */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">调用路由</label>
            <select
              value={config?.aiRecommend?.routingMode ?? 'inherit'}
              onChange={(e) => handleConfigChange('aiRecommend.routingMode', e.target.value)}
              className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
            >
              <option value="inherit">继承全局</option>
              <option value="frontend">前端直连（OpenAI 兼容）</option>
              <option value="backend">后端服务（使用后端场景模型）</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">提供商</label>
            <select
              value={config?.aiRecommend?.provider ?? 'local'}
              onChange={(e) => handleConfigChange('aiRecommend.provider', e.target.value)}
              disabled={config?.aiRecommend?.routingMode === 'backend' || modelLock}
              className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
            >
              <option value="local">本地（Ollama）</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API 地址</label>
            <input
              type="text"
              value={config?.aiRecommend?.apiUrl ?? 'http://127.0.0.1:11434/v1/chat/completions'}
              onChange={(e) => handleConfigChange('aiRecommend.apiUrl', e.target.value)}
              disabled={config?.aiRecommend?.routingMode === 'backend' || modelLock}
              className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API 密钥</label>
            <input
              type="password"
              value={config?.aiRecommend?.apiKey ?? ''}
              onChange={(e) => handleConfigChange('aiRecommend.apiKey', e.target.value)}
              disabled={config?.aiRecommend?.routingMode === 'backend' || modelLock}
              className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">温度</label>
            <input
              type="number"
              step="0.1"
              value={config?.aiRecommend?.temperature ?? 0.3}
              onChange={(e) => handleConfigChange('aiRecommend.temperature', parseFloat(e.target.value))}
              disabled={config?.aiRecommend?.routingMode === 'backend' || modelLock}
              className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">最大Tokens</label>
            <input
              type="number"
              value={config?.aiRecommend?.maxTokens ?? 1200}
              onChange={(e) => handleConfigChange('aiRecommend.maxTokens', parseInt(e.target.value))}
              disabled={config?.aiRecommend?.routingMode === 'backend' || modelLock}
              className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
            />
          </div>

          {/* 诊断 */}
          <div className="md:col-span-2 border-t pt-4">
            <h4 className="font-medium mb-3">诊断模型</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={config?.aiRecommend?.diagnosisModel ?? ''}
                onChange={(e) => handleConfigChange('aiRecommend.diagnosisModel', e.target.value)}
                disabled={config?.aiRecommend?.routingMode === 'backend' || modelLock}
                placeholder="模型名称"
                className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
              />
              <input
                type="text"
                value={config?.aiRecommend?.diagnosisPrompt ?? ''}
                onChange={(e) => handleConfigChange('aiRecommend.diagnosisPrompt', e.target.value)}
                disabled={config?.aiRecommend?.routingMode === 'backend' || modelLock}
                placeholder="可选：诊断提示词覆盖"
                className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
              />
            </div>
          </div>

          {/* 检查 */}
          <div className="md:col-span-2">
            <h4 className="font-medium mb-3">检查模型</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={config?.aiRecommend?.examModel ?? ''}
                onChange={(e) => handleConfigChange('aiRecommend.examModel', e.target.value)}
                disabled={config?.aiRecommend?.routingMode === 'backend' || modelLock}
                placeholder="模型名称"
                className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
              />
              <input
                type="text"
                value={config?.aiRecommend?.examPrompt ?? ''}
                onChange={(e) => handleConfigChange('aiRecommend.examPrompt', e.target.value)}
                disabled={config?.aiRecommend?.routingMode === 'backend' || modelLock}
                placeholder="可选：检查提示词覆盖"
                className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
              />
            </div>
          </div>

          {/* 用药 */}
          <div className="md:col-span-2">
            <h4 className="font-medium mb-3">用药模型</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={config?.aiRecommend?.medicationModel ?? ''}
                onChange={(e) => handleConfigChange('aiRecommend.medicationModel', e.target.value)}
                disabled={config?.aiRecommend?.routingMode === 'backend' || modelLock}
                placeholder="模型名称"
                className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
              />
              <input
                type="text"
                value={config?.aiRecommend?.medicationPrompt ?? ''}
                onChange={(e) => handleConfigChange('aiRecommend.medicationPrompt', e.target.value)}
                disabled={config?.aiRecommend?.routingMode === 'backend' || modelLock}
                placeholder="可选：用药提示词覆盖"
                className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWebSearchSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">网络搜索配置</h3>
        
        {/* 网络搜索状态 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                网络搜索功能
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                当前状态: {config?.ai?.webSearch?.enabled ? '已启用' : '已禁用'} | 
                提供商: {config?.ai?.webSearch?.provider || 'duckduckgo'} | 
                工具调用: {config?.ai?.toolsEnabled ? '已启用' : '已禁用'}
              </p>
              <div className="mt-2 flex items-center space-x-3">
                <button
                  type="button"
                  disabled={!config?.ai?.webSearch?.enabled || webSearchTesting}
                  onClick={async () => {
                    setWebSearchTesting(true);
                    setWebSearchTestResult(null);
                    try {
                      let res: any;
                      const routing = (config?.ai?.webSearch as any)?.routingMode || 'inherit';
                      const globalRouting = (config?.ai as any)?.routingMode || 'frontend';
                      const useBackend = routing === 'backend' || (routing === 'inherit' && globalRouting === 'backend');
                      if (useBackend) {
                        const origin = (() => { try { const u = new URL((import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8010/api'); return u.origin; } catch { return 'http://127.0.0.1:8010'; } })();
                        const r = await fetch(`${origin}/v1/tools/search?q=${encodeURIComponent('测试')}&provider=${config?.ai?.webSearch?.provider || 'duckduckgo'}&max_results=2`);
                        res = await r.json();
                      } else {
                        res = await (window as any).electronAPI?.ai?.searchWeb?.('测试', 2);
                      }
                      if (res?.success) {
                        const cnt = res?.data?.results?.length ?? 0;
                        setWebSearchTestResult({ ok: true, detail: `成功，返回 ${cnt} 条结果` });
                        toast.success('网络搜索测试通过');
                      } else {
                        setWebSearchTestResult({ ok: false, detail: res?.error || '未知错误' });
                        toast.error('网络搜索测试失败');
                      }
                    } catch (e: any) {
                      setWebSearchTestResult({ ok: false, detail: e?.message || String(e) });
                      toast.error('网络搜索测试出错');
                    } finally {
                      setWebSearchTesting(false);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md ${(!config?.ai?.webSearch?.enabled || webSearchTesting) ? 'bg-gray-300 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {webSearchTesting ? '测试中...' : '测试网络搜索'}
                </button>
                {webSearchTestResult && (
                  <span className={`text-xs ${webSearchTestResult.ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {webSearchTestResult.ok ? '通过' : '失败'}：{webSearchTestResult.detail}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={!!config?.ai?.webSearch?.enabled}
                onChange={(e) => handleConfigChange('ai.webSearch.enabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">启用网络搜索功能</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              允许 AI 助手搜索网络获取最新信息
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={!!config?.ai?.toolsEnabled}
                onChange={(e) => handleConfigChange('ai.toolsEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">启用工具调用</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              允许 AI 模型调用外部工具（如网络搜索）
            </p>
          </div>
        </div>

        {/* 快速配置按钮 */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">高级配置</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                配置搜索提供商、API 密钥等详细设置
              </p>
            </div>
            <button
              onClick={() => setShowWebSearchSettings(true)}
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              详细设置
            </button>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">使用说明</h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• 网络搜索功能需要支持工具调用的 AI 模型（如 qwen3、llama3.2 等）</li>
            <li>• 默认使用 DuckDuckGo 搜索（免费，无需 API Key）</li>
            <li>• 可以配置 Google、Bing 等付费搜索服务获得更好的结果</li>
            <li>• AI 会在需要最新信息时自动调用网络搜索</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderOneClickSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">一键流程配置</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={!!config?.oneClick?.enabled} onChange={(e)=>handleConfigChange('oneClick.enabled', e.target.checked)} className="w-4 h-4" />
          <span>启用一键流程</span>
        </label>
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={!!config?.oneClick?.showScreenshot} onChange={(e)=>handleConfigChange('oneClick.showScreenshot', e.target.checked)} className="w-4 h-4" />
          <span>显示截图</span>
        </label>
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={!!config?.oneClick?.showPatientInfo} onChange={(e)=>handleConfigChange('oneClick.showPatientInfo', e.target.checked)} className="w-4 h-4" />
          <span>显示患者信息</span>
        </label>
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={!!config?.oneClick?.allowFollowUp} onChange={(e)=>handleConfigChange('oneClick.allowFollowUp', e.target.checked)} className="w-4 h-4" />
          <span>允许后续对话</span>
        </label>
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={!!config?.oneClick?.followUpModelSameAsRecommend} onChange={(e)=>handleConfigChange('oneClick.followUpModelSameAsRecommend', e.target.checked)} className="w-4 h-4" />
          <span>后续对话沿用推荐模型</span>
        </label>

        <div className="md:col-span-2">
          <div className="text-sm text-gray-600 mb-2">生成内容（勾选生成）</div>
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center space-x-2">
              <input type="checkbox" checked={!!config?.oneClick?.generate?.diagnosis} onChange={(e)=>handleConfigChange('oneClick.generate.diagnosis', e.target.checked)} />
              <span>诊断</span>
            </label>
            <label className="inline-flex items-center space-x-2">
              <input type="checkbox" checked={!!config?.oneClick?.generate?.exam} onChange={(e)=>handleConfigChange('oneClick.generate.exam', e.target.checked)} />
              <span>检查</span>
            </label>
            <label className="inline-flex items-center space-x-2">
              <input type="checkbox" checked={!!config?.oneClick?.generate?.medication} onChange={(e)=>handleConfigChange('oneClick.generate.medication', e.target.checked)} />
              <span>用药</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">提供商</label>
          <select value={config?.oneClick?.provider ?? 'local'} onChange={(e)=>handleConfigChange('oneClick.provider', e.target.value)} disabled={(config?.oneClick?.routingMode || 'inherit') === 'backend' || modelLock} className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300">
            <option value="local">本地（Ollama）</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">调用路由</label>
          <select value={config?.oneClick?.routingMode ?? 'inherit'} onChange={(e)=>handleConfigChange('oneClick.routingMode', e.target.value)} className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300">
            <option value="inherit">继承全局</option>
            <option value="frontend">前端直连（用上面 Provider/模型）</option>
            <option value="backend">后端服务（使用后端场景模型）</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">API 地址</label>
          <input type="text" value={config?.oneClick?.apiUrl ?? 'http://127.0.0.1:11434/v1/chat/completions'} onChange={(e)=>handleConfigChange('oneClick.apiUrl', e.target.value)} disabled={(config?.oneClick?.routingMode || 'inherit') === 'backend' || modelLock} className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">模型</label>
          <input type="text" value={config?.oneClick?.model ?? 'qwen3:30b'} onChange={(e)=>handleConfigChange('oneClick.model', e.target.value)} disabled={(config?.oneClick?.routingMode || 'inherit') === 'backend' || modelLock} className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">温度</label>
          <input type="number" step="0.1" value={config?.oneClick?.temperature ?? 0.3} onChange={(e)=>handleConfigChange('oneClick.temperature', parseFloat(e.target.value))} disabled={modelLock} className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">最大Tokens</label>
          <input type="number" value={config?.oneClick?.maxTokens ?? 1500} onChange={(e)=>handleConfigChange('oneClick.maxTokens', parseInt(e.target.value))} disabled={modelLock} className="w-full px-3 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300" />
        </div>
        <div className="md:col-span-2">
          <label className="inline-flex items-center space-x-2">
            <input type="checkbox" checked={!!config?.oneClick?.voiceTrigger} onChange={(e)=>handleConfigChange('oneClick.voiceTrigger', e.target.checked)} />
            <span>语音唤起（预留）</span>
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="inline-flex items-center space-x-2">
            <input type="checkbox" checked={!!config?.oneClick?.exposeInAssistant} onChange={(e)=>handleConfigChange('oneClick.exposeInAssistant', e.target.checked)} />
            <span>在 AI 助手页面显示“一键完成”按钮</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderDesktopSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">桌面识别功能</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用桌面识别</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">允许AI助手识别和分析桌面内容</p>
            </div>
            <input
              type="checkbox"
              checked={!!config.desktopRecognition?.enabled}
              onChange={(e) => handleConfigChange('desktopRecognition.enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">自动分析截图</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">截图后自动进行AI分析</p>
            </div>
            <input
              type="checkbox"
              checked={config?.desktopRecognition?.sensitiveDataFilter ?? true}
              onChange={(e) => handleConfigChange('desktopRecognition.autoAnalyze', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">监控间隔（秒）</label>
            <input
              type="number"
              min="5"
              max="300"
              value={config?.desktopRecognition?.screenCaptureInterval ? Math.floor(config.desktopRecognition.screenCaptureInterval / 1000) : 5}
              onChange={(e) => handleConfigChange('desktopRecognition.screenCaptureInterval', parseInt(e.target.value) * 1000)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">自动截图的时间间隔</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">截图质量</label>
            <select
              value={config?.desktopRecognition?.confidenceThreshold ?? 0.8}
              onChange={(e) => handleConfigChange('desktopRecognition.screenshotQuality', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="low">低质量（快速）</option>
              <option value="medium">中等质量</option>
              <option value="high">高质量（精确）</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMedicalSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">医疗系统集成</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用医疗系统</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">连接到医疗管理系统</p>
            </div>
            <input
              type="checkbox"
              checked={!!config.medical?.enabled}
              onChange={(e) => handleConfigChange('medical.enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API端点</label>
            <input
              type="url"
              value={config?.medical?.apiUrl ?? 'http://localhost:3001/api'}
              onChange={(e) => handleConfigChange('medical.apiUrl', e.target.value)}
              placeholder="https://api.medical-system.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API密钥</label>
            <input
              type="password"
              value={config.medical.apiKey}
              onChange={(e) => handleConfigChange('medical.apiKey', e.target.value)}
              placeholder="输入API密钥"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">数据同步间隔（分钟）</label>
            <input
              type="number"
              min="1"
              max="60"
              value={config?.medical?.timeout ? Math.floor(config.medical.timeout / 1000) : 10}
              onChange={(e) => handleConfigChange('medical.timeout', parseInt(e.target.value) * 1000)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderBishengSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Bisheng 智能体平台</h3>

        <div className="space-y-4">
          {/* 路由说明（智能体固定使用后端） */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              调用路由：后端服务（固定）。智能体功能通过后端 /v1/agent/* 接口接入，不支持前端直连。
            </p>
          </div>
          {/* 服务状态指示器 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <BishengStatusIndicator showLabel={true} autoRefresh={true} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用智能体服务</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">连接到 Bisheng 智能体平台</p>
            </div>
            <input
              type="checkbox"
              checked={!!config.bisheng?.enabled}
              onChange={(e) => handleConfigChange('bisheng.enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API 地址</label>
              <input
                type="url"
                value={config?.bisheng?.baseUrl ?? 'http://localhost:7860'}
                onChange={(e) => handleConfigChange('bisheng.baseUrl', e.target.value)}
                placeholder="http://localhost:7860"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bisheng 后端 API 地址</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">前端地址</label>
              <input
                type="url"
                value={config?.bisheng?.frontendUrl ?? 'http://localhost:3001'}
                onChange={(e) => handleConfigChange('bisheng.frontendUrl', e.target.value)}
                placeholder="http://localhost:3001"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bisheng 前端页面地址 (iframe 模式需要)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">用户名</label>
              <input
                type="text"
                value={config?.bisheng?.username ?? ''}
                onChange={(e) => handleConfigChange('bisheng.username', e.target.value)}
                placeholder="请输入用户名或邮箱"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">密码</label>
              <input
                type="password"
                value={config?.bisheng?.password ?? ''}
                onChange={(e) => handleConfigChange('bisheng.password', e.target.value)}
                placeholder="请输入密码"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Access Token (可选)
            </label>
            <input
              type="password"
              value={config?.bisheng?.accessToken ?? ''}
              onChange={(e) => handleConfigChange('bisheng.accessToken', e.target.value)}
              placeholder="如果登录失败，请直接粘贴有效的 Token"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              如果登录功能不可用（服务器返回 "Decryption failed"），请直接配置有效的 Token
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">接入方式</label>
            <select
              value={config?.bisheng?.mode ?? 'api'}
              onChange={(e) => handleConfigChange('bisheng.mode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="api">API 调用</option>
              <option value="iframe">iframe 嵌入</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              API 模式使用自定义界面，iframe 模式直接嵌入 Bisheng 原生界面
            </p>
          </div>

          {config?.bisheng?.mode === 'iframe' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">iframe 代理端口</label>
              <input
                type="number"
                min="1024"
                max="65535"
                value={config?.bisheng?.iframeProxyPort ?? 3002}
                onChange={(e) => handleConfigChange('bisheng.iframeProxyPort', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                iframe 代理服务器端口 (默认 3002)
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">自动登录</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">启动时自动登录</p>
              </div>
              <input
                type="checkbox"
                checked={!!config?.bisheng?.autoLogin}
                onChange={(e) => handleConfigChange('bisheng.autoLogin', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">保存密码</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">本地保存密码(加密)</p>
              </div>
              <input
                type="checkbox"
                checked={!!config?.bisheng?.savePassword}
                onChange={(e) => handleConfigChange('bisheng.savePassword', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">请求超时（秒）</label>
            <input
              type="number"
              min="5"
              max="300"
              value={config?.bisheng?.timeout ? Math.floor(config.bisheng.timeout / 1000) : 120}
              onChange={(e) => handleConfigChange('bisheng.timeout', parseInt(e.target.value) * 1000)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
          </div>

          {/* 测试连接按钮 */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={async () => {
                  if (!config?.bisheng?.baseUrl || !config?.bisheng?.username || !config?.bisheng?.password) {
                    toast.error('请先填写完整的配置信息');
                    return;
                  }

                  const testToast = toast.loading('正在测试连接...');
                  
                  try {
                    // 测试登录
                    const response = await window.electronAPI.bisheng.login(
                      config.bisheng.username,
                      config.bisheng.password
                    );

                    if (response && response.token) {
                      toast.success('连接成功! Token 已获取', { id: testToast });

                      // 更新配置中的 token
                      handleConfigChange('bisheng.accessToken', response.token);
                      handleConfigChange('bisheng.tokenExpiry', response.expiry || Date.now() + 86400000);
                    } else {
                      toast.error('连接失败: 未获取到 Token', { id: testToast });
                    }
                  } catch (error: any) {
                    console.error('Bisheng 连接测试失败:', error);

                    // 特殊处理 Decryption failed 错误
                    if (error.message && error.message.includes('Decryption failed')) {
                      toast.error(
                        '登录失败: 服务器密码加密问题\n请直接在上方配置 Access Token',
                        { id: testToast, duration: 5000 }
                      );
                    } else {
                      toast.error(`连接失败: ${error.message || '未知错误'}`, { id: testToast });
                    }
                  }
                }}
                disabled={!config?.bisheng?.baseUrl || !config?.bisheng?.username || !config?.bisheng?.password}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                测试登录
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!config?.bisheng?.baseUrl || !config?.bisheng?.username || !config?.bisheng?.password) {
                    toast.error('请先填写完整的配置信息');
                    return;
                  }

                  const testToast = toast.loading('正在运行完整连接测试...');
                  
                  try {
                    // 运行完整的连接测试
                    const testResults = await window.electronAPI.bisheng.runConnectionTests();
                    
                    if (testResults.overall) {
                      toast.success(
                        `所有测试通过！\n登录: ✓\n工作流列表: ✓ (${testResults.workflowList.count}个)\n工作流调用: ${testResults.workflowInvoke?.success ? '✓' : '⚠️'}`,
                        { id: testToast, duration: 5000 }
                      );
                    } else {
                      const errorDetails = testResults.details.join('\n');
                      toast.error(
                        `测试失败：\n${errorDetails}`,
                        { id: testToast, duration: 8000 }
                      );
                    }
                    
                    // 显示详细结果在控制台
                    console.log('Bisheng 连接测试结果:', testResults);
                    
                  } catch (error: any) {
                    console.error('Bisheng 完整测试失败:', error);
                    toast.error(`测试失败: ${error.message || '未知错误'}`, { id: testToast });
                  }
                }}
                disabled={!config?.bisheng?.baseUrl || !config?.bisheng?.username || !config?.bisheng?.password}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                完整测试
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    // 保存配置
                    await handleSave();
                    
                    // 刷新页面以更新标签页状态
                    toast.success('配置已保存，正在刷新界面...');
                    setTimeout(() => {
                      window.location.reload();
                    }, 500);
                  } catch (error: any) {
                    console.error('保存配置失败:', error);
                    toast.error(`保存失败: ${error.message || '未知错误'}`);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                保存并刷新
              </button>
            </div>
            
            {/* 快速访问按钮 */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  const url = config?.bisheng?.baseUrl || 'http://localhost:7860';
                  window.open(url, '_blank');
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                打开 API 服务
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const url = config?.bisheng?.frontendUrl || 'http://localhost:3001';
                  window.open(url, '_blank');
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                打开前端页面
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const url = `${config?.bisheng?.baseUrl || 'http://localhost:7860'}/docs`;
                  window.open(url, '_blank');
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                API 文档
              </button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              使用说明
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>勾选"启用智能体服务"后，保存配置才能激活智能体标签页</li>
              <li>点击"测试连接"可以验证服务器地址和账号是否正确</li>
              <li>API 模式: 使用自定义对话界面，支持流式输出和 Markdown 渲染</li>
              <li>iframe 模式: 直接嵌入 Bisheng 原生界面，完整功能体验</li>
              <li>iframe 模式需要启动代理服务器，应用会自动处理</li>
              <li>保存配置后需要刷新界面才能看到标签页变化</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">高级设置</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">调试模式</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">启用详细日志记录</p>
            </div>
            <input
              type="checkbox"
              checked={config?.logging?.level === 'debug'}
              onChange={(e) => handleConfigChange('logging.level', e.target.checked ? 'debug' : 'info')}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">日志级别</label>
            <select
              value={config?.logging?.level ?? 'info'}
              onChange={(e) => handleConfigChange('logging.level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="error">错误</option>
              <option value="warn">警告</option>
              <option value="info">信息</option>
              <option value="debug">调试</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">最大日志文件大小（MB）</label>
            <input
              type="number"
              min="1"
              max="100"
              value={config?.logging?.maxFileSize ?? 10}
              onChange={(e) => handleConfigChange('logging.maxFileSize', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">自动更新</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">自动检查并安装更新</p>
            </div>
            <input
              type="checkbox"
              checked={config?.startup?.checkUpdates ?? true}
              onChange={(e) => handleConfigChange('startup.checkUpdates', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">配置管理</h3>

        <div className="flex space-x-4">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>导出配置</span>
          </button>

          <label className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>导入配置</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>重置设置</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSettings();
      case 'theme':
        return <ThemeSettings />;
      case 'voice':
        return renderVoiceSettings();
      case 'ai':
        return renderAISettings();
      case 'aiImage':
        return renderAIImageSettings();
      case 'aiRecommend':
        return renderAIRecommendSettings();
      case 'websearch':
        return renderWebSearchSettings();
      case 'oneClick':
        return renderOneClickSettings();
      case 'desktop':
        return renderDesktopSettings();
      case 'medical':
        return renderMedicalSettings();
      case 'bisheng':
        return renderBishengSettings();
      case 'advanced':
        return renderAdvancedSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header with navigation tabs */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">设置</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                配置您的桌面AI助手
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">有未保存的更改</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSaving ? '保存中...' : '保存设置'}</span>
              </button>
            </div>
          </div>

          {/* Navigation tabs - horizontal layout */}
          <nav className="flex space-x-2 overflow-x-auto">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  type="button"
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
                    ${isActive
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{section.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {renderContent()}
        </div>
      </div>

        {/* Web Search Settings Modal */}
        {showWebSearchSettings && (
          <WebSearchSettings onClose={() => setShowWebSearchSettings(false)} />
        )}

        {/* Voice Recognition Test Modal */}
        {showVoiceRecognitionTest && (
          <VoiceRecognitionTest 
            onTestComplete={(results) => {
              console.log('Voice recognition test results:', results);
              toast.success('语音识别测试完成');
            }}
            onClose={() => setShowVoiceRecognitionTest(false)} 
          />
        )}
    </div>
  );
};

export default SettingsPanel;
