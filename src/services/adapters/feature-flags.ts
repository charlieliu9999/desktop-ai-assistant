/**
 * 功能开关配置
 * 
 * 用于控制新旧实现的切换
 */

export const FEATURE_FLAGS = {
  // AI服务
  USE_BACKEND_AI: false, // 使用后端AI服务（默认false，使用legacy实现）
  
  // 视觉服务
  USE_BACKEND_OCR: false, // 使用后端OCR服务
  USE_BACKEND_VISION: false, // 使用后端视觉理解服务
  
  // 语音服务
  USE_BACKEND_STT: false, // 使用后端语音识别服务
  USE_BACKEND_TTS: false, // 使用后端语音合成服务
  
  // 智能体服务
  USE_BACKEND_AGENT: false, // 使用后端智能体服务
  
  // 配置管理
  USE_BACKEND_CONFIG: false, // 使用后端配置管理
} as const;

/**
 * 获取功能开关状态
 */
export function getFeatureFlag(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}

/**
 * 设置功能开关状态（仅用于测试）
 */
export function setFeatureFlag(flag: keyof typeof FEATURE_FLAGS, value: boolean): void {
  (FEATURE_FLAGS as any)[flag] = value;
}

/**
 * 重置所有功能开关到默认值
 */
export function resetFeatureFlags(): void {
  Object.keys(FEATURE_FLAGS).forEach(key => {
    (FEATURE_FLAGS as any)[key] = false;
  });
}

