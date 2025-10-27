// @ts-nocheck
/**
 * 智能体会话管理 Store
 * 使用 Zustand 管理多个智能体的对话会话
 * 支持会话持久化、消息历史、状态管理
 */

import { create } from 'zustand';
import type { BishengMessage } from '../../shared/types';

/**
 * 单个智能体会话数据
 */
export interface AgentSession {
  workflowId: string;           // 工作流 ID
  workflowName: string;          // 工作流名称
  sessionId: string | null;      // Bisheng 会话 ID
  messageId: string | null;      // 当前消息 ID
  inputNodeId: string | null;    // 输入节点 ID
  messages: BishengMessage[];    // 消息历史
  lastUpdate: number;            // 最后更新时间戳
  isActive: boolean;             // 是否为当前活跃会话
  isAutoStarted: boolean;        // 是否已自动启动
}

/**
 * 会话管理 Store 接口
 */
interface AgentSessionStore {
  sessions: Map<string, AgentSession>;
  activeWorkflowId: string | null;
  
  /**
   * 获取或创建会话
   * @param workflowId 工作流 ID
   * @param workflowName 工作流名称
   * @returns 会话对象
   */
  getSession: (workflowId: string, workflowName: string) => AgentSession;
  
  /**
   * 更新会话状态
   * @param workflowId 工作流 ID
   * @param updates 要更新的字段
   */
  updateSession: (workflowId: string, updates: Partial<AgentSession>) => void;
  
  /**
   * 添加消息到会话
   * @param workflowId 工作流 ID
   * @param message 消息对象
   */
  addMessage: (workflowId: string, message: BishengMessage) => void;
  
  /**
   * 更新消息内容（用于流式更新）
   * @param workflowId 工作流 ID
   * @param messageId 消息 ID
   * @param content 新内容
   */
  updateMessage: (workflowId: string, messageId: string, content: string) => void;
  
  /**
   * 更新消息类型
   * @param workflowId 工作流 ID
   * @param messageId 消息 ID
   * @param type 消息类型
   */
  updateMessageType: (workflowId: string, messageId: string, type: 'text' | 'stream' | 'error') => void;
  
  /**
   * 切换活跃会话
   * @param workflowId 工作流 ID
   */
  setActiveWorkflow: (workflowId: string) => void;
  
  /**
   * 获取所有会话（按最后更新时间排序）
   * @returns 会话数组
   */
  getAllSessions: () => AgentSession[];
  
  /**
   * 清空指定会话的消息
   * @param workflowId 工作流 ID
   */
  clearSessionMessages: (workflowId: string) => void;
  
  /**
   * 删除会话
   * @param workflowId 工作流 ID
   */
  deleteSession: (workflowId: string) => void;
}

/**
 * 创建会话管理 Store
 */
