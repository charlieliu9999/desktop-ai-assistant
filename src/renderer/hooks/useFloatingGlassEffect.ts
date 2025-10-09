import { useEffect } from 'react';
import { useConfigStore } from '../stores/configStore';

export const useFloatingGlassEffect = () => {
  const { config } = useConfigStore();

  useEffect(() => {
    const glass = config?.windows?.floating?.glassEffect;

    if (!glass?.enabled) {
      document.documentElement.style.removeProperty('--glass-opacity');
      document.documentElement.style.removeProperty('--glass-blur');
      document.documentElement.style.removeProperty('--glass-saturation');
      document.documentElement.style.removeProperty('--glass-tint');
      return;
    }

    const opacity = glass.opacity ?? 0.15;
    const blur = glass.blur ?? 25;
    const saturation = glass.saturation ?? 180;
    const tintColor = glass.tintColor ?? '#000000';
    const tintOpacity = glass.tintOpacity ?? 0;

    document.documentElement.style.setProperty('--glass-opacity', String(opacity));
    document.documentElement.style.setProperty('--glass-blur', `${blur}px`);
    document.documentElement.style.setProperty('--glass-saturation', `${saturation}%`);
    document.documentElement.style.setProperty('--glass-tint', hexToRgba(tintColor, clamp01(tintOpacity)));
  }, [
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

