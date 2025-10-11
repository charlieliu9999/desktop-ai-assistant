/**
 * 统一的输入框和输出框样式
 * 
 * 用于确保整个应用中所有输入框和输出框在深色/浅色主题下保持一致的视觉效果
 */

/**
 * 统一的 textarea 输入框样式
 * 适用于：AI对话、桌面识别、医疗系统、智能体等所有模块
 */
export const UNIFIED_TEXTAREA_STYLES =
  'flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl resize-none ' +
  'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 ' +
  'bg-white dark:bg-gray-800 ' +
  'text-gray-900 dark:text-gray-100 ' +
  'placeholder:text-gray-500 dark:placeholder:text-gray-400 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'transition-all duration-200 shadow-sm';

/**
 * 统一的 input 输入框样式
 * 适用于：表单输入、搜索框等
 */
export const UNIFIED_INPUT_STYLES =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ' +
  'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 ' +
  'bg-white dark:bg-gray-800 ' +
  'text-gray-900 dark:text-gray-100 ' +
  'placeholder:text-gray-500 dark:placeholder:text-gray-400 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'transition-all duration-200 shadow-sm';

/**
 * 统一的输出框样式（用于显示AI回复、推荐结果等）
 * 适用于：AI消息气泡、推荐结果展示区域等
 */
export const UNIFIED_OUTPUT_STYLES = 
  'p-4 rounded-lg border border-gray-300 dark:border-gray-600 ' +
  'bg-gray-50 dark:bg-gray-800 ' +
  'text-gray-900 dark:text-gray-100';

/**
 * 统一的代码块/预格式化文本样式
 * 适用于：代码展示、JSON数据展示等
 */
export const UNIFIED_PRE_STYLES = 
  'p-3 rounded-md bg-gray-50 dark:bg-gray-800 ' +
  'border border-gray-200 dark:border-gray-700 ' +
  'whitespace-pre-wrap text-sm ' +
  'text-gray-800 dark:text-gray-200';

/**
 * 统一的卡片容器样式
 * 适用于：各种内容卡片
 */
export const UNIFIED_CARD_STYLES = 
  'border border-gray-300 dark:border-gray-600 rounded-lg p-4 ' +
  'bg-white dark:bg-gray-900 ' +
  'shadow-sm';

/**
 * 统一的按钮样式
 */
export const UNIFIED_BUTTON_STYLES = {
  primary: 
    'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg ' +
    'transition-all duration-200 shadow-md hover:shadow-lg ' +
    'disabled:opacity-50 disabled:cursor-not-allowed',
  
  secondary: 
    'px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg ' +
    'transition-all duration-200 shadow-md hover:shadow-lg ' +
    'disabled:opacity-50 disabled:cursor-not-allowed',
  
  danger: 
    'px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg ' +
    'transition-all duration-200 shadow-md hover:shadow-lg ' +
    'disabled:opacity-50 disabled:cursor-not-allowed',
};

/**
 * 玻璃拟态效果的输入框样式（可选）
 * 用于需要玻璃效果的场景
 */
export const GLASS_TEXTAREA_STYLES =
  'flex-1 px-4 py-3 border border-gray-300/50 dark:border-gray-600/50 rounded-xl resize-none ' +
  'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400/50 ' +
  'bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm ' +
  'text-gray-900 dark:text-gray-100 ' +
  'placeholder:text-gray-500 dark:placeholder:text-gray-400 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'transition-all duration-200 shadow-sm';

/**
 * 玻璃拟态效果的输出框样式（可选）
 */
export const GLASS_OUTPUT_STYLES = 
  'p-4 rounded-lg border border-gray-300/50 dark:border-gray-600/50 ' +
  'bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm ' +
  'text-gray-900 dark:text-gray-100 ' +
  'shadow-lg';

