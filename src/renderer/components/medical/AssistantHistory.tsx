/**
 * 助手历史会话查看（按会话ID分组，医疗流程中会话ID=患者ID）
 */

import React from 'react';

export const AssistantHistory: React.FC = () => {
  const [sessions, setSessions] = React.useState<{ session_id: string; count: number; last_at: number }[]>([]);
  const [active, setActive] = React.useState<string>('');
  const [messages, setMessages] = React.useState<Array<{ id: string; role: string; content: string; created_at: number }>>([]);

  const load = async () => {
    const { listAllChatSessions } = await import('../../services/persistence');
    const s = listAllChatSessions();
    setSessions(s);
    if (s.length && !active) setActive(s[0].session_id);
  };

  const loadMsgs = async (sid: string) => {
    const { listChatMessages } = await import('../../services/persistence');
    setMessages(listChatMessages(sid));
  };

  React.useEffect(() => { load(); }, []);
  React.useEffect(() => { if (active) loadMsgs(active); }, [active]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1">
        <div className="text-sm text-gray-600 mb-2">会话（按时间倒序）</div>
        <div className="space-y-2 max-h-[28rem] overflow-auto">
          {sessions.map(s => (
            <div key={s.session_id} onClick={() => setActive(s.session_id)} className={`p-3 border rounded-md cursor-pointer ${active===s.session_id?'bg-blue-50 dark:bg-blue-900':''}`}>
              <div className="font-medium text-sm">{s.session_id}</div>
              <div className="text-xs text-gray-500">{new Date(s.last_at).toLocaleString()} · {s.count} 条</div>
            </div>
          ))}
          {sessions.length===0 && (<div className="text-sm text-gray-500">暂无会话</div>)}
        </div>
      </div>
      <div className="md:col-span-2">
        {!active ? (
          <div className="text-sm text-gray-500">请选择左侧会话</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">会话ID：{active}</div>
            <div className="space-y-2 max-h-[28rem] overflow-auto">
              {messages.map(m => (
                <div key={m.id} className={`p-3 border rounded-md ${m.role==='assistant'?'bg-gray-50 dark:bg-gray-800':''}`}>
                  <div className="text-xs text-gray-500 mb-1">{m.role} · {new Date(m.created_at).toLocaleString()}</div>
                  <pre className="whitespace-pre-wrap text-sm">{m.content}</pre>
                </div>
              ))}
              {messages.length===0 && (<div className="text-sm text-gray-500">此会话暂无消息</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

