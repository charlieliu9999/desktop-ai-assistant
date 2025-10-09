/**
 * 智能体对话历史组件
 * 显示所有智能体的对话会话列表
 * 支持快速切换、删除会话
 */

import React, { useState } from 'react';
import { useAgentSessionStore } from '../store/agentSessionStore';
import { Clock, MessageSquare, Trash2, Bot, ChevronLeft, ChevronRight } from 'lucide-react';

interface AgentHistoryProps {
  onSelectWorkflow?: (workflowId: string) => void;
}

export const AgentHistory: React.FC<AgentHistoryProps> = ({ onSelectWorkflow }) => {
  const { getAllSessions, setActiveWorkflow, deleteSession, activeWorkflowId } = useAgentSessionStore();
  const sessions = getAllSessions();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSelectSession = (workflowId: string) => {
    setActiveWorkflow(workflowId);
    onSelectWorkflow?.(workflowId);
  };

  const handleDeleteSession = (e: React.MouseEvent, workflowId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个对话历史吗？')) {
      deleteSession(workflowId);
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    // 小于1分钟
    if (diff < 60000) {
      return '刚刚';
    }
    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    }
    // 小于24小时
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    }
    // 显示日期
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-8">
        <MessageSquare size={64} className="mb-4 opacity-30" />
        <p className="text-sm text-center">暂无对话历史</p>
        <p className="text-xs text-center mt-2 opacity-70">
          选择智能体开始对话后<br />这里会显示历史记录
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-[280px]'}`}>
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${isCollapsed ? 'hidden' : ''}`}>
            <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              对话历史
            </h3>
          </div>

          {/* 折叠按钮 */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title={isCollapsed ? '展开历史记录' : '折叠历史记录'}
          >
            {isCollapsed ? (
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {!isCollapsed && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            共 {sessions.length} 个会话
          </p>
        )}
      </div>

      {/* 会话列表 */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sessions.map(session => {
          const lastMessage = session.messages[session.messages.length - 1];
          const messageCount = session.messages.length;
          
          return (
            <div
              key={session.workflowId}
              onClick={() => handleSelectSession(session.workflowId)}
              className={`
                group relative p-3 rounded-xl cursor-pointer transition-all duration-200
                ${session.isActive
                  ? 'bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 border-2 border-blue-500 dark:border-blue-400 shadow-lg'
                  : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:shadow-md'
                }
              `}
            >
              {/* 活跃指示器 */}
              {session.isActive && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
              )}

              {/* 智能体图标和名称 */}
              <div className="flex items-start gap-3 mb-2">
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                  ${session.isActive
                    ? 'bg-blue-500 dark:bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                  }
                `}>
                  <Bot size={20} className="text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {session.workflowName}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {messageCount} 条消息
                    </span>
                    {session.sessionId && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                        已连接
                      </span>
                    )}
                  </div>
                </div>

                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteSession(e, session.workflowId)}
                  className="
                    opacity-0 group-hover:opacity-100 transition-opacity
                    p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30
                    text-gray-400 hover:text-red-600 dark:hover:text-red-400
                  "
                  title="删除会话"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* 最后一条消息预览 */}
              {lastMessage && (
                <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 pl-13">
                  {lastMessage.role === 'user' ? '你: ' : 'AI: '}
                  {lastMessage.content.substring(0, 80)}
                  {lastMessage.content.length > 80 ? '...' : ''}
                </div>
              )}

              {/* 时间戳 */}
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 pl-13">
                <Clock size={12} />
                <span>{formatTime(session.lastUpdate)}</span>
              </div>
            </div>
          );
        })}

        {/* 底部提示 */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 点击会话可快速切换对话
          </p>
        </div>
      </div>
      )}
    </div>
  );
};

