/**
 * 患者信息展示组件
 * 显示提取的患者信息,支持编辑和确认
 */

import React, { useState, useEffect } from 'react';
import { User, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import type { PatientInfo } from '../../../shared/types';

interface PatientInfoDisplayProps {
  patientInfo: PatientInfo | null;
  onUpdate?: (info: PatientInfo) => void;
  onConfirm?: (info: PatientInfo) => void;
  editable?: boolean;
}

const PatientInfoDisplay: React.FC<PatientInfoDisplayProps> = ({
  patientInfo,
  onUpdate,
  onConfirm,
  editable = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedInfo, setEditedInfo] = useState<PatientInfo | null>(null);

  useEffect(() => {
    if (patientInfo) {
      setEditedInfo({ ...patientInfo });
    }
  }, [patientInfo]);

  if (!patientInfo) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">暂无患者信息</p>
        <p className="text-sm text-gray-500 mt-1">请先从屏幕获取患者信息</p>
      </div>
    );
  }

  /**
   * 处理字段更新
   */
  const handleFieldChange = (field: keyof PatientInfo, value: string | number) => {
    if (!editedInfo) return;
    
    const updated = { ...editedInfo, [field]: value };
    setEditedInfo(updated);
  };

  /**
   * 保存编辑
   */
  const handleSave = () => {
    if (editedInfo && onUpdate) {
      onUpdate(editedInfo);
    }
    setIsEditing(false);
  };

  /**
   * 取消编辑
   */
  const handleCancel = () => {
    setEditedInfo(patientInfo ? { ...patientInfo } : null);
    setIsEditing(false);
  };

  /**
   * 确认信息
   */
  const handleConfirm = () => {
    if (editedInfo && onConfirm) {
      onConfirm(editedInfo);
    }
  };

  /**
   * 获取置信度颜色
   */
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * 获取置信度文本
   */
  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return '未知';
    if (confidence >= 0.8) return '高';
    if (confidence >= 0.6) return '中';
    return '低';
  };

  const displayInfo = isEditing ? editedInfo : patientInfo;
  if (!displayInfo) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">患者信息</h3>
              <p className="text-sm text-blue-100">
                识别置信度: 
                <span className={`ml-1 font-medium ${getConfidenceColor(displayInfo.confidence)}`}>
                  {getConfidenceText(displayInfo.confidence)}
                </span>
              </p>
            </div>
          </div>
          
          {editable && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              <span className="text-sm">编辑</span>
            </button>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {/* 置信度警告 */}
        {displayInfo.confidence && displayInfo.confidence < 0.6 && (
          <div className="mb-4 flex items-start space-x-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">识别置信度较低</p>
              <p className="mt-1">请仔细核对以下信息,必要时手动修正</p>
            </div>
          </div>
        )}

        {/* 信息字段 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓名 <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={displayInfo.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入姓名"
              />
            ) : (
              <p className="text-gray-900 font-medium">{displayInfo.name || '-'}</p>
            )}
          </div>

          {/* 年龄 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">年龄</label>
            {isEditing ? (
              <input
                type="number"
                value={displayInfo.age || ''}
                onChange={(e) => handleFieldChange('age', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入年龄"
                min="0"
                max="150"
              />
            ) : (
              <p className="text-gray-900">{displayInfo.age ? `${displayInfo.age}岁` : '-'}</p>
            )}
          </div>

          {/* 性别 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
            {isEditing ? (
              <select
                value={displayInfo.gender || '未知'}
                onChange={(e) => handleFieldChange('gender', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="未知">未知</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            ) : (
              <p className="text-gray-900">{displayInfo.gender || '-'}</p>
            )}
          </div>

          {/* 患者ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">患者ID</label>
            {isEditing ? (
              <input
                type="text"
                value={displayInfo.patientId || ''}
                onChange={(e) => handleFieldChange('patientId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入患者ID"
              />
            ) : (
              <p className="text-gray-900 font-mono text-sm">{displayInfo.patientId || '-'}</p>
            )}
          </div>

          {/* 科室 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">就诊科室</label>
            {isEditing ? (
              <input
                type="text"
                value={displayInfo.department || ''}
                onChange={(e) => handleFieldChange('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入科室"
              />
            ) : (
              <p className="text-gray-900">{displayInfo.department || '-'}</p>
            )}
          </div>

          {/* 主诉 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">主诉</label>
            {isEditing ? (
              <textarea
                value={displayInfo.chiefComplaint || ''}
                onChange={(e) => handleFieldChange('chiefComplaint', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="请输入主诉"
                rows={2}
              />
            ) : (
              <p className="text-gray-900">{displayInfo.chiefComplaint || '-'}</p>
            )}
          </div>

          {/* 诊断 */}
          {displayInfo.diagnosis && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">诊断</label>
              {isEditing ? (
                <textarea
                  value={displayInfo.diagnosis || ''}
                  onChange={(e) => handleFieldChange('diagnosis', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="请输入诊断"
                  rows={2}
                />
              ) : (
                <p className="text-gray-900">{displayInfo.diagnosis}</p>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="mt-6 flex items-center justify-end space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center space-x-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>取消</span>
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Check className="h-4 w-4" />
                <span>保存</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={!displayInfo.name}
              className="flex items-center space-x-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="h-4 w-4" />
              <span>确认并获取推荐</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientInfoDisplay;

