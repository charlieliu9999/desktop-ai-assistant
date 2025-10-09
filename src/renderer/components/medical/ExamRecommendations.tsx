/**
 * 检查推荐展示组件
 * 显示AI推荐的检查项目列表
 */

import React, { useState } from 'react';
import { 
  Activity, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  FileText, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Printer,
  Download
} from 'lucide-react';

interface ExamRecommendation {
  id?: number;
  title: string;
  exam_type: string;
  body_part: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  urgency: string;
  estimated_cost: string;
  confidence?: number;
}

interface ExamRecommendationsProps {
  recommendations: ExamRecommendation[];
  loading?: boolean;
  onFeedback?: (recommendationId: number, feedbackType: 'accepted' | 'rejected', comment?: string) => void;
}

const ExamRecommendations: React.FC<ExamRecommendationsProps> = ({
  recommendations,
  loading = false,
  onFeedback
}) => {
  const [feedbackStates, setFeedbackStates] = useState<Record<number, 'accepted' | 'rejected' | null>>({});

  /**
   * 获取优先级样式
   */
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          border: 'border-red-300',
          label: '高优先级'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-700',
          border: 'border-yellow-300',
          label: '中优先级'
        };
      case 'low':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          border: 'border-green-300',
          label: '低优先级'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-300',
          label: '普通'
        };
    }
  };

  /**
   * 处理反馈
   */
  const handleFeedback = (recommendation: ExamRecommendation, type: 'accepted' | 'rejected') => {
    if (!recommendation.id) return;
    
    setFeedbackStates(prev => ({
      ...prev,
      [recommendation.id!]: type
    }));

    if (onFeedback) {
      onFeedback(recommendation.id, type);
    }
  };

  /**
   * 打印推荐
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * 导出推荐
   */
  const handleExport = () => {
    const content = recommendations.map((rec, index) => 
      `${index + 1}. ${rec.title}\n` +
      `   检查类型: ${rec.exam_type}\n` +
      `   检查部位: ${rec.body_part}\n` +
      `   优先级: ${getPriorityStyle(rec.priority).label}\n` +
      `   紧急程度: ${rec.urgency}\n` +
      `   推荐理由: ${rec.reason}\n` +
      `   预估费用: ${rec.estimated_cost}\n`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `检查推荐_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">正在生成推荐...</p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">暂无推荐结果</p>
        <p className="text-sm text-gray-500 mt-1">请先确认患者信息以获取推荐</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">检查项目推荐</h3>
              <p className="text-sm text-green-100">共 {recommendations.length} 项推荐</p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
              title="打印"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
              title="导出"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 推荐列表 */}
      <div className="p-6 space-y-4">
        {recommendations.map((recommendation, index) => {
          const priorityStyle = getPriorityStyle(recommendation.priority);
          const feedbackState = recommendation.id ? feedbackStates[recommendation.id] : null;

          return (
            <div
              key={recommendation.id || index}
              className={`border rounded-lg overflow-hidden transition-all ${
                feedbackState === 'accepted' 
                  ? 'border-green-300 bg-green-50' 
                  : feedbackState === 'rejected'
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              {/* 推荐卡片头部 */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg font-semibold text-gray-900">
                        {index + 1}. {recommendation.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
                        {priorityStyle.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>{recommendation.exam_type}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Activity className="h-4 w-4" />
                        <span>{recommendation.body_part}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{recommendation.urgency}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 推荐卡片内容 */}
              <div className="p-4 space-y-3">
                {/* 推荐理由 */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">推荐理由</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed pl-6">
                    {recommendation.reason}
                  </p>
                </div>

                {/* 预估费用 */}
                <div className="flex items-center space-x-2 pl-6">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">
                    预估费用: <span className="font-medium">{recommendation.estimated_cost}</span>
                  </span>
                </div>

                {/* 置信度 */}
                {recommendation.confidence !== undefined && (
                  <div className="flex items-center space-x-2 pl-6">
                    <AlertCircle className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-gray-700">
                      AI置信度: <span className="font-medium">{(recommendation.confidence * 100).toFixed(0)}%</span>
                    </span>
                  </div>
                )}

                {/* 反馈按钮 */}
                {recommendation.id && onFeedback && (
                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
                    {!feedbackState ? (
                      <>
                        <button
                          onClick={() => handleFeedback(recommendation, 'accepted')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>采纳</span>
                        </button>
                        <button
                          onClick={() => handleFeedback(recommendation, 'rejected')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>不采纳</span>
                        </button>
                      </>
                    ) : (
                      <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${
                        feedbackState === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {feedbackState === 'accepted' ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">已采纳</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">未采纳</span>
                          </>
                        )}
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
  );
};

export default ExamRecommendations;

