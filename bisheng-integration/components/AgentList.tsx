/**
 * 智能体列表组件
 * 显示可用的 Bisheng 工作流列表，支持折叠/展开
 */

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Bot, Clock, Check } from 'lucide-react';
import type { BishengWorkflow } from '../../src/shared/types';

interface AgentListProps {
  onSelectAgent: (agent: BishengWorkflow) => void;
  selectedAgent?: BishengWorkflow;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AgentList: React.FC<AgentListProps> = ({
  onSelectAgent,
  selectedAgent,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [workflows, setWorkflows] = useState<BishengWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载工作流列表
  const loadWorkflows = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.bisheng.getWorkflows();
      setWorkflows(result);
    } catch (err: any) {
      console.error('Failed to load workflows:', err);
      setError(err?.message || '加载工作流失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  if (isCollapsed) {
    return (
      <div className="w-12 h-full glass border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:glass rounded-md transition-all"
          title="展开智能体列表"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="mt-4 flex-1 flex flex-col items-center space-y-2">
          {workflows.slice(0, 5).map((workflow) => (
            <button
              key={workflow.id}
              onClick={() => onSelectAgent(workflow)}
              className={`p-2 rounded-md transition-all ${
                selectedAgent?.id === workflow.id
                  ? 'bg-blue-500/20 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 backdrop-blur-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:glass'
              }`}
              title={workflow.name}
            >
              <Bot className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 h-full glass border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">智能体列表</h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={loadWorkflows}
              disabled={loading}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:glass rounded-md transition-all disabled:opacity-50"
              title="刷新列表"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:glass rounded-md transition-all"
              title="折叠列表"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          共 {workflows.length} 个智能体
        </p>
      </div>

      {/* 工作流列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && workflows.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
            <button
              onClick={loadWorkflows}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && workflows.length === 0 && (
          <div className="p-4 text-center">
            <Bot className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无可用智能体</p>
          </div>
        )}

        <div className="space-y-1">
          {workflows.map((workflow) => (
            <button
              key={workflow.id}
              onClick={() => onSelectAgent(workflow)}
              className={`w-full p-3 rounded-lg text-left transition-all ${
                selectedAgent?.id === workflow.id
                  ? 'bg-blue-500/20 dark:bg-blue-600/20 border border-blue-400/50 dark:border-blue-500/50 backdrop-blur-sm'
                  : 'glass dark:glass-dark hover:bg-white/40 dark:hover:bg-black/40 border border-gray-200/30 dark:border-gray-600/30'
              }`}
            >
              <div className="flex items-start space-x-2">
                <div
                  className={`p-1.5 rounded-md flex-shrink-0 backdrop-blur-sm ${
                    selectedAgent?.id === workflow.id
                      ? 'bg-blue-400/30 dark:bg-blue-600/30'
                      : 'bg-gray-300/30 dark:bg-gray-600/30'
                  }`}
                >
                  <Bot
                    className={`w-4 h-4 ${
                      selectedAgent?.id === workflow.id
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4
                      className={`text-sm font-medium truncate ${
                        selectedAgent?.id === workflow.id
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {workflow.name}
                    </h4>
                    {selectedAgent?.id === workflow.id && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </div>
                  
                  {workflow.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {workflow.description}
                    </p>
                  )}
                  
                  {workflow.updated_at && (
                    <div className="flex items-center space-x-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(workflow.updated_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentList;

