/**
 * 患者信息表单组件
 */

import React from 'react';

export interface PatientInfo {
  name: string;
  age: number;
  gender: string;
  patient_id: string;
  department?: string;
  chief_complaint?: string;
  diagnosis?: string;
  medical_history?: string;
}

interface PatientInfoFormProps {
  patientInfo: PatientInfo;
  onChange: (info: PatientInfo) => void;
  onConfirm: () => void;
  isEditable?: boolean;
}

export const PatientInfoForm: React.FC<PatientInfoFormProps> = ({
  patientInfo,
  onChange,
  onConfirm,
  isEditable = true
}) => {
  const handleChange = (field: keyof PatientInfo, value: string | number) => {
    onChange({
      ...patientInfo,
      [field]: value
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          患者信息
        </h3>
        {isEditable && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            可手动修正
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 姓名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={patientInfo.name}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={!isEditable}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
            placeholder="患者姓名"
          />
        </div>

        {/* 年龄 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            年龄 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={patientInfo.age}
            onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
            disabled={!isEditable}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
            placeholder="年龄"
            min="0"
            max="150"
          />
        </div>

        {/* 性别 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            性别 <span className="text-red-500">*</span>
          </label>
          <select
            value={patientInfo.gender}
            onChange={(e) => handleChange('gender', e.target.value)}
            disabled={!isEditable}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            <option value="">请选择</option>
            <option value="男">男</option>
            <option value="女">女</option>
            <option value="其他">其他</option>
          </select>
        </div>

        {/* 患者ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            患者ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={patientInfo.patient_id}
            onChange={(e) => handleChange('patient_id', e.target.value)}
            disabled={!isEditable}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
            placeholder="患者ID"
          />
        </div>

        {/* 科室 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            科室
          </label>
          <input
            type="text"
            value={patientInfo.department || ''}
            onChange={(e) => handleChange('department', e.target.value)}
            disabled={!isEditable}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
            placeholder="就诊科室"
          />
        </div>

        {/* 主诉 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            主诉
          </label>
          <textarea
            value={patientInfo.chief_complaint || ''}
            onChange={(e) => handleChange('chief_complaint', e.target.value)}
            disabled={!isEditable}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
            placeholder="患者主诉症状"
          />
        </div>

        {/* 诊断 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            诊断
          </label>
          <textarea
            value={patientInfo.diagnosis || ''}
            onChange={(e) => handleChange('diagnosis', e.target.value)}
            disabled={!isEditable}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
            placeholder="初步诊断"
          />
        </div>

        {/* 病史 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            病史
          </label>
          <textarea
            value={patientInfo.medical_history || ''}
            onChange={(e) => handleChange('medical_history', e.target.value)}
            disabled={!isEditable}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
            placeholder="既往病史、过敏史等"
          />
        </div>
      </div>

      {/* 确认按钮 */}
      {isEditable && (
        <div className="flex justify-end">
          <button
            onClick={onConfirm}
            disabled={!patientInfo.name || !patientInfo.patient_id || !patientInfo.gender}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✓ 确认信息
          </button>
        </div>
      )}
    </div>
  );
};

