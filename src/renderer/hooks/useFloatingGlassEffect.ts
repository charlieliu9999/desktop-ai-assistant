import { useEffect } from 'react';
import { useConfigStore } from '../stores/configStore';
import { useThemeStore } from '../stores/themeStore';

export const useFloatingGlassEffect = () => {
  const { config } = useConfigStore();

  const { mode: themeMode } = useThemeStore();

  useEffect(() => {
    const glass = config?.windows?.floating?.glassEffect;
    const isGlassTheme = (config?.theme === 'glass') || (themeMode === 'glass');
    const enableGlass = isGlassTheme || !!glass?.enabled;

    if (!enableGlass) {
      document.documentElement.style.removeProperty('--glass-opacity');
      document.documentElement.style.removeProperty('--glass-blur');
      document.documentElement.style.removeProperty('--glass-saturation');
      document.documentElement.style.removeProperty('--glass-tint');
      // 恢复默认背景
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
      return;
    }

    // 使页面背景真正透明，配合透明窗口实现毛玻璃
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';

    const opacity = glass?.opacity ?? 0.15;
    const blur = glass?.blur ?? 25;
    const saturation = glass?.saturation ?? 180;
    const tintColor = glass?.tintColor ?? '#000000';
    const tintOpacity = glass?.tintOpacity ?? 0;

    document.documentElement.style.setProperty('--glass-opacity', String(opacity));
    document.documentElement.style.setProperty('--glass-blur', `${blur}px`);
    document.documentElement.style.setProperty('--glass-saturation', `${saturation}%`);
    document.documentElement.style.setProperty('--glass-tint', hexToRgba(tintColor, clamp01(tintOpacity)));
  }, [
    config?.theme,
    themeMode,
    config?.windows?.floating?.glassEffect?.enabled,
    config?.windows?.floating?.glassEffect?.opacity,
    config?.windows?.floating?.glassEffect?.blur,
    config?.windows?.floating?.glassEffect?.saturation,
    config?.windows?.floating?.glassEffect?.tintColor,
    config?.windows?.floating?.glassEffect?.tintOpacity,
  ]);
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let s = hex.trim().replace('#', '');
  if (s.length === 3) s = s.split('').map(c => c + c).join('');
  const num = parseInt(s, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export default useFloatingGlassEffect;
