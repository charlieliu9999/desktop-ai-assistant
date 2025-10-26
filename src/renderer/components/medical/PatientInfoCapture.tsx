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
  const [patientText, setPatientText] = useState<string>('');

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
      // 医疗系统期望按步骤显示（截图→识别→选择→推荐）
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
      // 通过后端视觉（VL）进行识别；根据 extractionMode 选择严格JSON或自由文本
      const extractionMode = (config as any)?.aiImage?.extractionMode || 'freeform';
      const useStrict = extractionMode === 'strict';
      console.log('🔍 使用后端视觉进行识别（VL, mode=%s）', extractionMode);
      const { visionAdapter } = await import('../../../services/adapters/vision-adapter');
      const backendProvider = (config as any)?.aiImage?.backendProvider || 'dashscope';
      const backendModel = (config as any)?.aiImage?.backendModel || undefined;
      const scene = (config as any)?.aiImage?.backendScene || (backendProvider === 'dashscope' ? 'screen_recognition_aliyun' : 'screen_recognition');
      const freeformPrompt = '只从中部或右侧的“患者信息/基本信息/诊断信息/医嘱录入/病历详情”等详情面板提取本次就诊患者的完整信息，忽略左侧的患者列表、中部的患者列表和表格/卡片集合。仅输出清晰的中文文本，逐行列出姓名、性别、年龄、患者ID/病历号、科室、日期、主诉、诊断、现病史、既往史等要点，保持与界面一致的用词，不要JSON，不要解释。';
      const res = await visionAdapter.understandImage({
        imageData: screenshot,
        imageMime: 'image/png',
        prompt: useStrict ? '' : freeformPrompt,
        provider: backendProvider as any,
        model: backendModel,
        strictJson: useStrict,
        allowFallback: false,
        schemaName: useStrict ? 'patient_info_v1' : undefined as any,
        scene,
      });
      if (useStrict) {
        const s: any = (res as any)?.details?.structured || {};
        const norm = (v: any) => (v === undefined || v === null) ? '' : v;
        const convertedPatientInfo = {
          name: norm(s.name) || norm(s.patient_name) || '',
          age: typeof s.age === 'number' ? s.age : parseInt(String(s.age || '0')) || 0,
          gender: norm(s.gender) || '',
          patient_id: norm(s.patient_id) || norm(s.patientId) || norm(s.medical_record_number) || '',
          department: norm(s.department) || '',
          chief_complaint: norm(s.chief_complaint) || norm(s.chiefComplaint) || '',
          diagnosis: norm(s.diagnosis) || '',
          medical_history: norm(s.medical_history) || norm(s.medicalHistory) || norm(s.medicalNow) || ''
        };
        setPatientInfo(convertedPatientInfo);
        setPatientText('');
        saveSession({ patientInfo: convertedPatientInfo, currentStep: 'editing' });
      } else {
        const text = (res as any)?.description || '';
        setPatientText(text);
        // 尝试最小提取关键信息用于摘要展示（不强制）
        const tryPick = (label: RegExp) => {
          const m = text.match(label);
          return m ? String(m[1]).trim() : '';
        };
        const convertedPatientInfo = {
          name: tryPick(/(?:姓名|患者姓名|name)[：: ]+([^\n，,]+)/i),
          age: parseInt(tryPick(/(?:年龄|age)[：: ]+(\d{1,3})/i)) || 0,
          gender: tryPick(/(?:性别|gender)[：: ]+([^\n，,]+)/i),
          patient_id: tryPick(/(?:患者ID|病历号|ID)[：: ]+([^\n，,]+)/i),
          department: tryPick(/(?:科室|department)[：: ]+([^\n，,]+)/i),
          chief_complaint: tryPick(/(?:主诉|chief\s*complaint)[：: ]+([^\n]+)/i),
          diagnosis: tryPick(/(?:诊断|diagnosis)[：: ]+([^\n]+)/i),
          medical_history: tryPick(/(?:现病史|既往史|病史|medical\s*history)[：: ]+([^\n]+)/i)
        } as any;
        setPatientInfo(convertedPatientInfo);
        saveSession({ patientInfo: convertedPatientInfo, currentStep: 'editing' });
      }
      // 自动进入生成推荐（跳过确认/选择）
      try {
        const auto = !!(config?.desktopRecognition?.autoAnalyze);
        if (auto) {
          const genCfg = (config?.oneClick?.generate || {}) as any;
          const types: any[] = [];
          if (genCfg.diagnosis) types.push('diagnosis');
          if (genCfg.exam) types.push('exam');
          if (genCfg.medication) types.push('medication');
          setSelectedTypes(types.length ? types : ['diagnosis','exam','medication']);
          setTimeout(() => {
            handleConfirmPatientInfo();
            setTimeout(() => { handleGenerateRecommendations().catch(()=>{}); }, 30);
          }, 10);
        }
      } catch {}
      
      setCurrentStep('editing');
    } catch (err: any) {
      const emsg = (err && (err.message || err?.error)) ? (err.message || err.error) : String(err);
      console.error('Patient info extraction error:', emsg);
      if (String(emsg).includes('strict_json_parse_failed')) {
        setError('识别失败：未得到严格 JSON 结构。请确保截图包含右侧详情/信息面板，避免包含左侧边栏或中部患者列表后重试。');
      } else {
        setError(emsg || '患者信息提取失败');
      }
      // 失败时回到初始，提示重新截图（右侧详情面板）
      setCurrentStep('initial');
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
      // 路由选择：aiRecommend.routingMode；inherit 时跟随 ai.routingMode
      const globalRouting = (config?.ai?.routingMode || 'frontend');
      const recRouting = (config?.aiRecommend as any)?.routingMode || 'inherit';
      const useFrontendRec = recRouting === 'frontend' || (recRouting === 'inherit' && globalRouting === 'frontend');

      if (useFrontendRec && config?.aiRecommend?.enabled) {
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
          },
          undefined,
          patientText && patientText.trim().length > 0 ? patientText : undefined
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
        // 后端模式：通过主进程 AI（/v1/ai/chat/stream）生成合并 Markdown
        try {
          const userInput = `请基于以下患者信息一次性输出诊断建议、检查项目推荐与用药建议，使用 Markdown 二级标题（##）分段，内容精炼专业，不要开场白或总结。`;
          const patientSummary = `姓名：${patientInfo.name}\n性别：${patientInfo.gender}\n年龄：${patientInfo.age}\nID：${patientInfo.patient_id}\n`
            + (patientInfo.department ? `科室：${patientInfo.department}\n` : '')
            + (patientInfo.chief_complaint ? `主诉：${patientInfo.chief_complaint}\n` : '')
            + (patientInfo.diagnosis ? `诊断：${patientInfo.diagnosis}\n` : '')
            + (patientInfo.medical_history ? `病史：${patientInfo.medical_history}\n` : '');
          const prompt = `${userInput}\n\n患者信息：\n${patientSummary}\n`;
          let combined = '';
          const offChunk = (window as any).electronAPI?.ai?.onStreamChunk?.((chunk: string)=>{
            combined += chunk;
            setRecommendations({ combined });
            saveSession({ recommendations: { combined }, currentStep: 'results' });
          });
          const offEnd = (window as any).electronAPI?.ai?.onStreamEnd?.((_res:any)=>{ offChunk?.(); offEnd?.(); setCurrentStep('results'); });
          await (window as any).electronAPI?.ai?.processMessageStream?.(prompt);
        } catch (e) {
          setError(e instanceof Error ? e.message : '后端生成失败');
          setCurrentStep('selecting');
        }
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
              data-testid="capture-start-btn"
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
      {(currentStep === 'editing' || currentStep === 'selecting') && (
        <>
          {patientText ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md whitespace-pre-wrap text-sm">
              {patientText}
              <div className="mt-3 text-right">
                <button onClick={handleConfirmPatientInfo} className="px-3 py-1 bg-blue-600 text-white rounded-md">确认</button>
              </div>
            </div>
          ) : patientInfo ? (
            <PatientInfoText patientInfo={patientInfo} onConfirm={handleConfirmPatientInfo} />
          ) : null}
        </>
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
          {(patientText || patientInfo) && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md whitespace-pre-wrap">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">患者信息</h4>
              {patientText ? (
                <div className="text-sm text-blue-800 dark:text-blue-200">{patientText}</div>
              ) : (
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  {patientInfo?.name} | {patientInfo?.gender} | {patientInfo?.age}岁 | ID: {patientInfo?.patient_id}
                </div>
              )}
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
