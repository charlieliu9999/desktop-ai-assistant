/**
 * 主题配置系统
 * 
 * 定义所有主题的颜色、样式配置
 * 支持玻璃、浅色、深色三种主题
 */

export type ThemeMode = 'glass' | 'light' | 'dark' | 'auto';

/**
 * 颜色配置接口
 */
export interface ColorConfig {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  border: string;
  input: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
  error: string;
  errorForeground: string;
}

/**
 * 对话样式配置接口
 */
export interface ChatStyleConfig {
  messageUserBg: string;
  messageUserText: string;
  messageAssistantBg: string;
  messageAssistantText: string;
  messageSystemBg: string;
  messageSystemText: string;
  inputBg: string;
  inputBorder: string;
  inputFocus: string;
}

/**
 * 玻璃效果配置接口
 */
export interface GlassEffectConfig {
  enabled: boolean;
  opacity: number;
  blur: number;
  saturation: number;
  tint: string;
}

/**
 * 完整主题配置接口
 */
export interface ThemeConfig {
  mode: ThemeMode;
  colors: ColorConfig;
  chatStyle: ChatStyleConfig;
  glassEffect: GlassEffectConfig;
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };
  spacing: {
    messagGap: string;
    bubblePaddingX: string;
    bubblePaddingY: string;
    inputPadding: string;
  };
  animation: {
    durationFast: string;
    durationNormal: string;
    durationSlow: string;
  };
}

/**
 * 玻璃主题配置
 */
