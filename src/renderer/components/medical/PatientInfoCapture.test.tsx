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

    // 现在手动点击“提交识别”，避免依赖配置中的 autoAnalyze
    await new Promise((r) => setTimeout(r, 20));
    const submitBtn = Array.from(container.querySelectorAll('button'))
      .find((b) => (b.textContent || '').includes('提交识别')) as HTMLButtonElement | undefined;
    expect(!!submitBtn).toBe(true);
    submitBtn!.click();
    // 等待识别完成，进入编辑阶段
    await new Promise((r) => setTimeout(r, 60));

    // 点击“确认”（从编辑进入类型选择）
    const confirmBtn = Array.from(container.querySelectorAll('button'))
      .find((b) => (b.textContent || '').includes('确认')) as HTMLButtonElement | undefined;
    expect(!!confirmBtn).toBe(true);
    confirmBtn!.click();

    // 选择类型：“全选”，然后点击“生成推荐”
    await new Promise((r) => setTimeout(r, 20));
    const selectAllBtn = Array.from(container.querySelectorAll('button'))
      .find((b) => (b.textContent || '').includes('全选')) as HTMLButtonElement | undefined;
    if (selectAllBtn) selectAllBtn.click();
    const genBtn = Array.from(container.querySelectorAll('button'))
      .find((b) => (b.textContent || '').includes('生成推荐')) as HTMLButtonElement | undefined;
    expect(!!genBtn).toBe(true);
    genBtn!.click();
    // 等待流式生成
    await new Promise((r) => setTimeout(r, 120));

    // Should contain patient info summary and recommendations title
    const txt = container.textContent || '';
    // 兼容纯文本提取与严格JSON两种模式
    expect(txt).toContain('患者信息');
    expect(txt).toMatch(/诊断建议/);
  });
});
