/**
 * 样式工具函数
 * 
 * 提供统一的样式生成和管理工具
 */

import type { MessageRole } from '../types/chat';

/**
 * 合并类名（类似clsx）
 * @param classes 类名数组
 * @returns 合并后的类名字符串
 * 
 * @example
 * cn('base-class', condition && 'conditional-class', 'another-class')
 * // => 'base-class conditional-class another-class'
 */
export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * 获取消息气泡的类名
 * @param role 消息角色
 * @param isStreaming 是否正在流式输出
 * @returns 类名字符串
 * 
 * @example
 * getMessageBubbleClass('user')
 * // => 'message-bubble message-user'
 * 
 * getMessageBubbleClass('assistant', true)
 * // => 'message-bubble message-assistant message-streaming'
 */
export const getMessageBubbleClass = (role: MessageRole, isStreaming = false): string => {
  return cn(
    'message-bubble',
    `message-${role}`,
    isStreaming && 'message-streaming'
  );
};

/**
 * 获取消息容器的类名
 * @param role 消息角色
 * @returns 类名字符串
 */
export const getMessageContainerClass = (role: MessageRole): string => {
  return cn(
    'message-container',
    role === 'user' && 'justify-end',
    role === 'assistant' && 'justify-start',
    role === 'system' && 'justify-center'
  );
};

/**
 * 获取按钮的类名
 * @param variant 按钮变体
 * @param size 按钮大小
 * @param disabled 是否禁用
 * @returns 类名字符串
 */
export const getButtonClass = (
  variant: 'primary' | 'secondary' | 'ghost' | 'destructive' = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md',
  disabled = false
): string => {
  const baseClass = 'chat-button';
  const variantClass = `chat-button-${variant}`;
  const sizeClass = `chat-button-${size}`;
  const disabledClass = disabled ? 'chat-button-disabled' : '';

  return cn(baseClass, variantClass, sizeClass, disabledClass);
};

/**
 * 获取输入框的类名
 * @param isFocused 是否聚焦
 * @param hasError 是否有错误
 * @returns 类名字符串
 */
export const getInputClass = (isFocused = false, hasError = false): string => {
  return cn(
    'chat-input',
    isFocused && 'chat-input-focused',
    hasError && 'chat-input-error'
  );
};

/**
 * 获取玻璃效果的类名
 * @param intensity 强度（light | medium | strong）
 * @returns 类名字符串
 */
export const getGlassClass = (intensity: 'light' | 'medium' | 'strong' = 'medium'): string => {
  return cn('glass', `glass-${intensity}`);
};

/**
 * 生成内联样式对象
 * @param styles 样式对象
 * @returns React样式对象
 * 
 * @example
 * createInlineStyle({ opacity: 0.5, transform: 'translateY(10px)' })
 * // => { opacity: 0.5, transform: 'translateY(10px)' }
 */
export const createInlineStyle = (
  styles: Record<string, string | number>
): React.CSSProperties => {
  return styles as React.CSSProperties;
};

/**
 * 获取CSS变量值
 * @param varName CSS变量名（不含--前缀）
 * @param fallback 回退值
 * @returns CSS变量值
 * 
 * @example
 * getCSSVar('primary')
 * // => '59 130 246'
 */
