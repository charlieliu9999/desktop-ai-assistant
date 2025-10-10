/**
 * 推荐结果展示组件
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { RecommendationType } from './RecommendationTypeSelector';
import { UNIFIED_OUTPUT_STYLES, UNIFIED_PRE_STYLES } from '../../styles/unified-input-styles';

export interface RecommendationItem {
  name: string;
  description: string;
  priority: string;
  confidence: number;
  reason?: string;
}

export interface RecommendationResults {
  combined?: string; // 合并的Markdown
  diagnosis?: RecommendationItem[] | string; // 允许MD字符串
  exam?: RecommendationItem[] | string;
  medication?: RecommendationItem[] | string;
}

interface RecommendationResultsProps {
  results: RecommendationResults;
  onExport?: () => void;
}

export const RecommendationResultsDisplay: React.FC<RecommendationResultsProps> = ({
  results,
  onExport
}) => {
  const [renderAsMarkdown, setRenderAsMarkdown] = React.useState<boolean>(() => {
    try {
      const v = localStorage.getItem('medical:renderAsMarkdown');
      return v ? v === '1' : true;
    } catch { return true; }
  });

  const toggleMode = () => {
    setRenderAsMarkdown((prev) => {
      const next = !prev;
      try { localStorage.setItem('medical:renderAsMarkdown', next ? '1' : '0'); } catch {}
      return next;
    });
  };
  const typeLabels: Record<RecommendationType, string> = {
    diagnosis: '诊断建议',
    exam: '检查项目推荐',
    medication: '用药推荐'
  };

  const typeIcons: Record<RecommendationType, string> = {
    diagnosis: '🩺',
    exam: '🔬',
    medication: '💊'
  };

  const priorityColors: Record<string, string> = {
    '高': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    '中': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    '低': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: 显示复制成功提示
  };

  const formatResults = (): string => {
    let text = `## AI 推荐结果\n\n`;
    Object.entries(results).forEach(([type, items]) => {
      if (!items) return;
      const header = typeLabels[type as RecommendationType];
      text += `### ${header}\n\n`;
      if (typeof items === 'string') {
        text += `${items}\n\n`;
      } else if (items.length > 0) {
        items.forEach((item, index) => {
          text += `${index + 1}. **${item.name}**\n`;
          text += `   - 描述: ${item.description}\n`;
          text += `   - 优先级: ${item.priority}\n`;
          text += `   - 置信度: ${(item.confidence * 100).toFixed(0)}%\n`;
          if (item.reason) text += `   - 理由: ${item.reason}\n`;
          text += `\n`;
        });
      }
    });
    return text;
  };

  const hasResults = !!(results.combined && results.combined.length > 0) ||
    Object.entries(results).some(([k, items]) => k !== 'combined' && items && (typeof items === 'string' ? items.length > 0 : items.length > 0));

  if (!hasResults) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          推荐结果
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={toggleMode}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            {renderAsMarkdown ? '切换纯文本' : '切换Markdown'}
          </button>
          <button
            onClick={() => copyToClipboard(formatResults())}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            📋 复制
          </button>
          {onExport && (
            <button
              onClick={onExport}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              💾 保存
            </button>
          )}
        </div>
      </div>

      {/* 合并Markdown优先显示 */}
      {results.combined && (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          {renderAsMarkdown ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {results.combined as string}
              </ReactMarkdown>
            </div>
          ) : (
            <pre className={UNIFIED_PRE_STYLES}>{results.combined as string}</pre>
          )}
        </div>
      )}

      {/* 按类型分组显示结果 */}
      {Object.entries(results).map(([type, items]) => {
        if (type === 'combined') return null;
        if (!items || items.length === 0) return null;

        const recommendationType = type as RecommendationType;

        // 如果是字符串，则按MD样式展示
        if (typeof items === 'string') {
          return (
            <div key={type} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-2xl">{typeIcons[recommendationType]}</span>
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
                  {typeLabels[recommendationType]}
                </h4>
              </div>
              {renderAsMarkdown ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {items}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className={UNIFIED_PRE_STYLES}>{items}</pre>
              )}
            </div>
          );
        }

        return (
          <div key={type} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">{typeIcons[recommendationType]}</span>
              <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
                {typeLabels[recommendationType]}
              </h4>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({items.length} 条)
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className={UNIFIED_OUTPUT_STYLES}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {index + 1}. {item.name}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${priorityColors[item.priority] || priorityColors['中']}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {item.description}
                      </p>
                      {item.reason && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          💡 {item.reason}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 text-right">
                      <div className={`text-sm font-medium ${getConfidenceColor(item.confidence)}`}>
                        {(item.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        置信度
                      </div>
                    </div>
                  </div>

                  {/* 置信度进度条 */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                    <div
                      className={`h-1.5 rounded-full ${
                        item.confidence >= 0.8
                          ? 'bg-green-600'
                          : item.confidence >= 0.6
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${item.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
