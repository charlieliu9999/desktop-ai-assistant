import { create } from 'zustand';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatAttachment {
  type: 'image' | 'file';
  name: string;
  url: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  type: ChatRole;
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
}

interface ChatState {
  messages: ChatMessage[];
  add: (msg: ChatMessage) => void;
  setAll: (msgs: ChatMessage[]) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  add: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setAll: (msgs) => set(() => ({ messages: msgs })),
  clear: () => set({ messages: [] }),
}));

