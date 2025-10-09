/**
 * 截图预览组件
 */

import React from 'react';

interface ScreenshotPreviewProps {
  dataUrl: string;
  onRetake: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export const ScreenshotPreview: React.FC<ScreenshotPreviewProps> = ({
  dataUrl,
  onRetake,
  onSubmit,
  isSubmitting = false
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          截图预览
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          请确认截图内容
        </span>
      </div>

      {/* 截图缩略图 */}
      <div className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
        <img
          src={dataUrl}
          alt="Screenshot preview"
          className="w-full h-auto max-h-96 object-contain"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex space-x-4">
        <button
          onClick={onRetake}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 重新截图
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              识别中...
            </>
          ) : (
            '✅ 提交识别'
          )}
        </button>
      </div>
    </div>
  );
};

