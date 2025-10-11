/**
 * 统一对话状态管理 Store
 *
 * 使用Zustand管理所有对话组件的状态
 * 支持多会话管理、消息持久化、智能建议等功能
 *
 * 遵循开发规则文档: .augment/rules/CHAT_COMPONENTS.md
 */

import { create } from 'zustand';
import type { Message, ChatSession } from '../types/chat';
import { STORAGE_KEYS } from '../types/chat';

/**
 * ChatStore接口定义
 */
interface ChatStore {
  // ========== 状态 ==========
  /** 所有会话（使用Map存储，key为sessionId） */
  sessions: Map<string, ChatSession>;
  /** 当前活跃的会话ID */
  activeSessionId: string | null;

  // ========== 会话管理 ==========
  /**
   * 获取或创建会话
   * @param sessionId 会话ID
   * @param sessionName 会话名称（可选）
   * @returns 会话对象
   */
  getSession: (sessionId: string, sessionName?: string) => ChatSession;

  /**
   * 更新会话状态
   * @param sessionId 会话ID
   * @param updates 要更新的字段
   */
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;

  /**
   * 切换活跃会话
   * @param sessionId 会话ID
   */
  setActiveSession: (sessionId: string) => void;

  /**
   * 获取所有会话（按最后更新时间排序）
   * @returns 会话数组
   */
  getAllSessions: () => ChatSession[];

  /**
   * 删除会话
   * @param sessionId 会话ID
   */
  deleteSession: (sessionId: string) => void;

  // ========== 消息操作 ==========
  /**
   * 添加消息到会话
   * @param sessionId 会话ID
   * @param message 消息对象
   */
  addMessage: (sessionId: string, message: Message) => void;

  /**
   * 更新消息内容（用于流式输出）
   * @param sessionId 会话ID
   * @param messageId 消息ID
   * @param content 新内容
   */
  updateMessage: (sessionId: string, messageId: string, content: string) => void;

  /**
   * 更新消息类型
   * @param sessionId 会话ID
   * @param messageId 消息ID
   * @param type 消息类型
   */
  updateMessageType: (sessionId: string, messageId: string, type: 'text' | 'stream' | 'error') => void;

  /**
   * 删除消息
   * @param sessionId 会话ID
   * @param messageId 消息ID
   */
  deleteMessage: (sessionId: string, messageId: string) => void;

  /**
   * 清空会话的所有消息
   * @param sessionId 会话ID
   */
  clearSession: (sessionId: string) => void;

  /**
   * 批量导入消息（用于数据迁移）
   * @param sessionId 会话ID
   * @param messages 消息数组
   */
  importMessages: (sessionId: string, messages: Message[]) => void;

  // ========== 状态控制 ==========
  /**
   * 设置加载状态
   * @param sessionId 会话ID
   * @param loading 是否加载中
   */
  setLoading: (sessionId: string, loading: boolean) => void;

  /**
   * 设置错误信息
   * @param sessionId 会话ID
   * @param error 错误信息
   */
  setError: (sessionId: string, error: string | null) => void;

  /**
   * 设置智能建议
   * @param sessionId 会话ID
   * @param suggestions 建议列表
   */
  setSuggestions: (sessionId: string, suggestions: string[]) => void;

  // ========== 持久化 ==========
  /**
   * 保存会话到本地存储
   * @param sessionId 会话ID
   */
  persistSession: (sessionId: string) => void;

  /**
   * 从本地存储恢复会话
   * @param sessionId 会话ID
   */
  restoreSession: (sessionId: string) => void;

  /**
   * 保存所有会话到本地存储
   */
  persistAllSessions: () => void;

  /**
   * 从本地存储恢复所有会话
   */
  restoreAllSessions: () => void;
}

/**
 * 创建默认会话对象
 */
const createDefaultSession = (sessionId: string, sessionName: string = '对话'): ChatSession => ({
  id: sessionId,
  name: sessionName,
  messages: [],
  isLoading: false,
  error: null,
  suggestions: [],
  lastUpdate: Date.now(),
  isActive: false,
  metadata: {},
});


/**
 * 从localStorage读取数据
 */
const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch (error) {
    console.warn(`Failed to load from storage (${key}):`, error);
    return fallback;
  }
};

/**
 * 保存数据到localStorage
 */