export const getCSSVar = (varName: string, fallback = ''): string => {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${varName}`)
    .trim() || fallback;
};

/**
 * 设置CSS变量值
 * @param varName CSS变量名（不含--前缀）
 * @param value 变量值
 * 
 * @example
 * setCSSVar('primary', '59 130 246')
 */
export const setCSSVar = (varName: string, value: string): void => {
  if (typeof window === 'undefined') return;
  document.documentElement.style.setProperty(`--${varName}`, value);
};

/**
 * 将RGB字符串转换为rgba
 * @param rgb RGB字符串（如 '59 130 246'）
 * @param alpha 透明度
 * @returns rgba字符串
 * 
 * @example
 * rgbToRgba('59 130 246', 0.5)
 * // => 'rgba(59, 130, 246, 0.5)'
 */
export const rgbToRgba = (rgb: string, alpha: number): string => {
  const values = rgb.split(' ').map(v => v.trim());
  if (values.length === 3) {
    return `rgba(${values.join(', ')}, ${alpha})`;
  }
  return rgb;
};

/**
 * 获取对比色（用于文本颜色）
 * @param rgb RGB字符串
 * @returns 'light' | 'dark'
 * 
 * @example
 * getContrastColor('59 130 246')
 * // => 'light' (因为蓝色背景需要浅色文字)
 */
export const getContrastColor = (rgb: string): 'light' | 'dark' => {
  const values = rgb.split(' ').map(v => parseInt(v.trim(), 10));
  if (values.length !== 3) return 'dark';

  const [r = 0, g = 0, b = 0] = values as [number?, number?, number?];
  // 计算相对亮度
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? 'dark' : 'light';
};

/**
 * 生成渐变背景样式
 * @param from 起始颜色
 * @param to 结束颜色
 * @param direction 方向
 * @returns 渐变CSS字符串
 * 
 * @example
 * createGradient('59 130 246', '96 165 250', 'to right')
 * // => 'linear-gradient(to right, rgb(59 130 246), rgb(96 165 250))'
 */
export const createGradient = (
  from: string,
  to: string,
  direction = 'to bottom'
): string => {
  return `linear-gradient(${direction}, rgb(${from}), rgb(${to}))`;
};

/**
 * 创建玻璃效果样式对象
 * @param opacity 透明度
 * @param blur 模糊度
 * @param saturation 饱和度
 * @returns React样式对象
 */
export const createGlassStyle = (
  opacity = 0.15,
  blur = 40,
  saturation = 200
): React.CSSProperties => {
  return {
    backgroundColor: `rgba(255, 255, 255, ${opacity})`,
    backdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
  };
};

/**
 * 创建阴影样式
 * @param size 阴影大小
 * @param color 阴影颜色（可选）
 * @returns 阴影CSS字符串
 */
export const createShadow = (
  size: 'sm' | 'md' | 'lg' | 'xl' = 'md',
  color?: string
): string => {
  const shadows = {
    sm: '0 1px 2px 0',
    md: '0 4px 6px -1px',
    lg: '0 10px 15px -3px',
    xl: '0 20px 25px -5px',
  };

  const shadowColor = color || 'rgb(0 0 0 / 0.1)';
  return `${shadows[size]} ${shadowColor}`;
};

/**
 * 创建过渡样式
 * @param properties 要过渡的属性
 * @param duration 持续时间
 * @param easing 缓动函数
 * @returns 过渡CSS字符串
 */
export const createTransition = (
  properties: string[] = ['all'],
  duration = '200ms',
  easing = 'cubic-bezier(0.4, 0, 0.2, 1)'
): string => {
  return properties.map(prop => `${prop} ${duration} ${easing}`).join(', ');
};

/**
 * 响应式字体大小
 * @param base 基础大小（px）
 * @param scale 缩放比例
 * @returns clamp CSS字符串
 */
export const responsiveFontSize = (base: number, scale = 1.2): string => {
  const min = base / scale;
  const max = base * scale;
  return `clamp(${min}px, ${base}px + 0.5vw, ${max}px)`;
};

/**
 * 截断文本样式
 * @param lines 行数（1为单行截断）
 * @returns React样式对象
 */
export const createTruncateStyle = (lines = 1): React.CSSProperties => {
  if (lines === 1) {
    return {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    };
  }

  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
};

/**
 * 创建脉冲动画样式
 * @param duration 持续时间
 * @returns React样式对象
 */
export const createPulseStyle = (duration = '2s'): React.CSSProperties => {
  return {
    animation: `pulse ${duration} cubic-bezier(0.4, 0, 0.6, 1) infinite`,
  };
};

/**
 * 创建淡入动画样式
 * @param duration 持续时间
 * @param delay 延迟时间
 * @returns React样式对象
 */
export const createFadeInStyle = (
  duration = '200ms',
  delay = '0ms'
): React.CSSProperties => {
  return {
    animation: `fadeIn ${duration} ease-out ${delay} forwards`,
    opacity: 0,
  };
};

/**
 * 创建滑入动画样式
 * @param direction 方向
 * @param duration 持续时间
 * @returns React样式对象
 */
export const createSlideInStyle = (
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  duration = '200ms'
): React.CSSProperties => {
  return {
    animation: `slideIn${direction.charAt(0).toUpperCase() + direction.slice(1)} ${duration} ease-out forwards`,
    opacity: 0,
  };
};
