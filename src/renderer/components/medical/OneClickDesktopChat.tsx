import React, { useEffect, useRef, useState } from 'react';
import { Zap, Trash2 } from 'lucide-react';
import { useConfigStore } from '../../stores/configStore';
import { useChatStore } from '../../stores/chatStore';
import type { Message } from '../../types/chat';
import { screenshotService } from '../../services/screenshot';
import { apiClient } from '../../../services/api-client';
import { savePatientRecord } from '../../services/persistence';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { UNIFIED_TEXTAREA_STYLES } from '../../styles/unified-input-styles';

export const OneClickDesktopChat: React.FC = () => {
  const { config } = useConfigStore();
  const {
    getSession,
    addMessage,
    updateMessage,
    clearSession,
    persistSession
  } = useChatStore();

  const [running, setRunning] = useState(false);
  const [screenshot, setScreenshot] = useState<string>('');
  const [patient, setPatient] = useState<any>(null);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // 使用患者ID作为sessionId，如果没有则使用临时ID
  const currentSessionId = patient?.patient_id
    ? `desktop-${patient.patient_id}`
    : 'desktop-temp';

  const session = getSession(currentSessionId, '桌面识别对话');
  const messages = session.messages;

  // 自动滚动到底部
  useEffect(() => {
    listRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 自动持久化
  useEffect(() => {
    if (messages.length > 0 && patient?.patient_id) {
      persistSession(currentSessionId);
    }
  }, [messages, currentSessionId, patient?.patient_id]);

  // 添加消息的辅助函数
  const addMsg = (role: 'user' | 'assistant' | 'system', content: string): string => {
    const message: Message = {
      id: `msg-${Date.now()}-${role}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId: currentSessionId,
      role,
      content,
      timestamp: Date.now(),
      type: 'text',
    };
    addMessage(currentSessionId, message);
    return message.id;
  };

  // 更新消息内容（用于流式输出）
  const updateMsgContent = (messageId: string, newContent: string) => {
    updateMessage(currentSessionId, messageId, newContent);
  };

  // 重置会话
  const resetSession = () => {
    setRunning(false);
    setScreenshot('');
    setPatient(null);
    if (currentSessionId) {
      clearSession(currentSessionId);
    }
  };

  const start = async () => {
    if (running) return;
    setRunning(true);
    addMsg('system', '开始一键流程...');
    try {
      // 截图
      const ok = await screenshotService.checkPermissions();
      if (!ok) throw new Error('没有屏幕录制权限');
      const shot = await screenshotService.captureScreen({ noCache: true });
      setScreenshot(shot.dataUrl);
      if (config.oneClick?.showScreenshot) addMsg('system', '截图完成');

      // 识别
      const resp = await apiClient.extractPatientInfo(shot.dataUrl, config.aiImage);
      const piRaw: any = resp.patient_info || {};
      const pi = {
        name: piRaw.name || '',
        age: typeof piRaw.age === 'number' ? piRaw.age : parseInt(String(piRaw.age || '0')) || 0,
        gender: piRaw.gender || '',
        patient_id: piRaw.patient_id || piRaw.patientId || `PID_${Date.now()}`,
        department: piRaw.department || '',
        chief_complaint: piRaw.chief_complaint || piRaw.chiefComplaint || '',
        diagnosis: piRaw.diagnosis || '',
        medical_history: piRaw.medical_history || piRaw.medicalHistory || piRaw.medicalNow || ''
      };
      setPatient(pi);
      if (config.oneClick?.showPatientInfo) {
        addMsg('system', `患者信息：\n姓名：${pi.name}  性别：${pi.gender}  年龄：${pi.age}\nID：${pi.patient_id}${pi.department?`  科室：${pi.department}`:''}`);
      }

      // 推荐类型
      const types: string[] = [];
      if (config.oneClick?.generate?.diagnosis) types.push('diagnosis');
      if (config.oneClick?.generate?.exam) types.push('exam');
      if (config.oneClick?.generate?.medication) types.push('medication');

      // 推荐（流式）
      const recMsgId = addMsg('assistant', '');
      let accumulatedContent = '';

      const res = await apiClient.generateCombinedRecommendationsStream(
        pi as any,
        (config.oneClick?.followUpModelSameAsRecommend ? (config.aiRecommend as any) : {
          ...config.aiRecommend,
          provider: config.oneClick?.provider || config.aiRecommend?.provider,
          apiUrl: config.oneClick?.apiUrl || config.aiRecommend?.apiUrl,
          diagnosisModel: config.oneClick?.model || config.aiRecommend?.diagnosisModel,
          examModel: config.oneClick?.model || config.aiRecommend?.examModel,
          medicationModel: config.oneClick?.model || config.aiRecommend?.medicationModel,
          temperature: config.oneClick?.temperature ?? config.aiRecommend?.temperature,
          maxTokens: config.oneClick?.maxTokens ?? config.aiRecommend?.maxTokens,
        } as any),
        (chunk) => {
          accumulatedContent += chunk;
          updateMsgContent(recMsgId, accumulatedContent);
        },
        types
      );

      const md = (res?.recommendations as any)?.combined || accumulatedContent || '';

      // 保存患者记录（不再手动保存对话消息，由 Store 自动持久化）
      try {
        savePatientRecord({
          id: `rec_${Date.now()}`,
          patient_id: pi.patient_id,
          patient_name: pi.name,
          created_at: Date.now(),
          screenshot: shot.dataUrl,
          markdown: md,
          raw: { patient: pi, res }
        });
      } catch (err) {
        console.error('保存患者记录失败:', err);
      }

      if (config.oneClick?.allowFollowUp) {
        addMsg('system', '可以继续提问，和同一患者上下文继续对话。');
      } else {
        addMsg('system', '流程已完成。');
      }
    } catch (e) {
      addMsg('system', e instanceof Error ? e.message : '流程失败');
    } finally {
      setRunning(false);
    }
  };

  // 后续对话（同模型、同上下文）
  const send = async () => {
    if (!input.trim() || !patient) return;

    const userInput = input.trim();
    setInput('');

    // 添加用户消息
    addMsg('user', userInput);

    // 添加助手消息占位符
    const assistantMsgId = addMsg('assistant', '');
    let accumulatedContent = '';

    try {
      // 组装消息：系统+患者信息+用户消息
      const cfg = config.oneClick?.followUpModelSameAsRecommend ? (config.aiRecommend as any) : {
        provider: config.oneClick?.provider || 'local',
        apiUrl: config.oneClick?.apiUrl || 'http://127.0.0.1:11434/v1/chat/completions',
        model: config.oneClick?.model || config.aiRecommend?.diagnosisModel || 'qwen3:30b',
        temperature: config.oneClick?.temperature ?? 0.3,
        maxTokens: config.oneClick?.maxTokens ?? 1200
      };

      let endpoint = cfg.apiUrl || 'http://127.0.0.1:11434/v1/chat/completions';
      try {
        const u = new URL(endpoint);
        if (u.pathname.startsWith('/api/')) endpoint = `${u.origin}/v1/chat/completions`;
      } catch {}

      const system = {
        role: 'system',
        content: '你是资深临床智能助手，请严格围绕患者当前病情提供建议。不要输出开头或结尾说明，仅输出内容。'
      };

      const patientSummary = `姓名：${patient.name}\n性别：${patient.gender}\n年龄：${patient.age}\n患者ID：${patient.patient_id}\n`
        + (patient.department ? `科室：${patient.department}\n` : '')
        + (patient.chief_complaint ? `主诉：${patient.chief_complaint}\n` : '')
        + (patient.diagnosis ? `诊断：${patient.diagnosis}\n` : '')
        + (patient.medical_history ? `病史：${patient.medical_history}\n` : '');

      const user = {
        role: 'user',
        content: `患者信息：\n${patientSummary}\n\n问题：\n${userInput}\n\n注意：只输出内容，不要任何额外说明。`
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;

      const payload = {
        model: cfg.model || cfg.diagnosisModel,
        messages: [system, user],
        temperature: cfg.temperature || 0.3,
        max_tokens: cfg.maxTokens || 1200,
        stream: true
      };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);

      if (resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data:')) continue;

            const data = line.replace(/^data:\s*/, '');
            if (data === '[DONE]') continue;

            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || '';
              if (delta) {
                accumulatedContent += delta;
                updateMsgContent(assistantMsgId, accumulatedContent);
              }
            } catch {}
          }
        }
      }
      // 消息已通过 Store 自动持久化，无需手动保存
    } catch (e) {
      updateMsgContent(assistantMsgId, '对话失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {patient?.patient_id ? `会话：desktop-${patient.patient_id}` : '未开始会话'}
        </div>
        <div className="space-x-2">
          <button
            type="button"
            onClick={start}
            disabled={running}
            className="px-3 py-1 bg-primary-600 text-white rounded-md disabled:opacity-50 hover:bg-primary-700 transition-colors"
          >
            <Zap className="h-4 w-4 inline mr-1"/>
            一键开始
          </button>
          <button
            type="button"
            onClick={resetSession}
            className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <Trash2 className="h-4 w-4 inline mr-1"/>
            清除
          </button>
        </div>
      </div>

      {config.oneClick?.showScreenshot && screenshot && (
        <div className="border rounded-md overflow-hidden">
          <img
            src={screenshot}
            alt="桌面截图"
            className="w-full h-auto"
          />
        </div>
      )}

      <div className="space-y-2">
        {messages.map(m => (
          <div key={m.id} className="flex justify-start">
            <div className={`w-full border rounded-md p-3 ${m.role==='assistant'?'bg-gray-50 dark:bg-gray-800':''}`}>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                {m.role} · {new Date(m.timestamp).toLocaleString()}
              </div>
              {m.role==='assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm">{m.content}</pre>
              )}
            </div>
          </div>
        ))}
        <div ref={listRef} />
      </div>

      {config.oneClick?.allowFollowUp && patient && (
        <div className="flex items-end space-x-2">
          <textarea
            value={input}
            onChange={(e)=>setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className={UNIFIED_TEXTAREA_STYLES}
            placeholder="继续提问... (Enter 发送, Shift+Enter 换行)"
            rows={2}
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim()}
            className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </div>
      )}
    </div>
  );
};
