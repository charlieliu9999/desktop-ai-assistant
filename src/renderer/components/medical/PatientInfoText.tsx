/**
 * 患者信息紧凑文本展示组件
 */

import React from 'react';
import type { PatientInfo } from './PatientInfoForm';

interface PatientInfoTextProps {
  patientInfo: PatientInfo;
  onConfirm: () => void;
}

export const PatientInfoText: React.FC<PatientInfoTextProps> = ({ patientInfo, onConfirm }) => {
  const summary = `姓名：${patientInfo.name || ''}\n` +
    `性别：${patientInfo.gender || ''}\n` +
    `年龄：${patientInfo.age ?? ''}\n` +
    `患者ID：${patientInfo.patient_id || ''}\n` +
    (patientInfo.department ? `科室：${patientInfo.department}\n` : '') +
    (patientInfo.chief_complaint ? `主诉：${patientInfo.chief_complaint}\n` : '') +
    (patientInfo.diagnosis ? `诊断：${patientInfo.diagnosis}\n` : '') +
    (patientInfo.medical_history ? `病史：${patientInfo.medical_history}\n` : '');

  const canConfirm = !!(patientInfo?.name && patientInfo?.patient_id && patientInfo?.gender);

  const copy = () => navigator.clipboard.writeText(summary);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">患者信息</h3>
        <div className="space-x-2">
          <button onClick={copy} className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700">复制</button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >确认</button>
        </div>
      </div>
      <pre className="p-3 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
        {summary}
      </pre>
    </div>
  );
};