export const glassTheme: ThemeConfig = {
  mode: 'glass',
  colors: {
    primary: '59 130 246',
    primaryForeground: '255 255 255',
    background: '255 255 255 / 0.05',
    foreground: '15 23 42',
    card: '255 255 255 / 0.15',
    cardForeground: '15 23 42',
    border: '226 232 240 / 0.3',
    input: '226 232 240 / 0.5',
    muted: '241 245 249',
    mutedForeground: '100 116 139',
    accent: '240 253 250',
    accentForeground: '15 23 42',
    destructive: '239 68 68',
    destructiveForeground: '255 255 255',
    success: '34 197 94',
    successForeground: '255 255 255',
    warning: '251 146 60',
    warningForeground: '255 255 255',
    info: '59 130 246',
    infoForeground: '255 255 255',
    error: '239 68 68',
    errorForeground: '255 255 255',
  },
  chatStyle: {
    messageUserBg: '59 130 246',
    messageUserText: '255 255 255',
    messageAssistantBg: '255 255 255 / 0.15',
    messageAssistantText: '15 23 42',
    messageSystemBg: '254 243 199',
    messageSystemText: '120 53 15',
    inputBg: '255 255 255 / 0.15',
    inputBorder: '226 232 240 / 0.3',
    inputFocus: '59 130 246',
  },
  glassEffect: {
    enabled: true,
    opacity: 0.15,
    blur: 40,
    saturation: 200,
    tint: 'rgba(0, 0, 0, 0)',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  spacing: {
    messagGap: '1rem',
    bubblePaddingX: '1rem',
    bubblePaddingY: '0.75rem',
    inputPadding: '1rem',
  },
  animation: {
    durationFast: '150ms',
    durationNormal: '200ms',
    durationSlow: '300ms',
  },
};

/**
 * 浅色主题配置
 */
export const lightTheme: ThemeConfig = {
  mode: 'light',
  colors: {
    primary: '59 130 246',
    primaryForeground: '255 255 255',
    background: '255 255 255',
    foreground: '15 23 42',
    card: '255 255 255',
    cardForeground: '15 23 42',
    border: '226 232 240',
    input: '226 232 240',
    muted: '241 245 249',
    mutedForeground: '100 116 139',
    accent: '240 253 250',
    accentForeground: '15 23 42',
    destructive: '239 68 68',
    destructiveForeground: '255 255 255',
    success: '34 197 94',
    successForeground: '255 255 255',
    warning: '251 146 60',
    warningForeground: '255 255 255',
    info: '59 130 246',
    infoForeground: '255 255 255',
    error: '239 68 68',
    errorForeground: '255 255 255',
  },
  chatStyle: {
    messageUserBg: '59 130 246',
    messageUserText: '255 255 255',
    messageAssistantBg: '241 245 249',
    messageAssistantText: '15 23 42',
    messageSystemBg: '254 243 199',
    messageSystemText: '120 53 15',
    inputBg: '255 255 255',
    inputBorder: '226 232 240',
    inputFocus: '59 130 246',
  },
  glassEffect: {
    enabled: false,
    opacity: 0,
    blur: 0,
    saturation: 100,
    tint: 'rgba(0, 0, 0, 0)',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  spacing: {
    messagGap: '1rem',
    bubblePaddingX: '1rem',
    bubblePaddingY: '0.75rem',
    inputPadding: '1rem',
  },
  animation: {
    durationFast: '150ms',
    durationNormal: '200ms',
    durationSlow: '300ms',
  },
};

/**
 * 深色主题配置
 */
export const darkTheme: ThemeConfig = {
  mode: 'dark',
  colors: {
    primary: '96 165 250',
    primaryForeground: '15 23 42',
    background: '15 23 42',
    foreground: '248 250 252',
    card: '30 41 59',
    cardForeground: '248 250 252',
    border: '51 65 85',
    input: '51 65 85',
    muted: '51 65 85',
    mutedForeground: '148 163 184',
    accent: '30 41 59',
    accentForeground: '248 250 252',
    destructive: '248 113 113',
    destructiveForeground: '15 23 42',
    success: '74 222 128',
    successForeground: '15 23 42',
    warning: '251 191 36',
    warningForeground: '15 23 42',
    info: '96 165 250',
    infoForeground: '15 23 42',
    error: '248 113 113',
    errorForeground: '15 23 42',
  },
  chatStyle: {
    messageUserBg: '96 165 250',
    messageUserText: '15 23 42',
    messageAssistantBg: '30 41 59',
    messageAssistantText: '248 250 252',
    messageSystemBg: '254 243 199',
    messageSystemText: '120 53 15',
    inputBg: '30 41 59',
    inputBorder: '51 65 85',
    inputFocus: '96 165 250',
  },
  glassEffect: {
    enabled: false,
    opacity: 0,
    blur: 0,
    saturation: 100,
    tint: 'rgba(0, 0, 0, 0)',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  spacing: {
    messagGap: '1rem',
    bubblePaddingX: '1rem',
    bubblePaddingY: '0.75rem',
    inputPadding: '1rem',
  },
  animation: {
    durationFast: '150ms',
    durationNormal: '200ms',
    durationSlow: '300ms',
  },
};

/**
 * 主题映射
 */
export const themes: Record<Exclude<ThemeMode, 'auto'>, ThemeConfig> = {
  glass: glassTheme,
  light: lightTheme,
  dark: darkTheme,
};

/**
 * 获取主题配置
 */
export const getThemeConfig = (mode: ThemeMode): ThemeConfig => {
  if (mode === 'auto') {
    // 根据系统主题自动选择
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? darkTheme : lightTheme;
  }
  return themes[mode];
};

/**
 * 应用主题到DOM
 */
export const applyTheme = (config: ThemeConfig): void => {
  const root = document.documentElement;

  // 应用颜色变量
  Object.entries(config.colors).forEach(([key, value]) => {
    const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
  });

  // 应用对话样式变量
  Object.entries(config.chatStyle).forEach(([key, value]) => {
    const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
  });

  // 应用玻璃效果变量
  if (config.glassEffect.enabled) {
    root.style.setProperty('--glass-opacity', config.glassEffect.opacity.toString());
    root.style.setProperty('--glass-blur', `${config.glassEffect.blur}px`);
    root.style.setProperty('--glass-saturation', `${config.glassEffect.saturation}%`);
    root.style.setProperty('--glass-tint', config.glassEffect.tint);
  }

  // 应用圆角变量
  Object.entries(config.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  // 应用间距变量
  Object.entries(config.spacing).forEach(([key, value]) => {
    const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
  });

  // 应用动画变量
  Object.entries(config.animation).forEach(([key, value]) => {
    const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
  });

  // 设置主题类名
  root.classList.remove('theme-glass', 'theme-light', 'theme-dark');
  root.classList.add(`theme-${config.mode}`);

  // 设置深色模式类名（用于Tailwind dark:）
  if (config.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

