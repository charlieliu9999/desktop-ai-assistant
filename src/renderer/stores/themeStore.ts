/**
 * 主题管理 Store
 * 
 * 统一管理应用主题，支持实时切换和自定义配置
 * 与configStore集成，提供更细粒度的主题控制
 */

import { create } from 'zustand';
import type { ThemeMode, ThemeConfig, GlassEffectConfig } from '../config/themes';
import { getThemeConfig, applyTheme } from '../config/themes';

/**
 * 主题Store接口
 */
interface ThemeStore {
  // ========== 状态 ==========
  /** 当前主题模式 */
  mode: ThemeMode;
  /** 当前主题配置 */
  config: ThemeConfig;
  /** 是否正在切换主题 */
  isTransitioning: boolean;

  // ========== 主题切换 ==========
  /**
   * 设置主题模式
   * @param mode 主题模式
   */
  setMode: (mode: ThemeMode) => void;

  /**
   * 切换到下一个主题
   */
  toggleTheme: () => void;

  // ========== 自定义配置 ==========
  /**
   * 更新玻璃效果配置
   * @param config 玻璃效果配置
   */
  updateGlassEffect: (config: Partial<GlassEffectConfig>) => void;

  /**
   * 更新主题颜色
   * @param key 颜色键
   * @param value 颜色值
   */
  updateColor: (key: keyof ThemeConfig['colors'], value: string) => void;

  /**
   * 重置为默认主题
   */
  resetTheme: () => void;

  // ========== 持久化 ==========
  /**
   * 保存主题配置到本地存储
   */
  saveToStorage: () => void;

  /**
   * 从本地存储恢复主题配置
   */
  loadFromStorage: () => void;
}

const STORAGE_KEY = 'app:theme';

/**
 * 从localStorage读取主题配置
 */
const loadThemeFromStorage = (): { mode: ThemeMode; config?: Partial<ThemeConfig> } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to load theme from storage:', error);
    return null;
  }
};

/**
 * 保存主题配置到localStorage
 */
const saveThemeToStorage = (mode: ThemeMode, config: ThemeConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, config }));
  } catch (error) {
    console.warn('Failed to save theme to storage:', error);
  }
};

/**
 * 创建主题Store
 */
export const useThemeStore = create<ThemeStore>((set, get) => {
  // 初始化：从存储恢复或使用默认主题
  const stored = loadThemeFromStorage();
  const initialMode: ThemeMode = stored?.mode || 'glass';
  const initialConfig = getThemeConfig(initialMode);

  // 应用初始主题
  applyTheme(initialConfig);

  return {
    // ========== 初始状态 ==========
    mode: initialMode,
    config: initialConfig,
    isTransitioning: false,

    // ========== 主题切换 ==========
    setMode: (mode: ThemeMode) => {
      set({ isTransitioning: true });

      // 获取新主题配置
      const newConfig = getThemeConfig(mode);

      // 应用主题
      applyTheme(newConfig);

      // 更新状态
      set({
        mode,
        config: newConfig,
        isTransitioning: false,
      });

      // 保存到存储
      saveThemeToStorage(mode, newConfig);

      console.log('[ThemeStore] Theme changed to:', mode);
    },

    toggleTheme: () => {
      const { mode } = get();
      const themeOrder: ThemeMode[] = ['glass', 'light', 'dark'];
      const currentIndex = themeOrder.indexOf(mode === 'auto' ? 'glass' : mode);
      const nextIndex = (currentIndex + 1) % themeOrder.length;
      const nextMode = themeOrder[nextIndex] ?? 'glass';

      get().setMode(nextMode);
    },

    // ========== 自定义配置 ==========
    updateGlassEffect: (glassConfig: Partial<GlassEffectConfig>) => {
      const { config } = get();

      const updatedConfig: ThemeConfig = {
        ...config,
        glassEffect: {
          ...config.glassEffect,
          ...glassConfig,
        },
      };

      // 应用更新后的主题
      applyTheme(updatedConfig);

      // 更新状态
      set({ config: updatedConfig });

      // 保存到存储
      saveThemeToStorage(get().mode, updatedConfig);

      console.log('[ThemeStore] Glass effect updated:', glassConfig);
    },

    updateColor: (key: keyof ThemeConfig['colors'], value: string) => {
      const { config } = get();

      const updatedConfig: ThemeConfig = {
        ...config,
        colors: {
          ...config.colors,
          [key]: value,
        },
      };

      // 应用更新后的主题
      applyTheme(updatedConfig);

      // 更新状态
      set({ config: updatedConfig });

      // 保存到存储
      saveThemeToStorage(get().mode, updatedConfig);

      console.log('[ThemeStore] Color updated:', key, value);
    },

    resetTheme: () => {
      const { mode } = get();
      const defaultConfig = getThemeConfig(mode);

      // 应用默认主题
      applyTheme(defaultConfig);

      // 更新状态
      set({ config: defaultConfig });

      // 保存到存储
      saveThemeToStorage(mode, defaultConfig);

      console.log('[ThemeStore] Theme reset to default');
    },

    // ========== 持久化 ==========
    saveToStorage: () => {
      const { mode, config } = get();
      saveThemeToStorage(mode, config);
    },

    loadFromStorage: () => {
      const stored = loadThemeFromStorage();
      if (stored) {
        const config = stored.config
          ? { ...getThemeConfig(stored.mode), ...stored.config }
          : getThemeConfig(stored.mode);

        applyTheme(config);
        set({ mode: stored.mode, config });
        console.log('[ThemeStore] Theme loaded from storage:', stored.mode);
      }
    },
  };
});

/**
 * 监听系统主题变化（用于auto模式）
 */
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  mediaQuery.addEventListener('change', () => {
    const { mode, setMode } = useThemeStore.getState();
    if (mode === 'auto') {
      // 重新应用auto主题（会根据系统主题选择light或dark）
      setMode('auto');
      console.log('[ThemeStore] System theme changed, auto theme updated');
    }
  });
}
