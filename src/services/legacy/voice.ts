// @ts-nocheck - Legacy code, type checking disabled
import { EventEmitter } from 'events';
import type { Logger } from '../../utils/logger';
import type { VoiceConfig, VoiceState, VoiceRecognitionResult } from '../../shared/types';

// 语音合成选项接口
export interface VoiceSynthesisOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

// 语音识别状态
export type RecognitionState = 'idle' | 'listening' | 'processing' | 'error';

// 语音合成状态
export type SynthesisState = 'idle' | 'speaking' | 'paused' | 'error';

// 语音事件
export interface VoiceEvents {
  'recognition-start': () => void;
  'recognition-result': (result: VoiceRecognitionResult) => void;
  'recognition-end': () => void;
  'recognition-error': (error: Error) => void;
  'synthesis-start': () => void;
  'synthesis-end': () => void;
  'synthesis-error': (error: Error) => void;
  'state-change': (state: VoiceState) => void;
}

export class VoiceService extends EventEmitter {
  private logger: Logger;
  private config: VoiceConfig;
  private recognitionState: RecognitionState = 'idle';
  private synthesisState: SynthesisState = 'idle';
  private isEnabled: boolean = false;
  private recognition: any = null; // SpeechRecognition instance
  private synthesis: any = null; // SpeechSynthesis instance
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private recognitionTimeout: NodeJS.Timeout | null = null;
  private keywordDetectionActive: boolean = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private noiseGate: GainNode | null = null;

  constructor(config: VoiceConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.isEnabled = config.enabled;
  }

  /**
   * 初始化语音服务
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing voice service...');
    
    try {
      if (!this.isEnabled) {
        this.logger.info('Voice service is disabled');
        return;
      }

      // 检查浏览器支持
      await this.checkBrowserSupport();
      
      // 初始化语音识别
      await this.initializeRecognition();
      
      // 初始化语音合成
      await this.initializeSynthesis();
      
      // 初始化音频上下文（用于噪音降噪）
      if (this.config.noiseReduction) {
        await this.initializeAudioContext();
      }
      
      // 启动关键词检测
      if (this.config.hotwordEnabled) {
        await this.startKeywordDetection();
      }
      
      this.logger.info('Voice service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize voice service:', error);
      throw error;
    }
  }

  /**
   * 检查浏览器支持
   */
  private async checkBrowserSupport(): Promise<void> {
    // 检查语音识别支持
    const SpeechRecognition = (globalThis as any).SpeechRecognition || 
                             (globalThis as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    // 检查语音合成支持
    if (!('speechSynthesis' in globalThis)) {
      throw new Error('Speech synthesis is not supported in this browser');
    }

    // 检查媒体设备支持
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Media devices are not supported in this browser');
    }

    this.logger.info('Browser support check passed');
  }

  /**
   * 初始化语音识别
   */
  private async initializeRecognition(): Promise<void> {
    const SpeechRecognition = (globalThis as any).SpeechRecognition || 
                             (globalThis as any).webkitSpeechRecognition;
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = 3;

    // 设置事件监听器
    this.recognition.onstart = () => {
      this.recognitionState = 'listening';
      this.emit('recognition-start');
      this.emitStateChange();
      this.logger.debug('Speech recognition started');
    };

    this.recognition.onresult = (event: any) => {
      this.recognitionState = 'processing';
      
      const results: VoiceRecognitionResult[] = [];
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        
        results.push({
          transcript: transcript.trim(),
          confidence,
          isFinal: result.isFinal,
          timestamp: Date.now()
        });
      }
      
      // 发送识别结果
      results.forEach(result => {
        this.emit('recognition-result', result);
        
        // 检查是否包含激活关键词
        if (this.config.hotwordEnabled && 
            this.config.hotwords.some(hotword => result.transcript.includes(hotword))) {
          this.logger.info(`Hotword detected in transcript`);
        }
      });
      
      this.emitStateChange();
    };

