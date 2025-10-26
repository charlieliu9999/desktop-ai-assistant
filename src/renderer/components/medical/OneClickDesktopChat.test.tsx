/* @vitest-environment jsdom */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OneClickDesktopChat } from './OneClickDesktopChat';

vi.mock('../../../services/adapters/vision-adapter', () => {
  return {
    visionAdapter: {
      understandImage: vi.fn(async (_req: any) => ({
        description: 'ok',
        confidence: 0.9,
        details: { structured: {
          patient_name: '赵华',
          gender: '女',
          age: 45,
          medical_record_number: '13391483',
          department: '急诊科',
          chief_complaint: '突发左侧肢体活动障碍、言语不清2小时',
          diagnosis: '急性缺血性脑卒中',
          medical_history: '高血压病史5年',
          confidence: 0.9
        } }
      }))
    }
  };
});

vi.mock('../../../services/api-client', () => {
  return {
    apiClient: {
      generateCombinedRecommendationsStream: vi.fn(async (_patient: any, _cfg: any, onChunk?: (c: string)=>void) => {
        onChunk && onChunk('## 诊断建议\n1. 急性缺血性脑卒中\n');
        onChunk && onChunk('\n## 检查项目推荐\n1. 头颅CT\n');
        onChunk && onChunk('\n## 用药建议\n1. 阿司匹林\n');
        return { success: true, recommendations: { combined: 'complete' } } as any;
      })
    },
    default: {}
  };
});

function installElectronAPIMock() {
  (globalThis as any).window = window;
  (window as any).electronAPI = {
    screenshot: {
      checkPermissions: vi.fn(async () => ({ hasPermission: true })),
      capture: vi.fn(async () => ({ success: true, data: { dataUrl: 'data:image/png;base64,AAA', width: 100, height: 100, timestamp: Date.now() } }))
    },
    ai: {}
  };
}

function render(ui: React.ReactElement) {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = ReactDOM.createRoot(div);
  root.render(ui);
  return { container: div, unmount: () => root.unmount() };
}

describe('OneClickDesktopChat - start flow shows patient + streaming', () => {
  beforeEach(() => {
    installElectronAPIMock();
    try { localStorage.clear(); } catch {}
    vi.useRealTimers();
  });

  it('runs one-click flow and renders streaming content', async () => {
    const { container } = render(<OneClickDesktopChat />);
    // 等待一次宏任务/微任务，确保React 18渲染完成
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    const startBtn = container.querySelector('[data-testid="oneclick-start-btn"]') as HTMLButtonElement;
    expect(startBtn).toBeTruthy();
    startBtn.click();
    await new Promise((r) => setTimeout(r, 80));

    const txt = container.textContent || '';
    // 文本模式或结构化模式均可，只要包含患者信息提示与推荐标题
    expect(txt).toContain('患者信息');
    expect(txt).toContain('诊断建议');
  });
});
