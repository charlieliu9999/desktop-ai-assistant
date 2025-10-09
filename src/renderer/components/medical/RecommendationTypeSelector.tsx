/**
 * 推荐类型选择器组件
 */

import React from 'react';

export type RecommendationType = 'diagnosis' | 'exam' | 'medication';

interface RecommendationTypeSelectorProps {
  selectedTypes: RecommendationType[];
  onChange: (types: RecommendationType[]) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
}

export const RecommendationTypeSelector: React.FC<RecommendationTypeSelectorProps> = ({
  selectedTypes,
  onChange,
  onGenerate,
  isGenerating = false
}) => {
  const allTypes: RecommendationType[] = ['diagnosis', 'exam', 'medication'];

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

  const handleToggle = (type: RecommendationType) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter(t => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTypes.length === allTypes.length) {
      onChange([]);
    } else {
      onChange(allTypes);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          选择推荐类型
        </h3>
        <button
          onClick={handleSelectAll}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {selectedTypes.length === allTypes.length ? '取消全选' : '全选'}
        </button>
      </div>

      {/* 复选框列表 */}
      <div className="space-y-3">
        {allTypes.map(type => (
          <label
            key={type}
            className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedTypes.includes(type)}
              onChange={() => handleToggle(type)}
              className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-2xl">{typeIcons[type]}</span>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
              {typeLabels[type]}
            </span>
          </label>
        ))}
      </div>

      {/* 生成按钮 */}
      <div className="flex justify-end">
        <button
          onClick={onGenerate}
          disabled={selectedTypes.length === 0 || isGenerating}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              生成中...
            </>
          ) : (
            <>
              <span className="mr-2">🤖</span>
              生成推荐
            </>
          )}
        </button>
      </div>
    </div>
  );
};

