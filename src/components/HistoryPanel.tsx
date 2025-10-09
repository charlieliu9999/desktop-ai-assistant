import React, { useState, useEffect } from 'react';
import { ChatMessage, AppEvent } from '../shared/types';

interface HistoryItem {
  id: string;
  timestamp: Date;
  type: 'chat' | 'voice' | 'screen_capture' | 'medical_search' | 'suggestion';
  title: string;
  content: string;
  metadata?: {
    confidence?: number;
    duration?: number;
    source?: string;
    tags?: string[];
  };
}

interface HistoryPanelProps {
  history?: HistoryItem[];
  onClearHistory?: () => void;
  onExportHistory?: () => void;
  onDeleteItem?: (id: string) => void;
  onReplayItem?: (item: HistoryItem) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history = [],
  onClearHistory,
  onExportHistory,
  onDeleteItem,
  onReplayItem,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'type'>('timestamp');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 过滤和搜索历史记录
  const filteredHistory = history.filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'timestamp') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else {
      return a.type.localeCompare(b.type);
    }
  });

  // 按日期分组
  const groupedHistory = filteredHistory.reduce((groups, item) => {
    const date = new Date(item.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, HistoryItem[]>);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
        );
      case 'voice':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        );
      case 'screen_capture':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      case 'medical_search':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'suggestion':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'chat': return 'text-blue-600 dark:text-blue-400';
      case 'voice': return 'text-green-600 dark:text-green-400';
      case 'screen_capture': return 'text-purple-600 dark:text-purple-400';
      case 'medical_search': return 'text-red-600 dark:text-red-400';
      case 'suggestion': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'chat': return '对话';
      case 'voice': return '语音';
      case 'screen_capture': return '截屏';
      case 'medical_search': return '医疗搜索';
      case 'suggestion': return '建议';
      default: return '其他';
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return new Intl.DateTimeFormat('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(date);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredHistory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredHistory.map(item => item.id)));
    }
  };

  const handleDeleteSelected = () => {
    selectedItems.forEach(id => onDeleteItem?.(id));
    setSelectedItems(new Set());
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 space-y-4">
        {/* 搜索和过滤 */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索历史记录..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">全部类型</option>
            <option value="chat">对话</option>
            <option value="voice">语音</option>
            <option value="screen_capture">截屏</option>
            <option value="medical_search">医疗搜索</option>
            <option value="suggestion">建议</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'type')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="timestamp">按时间</option>
            <option value="type">按类型</option>
          </select>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              {selectedItems.size === filteredHistory.length ? '取消全选' : '全选'}
            </button>
            
            {selectedItems.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
              >
                删除选中 ({selectedItems.size})
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onExportHistory}
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              导出
            </button>
            
            <button
              onClick={onClearHistory}
              className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            >
              清空
            </button>
          </div>
        </div>
      </div>

      {/* 历史记录列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2v8h12V6H4z" clipRule="evenodd" />
            </svg>
            <p className="text-lg font-medium mb-2">暂无历史记录</p>
            <p className="text-sm text-center">
              {searchQuery ? '没有找到匹配的记录' : '开始使用AI助手后，您的交互历史将显示在这里'}
            </p>
          </div>
        ) : (
          <div className="space-y-6 p-4">
            {Object.entries(groupedHistory).map(([date, items]) => (
              <div key={date}>
                {/* 日期分组标题 */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(date)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {items.length} 条记录
                  </p>
                </div>
                
                {/* 历史记录项 */}
                <div className="space-y-3">
                  {items.map((item) => {
                    const isExpanded = expandedItems.has(item.id);
                    const isSelected = selectedItems.has(item.id);
                    
                    return (
                      <div
                        key={item.id}
                        className={`border rounded-lg transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-300 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                        }`}
                      >
                        <div className="p-4">
                          {/* 头部信息 */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedItems);
                                  if (e.target.checked) {
                                    newSelected.add(item.id);
                                  } else {
                                    newSelected.delete(item.id);
                                  }
                                  setSelectedItems(newSelected);
                                }}
                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              
                              <div className={`p-2 rounded-lg ${getTypeColor(item.type)} bg-opacity-10`}>
                                {getTypeIcon(item.type)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {item.title}
                                  </h4>
                                  <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(item.type)} bg-opacity-10`}>
                                    {getTypeName(item.type)}
                                  </span>
                                </div>
                                
                                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  <span>{formatTime(item.timestamp)}</span>
                                  {item.metadata?.confidence && (
                                    <span>置信度: {Math.round(item.metadata.confidence * 100)}%</span>
                                  )}
                                  {item.metadata?.duration && (
                                    <span>时长: {item.metadata.duration}s</span>
                                  )}
                                  {item.metadata?.source && (
                                    <span>来源: {item.metadata.source}</span>
                                  )}
                                </div>
                                
                                {/* 内容预览 */}
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                                  {item.content}
                                </p>
                                
                                {/* 标签 */}
                                {item.metadata?.tags && item.metadata.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {item.metadata.tags.map((tag, index) => (
                                      <span
                                        key={index}
                                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* 操作按钮 */}
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => toggleExpanded(item.id)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title={isExpanded ? '收起' : '展开'}
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => onReplayItem?.(item)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="重新执行"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => onDeleteItem?.(item.id)}
                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                                title="删除"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414L8.586 12l-1.293 1.293a1 1 0 101.414 1.414L10 13.414l1.293 1.293a1 1 0 001.414-1.414L11.414 12l1.293-1.293z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          {/* 展开的详细内容 */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">完整内容</h5>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {item.content}
                                </p>
                              </div>
                              
                              {item.metadata && Object.keys(item.metadata).length > 0 && (
                                <div className="mt-3">
                                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">元数据</h5>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                    {Object.entries(item.metadata).map(([key, value]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="font-medium">{key}:</span>
                                        <span>{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;