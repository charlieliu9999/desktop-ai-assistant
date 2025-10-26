/**
 * 主题管理 Hook
 * 
 * 提供便捷的主题访问和操作接口
 * 封装 useThemeStore,简化组件中的主题使用
 */

import { useThemeStore } from '../stores/themeStore';
import type { ThemeMode, ThemeConfig, GlassEffectConfig } from '../config/themes';

/**
 * 主题Hook返回值接口
 */
export interface UseThemeReturn {
  // ========== 状态 ==========
  /** 当前主题模式 */
  mode: ThemeMode;
  /** 当前主题配置 */
  config: ThemeConfig;
  /** 是否正在切换主题 */
  isTransitioning: boolean;
  /** 是否为玻璃主题 */
  isGlass: boolean;
  /** 是否为深色主题 */
  isDark: boolean;
  /** 是否为浅色主题 */
  isLight: boolean;

  // ========== 主题切换 ==========
  /** 设置主题模式 */
  setMode: (mode: ThemeMode) => void;
  /** 切换到下一个主题 */
  toggleTheme: () => void;

  // ========== 自定义配置 ==========
  /** 更新玻璃效果配置 */
  updateGlassEffect: (config: Partial<GlassEffectConfig>) => void;
  /** 更新主题颜色 */
  updateColor: (key: keyof ThemeConfig['colors'], value: string) => void;
  /** 重置为默认主题 */
  resetTheme: () => void;

  // ========== 工具方法 ==========
  /** 获取当前主题的CSS类名 */
  getThemeClass: () => string;
  /** 获取玻璃效果CSS类名 */
  getGlassClass: (additionalClasses?: string) => string;
  /** 检查是否启用了玻璃效果 */
  isGlassEnabled: () => boolean;
}

/**
 * 主题管理 Hook
 * 
 * @example
 * ```tsx
 * const { mode, isGlass, setMode, getGlassClass } = useTheme();
 * 
 * return (
 *   <div className={getGlassClass('p-4 rounded-lg')}>
 *     <p>Current theme: {mode}</p>
 *     <button onClick={() => setMode('dark')}>Switch to Dark</button>
 *   </div>
 * );
 * ```
 */
export const useTheme = (): UseThemeReturn => {
  const store = useThemeStore();

  // 计算派生状态
  const isGlass = store.mode === 'glass';
  const isDark = store.mode === 'dark' || (store.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const isLight = store.mode === 'light' || (store.mode === 'auto' && !window.matchMedia('(prefers-color-scheme: dark)').matches);

  /**
   * 获取当前主题的CSS类名
   */
  const getThemeClass = (): string => {
    if (isDark) return 'dark';
    if (isLight) return 'light';
    if (isGlass) return 'glass';
    return '';
  };

  /**
   * 获取玻璃效果CSS类名
   * @param additionalClasses 额外的CSS类名
   */
  const getGlassClass = (additionalClasses: string = ''): string => {
    const baseClass = isGlass ? 'glass' : '';
    return [baseClass, additionalClasses].filter(Boolean).join(' ');
  };

  /**
   * 检查是否启用了玻璃效果
   */
  const isGlassEnabled = (): boolean => {
    return isGlass;
  };

  return {
    // 状态
    mode: store.mode,
    config: store.config,
    isTransitioning: store.isTransitioning,
    isGlass,
    isDark,
    isLight,

    // 主题切换
    setMode: store.setMode,
    toggleTheme: store.toggleTheme,

    // 自定义配置
    updateGlassEffect: store.updateGlassEffect,
    updateColor: store.updateColor,
    resetTheme: store.resetTheme,

    // 工具方法
    getThemeClass,
    getGlassClass,
    isGlassEnabled,
  };
};

/**
 * 默认导出
 */
export default useTheme;

