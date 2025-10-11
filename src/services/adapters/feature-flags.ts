/**
 * 功能开关配置
 * 
 * 用于控制新旧实现的切换
 */

export const FEATURE_FLAGS = {
  // AI服务
  USE_BACKEND_AI: true, // ✅ 启用后端AI服务

  // 视觉服务
  USE_BACKEND_OCR: true, // ✅ 启用后端OCR服务
  USE_BACKEND_VISION: true, // ✅ 启用后端视觉理解服务

  // 语音服务
  USE_BACKEND_STT: true, // ✅ 启用后端语音识别服务
  USE_BACKEND_TTS: true, // ✅ 启用后端语音合成服务

  // 智能体服务
  USE_BACKEND_AGENT: true, // ✅ 启用后端智能体服务

  // 配置管理
  USE_BACKEND_CONFIG: false, // 配置管理暂时使用legacy实现
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