export const useAgentSessionStore = create<AgentSessionStore>((set, get) => ({
  sessions: new Map(),
  activeWorkflowId: null,
  
  getSession: (workflowId: string, workflowName: string) => {
    const { sessions } = get();
    
    if (!sessions.has(workflowId)) {
      const newSession: AgentSession = {
        workflowId,
        workflowName,
        sessionId: null,
        messageId: null,
        inputNodeId: null,
        messages: [],
        lastUpdate: Date.now(),
        isActive: false,
        isAutoStarted: false,
      };
      
      const newSessions = new Map(sessions);
      newSessions.set(workflowId, newSession);
      set({ sessions: newSessions });
      
      console.log('[SessionStore] Created new session:', workflowId);
      return newSession;
    }
    
    return sessions.get(workflowId)!;
  },
  
  updateSession: (workflowId: string, updates: Partial<AgentSession>) => {
    const { sessions } = get();
    const session = sessions.get(workflowId);
    
    if (session) {
      const updatedSession = {
        ...session,
        ...updates,
        lastUpdate: Date.now(),
      };
      
      const newSessions = new Map(sessions);
      newSessions.set(workflowId, updatedSession);
      set({ sessions: newSessions });
      
      console.log('[SessionStore] Updated session:', workflowId, updates);
    } else {
      console.warn('[SessionStore] Session not found:', workflowId);
    }
  },
  
  addMessage: (workflowId: string, message: BishengMessage) => {
    const { sessions } = get();
    const session = sessions.get(workflowId);
    
    if (session) {
      const updatedSession = {
        ...session,
        messages: [...session.messages, message],
        lastUpdate: Date.now(),
      };
      
      const newSessions = new Map(sessions);
      newSessions.set(workflowId, updatedSession);
      set({ sessions: newSessions });
      
      console.log('[SessionStore] Added message to session:', workflowId, message.id);
    } else {
      console.warn('[SessionStore] Session not found for adding message:', workflowId);
    }
  },
  
  updateMessage: (workflowId: string, messageId: string, content: string) => {
    const { sessions } = get();
    const session = sessions.get(workflowId);
    
    if (session) {
      const updatedMessages = session.messages.map(msg =>
        msg.id === messageId ? { ...msg, content } : msg
      );
      
      const updatedSession = {
        ...session,
        messages: updatedMessages,
        lastUpdate: Date.now(),
      };
      
      const newSessions = new Map(sessions);
      newSessions.set(workflowId, updatedSession);
      set({ sessions: newSessions });
    }
  },
  
  updateMessageType: (workflowId: string, messageId: string, type: 'text' | 'stream' | 'error') => {
    const { sessions } = get();
    const session = sessions.get(workflowId);
    
    if (session) {
      const updatedMessages = session.messages.map(msg =>
        msg.id === messageId ? { ...msg, type } : msg
      );
      
      const updatedSession = {
        ...session,
        messages: updatedMessages,
        lastUpdate: Date.now(),
      };
      
      const newSessions = new Map(sessions);
      newSessions.set(workflowId, updatedSession);
      set({ sessions: newSessions });
    }
  },
  
  setActiveWorkflow: (workflowId: string) => {
    const { sessions } = get();
    const newSessions = new Map(sessions);
    
    // 将所有会话设为非活跃
    newSessions.forEach((session, id) => {
      if (session.isActive) {
        newSessions.set(id, { ...session, isActive: false });
      }
    });
    
    // 设置当前会话为活跃
    const session = newSessions.get(workflowId);
    if (session) {
      newSessions.set(workflowId, { ...session, isActive: true });
      set({ sessions: newSessions, activeWorkflowId: workflowId });
      console.log('[SessionStore] Set active workflow:', workflowId);
    } else {
      console.warn('[SessionStore] Workflow not found for activation:', workflowId);
    }
  },
  
  getAllSessions: () => {
    const { sessions } = get();
    return Array.from(sessions.values())
      .sort((a, b) => b.lastUpdate - a.lastUpdate);
  },
  
  clearSessionMessages: (workflowId: string) => {
    const { sessions } = get();
    const session = sessions.get(workflowId);
    
    if (session) {
      const updatedSession = {
        ...session,
        messages: [],
        sessionId: null,
        messageId: null,
        inputNodeId: null,
        isAutoStarted: false,
        lastUpdate: Date.now(),
      };
      
      const newSessions = new Map(sessions);
      newSessions.set(workflowId, updatedSession);
      set({ sessions: newSessions });
      
      console.log('[SessionStore] Cleared messages for session:', workflowId);
    }
  },
  
  deleteSession: (workflowId: string) => {
    const { sessions, activeWorkflowId } = get();
    const newSessions = new Map(sessions);
    newSessions.delete(workflowId);
    
    const newActiveWorkflowId = activeWorkflowId === workflowId ? null : activeWorkflowId;
    set({ sessions: newSessions, activeWorkflowId: newActiveWorkflowId });
    
    console.log('[SessionStore] Deleted session:', workflowId);
  },
}));
// @ts-nocheck
