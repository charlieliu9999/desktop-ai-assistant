/**
 * 患者记录列表/调阅组件
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface RecordItem {
  id: string;
  patient_id: string;
  patient_name?: string;
  created_at: number;
  screenshot?: string;
  markdown?: string;
}

export const PatientRecords: React.FC = () => {
  const [records, setRecords] = React.useState<RecordItem[]>([]);
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<RecordItem | null>(null);
  const [renderAsMarkdown, setRenderAsMarkdown] = React.useState<boolean>(() => {
    try { return (localStorage.getItem('medical:renderAsMarkdown') || '1') === '1'; } catch { return true; }
  });

  const loadAll = async () => {
    const { listAllPatientRecords } = await import('../../services/persistence');
    const all = listAllPatientRecords();
    // 最新在前
    setRecords(all.sort((a, b) => b.created_at - a.created_at));
  };

  React.useEffect(() => { loadAll(); }, []);

  const filtered = records.filter(r => {
    const q = query.trim();
    if (!q) return true;
    return (r.patient_id || '').includes(q) || (r.patient_name || '').includes(q) || (r.markdown || '').includes(q);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1 space-y-3">
        <div className="flex items-center space-x-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="按患者ID/姓名/内容搜索"
            className="w-full px-3 py-2 border rounded-md"
          />
          <button onClick={loadAll} className="px-3 py-2 bg-gray-600 text-white rounded-md">刷新</button>
        </div>
        <div className="space-y-2 max-h-[28rem] overflow-auto">
          {filtered.map(rec => (
            <div
              key={rec.id}
              onClick={() => setSelected(rec)}
              className={`p-3 border rounded-md cursor-pointer ${selected?.id === rec.id ? 'bg-blue-50 dark:bg-blue-900' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <div className="text-sm font-medium">{rec.patient_name || '未命名'} <span className="text-gray-500">({rec.patient_id})</span></div>
              <div className="text-xs text-gray-500">{new Date(rec.created_at).toLocaleString()}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-gray-500">暂无记录</div>
          )}
        </div>
      </div>
      <div className="md:col-span-2">
        {!selected ? (
          <div className="text-sm text-gray-500">请选择左侧一条记录</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-medium">{selected.patient_name || '未命名'} <span className="text-gray-500">({selected.patient_id})</span></div>
                <div className="text-xs text-gray-500">{new Date(selected.created_at).toLocaleString()}</div>
              </div>
              <button onClick={() => setRenderAsMarkdown(!renderAsMarkdown)} className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md">{renderAsMarkdown ? '纯文本' : 'Markdown'}</button>
            </div>
            {selected.screenshot && (
              <div className="border rounded-md overflow-hidden">
                <img src={selected.screenshot} className="w-full h-auto" />
              </div>
            )}
            {selected.markdown && (
              renderAsMarkdown ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {selected.markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="p-3 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{selected.markdown}</pre>
              )
            )}

            {/* 对话记录（按患者ID）*/}
            <PatientConversation patientId={selected.patient_id} />
          </div>
        )}
      </div>
    </div>
  );
};

// 子组件：显示患者会话（用户与助手消息，左对齐单列）
const PatientConversation: React.FC<{ patientId: string }> = ({ patientId }) => {
  const [messages, setMessages] = React.useState<Array<{ id: string; role: string; content: string; created_at: number }>>([]);

  React.useEffect(() => {
    (async () => {
      const { listChatMessages } = await import('../../services/persistence');
      setMessages(listChatMessages(patientId));
    })();
  }, [patientId]);

  if (!patientId) return null;
  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600">对话记录</div>
      {messages.length === 0 ? (
        <div className="text-xs text-gray-500">暂无对话</div>
      ) : (
        <div className="space-y-2">
          {messages.map(m => (
            <div key={m.id} className="flex justify-start">
              <div className={`w-full border rounded-md p-3 ${m.role==='assistant'?'bg-gray-50 dark:bg-gray-800':''}`}>
                <div className="text-[11px] text-gray-500 mb-1">{m.role} · {new Date(m.created_at).toLocaleString()}</div>
                <pre className="whitespace-pre-wrap text-sm">{m.content}</pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
