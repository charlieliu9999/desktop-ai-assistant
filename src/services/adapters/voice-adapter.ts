/**
 * 语音服务适配器
 * 
 * 统一的语音服务接口，支持新旧实现切换
 */

import { APIClient } from '../api-client';
import { FEATURE_FLAGS } from './feature-flags';
import type { VoiceRecognitionService } from '../legacy/voice-recognition';

/**
 * 语音识别请求 (Speech-to-Text)
 */
export interface STTRequest {
  audioData: string; // Base64编码的音频数据
  language?: string; // 语言代码
  model?: string; // 使用的模型
  audioMime?: string; // 音频MIME类型（如 audio/webm, audio/wav, audio/mpeg）
}

/**
 * 语音识别结果
 */
export interface STTResult {
  text: string; // 识别的文本
  confidence: number; // 置信度
  language: string; // 检测到的语言
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
}

/**
 * 语音合成请求 (Text-to-Speech)
 */
export interface TTSRequest {
  text: string; // 要合成的文本
  language?: string; // 语言代码
  voice?: string; // 语音类型
  speed?: number; // 语速
  pitch?: number; // 音调
  model?: string; // 使用的模型
}

/**
 * 语音合成结果
 */
export interface TTSResult {
  audioData: string; // Base64编码的音频数据
  format: string; // 音频格式
  durationMs: number; // 音频时长(毫秒)
}

/**
 * 语音服务适配器
 */
export class VoiceServiceAdapter {
  private useBackendSTT: boolean;
  private useBackendTTS: boolean;
  private apiClient: APIClient;
  private legacySTTService: VoiceRecognitionService | null = null;
  private legacyTTSService: any | null = null;

  constructor() {
    this.useBackendSTT = FEATURE_FLAGS.USE_BACKEND_STT;
    this.useBackendTTS = FEATURE_FLAGS.USE_BACKEND_TTS;
    this.apiClient = new APIClient();
  }

  /**
   * 设置legacy STT服务实例
   */
  setLegacySTTService(service: VoiceRecognitionService): void {
    this.legacySTTService = service;
  }

  /**
   * 设置legacy TTS服务实例
   */
  setLegacyTTSService(service: any): void {
    this.legacyTTSService = service;
  }

  /**
   * 语音识别 (Speech-to-Text)
   */
  async speechToText(request: STTRequest): Promise<STTResult> {
    if (this.useBackendSTT) {
      return this.speechToTextWithBackend(request);
    } else {
      return this.speechToTextWithLegacy(request);
    }
  }

  /**
   * 使用后端语音识别服务
   */
  private async speechToTextWithBackend(request: STTRequest): Promise<STTResult> {
    try {
      const response = await this.apiClient.post('/v1/voice/stt', {
        audio_data: request.audioData,
        language: request.language || 'zh',
        model: request.model,
        audio_mime: request.audioMime,
      });

      if (!response.success || !response.result) {
        throw new Error(response.error || '语音识别失败');
      }

      return {
        text: response.result.text,
        confidence: response.result.confidence,
        language: response.result.language,
        segments: response.result.segments,
      };
    } catch (error) {
      console.error('后端语音识别失败:', error);
      // 自动降级到legacy实现
      return this.speechToTextWithLegacy(request);
    }
  }

  /**
   * 使用legacy语音识别服务
   */
  private async speechToTextWithLegacy(request: STTRequest): Promise<STTResult> {
    if (!this.legacySTTService) {
      throw new Error('Legacy语音识别服务未初始化');
    }

    // 调用legacy服务的语音识别功能
    // 注意：这里需要根据实际的legacy实现调整
    const text = await this.legacySTTService.recognize(request.audioData);

    return {
      text,
      confidence: 0.8, // Legacy实现可能没有置信度
      language: request.language || 'zh',
    };
  }

  /**
   * 语音合成 (Text-to-Speech)
   */
  async textToSpeech(request: TTSRequest): Promise<TTSResult> {
    if (this.useBackendTTS) {
      return this.textToSpeechWithBackend(request);
    } else {
      return this.textToSpeechWithLegacy(request);
    }
  }

  /**
   * 使用后端语音合成服务
   */
  private async textToSpeechWithBackend(request: TTSRequest): Promise<TTSResult> {
    try {
      const response = await this.apiClient.post('/v1/voice/tts', {
        text: request.text,
        language: request.language || 'zh',
        voice: request.voice,
        speed: request.speed || 1.0,
        pitch: request.pitch || 1.0,
        model: request.model,
      });

      if (!response.success || !response.result) {
        throw new Error(response.error || '语音合成失败');
      }

      return {
        audioData: response.result.audio_data,
        format: response.result.format,
        durationMs: response.result.duration_ms,
      };
    } catch (error) {
      console.error('后端语音合成失败:', error);
      // 自动降级到legacy实现
      return this.textToSpeechWithLegacy(request);
    }
  }

  /**
   * 使用legacy语音合成服务
   */
  private async textToSpeechWithLegacy(request: TTSRequest): Promise<TTSResult> {
    if (!this.legacyTTSService) {
      throw new Error('Legacy语音合成服务未初始化');
    }

    // 调用legacy服务的语音合成功能
    // 注意：这里需要根据实际的legacy实现调整
    const audioData = await this.legacyTTSService.synthesize(request.text, {
      voice: request.voice,
      rate: request.speed,
      pitch: request.pitch,
    });

    return {
      audioData,
      format: 'wav',
      durationMs: request.text.length * 100, // 估算时长
    };
  }

  /**
   * 开始连续语音识别
   */
  async startContinuousRecognition(
    onResult: (result: STTResult) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (this.useBackendSTT) {
      // 后端实现需要通过WebSocket或轮询实现连续识别
      console.warn('后端连续语音识别功能待实现');
      throw new Error('后端连续语音识别功能待实现');
    } else {
      if (!this.legacySTTService) {
        throw new Error('Legacy语音识别服务未初始化');
      }

      // 调用legacy服务的连续识别功能
      await this.legacySTTService.startContinuous(
        (text: string) => {
          onResult({
            text,
            confidence: 0.8,
            language: 'zh',
          });
        },
        onError
      );
    }
  }

  /**
   * 停止连续语音识别
   */
  async stopContinuousRecognition(): Promise<void> {
    if (this.useBackendSTT) {
      // 后端实现
      console.warn('后端连续语音识别功能待实现');
    } else {
      if (!this.legacySTTService) {
        throw new Error('Legacy语音识别服务未初始化');
      }

      await this.legacySTTService.stopContinuous();
    }
  }

  /**
   * 播放语音
   */
  async playAudio(audioData: string, format: string = 'wav'): Promise<void> {
    // 创建Audio元素播放
    const audio = new Audio(`data:audio/${format};base64,${audioData}`);
    await audio.play();
  }

  /**
   * 测试后端连接
   */
  async testBackendConnection(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/v1/voice/health');
      return response.success === true;
    } catch (error) {
      console.error('语音服务后端连接测试失败:', error);
      return false;
    }
  }
}

// 导出单例
export const voiceAdapter = new VoiceServiceAdapter();
