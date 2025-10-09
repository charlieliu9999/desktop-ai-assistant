/**
 * 简单本地持久化（Renderer侧），用于患者记录与对话历史
 * 生产可迁移至主进程 electron-store/数据库
 */

export interface PatientRecordEntry {
  id: string;
  patient_id: string;
  patient_name?: string;
  created_at: number;
  screenshot?: string; // dataUrl
  markdown?: string;   // 推荐结果MD
  raw?: any;           // 其他扩展数据
}

export interface ChatMessage {
  id: string;
  session_id: string; // 可用 patient_id 或自定义会话ID
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: number;
}

const KEY_PATIENT = 'medical:patientRecords';
const KEY_CHAT = 'medical:chatHistory';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// 患者记录：按 patient_id 归档
export function savePatientRecord(entry: PatientRecordEntry) {
  const store: Record<string, PatientRecordEntry[]> = read(KEY_PATIENT, {});
  const list = store[entry.patient_id] || [];
  store[entry.patient_id] = [...list, entry].slice(-200);
  write(KEY_PATIENT, store);
}

export function listPatientRecords(patientId: string): PatientRecordEntry[] {
  const store: Record<string, PatientRecordEntry[]> = read(KEY_PATIENT, {});
  return store[patientId] || [];
}

export function listAllPatientRecords(): PatientRecordEntry[] {
  const store: Record<string, PatientRecordEntry[]> = read(KEY_PATIENT, {});
  return Object.values(store).flat();
}

// 对话历史：按 session_id（可使用patient_id）归档
export function saveChatMessage(msg: ChatMessage) {
  const store: Record<string, ChatMessage[]> = read(KEY_CHAT, {});
  const list = store[msg.session_id] || [];
  store[msg.session_id] = [...list, msg].slice(-1000);
  write(KEY_CHAT, store);
}

export function listChatMessages(sessionId: string): ChatMessage[] {
  const store: Record<string, ChatMessage[]> = read(KEY_CHAT, {});
  return store[sessionId] || [];
}

export function listAllChatSessions(): { session_id: string; count: number; last_at: number }[] {
  const store: Record<string, ChatMessage[]> = read(KEY_CHAT, {});
  return Object.entries(store).map(([sid, msgs]) => ({
    session_id: sid,
    count: msgs.length,
    last_at: msgs.reduce((acc, m) => Math.max(acc, m.created_at), 0)
  })).sort((a,b)=>b.last_at-a.last_at);
}
