/**
 * 玻璃效果 Hook
 * 根据配置应用玻璃毛玻璃效果
 */

import { useEffect } from 'react';
import { useConfigStore } from '../stores/configStore';

export const useGlassEffect = () => {
  const { config } = useConfigStore();

  useEffect(() => {
    const glassConfig = config?.windows?.main?.glassEffect;
    
    if (!glassConfig?.enabled) {
      // 禁用玻璃效果 - 移除 CSS 变量
      document.documentElement.style.removeProperty('--glass-opacity');
      document.documentElement.style.removeProperty('--glass-blur');
      document.documentElement.style.removeProperty('--glass-saturation');
      document.documentElement.style.removeProperty('--glass-tint');
      // 恢复背景为普通模式
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
      document.body.classList.add('glass-disabled');
      return;
    }

    // 启用玻璃效果 - 设置 CSS 变量
    document.body.classList.remove('glass-disabled');
    // 使页面背景真正透明，配合 Electron BrowserWindow transparent 实现毛玻璃
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';

    const opacity = glassConfig.opacity ?? 0.15;
    const blur = glassConfig.blur ?? 40;
    const saturation = glassConfig.saturation ?? 200;
    const tintColor = glassConfig.tintColor ?? '#000000';
    const tintOpacity = glassConfig.tintOpacity ?? 0;
    const rgba = hexToRgba(tintColor, clamp01(tintOpacity));

    document.documentElement.style.setProperty('--glass-opacity', opacity.toString());
    document.documentElement.style.setProperty('--glass-blur', `${blur}px`);
    document.documentElement.style.setProperty('--glass-saturation', `${saturation}%`);
    document.documentElement.style.setProperty('--glass-tint', rgba);

    // 清理函数
    return () => {
      document.body.classList.remove('glass-disabled');
      // 清理时不要强制覆盖主题背景色，由上层样式控制
    };
  }, [
    config?.windows?.main?.glassEffect?.enabled,
    config?.windows?.main?.glassEffect?.opacity,
    config?.windows?.main?.glassEffect?.blur,
    config?.windows?.main?.glassEffect?.saturation,
    config?.windows?.main?.glassEffect?.tintColor,
    config?.windows?.main?.glassEffect?.tintOpacity
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
  if (s.length === 3) {
    s = s.split('').map(c => c + c).join('');
  }
  const num = parseInt(s, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return { r, g, b };
}