    this.recognition.onend = () => {
      this.recognitionState = 'idle';
      this.emit('recognition-end');
      this.emitStateChange();
      this.logger.debug('Speech recognition ended');
      
      // 如果启用了连续监听，重新开始
      if (this.config.continuous && this.keywordDetectionActive) {
        setTimeout(() => {
          this.startRecognition();
        }, 1000);
      }
    };

    this.recognition.onerror = (event: any) => {
      this.recognitionState = 'error';
      const error = new Error(`Speech recognition error: ${event.error}`);
      this.emit('recognition-error', error);
      this.emitStateChange();
      this.logger.error('Speech recognition error:', error);
    };

    this.logger.info('Speech recognition initialized');
  }

  /**
   * 初始化语音合成
   */
  private async initializeSynthesis(): Promise<void> {
    this.synthesis = globalThis.speechSynthesis;
    
    // 等待语音列表加载
    if (this.synthesis.getVoices().length === 0) {
      await new Promise<void>((resolve) => {
        this.synthesis.onvoiceschanged = () => {
          resolve();
        };
      });
    }
    
    this.logger.info('Speech synthesis initialized');
  }

  /**
   * 初始化音频上下文（噪音降噪）
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      
      // 获取麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // 创建噪音门
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.noiseGate = this.audioContext.createGain();
      this.noiseGate.gain.value = 0.5; // 初始增益
      
      source.connect(this.noiseGate);
      this.noiseGate.connect(this.audioContext.destination);
      
      this.logger.info('Audio context initialized with noise reduction');
    } catch (error) {
      this.logger.warn('Failed to initialize audio context:', error);
    }
  }

  /**
   * 开始语音识别
   */
  async startRecognition(): Promise<void> {
    if (!this.isEnabled || !this.recognition) {
      throw new Error('Voice service is not enabled or not initialized');
    }
    
    if (this.recognitionState === 'listening') {
      this.logger.warn('Speech recognition is already active');
      return;
    }
    
    try {
      this.recognition.start();
      
      // 设置超时
      if (this.recognitionTimeout) {
        clearTimeout(this.recognitionTimeout);
      }
      
      this.recognitionTimeout = setTimeout(() => {
        this.stopRecognition();
      }, 30000); // 30秒超时
      
      this.logger.info('Speech recognition started');
    } catch (error) {
      this.logger.error('Failed to start speech recognition:', error);
      throw error;
    }
  }

  /**
   * 停止语音识别
   */
  async stopRecognition(): Promise<void> {
    if (this.recognition && this.recognitionState === 'listening') {
      this.recognition.stop();
      
      if (this.recognitionTimeout) {
        clearTimeout(this.recognitionTimeout);
        this.recognitionTimeout = null;
      }
      
      this.logger.info('Speech recognition stopped');
    }
  }

  /**
   * 开始关键词检测
   */
  async startKeywordDetection(): Promise<void> {
    if (!this.config.hotwordEnabled) {
      return;
    }
    
    this.keywordDetectionActive = true;
    await this.startRecognition();
    
    this.logger.info(`Keyword detection started for: ${this.config.hotwords.join(', ')}`);
  }

  /**
   * 停止关键词检测
   */
  async stopKeywordDetection(): Promise<void> {
    this.keywordDetectionActive = false;
    await this.stopRecognition();
    
    this.logger.info('Keyword detection stopped');
  }

  /**
   * 语音合成
   */
  async speak(text: string, options: Partial<VoiceSynthesisOptions> = {}): Promise<void> {
    if (!this.isEnabled || !this.synthesis) {
      throw new Error('Voice service is not enabled or not initialized');
    }
    if (!this.config.ttsEnabled) {
      throw new Error('TTS is disabled in settings');
    }
    
    // 停止当前播放
    if (this.synthesisState === 'speaking') {
      this.stopSpeaking();
    }
    
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // 设置语音参数
      utterance.lang = options.language || this.config.language;
      utterance.rate = options.rate || this.config.ttsRate;
      utterance.pitch = options.pitch || this.config.ttsPitch;
      utterance.volume = options.volume || this.config.ttsVolume;
      
      // 选择语音
      const voices = this.synthesis.getVoices();
      const voice = voices.find((v: SpeechSynthesisVoice) => v.lang === utterance.lang) || voices[0];
      if (voice) {
        utterance.voice = voice;
      }
      
      // 设置事件监听器
      utterance.onstart = () => {
        this.synthesisState = 'speaking';
        this.emit('synthesis-start');
        this.emitStateChange();
        this.logger.debug('Speech synthesis started');
      };
      
      utterance.onend = () => {
        this.synthesisState = 'idle';
        this.currentUtterance = null;
        this.emit('synthesis-end');
        this.emitStateChange();
        this.logger.debug('Speech synthesis ended');
      };
      
      utterance.onerror = (event: any) => {
        this.synthesisState = 'error';
        this.currentUtterance = null;
        const error = new Error(`Speech synthesis error: ${event.error}`);
        this.emit('synthesis-error', error);
        this.emitStateChange();
        this.logger.error('Speech synthesis error:', error);
      };
      
      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
      
      this.logger.info(`Speaking text: ${text.substring(0, 50)}...`);
    } catch (error) {
      this.logger.error('Failed to speak text:', error);
      throw error;
    }
  }

  /**
   * 停止语音合成
   */
  stopSpeaking(): void {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.cancel();
      this.synthesisState = 'idle';
      this.currentUtterance = null;
      this.emit('synthesis-stop');
      this.emitStateChange();
      this.logger.debug('Speech synthesis stopped');
    }
  }

  /**
   * 暂停语音合成
   */
  pauseSpeaking(): void {
    if (this.synthesis && this.synthesis.speaking && this.currentUtterance) {
      this.synthesis.pause();
      this.synthesisState = 'paused';
      this.emit('synthesis-pause');
      this.emitStateChange();
      this.logger.debug('Speech synthesis paused');
    }
  }

  /**
   * 恢复语音合成
   */
  resumeSpeaking(): void {
    if (this.synthesis && this.synthesis.paused && this.currentUtterance) {
      this.synthesis.resume();
      this.synthesisState = 'speaking';
      this.emit('synthesis-resume');
      this.emitStateChange();
      this.logger.debug('Speech synthesis resumed');
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<VoiceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.isEnabled = this.config.enabled;
    
    // 重新初始化识别器配置
    if (this.recognition) {
      this.recognition.continuous = this.config.continuous;
      this.recognition.lang = this.config.language;
    }
    
    // 更新关键词检测
    if (this.config.hotwordEnabled && !this.keywordDetectionActive) {
      await this.startKeywordDetection();
    } else if (!this.config.hotwordEnabled && this.keywordDetectionActive) {
      await this.stopKeywordDetection();
    }
    
    this.logger.info('Voice service config updated');
    this.emitStateChange();
  }

  /**
   * 获取当前状态
   */
  getState(): VoiceState {
    return {
      enabled: this.isEnabled,
      recognitionState: this.recognitionState,
      synthesisState: this.synthesisState,
      keywordDetectionActive: this.keywordDetectionActive,
      config: this.config
    };
  }

  /**
   * 获取可用语音列表
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) {
      return [];
    }
    return this.synthesis.getVoices();
  }

  /**
   * 开始监听（别名方法）
   */
  async startListening(): Promise<void> {
    return this.startRecognition();
  }

  /**
   * 停止监听（别名方法）
   */
  async stopListening(): Promise<void> {
    return this.stopRecognition();
  }

  /**
   * 处理文本（语音合成）
   */
  async processText(text: string, options?: Partial<VoiceSynthesisOptions>): Promise<void> {
    return this.speak(text, options);
  }

  /**
   * 发送状态变化事件
   */
  private emitStateChange(): void {
    this.emit('state-change', this.getState());
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up voice service...');
    
    // 停止语音识别
    await this.stopRecognition();
    await this.stopKeywordDetection();
    
    // 停止语音合成
    this.stopSpeaking();
    
    // 清理音频上下文
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    // 清理媒体流
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // 清理超时
    if (this.recognitionTimeout) {
      clearTimeout(this.recognitionTimeout);
      this.recognitionTimeout = null;
    }
    
    // 移除所有监听器
    this.removeAllListeners();
    
    this.logger.info('Voice service cleanup completed');
  }
}
