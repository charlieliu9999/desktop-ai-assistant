/**
 * 对话系统工具函数库
 * 
 * 提供消息ID生成、时间格式化、文件处理等通用工具函数
 * 遵循开发规则文档: .augment/rules/CHAT_COMPONENTS.md
 */

import type { MessageRole } from '../types/chat';

/**
 * 生成唯一的消息ID
 * 格式: msg-{timestamp}-{role}-{random}
 * 
 * @param role 消息角色
 * @returns 唯一的消息ID
 * 
 * @example
 * generateMessageId('user') // "msg-1696800000000-user-a1b2"
 */
export const generateMessageId = (role: MessageRole): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  return `msg-${timestamp}-${role}-${random}`;
};

/**
 * 格式化时间戳为相对时间
 * 
 * @param timestamp Unix时间戳（毫秒）
 * @returns 相对时间字符串
 * 
 * @example
 * formatRelativeTime(Date.now() - 1000) // "刚刚"
 * formatRelativeTime(Date.now() - 60000) // "1分钟前"
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return '刚刚';
  if (seconds < 60) return `${seconds}秒前`;
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  // 超过7天显示绝对时间
  return formatAbsoluteTime(timestamp);
};

/**
 * 格式化时间戳为绝对时间
 * 
 * @param timestamp Unix时间戳（毫秒）
 * @returns 绝对时间字符串
 * 
 * @example
 * formatAbsoluteTime(1696800000000) // "2023-10-09 10:00"
 */
export const formatAbsoluteTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

/**
 * 格式化时间戳为简短时间（仅时分）
 * 
 * @param timestamp Unix时间戳（毫秒）
 * @returns 简短时间字符串
 * 
 * @example
 * formatShortTime(1696800000000) // "10:00"
 */
export const formatShortTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * 格式化文件大小
 * 
 * @param bytes 文件大小（字节）
 * @returns 格式化后的文件大小字符串
 * 
 * @example
 * formatFileSize(1024) // "1.00 KB"
 * formatFileSize(1048576) // "1.00 MB"
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * 移除Markdown中的<think>标签
 * 某些AI模型会在响应中包含思考过程，需要移除
 * 
 * @param content 原始内容
 * @returns 移除<think>标签后的内容
 * 
 * @example
 * stripThinkTags('<think>思考中...</think>这是回答') // "这是回答"
 */
export const stripThinkTags = (content: string): string => {
  if (!content) return content;

  try {
    return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() || content;
  } catch {
    return content;
  }
};

/**
 * 截断长文本
 * 
 * @param text 原始文本
 * @param maxLength 最大长度
 * @param ellipsis 省略符号
 * @returns 截断后的文本
 * 
 * @example
 * truncateText('这是一段很长的文本', 5) // "这是一段很..."
 */
export const truncateText = (
  text: string,
  maxLength: number,
  ellipsis: string = '...'
): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + ellipsis;
};

/**
 * 检测文本是否为代码块
 * 
 * @param text 文本内容
 * @returns 是否为代码块
 */
export const isCodeBlock = (text: string): boolean => {
  return /^```[\s\S]*```$/m.test(text.trim());
};

/**
 * 提取代码块语言
 * 
 * @param text 代码块文本
 * @returns 语言标识
 * 
 * @example
 * extractCodeLanguage('```typescript\nconst a = 1;\n```') // "typescript"
 */
export const extractCodeLanguage = (text: string): string | null => {
  const match = text.match(/^```(\w+)/);
  return match ? match[1] : null;
};

/**
 * 复制文本到剪贴板
 * 
 * @param text 要复制的文本
 * @returns Promise<boolean> 是否成功
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * 读取文件内容为文本
 * 
 * @param file 文件对象
 * @returns Promise<string> 文件内容
 */
export const readFileAsText = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

/**
 * 读取文件内容为DataURL
 * 
 * @param file 文件对象
 * @returns Promise<string> DataURL
 */
export const readFileAsDataURL = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

/**
 * 检查文件是否为图片
 * 
 * @param file 文件对象
 * @returns 是否为图片
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * 检查文件是否为文本文件
 * 
 * @param file 文件对象
 * @returns 是否为文本文件
 */
export const isTextFile = (file: File): boolean => {
  const textTypes = [
    'text/',
    'application/json',
    'application/xml',
    'application/javascript',
  ];

  const textExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.js', '.ts', '.tsx', '.jsx'];

  return (
    textTypes.some((type) => file.type.startsWith(type)) ||
    textExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
  );
};

/**
 * 验证会话ID格式
 * 
 * @param sessionId 会话ID
 * @returns 是否有效
 */
export const isValidSessionId = (sessionId: string): boolean => {
  return typeof sessionId === 'string' && sessionId.length > 0;
};

/**
 * 验证消息ID格式
 * 
 * @param messageId 消息ID
 * @returns 是否有效
 */
export const isValidMessageId = (messageId: string): boolean => {
  return /^msg-\d+-\w+-\w+$/.test(messageId);
};

/**
 * 防抖函数
 * 
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

/**
 * 节流函数
 * 
 * @param fn 要节流的函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};

/**
 * 生成会话ID
 * 格式: session-{timestamp}-{random}
 * 
 * @returns 唯一的会话ID
 */
export const generateSessionId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `session-${timestamp}-${random}`;
};