const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Failed to save to storage (${key}):`, error);
  }
};

/**
 * 创建ChatStore
 */
export const useChatStore = create<ChatStore>((set, get) => ({
  // ========== 初始状态 ==========
  sessions: new Map(),
  activeSessionId: null,

  // ========== 会话管理 ==========
  getSession: (sessionId: string, sessionName?: string) => {
    const { sessions } = get();

    if (!sessions.has(sessionId)) {
      const newSession = createDefaultSession(sessionId, sessionName);
      const newSessions = new Map(sessions);
      newSessions.set(sessionId, newSession);
      set({ sessions: newSessions });

      console.log('[ChatStore] Created new session:', sessionId);
      return newSession;
    }

    return sessions.get(sessionId)!;
  },

  updateSession: (sessionId: string, updates: Partial<ChatSession>) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);

    if (session) {
      const updatedSession = {
        ...session,
        ...updates,
        lastUpdate: Date.now(),
      };

      const newSessions = new Map(sessions);
      newSessions.set(sessionId, updatedSession);
      set({ sessions: newSessions });

      console.log('[ChatStore] Updated session:', sessionId, updates);
    } else {
      console.warn('[ChatStore] Session not found:', sessionId);
    }
  },

  setActiveSession: (sessionId: string) => {
    const { sessions } = get();
    const newSessions = new Map(sessions);

    // 将所有会话设为非活跃
    newSessions.forEach((session, id) => {
      if (session.isActive) {
        newSessions.set(id, { ...session, isActive: false });
      }
    });

    // 设置当前会话为活跃
    const session = newSessions.get(sessionId);
    if (session) {
      newSessions.set(sessionId, { ...session, isActive: true });
      set({ sessions: newSessions, activeSessionId: sessionId });
      console.log('[ChatStore] Set active session:', sessionId);
    } else {
      console.warn('[ChatStore] Session not found for activation:', sessionId);
    }
  },

  getAllSessions: () => {
    const { sessions } = get();
    return Array.from(sessions.values()).sort((a, b) => b.lastUpdate - a.lastUpdate);
  },

  deleteSession: (sessionId: string) => {
    const { sessions, activeSessionId } = get();
    const newSessions = new Map(sessions);
    newSessions.delete(sessionId);

    const newActiveSessionId = activeSessionId === sessionId ? null : activeSessionId;
    set({ sessions: newSessions, activeSessionId: newActiveSessionId });

    // 从存储中删除
    try {
      localStorage.removeItem(`${STORAGE_KEYS.SESSIONS}:${sessionId}`);
    } catch (error) {
      console.warn('Failed to delete session from storage:', error);
    }

    console.log('[ChatStore] Deleted session:', sessionId);
  },

  // ========== 消息操作 ==========
  addMessage: (sessionId: string, message: Message) => {
    const { sessions, updateSession } = get();
    const session = sessions.get(sessionId);

    if (session) {
      const updatedMessages = [...session.messages, message];
      updateSession(sessionId, { messages: updatedMessages });
      console.log('[ChatStore] Added message to session:', sessionId, message.id);
    } else {
      console.warn('[ChatStore] Session not found for adding message:', sessionId);
    }
  },

  updateMessage: (sessionId: string, messageId: string, content: string) => {
    const { sessions, updateSession } = get();
    const session = sessions.get(sessionId);

    if (session) {
      const updatedMessages = session.messages.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg
      );
      updateSession(sessionId, { messages: updatedMessages });
    }
  },

  updateMessageType: (sessionId: string, messageId: string, type: 'text' | 'stream' | 'error') => {
    const { sessions, updateSession } = get();
    const session = sessions.get(sessionId);

    if (session) {
      const updatedMessages = session.messages.map((msg) =>
        msg.id === messageId ? { ...msg, type } : msg
      );
      updateSession(sessionId, { messages: updatedMessages });
    }
  },

  deleteMessage: (sessionId: string, messageId: string) => {
    const { sessions, updateSession } = get();
    const session = sessions.get(sessionId);

    if (session) {
      const updatedMessages = session.messages.filter((msg) => msg.id !== messageId);
      updateSession(sessionId, { messages: updatedMessages });
      console.log('[ChatStore] Deleted message:', messageId);
    }
  },

  clearSession: (sessionId: string) => {
    const { updateSession } = get();
    updateSession(sessionId, {
      messages: [],
      error: null,
      suggestions: [],
      isLoading: false,
    });
    console.log('[ChatStore] Cleared session:', sessionId);
  },

  importMessages: (sessionId: string, messages: Message[]) => {
    const { updateSession } = get();
    updateSession(sessionId, { messages });
    console.log('[ChatStore] Imported messages to session:', sessionId, messages.length);
  },

  // ========== 状态控制 ==========
  setLoading: (sessionId: string, loading: boolean) => {
    const { updateSession } = get();
    updateSession(sessionId, { isLoading: loading });
  },

  setError: (sessionId: string, error: string | null) => {
    const { updateSession } = get();
    updateSession(sessionId, { error });
  },

  setSuggestions: (sessionId: string, suggestions: string[]) => {
    const { updateSession } = get();
    updateSession(sessionId, { suggestions });
  },

  // ========== 持久化 ==========
  persistSession: (sessionId: string) => {
    const { sessions } = get();
    const session = sessions.get(sessionId);

    if (session) {
      saveToStorage(`${STORAGE_KEYS.SESSIONS}:${sessionId}`, session);
    }
  },

  restoreSession: (sessionId: string) => {
    const session = loadFromStorage<ChatSession | null>(
      `${STORAGE_KEYS.SESSIONS}:${sessionId}`,
      null
    );

    if (session) {
      const { sessions } = get();
      const newSessions = new Map(sessions);
      newSessions.set(sessionId, session);
      set({ sessions: newSessions });
      console.log('[ChatStore] Restored session from storage:', sessionId);
    }
  },

  persistAllSessions: () => {
    const { sessions } = get();
    sessions.forEach((session, sessionId) => {
      saveToStorage(`${STORAGE_KEYS.SESSIONS}:${sessionId}`, session);
    });
    console.log('[ChatStore] Persisted all sessions');
  },

  restoreAllSessions: () => {
    // 这个方法需要知道所有sessionId，实际使用中可能需要维护一个sessionId列表
    console.log('[ChatStore] Restore all sessions - implement based on your needs');
  },
}));

// ========== 向后兼容导出 ==========
// 保留旧的类型导出，避免破坏现有代码
export type ChatRole = 'user' | 'assistant' | 'system';
export type { Message as ChatMessage, Attachment as ChatAttachment } from '../types/chat';
