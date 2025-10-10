/**
 * 统一对话系统类型定义
 * 
 * 本文件定义了所有对话组件共享的类型接口
 * 遵循开发规则文档: .augment/rules/CHAT_COMPONENTS.md
 */

/**
 * 消息角色类型
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * 消息类型
 */
export type MessageType = 'text' | 'stream' | 'error';

/**
 * 附件类型
 */
export type AttachmentType = 'image' | 'file';

/**
 * 附件接口
 */
export interface Attachment {
  /** 附件类型 */
  type: AttachmentType;
  /** 文件名 */
  name: string;
  /** 文件URL（dataURL或文件路径） */
  url: string;
  /** 文件大小（字节） */
  size?: number;
  /** MIME类型 */
  mimeType?: string;
}

/**
 * 消息接口
 */
export interface Message {
  /** 唯一标识，格式: msg-{timestamp}-{role}-{random} */
  id: string;
  /** 所属会话ID */
  sessionId: string;
  /** 消息角色 */
  role: MessageRole;
  /** 消息内容 */
  content: string;
  /** Unix时间戳（毫秒） */
  timestamp: number;
  /** 消息类型 */
  type?: MessageType;
  /** 附件列表 */
  attachments?: Attachment[];
  /** 扩展元数据 */
  metadata?: Record<string, any>;
}

/**
 * 对话会话接口
 */
export interface ChatSession {
  /** 会话ID */
  id: string;
  /** 会话名称 */
  name: string;
  /** 消息列表 */
  messages: Message[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 智能建议列表 */
  suggestions: string[];
  /** 最后更新时间（Unix时间戳） */
  lastUpdate: number;
  /** 是否为活跃会话 */
  isActive: boolean;
  /** 扩展元数据 */
  metadata?: Record<string, any>;
}

/**
 * 基础对话组件Props
 * 所有对话组件必须实现此接口
 */
export interface BaseChatProps {
  /**
   * 会话ID，用于区分不同的对话会话
   * 必需，用于状态管理和持久化
   */
  sessionId: string;

  /**
   * 会话名称，显示在头部
   * 可选，默认为"对话"
   */
  sessionName?: string;

  /**
   * 自定义类名
   * 可选，用于外部样式覆盖
   */
  className?: string;

  /**
   * 是否启用持久化
   * 可选，默认为true
   */
  enablePersistence?: boolean;

  /**
   * 是否启用智能建议
   * 可选，默认为false
   */
  enableSuggestions?: boolean;

  /**
   * 自定义配置
   * 可选，用于扩展功能
   */
  config?: ChatConfig;
}

/**
 * 对话配置接口
 */
export interface ChatConfig {
  /** 最大消息数量 */
  maxMessages?: number;
  /** 是否自动滚动 */
  autoScroll?: boolean;
  /** 是否显示时间戳 */
  showTimestamp?: boolean;
  /** 是否启用虚拟滚动 */
  enableVirtualScroll?: boolean;
  /** 扩展配置 */
  [key: string]: any;
}

/**
 * AI助手对话Props
 */
export interface AIChatProps extends BaseChatProps {
  /**
   * AI模型配置
   */
  modelConfig?: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };

  /**
   * 是否启用联网搜索
   */
  enableWebSearch?: boolean;
}

/**
 * 医疗对话Props
 */
export interface MedicalChatProps extends BaseChatProps {
  /**
   * 患者信息
   */
  patientInfo?: {
    patient_id: string;
    name: string;
    age: number;
    gender: string;
    [key: string]: any;
  };

  /**
   * 是否自动启动流程
   */
  autoStart?: boolean;
}

/**
 * 智能体对话Props
 */
export interface AgentChatProps extends BaseChatProps {
  /**
   * 工作流配置
   */
  workflow: {
    id: string;
    name: string;
    [key: string]: any;
  };

  /**
   * 是否自动启动工作流
   */
  autoStartWorkflow?: boolean;
}

/**
 * 流式响应选项
 */
export interface StreamOptions {
  /** AbortSignal用于取消请求 */
  signal: AbortSignal;
  /** 接收到文本片段时的回调 */
  onChunk: (chunk: string) => void;
  /** 完成时的回调 */
  onComplete: () => void;
  /** 错误时的回调 */
  onError: (error: Error) => void;
}

/**
 * 消息操作类型
 */
export type MessageAction = 'copy' | 'delete' | 'regenerate' | 'edit';

/**
 * 持久化存储键
 */
export const STORAGE_KEYS = {
  /** 会话数据 */
  SESSIONS: 'chat:sessions',
  /** 活跃会话ID */
  ACTIVE_SESSION: 'chat:activeSession',
  /** 用户偏好 */
  PREFERENCES: 'chat:preferences',
} as const;

/**
 * 默认配置
 */
export const DEFAULT_CHAT_CONFIG: Required<ChatConfig> = {
  maxMessages: 500,
  autoScroll: true,
  showTimestamp: true,
  enableVirtualScroll: false,
};

/**
 * 消息ID生成函数类型
 */
export type GenerateMessageId = (role: MessageRole) => string;

/**
 * 时间格式化函数类型
 */
export type FormatTime = (timestamp: number) => string;

/**
 * 文件大小格式化函数类型
 */
export type FormatFileSize = (bytes: number) => string;

