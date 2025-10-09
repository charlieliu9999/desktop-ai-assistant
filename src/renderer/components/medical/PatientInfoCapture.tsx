/**
 * 患者信息捕获组件 - 完整工作流
 */

import React, { useState } from 'react';
import { screenshotService } from '../../services/screenshot';
import { apiClient } from '../../../services/api-client';
import { useConfigStore } from '../../stores/configStore';
import { ScreenshotPreview } from './ScreenshotPreview';
import { PatientInfoForm, type PatientInfo } from './PatientInfoForm';
import { PatientInfoText } from './PatientInfoText';
import { RecommendationTypeSelector, type RecommendationType } from './RecommendationTypeSelector';
import { RecommendationResultsDisplay, type RecommendationResults } from './RecommendationResults';

type WorkflowStep = 'initial' | 'preview' | 'extracting' | 'editing' | 'selecting' | 'generating' | 'results';

export const PatientInfoCapture: React.FC = () => {
  // 获取配置
  const { config } = useConfigStore();
  
  // 工作流状态
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('initial');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<RecommendationType[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResults>({});
  const [combinedMd, setCombinedMd] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasCachedScreenshot, setHasCachedScreenshot] = useState(false);

  // 初始化检查是否有缓存的截图
  React.useEffect(() => {
    try {
      const cached = localStorage.getItem('medical:lastScreenshot');
      setHasCachedScreenshot(!!cached);
    } catch (e) {
      // 忽略本地存储错误
    }
  }, []);

  // 恢复上次会话
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('medical:lastSession');
      if (!raw) return;
      const sess = JSON.parse(raw);
      if (sess?.patientInfo) setPatientInfo(sess.patientInfo);
      if (sess?.screenshot) setScreenshot(sess.screenshot);
      if (sess?.recommendations) setRecommendations(sess.recommendations);
      if (sess?.combinedMd) setCombinedMd(sess.combinedMd);
      if (sess?.currentStep) setCurrentStep(sess.currentStep);
    } catch {}
  }, []);

  const saveSession = (partial?: any) => {
    try {
      const payload = {
        timestamp: Date.now(),
        currentStep,
        screenshot,
        patientInfo,
        recommendations,
        combinedMd,
        ...(partial || {})
      };
      localStorage.setItem('medical:lastSession', JSON.stringify(payload));
    } catch {}
  };

  /**
   * 步骤 1: 捕获屏幕截图
   */
  const handleCaptureScreen = async () => {
    setError(null);
    setIsCapturing(true);

    try {
      // 检查权限
      const hasPermission = await screenshotService.checkPermissions();
      if (!hasPermission) {
        throw new Error('没有屏幕录制权限。请在系统设置中授予权限。');
      }

      // 捕获截图
      const result = await screenshotService.captureScreen({ noCache: true });
      setScreenshot(result.dataUrl);

      // 本地缓存截图（仅保存最近一次）
      try {
        localStorage.setItem(
          'medical:lastScreenshot',
          JSON.stringify({ dataUrl: result.dataUrl, timestamp: Date.now() })
        );
        setHasCachedScreenshot(true);
        saveSession({ screenshot: result.dataUrl });
      } catch (e) {
        console.warn('Failed to cache screenshot locally:', e);
      }
      setCurrentStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : '截图失败');
      console.error('Screenshot capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * 步骤 2: 重新截图
   */
  const handleRetake = () => {
    setScreenshot(null);
    setCurrentStep('initial');
  };

  /**
   * 从本地缓存加载上次截图
   */
  const handleLoadCachedScreenshot = () => {
    try {
      const raw = localStorage.getItem('medical:lastScreenshot');
      if (!raw) {
        setError('没有可用的缓存截图');
        return;
      }
      const cached = JSON.parse(raw);
      if (!cached?.dataUrl) {
        setError('缓存截图无效');
        return;
      }
      setScreenshot(cached.dataUrl);
      setCurrentStep('preview');
      saveSession({ screenshot: cached.dataUrl, currentStep: 'preview' });
    } catch (e) {
      setError('读取缓存失败');
    }
  };

  /**
   * 步骤 3: 提交识别
   */
  const handleSubmitRecognition = async () => {
    if (!screenshot) return;

    setError(null);
    setIsExtracting(true);
    setCurrentStep('extracting');

    try {
      // 检查是否启用AI图片识别
      if (config?.aiImage?.enabled) {
        console.log('🔍 使用配置的AI图片模型进行识别:', config.aiImage);
        // 使用配置的图片模型直接提取患者信息
        const response = await apiClient.extractPatientInfo(screenshot, config.aiImage);
        
        // 打印完整接收数据
        console.log('🔍 医疗系统接收的完整数据:', {
          timestamp: new Date().toISOString(),
          success: response.success,
          patient_info: response.patient_info,
          raw_content: response.raw_content,
          full_response: response.full_response,
          error: response.error
        });
        
        // 转换字段名以匹配PatientInfo接口
        const pi: any = response.patient_info || {};
        const convertedPatientInfo = response.patient_info ? {
          name: pi.name || '',
          age: typeof pi.age === 'number' ? pi.age : parseInt(String(pi.age || '0')) || 0,
          gender: pi.gender || '',
          patient_id: pi.patient_id || pi.patientId || '',
          department: pi.department || '',
          chief_complaint: pi.chief_complaint || pi.chiefComplaint || '',
          diagnosis: pi.diagnosis || '',
          medical_history: pi.medical_history || pi.medicalHistory || pi.medicalNow || ''
        } : null;
        
        setPatientInfo(convertedPatientInfo);
        saveSession({ patientInfo: convertedPatientInfo, currentStep: 'editing' });
      } else {
        console.log('🔍 使用后端API进行识别');
        // 使用后端API提取患者信息
        const response = await apiClient.extractPatientInfo(screenshot);
        
        // 打印后端API接收数据
        console.log('🔍 后端API接收的完整数据:', {
          timestamp: new Date().toISOString(),
          success: response.success,
          patient_info: response.patient_info,
          error: response.error
        });
        
        setPatientInfo(response.patient_info);
        saveSession({ patientInfo: response.patient_info, currentStep: 'editing' });
      }
      
      setCurrentStep('editing');
    } catch (err) {
      setError(err instanceof Error ? err.message : '患者信息提取失败');
      console.error('Patient info extraction error:', err);
      setCurrentStep('preview');
    } finally {
      setIsExtracting(false);
    }
  };

  /**
   * 步骤 4: 确认患者信息
   */
  const handleConfirmPatientInfo = () => {
    setCurrentStep('selecting');
    saveSession({ currentStep: 'selecting', patientInfo });
  };

  /**
   * 步骤 5: 生成推荐
   */
  const handleGenerateRecommendations = async () => {
    if (!patientInfo || selectedTypes.length === 0) return;

    setError(null);
    setIsGenerating(true);
    setCurrentStep('generating');

    try {
      if (config?.aiRecommend?.enabled) {
        // 保存一次“用户”消息到会话（用于历史对话）
        try {
          if (patientInfo?.patient_id) {
            const { saveChatMessage } = await import('../../services/persistence');
            const userContent = `根据以下患者信息生成诊断/检查/用药建议：\n\n姓名：${patientInfo.name}\n性别：${patientInfo.gender}\n年龄：${patientInfo.age}\nID：${patientInfo.patient_id}\n` +
              (patientInfo.department ? `科室：${patientInfo.department}\n` : '') +
              (patientInfo.chief_complaint ? `主诉：${patientInfo.chief_complaint}\n` : '') +
              (patientInfo.diagnosis ? `诊断：${patientInfo.diagnosis}\n` : '') +
              (patientInfo.medical_history ? `病史：${patientInfo.medical_history}\n` : '');
            saveChatMessage({ id: `m_${Date.now()}`, session_id: patientInfo.patient_id, role: 'user', content: userContent, created_at: Date.now() });
          }
        } catch {}

        // 合并一次流式调用
        setCombinedMd('');
        setRecommendations({ combined: '' });
        setCurrentStep('results');
        const combinedRes = await apiClient.generateCombinedRecommendationsStream(
          patientInfo,
          config.aiRecommend as any,
          (chunk) => {
            setCombinedMd((prev) => {
              const next = (prev || '') + chunk;
              setRecommendations({ combined: next });
              saveSession({ combinedMd: next, recommendations: { combined: next }, currentStep: 'results' });
              // 也写入对话历史（合并在同一条）——简单做法：在完成时再写入一次完整内容
              return next;
            });
          }
        );
        // 流式完成后一次性保存“助手”消息
        try {
          if (patientInfo?.patient_id && combinedMd) {
            const { saveChatMessage } = await import('../../services/persistence');
            const finalMd = (combinedRes?.recommendations as any)?.combined || combinedMd;
            saveChatMessage({ id: `m_${Date.now()}`, session_id: patientInfo.patient_id, role: 'assistant', content: finalMd, created_at: Date.now() });
          }
        } catch {}
      } else {
        // 回退到后端 API
        const response = await apiClient.generateRecommendations(
          patientInfo,
          selectedTypes
        );
        setRecommendations(response.recommendations || {});
        setCurrentStep('results');
        saveSession({ recommendations: response.recommendations, currentStep: 'results' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '推荐生成失败');
      console.error('Recommendation generation error:', err);
      setCurrentStep('selecting');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * 重置工作流
   */
  const handleReset = () => {
    setCurrentStep('initial');
    setScreenshot(null);
    setPatientInfo(null);
    setSelectedTypes([]);
    setRecommendations({});
    setCombinedMd('');
    setError(null);
    try { localStorage.removeItem('medical:lastSession'); } catch {}
  };

  /**
   * 导出结果
   */
  const handleExport = async () => {
    // 保存到患者记录
    try {
      if (!patientInfo?.patient_id) {
        setError('无法保存：缺少患者ID');
        return;
      }
      const { savePatientRecord } = await import('../../services/persistence');
      const id = `rec_${Date.now()}`;
      const markdown = (recommendations as any)?.combined || '';
      savePatientRecord({
        id,
        patient_id: patientInfo.patient_id,
        patient_name: patientInfo.name,
        created_at: Date.now(),
        screenshot: screenshot || undefined,
        markdown,
        raw: { recommendations }
      });
      console.log('✅ 记录已保存:', id);
    } catch (e) {
      console.error('保存失败:', e);
      setError('保存记录失败');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 标题和进度指示 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          患者信息识别与推荐
        </h2>
        {currentStep !== 'initial' && (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            🔄 重新开始
          </button>
        )}
      </div>

      {/* 进度条 */}
      <div className="flex items-center space-x-2">
        {['截图', '识别', '确认', '选择', '生成', '结果'].map((label, index) => {
          const stepIndex = ['initial', 'preview', 'editing', 'selecting', 'generating', 'results'].indexOf(currentStep);
          const isActive = index <= stepIndex;
          const isCurrent = index === stepIndex;

          return (
            <React.Fragment key={label}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                isActive
                  ? isCurrent
                    ? 'bg-blue-600 text-white'
                    : 'bg-green-600 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
              }`}>
                {isActive && !isCurrent ? '✓' : index + 1}
              </div>
              {index < 5 && (
                <div className={`flex-1 h-1 ${
                  isActive ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-md">
          <div className="flex items-center">
            <span className="text-red-800 dark:text-red-200">⚠️ {error}</span>
          </div>
        </div>
      )}

      {/* 步骤 1: 初始状态 - 捕获截图按钮 */}
      {currentStep === 'initial' && (
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
              开始识别患者信息
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              点击下方按钮捕获屏幕,AI 将自动识别患者信息
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={handleCaptureScreen}
              disabled={isCapturing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
            >
              {isCapturing ? '截图中...' : '📸 获取屏幕患者信息'}
            </button>
            {hasCachedScreenshot && (
              <button
                onClick={handleLoadCachedScreenshot}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-lg font-medium"
              >
                🗂️ 使用上次截图
              </button>
            )}
          </div>
        </div>
      )}

      {/* 步骤 2: 预览截图 */}
      {currentStep === 'preview' && screenshot && (
        <ScreenshotPreview
          dataUrl={screenshot}
          onRetake={handleRetake}
          onSubmit={handleSubmitRecognition}
          isSubmitting={isExtracting}
        />
      )}

      {/* 步骤 3: 提取中 */}
      {currentStep === 'extracting' && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4 animate-pulse">🤖</div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
            AI 正在识别患者信息...
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            请稍候,这可能需要几秒钟
          </p>
        </div>
      )}

      {/* 步骤 4: 编辑患者信息 */}
      {/* 紧凑文本显示替代输入表单 */}
      {(currentStep === 'editing' || currentStep === 'selecting') && patientInfo && (
        <PatientInfoText patientInfo={patientInfo} onConfirm={handleConfirmPatientInfo} />
      )}

      {/* 步骤 5: 选择推荐类型 */}
      {currentStep === 'selecting' && (
        <RecommendationTypeSelector
          selectedTypes={selectedTypes}
          onChange={setSelectedTypes}
          onGenerate={handleGenerateRecommendations}
          isGenerating={isGenerating}
        />
      )}

      {/* 步骤 6: 生成中 */}
      {currentStep === 'generating' && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4 animate-pulse">🤖</div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
            AI 正在生成推荐...
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            正在分析患者信息并生成专业建议
          </p>
        </div>
      )}

      {/* 步骤 7: 显示结果 */}
      {currentStep === 'results' && (
        <>
          {/* 患者信息摘要 */}
          {patientInfo && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                患者信息
              </h4>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                {patientInfo.name} | {patientInfo.gender} | {patientInfo.age}岁 | ID: {patientInfo.patient_id}
              </div>
            </div>
          )}

          {/* 推荐结果 */}
          <RecommendationResultsDisplay
            results={recommendations}
            onExport={handleExport}
          />
        </>
      )}
    </div>
  );
};

