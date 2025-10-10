// @ts-nocheck - Legacy code, type checking disabled
/**
 * 患者信息提取服务
 * 从OCR文本或屏幕截图中提取患者信息
 */

import { Logger } from '../../utils/logger';

const logger = new Logger('PatientInfoExtractor');

/**
 * 患者信息接口
 */
export interface PatientInfo {
  name: string;
  age?: number;
  gender?: '男' | '女' | '未知';
  patientId?: string;
  department?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  medicalHistory?: string;
  confidence?: number; // 提取置信度 0-1
}

/**
 * OCR结果接口
 */
export interface OCRResult {
  text: string;
  confidence: number;
  bounds?: { x: number; y: number; width: number; height: number };
  words?: Array<{
    text: string;
    confidence: number;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
  lines?: Array<{
    text: string;
    confidence: number;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
}

/**
 * 提取配置
 */
export interface ExtractionConfig {
  useAI?: boolean; // 是否使用AI辅助提取
  aiApiUrl?: string; // AI API地址
  aiApiKey?: string; // AI API密钥
  minConfidence?: number; // 最小置信度阈值
}

/**
 * 患者信息提取器类
 */
export class PatientInfoExtractor {
  private config: ExtractionConfig;

  constructor(config: ExtractionConfig = {}) {
    this.config = {
      useAI: true,
      minConfidence: 0.6,
      ...config
    };
  }

  /**
   * 从OCR结果中提取患者信息
   */
  async extractFromOCR(ocrResult: OCRResult): Promise<PatientInfo> {
    const text = ocrResult.text;
    
    logger.info('开始从OCR文本提取患者信息');
    logger.debug(`OCR文本: ${text.substring(0, 200)}...`);

    // 如果启用AI辅助提取
    if (this.config.useAI) {
      try {
        const aiExtracted = await this.extractWithAI(text);
        if (aiExtracted && aiExtracted.confidence && aiExtracted.confidence >= (this.config.minConfidence || 0.6)) {
          logger.info('AI提取成功');
          return aiExtracted;
        }
      } catch (error) {
        logger.warn('AI提取失败,回退到规则提取:', error);
      }
    }

    // 回退到基于规则的提取
    return this.extractWithRules(text);
  }

  /**
   * 使用AI提取患者信息
   */
  private async extractWithAI(text: string): Promise<PatientInfo> {
    const apiUrl = this.config.aiApiUrl || 'http://localhost:8010/api/ai/extract-patient-info';
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`AI API请求失败: ${response.status}`);
      }

      const result = await response.json();
      return result.patient_info || result;
    } catch (error) {
      logger.error('AI提取请求失败:', error);
      throw error;
    }
  }

  /**
   * 使用规则提取患者信息
   */
  private extractWithRules(text: string): PatientInfo {
    const info: PatientInfo = {
      name: '',
      confidence: 0.5
    };

    // 提取姓名
    const namePatterns = [
      /(?:姓名|患者|病人)[：:]\s*([^\s\n]{2,4})/,
      /(?:姓名|患者|病人)\s+([^\s\n]{2,4})/,
      /^([^\s\n]{2,4})\s+(?:男|女)/m
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        info.name = match[1].trim();
        break;
      }
    }

    // 提取年龄
    const agePatterns = [
      /(?:年龄|年齡)[：:]\s*(\d{1,3})\s*[岁歲]/,
      /(\d{1,3})\s*[岁歲]/,
      /(?:年龄|年齡)\s+(\d{1,3})/
    ];
    
    for (const pattern of agePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const age = parseInt(match[1]);
        if (age > 0 && age < 150) {
          info.age = age;
          break;
        }
      }
    }

    // 提取性别
    const genderPatterns = [
      /(?:性别|性別)[：:]\s*(男|女)/,
      /(?:性别|性別)\s+(男|女)/,
      /\s(男|女)\s/
    ];
    
    for (const pattern of genderPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        info.gender = match[1] as '男' | '女';
        break;
      }
    }

    // 提取患者ID
    const idPatterns = [
      /(?:患者ID|病历号|就诊号|门诊号)[：:]\s*([A-Z0-9\-]+)/i,
      /(?:ID|编号)[：:]\s*([A-Z0-9\-]+)/i,
      /[A-Z]{1,3}\d{6,}/
    ];
    
    for (const pattern of idPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        info.patientId = match[1].trim();
        break;
      }
    }

    // 提取科室
    const deptPatterns = [
      /(?:科室|就诊科室|门诊科室)[：:]\s*([^\s\n]{2,10})/,
      /([^\s\n]{2,6}(?:科|内科|外科|儿科|妇科|骨科|神经科|心内科|呼吸科|消化科))/
    ];
    
    for (const pattern of deptPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        info.department = match[1].trim();
        break;
      }
    }

    // 提取主诉
    const complaintPatterns = [
      /(?:主诉|主訴)[：:]\s*([^\n]{5,100})/,
      /(?:症状|症狀)[：:]\s*([^\n]{5,100})/
    ];
    
    for (const pattern of complaintPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        info.chiefComplaint = match[1].trim();
        break;
      }
    }

    // 提取诊断
    const diagnosisPatterns = [
      /(?:诊断|診斷|初步诊断)[：:]\s*([^\n]{5,100})/,
      /(?:疾病|病名)[：:]\s*([^\n]{5,100})/
    ];
    
    for (const pattern of diagnosisPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        info.diagnosis = match[1].trim();
        break;
      }
    }

    // 计算置信度
    let fieldsFound = 0;
    if (info.name) fieldsFound++;
    if (info.age) fieldsFound++;
    if (info.gender) fieldsFound++;
    if (info.patientId) fieldsFound++;
    if (info.department) fieldsFound++;
    if (info.chiefComplaint) fieldsFound++;
    
    info.confidence = Math.min(0.9, 0.3 + (fieldsFound * 0.1));

    logger.info(`规则提取完成,找到 ${fieldsFound} 个字段,置信度: ${info.confidence}`);
    
    return info;
  }

  /**
   * 验证患者信息
   */
  validatePatientInfo(info: PatientInfo): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!info.name || info.name.length < 2) {
      errors.push('患者姓名无效或缺失');
    }

    if (info.age !== undefined && (info.age < 0 || info.age > 150)) {
      errors.push('年龄超出有效范围');
    }

    if (info.gender && !['男', '女', '未知'].includes(info.gender)) {
      errors.push('性别值无效');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// 导出单例
export const patientInfoExtractor = new PatientInfoExtractor();

