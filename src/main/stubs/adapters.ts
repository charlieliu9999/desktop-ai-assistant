// Minimal runtime stubs for adapters used by main process
export class AIServiceAdapter {
  [key: string]: any;
  constructor(..._args: any[]) {}
  async initialize(): Promise<void> { /* no-op */ }
  async *chatStream(message: string, _context?: string[]): AsyncIterableIterator<string> {
    const parts = [
      '## 诊断建议\n1. 急性缺血性脑卒中\n',
      '\n## 检查项目推荐\n1. 头颅CT\n',
      '\n## 用药建议\n1. 阿司匹林\n'
    ];
    for (const p of parts) { yield p; }
  }
}

export function setBackendApiOrigin(_origin: string) {
  // no-op stub
}

export class AgentServiceAdapter { [key: string]: any; constructor(..._args: any[]) {} }
