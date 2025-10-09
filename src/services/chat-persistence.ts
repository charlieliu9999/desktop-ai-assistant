import Store from 'electron-store';

export interface ChatAttachment {
  type: 'image' | 'file';
  name: string;
  url: string;
  size?: number;
}

export interface ChatMessagePersisted {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number; // epoch ms for easy serialization
  attachments?: ChatAttachment[];
}

export class ChatPersistenceService {
  private store: Store<{ messages: ChatMessagePersisted[] }>;
  private maxMessages = 500;

  constructor() {
    this.store = new Store<{ messages: ChatMessagePersisted[] }>({
      name: 'chat',
      defaults: { messages: [] },
      clearInvalidConfig: true,
    });
  }

  getAll(): ChatMessagePersisted[] {
    try {
      const msgs = this.store.get('messages') || [];
      return Array.isArray(msgs) ? msgs : [];
    } catch {
      return [];
    }
  }

  setAll(messages: ChatMessagePersisted[]) {
    try {
      const trimmed = messages.slice(-this.maxMessages);
      this.store.set('messages', trimmed);
    } catch {
      // ignore persistence errors
    }
  }

  add(message: ChatMessagePersisted) {
    const all = this.getAll();
    all.push(message);
    this.setAll(all);
  }

  clear() {
    this.store.set('messages', []);
  }
}

