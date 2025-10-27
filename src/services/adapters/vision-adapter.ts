/**
 * 视觉服务适配器
 * 
 * 统一的视觉服务接口，支持新旧实现切换
 */

import { APIClient } from '../api-client';
import { FEATURE_FLAGS } from './feature-flags';
// Narrow legacy type to the minimal shape we need to avoid pulling legacy types into renderer
type LegacyDesktopRecognitionLike = {
  recognizeText: (imageData: string) => Promise<string>;
};

/**
 * OCR识别请求
 */
export interface OCRRequest {
  imageData: string; // Base64编码的图像数据
  language?: string; // 识别语言
  psm?: number; // 页面分割模式
  oem?: number; // OCR引擎模式
}

/**
 * OCR识别结果
 */
export interface OCRResult {
  text: string; // 识别的文本
  confidence: number; // 置信度
  boxes?: Array<{
    text: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

/**
 * 视觉理解请求
 */
export interface VisionRequest {
  imageData: string; // Base64编码的图像数据
  prompt: string; // 提示词
  model?: string; // 使用的模型
  maxTokens?: number; // 最大token数
  temperature?: number; // 温度参数
  imageMime?: string; // 图像MIME类型
  provider?: 'dashscope' | 'openai' | 'local'; // 指定后端提供商
  strictJson?: boolean; // 是否要求严格JSON
  schemaName?: 'patient_info_v1' | string; // 内置结构化模式名
  scene?: string; // 指定业务场景（优先级最高）
  allowFallback?: boolean; // 是否允许后备策略（文本/ OCR），默认不允许
}

/**
 * 视觉理解结果
 */
export interface VisionResult {
  description: string; // 图像描述
  confidence: number; // 置信度
  details?: Record<string, any>; // 详细信息
}

/**
 * 视觉服务适配器
 */
export class VisionServiceAdapter {
  private useBackendOCR: boolean;
  private useBackendVision: boolean;
  private apiClient: APIClient;
  private legacyService: LegacyDesktopRecognitionLike | null = null;

  constructor() {
    this.useBackendOCR = FEATURE_FLAGS.USE_BACKEND_OCR;
    this.useBackendVision = FEATURE_FLAGS.USE_BACKEND_VISION;
    this.apiClient = new APIClient();
  }

  /**
   * 设置legacy服务实例
   */
  setLegacyService(service: LegacyDesktopRecognitionLike): void {
    this.legacyService = service;
  }

  /**
   * OCR文字识别
   */
  async recognizeText(request: OCRRequest): Promise<OCRResult> {
    if (this.useBackendOCR) {
      return this.recognizeTextWithBackend(request);
    } else {
      return this.recognizeTextWithLegacy(request);
    }
  }

  /**
   * 使用后端OCR服务
   */
  private async recognizeTextWithBackend(request: OCRRequest): Promise<OCRResult> {
    try {
      const response = await this.apiClient.post('/v1/vision/ocr', {
        image_data: request.imageData,
        language: request.language || 'chi_sim+eng',
        psm: request.psm || 3,
        oem: request.oem || 3,
      });

      if (!response.success || !response.result) {
        throw new Error(response.error || 'OCR识别失败');
      }

      return {
        text: response.result.text,
        confidence: response.result.confidence,
        boxes: response.result.boxes,
      };
    } catch (error) {
      console.error('后端OCR识别失败:', error);
      // 自动降级到legacy实现
      return this.recognizeTextWithLegacy(request);
    }
  }

  /**
   * 使用legacy OCR服务
   */
  private async recognizeTextWithLegacy(request: OCRRequest): Promise<OCRResult> {
    if (!this.legacyService) {
      throw new Error('Legacy OCR服务未初始化');
    }

    // 调用legacy服务的OCR功能
    // 注意：这里需要根据实际的legacy实现调整
    const text = await this.legacyService.recognizeText(request.imageData);

    return {
      text,
      confidence: 0.8, // Legacy实现可能没有置信度
    };
  }

  /**
   * 图像理解
   */
  async understandImage(request: VisionRequest): Promise<VisionResult> {
    if (this.useBackendVision) {
      return this.understandImageWithBackend(request);
    } else {
      return this.understandImageWithLegacy(request);
    }
  }

  /**
   * 使用后端视觉理解服务
   */
  private async understandImageWithBackend(request: VisionRequest): Promise<VisionResult> {
    try {
      const scene = request.scene
        || (request.provider === 'dashscope' ? 'screen_recognition_aliyun' : 'screen_recognition');
      const body: any = {
        image_data: request.imageData,
        image_mime: request.imageMime || 'image/png',
        prompt: request.prompt,
        model: request.model,
        provider: request.provider,
        max_tokens: request.maxTokens ?? 1000,
        temperature: request.temperature ?? 0.7,
      };
      if (request.strictJson !== undefined) body.strict_json = request.strictJson;
      if (request.schemaName) body.schema_name = request.schemaName;
      // 默认不启用回退（严格JSON失败即报错）
      const allowFallback = request.allowFallback === true;
      if (allowFallback) body.allow_fallback = true;

      const response = await this.apiClient.post(`/v1/vision/understand?scene=${encodeURIComponent(scene)}`, body);
      if (!response.success || !response.result) {
        throw new Error((response as any)?.error || '图像理解失败');
      }

      return {
        description: response.result.description,
        confidence: response.result.confidence,
        details: {
          ...(response.result.details || {}),
          structured: response.result.structured,
        },
      };
    } catch (error) {
      console.error('后端图像理解失败:', error);
      // 不再自动降级，直接抛出给上层处理
      throw error;
    }
  }

  /**
   * 使用legacy视觉理解服务
   */
  private async understandImageWithLegacy(_request: VisionRequest): Promise<VisionResult> {
    // Legacy实现可能没有图像理解功能
    // 这里返回一个基本的结果
    return {
      description: '图像理解功能需要启用后端服务',
      confidence: 0.0,
    };
  }

  /**
   * 分析医疗图像
   */
  async analyzeMedicalImage(imageData: string, focus?: string): Promise<VisionResult> {
    if (this.useBackendVision) {
      return this.analyzeMedicalImageWithBackend(imageData, focus);
    } else {
      return this.analyzeMedicalImageWithLegacy(imageData, focus);
    }
  }

  /**
   * 使用后端分析医疗图像
   */
  private async analyzeMedicalImageWithBackend(
    imageData: string,
    focus?: string
  ): Promise<VisionResult> {
    try {
      const response = await this.apiClient.post('/v1/vision/analyze-medical', {
        image_data: imageData,
        focus,
      });

      if (!response.success || !response.result) {
        throw new Error(response.error || '医疗图像分析失败');
      }

      return {
        description: response.result.description,
        confidence: response.result.confidence,
        details: response.result.details,
      };
    } catch (error) {
      console.error('后端医疗图像分析失败:', error);
      // 自动降级到legacy实现
      return this.analyzeMedicalImageWithLegacy(imageData, focus);
    }
  }

  /**
   * 使用legacy分析医疗图像
   */
  private async analyzeMedicalImageWithLegacy(
    _imageData: string,
    _focus?: string
  ): Promise<VisionResult> {
    // Legacy实现可能没有医疗图像分析功能
    return {
      description: '医疗图像分析功能需要启用后端服务',
      confidence: 0.0,
    };
  }

  /**
   * 从图像中提取文字（使用视觉模型）
   */
  async extractTextFromImage(imageData: string): Promise<VisionResult> {
    if (this.useBackendVision) {
      return this.extractTextFromImageWithBackend(imageData);
    } else {
      // 降级到OCR
      const ocrResult = await this.recognizeText({ imageData });
      return {
        description: ocrResult.text,
        confidence: ocrResult.confidence,
      };
    }
  }

  /**
   * 使用后端从图像中提取文字
   */
  private async extractTextFromImageWithBackend(imageData: string): Promise<VisionResult> {
    try {
      const response = await this.apiClient.post('/v1/vision/extract-text', {
        image_data: imageData,
      });

      if (!response.success || !response.result) {
        throw new Error(response.error || '文字提取失败');
      }

      return {
        description: response.result.description,
        confidence: response.result.confidence,
        details: response.result.details,
      };
    } catch (error) {
      console.error('后端文字提取失败:', error);
      // 降级到OCR
      const ocrResult = await this.recognizeText({ imageData });
      return {
        description: ocrResult.text,
        confidence: ocrResult.confidence,
      };
    }
  }

  /**
   * 测试后端连接
   */
  async testBackendConnection(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/v1/vision/health');
      return response.success === true;
    } catch (error) {
      console.error('视觉服务后端连接测试失败:', error);
      return false;
    }
  }
}

// 导出单例
export const visionAdapter = new VisionServiceAdapter();
