/* @vitest-environment jsdom */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientInfoCapture } from './PatientInfoCapture';

// Mock dynamic imports used inside component
vi.mock('../../../services/adapters/vision-adapter', () => {
  return {
    visionAdapter: {
      understandImage: vi.fn(async (_req: any) => {
        return {
          description: 'ok',
          confidence: 0.9,
          details: { model: 'qwen-vl-plus' },
          // component expects details.structured
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
        } as any;
      })
    }
  };
});

vi.mock('../../../services/api-client', () => {
  return {
    apiClient: {
      generateCombinedRecommendationsStream: vi.fn(async (_patient: any, _cfg: any, onChunk?: (c: string)=>void) => {
        // Simulate streaming
        onChunk && onChunk('## 诊断建议\n1. 急性缺血性脑卒中\n');
        onChunk && onChunk('\n## 检查项目推荐\n1. 头颅CT\n');
        onChunk && onChunk('\n## 用药建议\n1. 阿司匹林\n');
        return { success: true, recommendations: { combined: '## 诊断建议\n1. 急性缺血性脑卒中\n\n## 检查项目推荐\n1. 头颅CT\n\n## 用药建议\n1. 阿司匹林\n' } } as any;
      })
    },
    default: {}
  };
});

// Stub electronAPI for screenshot
function installElectronAPIMock() {
  (globalThis as any).window = window;
  (window as any).electronAPI = {
    screenshot: {
      checkPermissions: vi.fn(async () => ({ hasPermission: true })),
      capture: vi.fn(async () => ({ success: true, data: { dataUrl: 'data:image/png;base64,AAA', width: 100, height: 100, timestamp: Date.now() } }))
    }
  };
}

function render(ui: React.ReactElement) {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = ReactDOM.createRoot(div);
  root.render(ui);
  return { container: div, unmount: () => root.unmount() };
}

describe('PatientInfoCapture - auto flow VL-only strict JSON', () => {
  beforeEach(() => {
    installElectronAPIMock();
    try { localStorage.clear(); } catch {}
    vi.useRealTimers();
  });

  it('screenshots, recognizes, and shows patient info + streaming results', async () => {
    const { container } = render(<PatientInfoCapture />);
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    
    // Click start capture button
    const btn = container.querySelector('[data-testid="capture-start-btn"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();

    // wait real timers to flush auto flow timers (20 + 10 + 30ms)
    await new Promise((r) => setTimeout(r, 120));

    // Should contain patient info summary and recommendations title
    const txt = container.textContent || '';
    expect(txt).toContain('患者信息');
    expect(txt).toContain('赵华');
    expect(txt).toContain('13391483');
    expect(txt).toContain('推荐结果');
    expect(txt).toContain('诊断建议');
  });
});
