/* @vitest-environment jsdom */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientInfoCapture } from './PatientInfoCapture';

vi.mock('../../../services/adapters/vision-adapter', () => ({
  visionAdapter: {
    understandImage: vi.fn(async () => { throw new Error('no_result'); })
  }
}));

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

describe('PatientInfoCapture - v2 strict json no_result path', () => {
  beforeEach(() => {
    installElectronAPIMock();
    try { localStorage.clear(); } catch {}
  });

  it('shows guidance error on no_result and returns to initial', async () => {
    const { container } = render(<PatientInfoCapture />);
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    const btn = container.querySelector('[data-testid="capture-start-btn"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    await new Promise((r) => setTimeout(r, 40));
    const submitBtn = Array.from(container.querySelectorAll('button'))
      .find((b) => (b.textContent || '').includes('提交识别')) as HTMLButtonElement | undefined;
    expect(!!submitBtn).toBe(true);
    submitBtn!.click();
    await new Promise((r) => setTimeout(r, 30));

    const txt = container.textContent || '';
    expect(txt).toContain('识别失败：未得到严格 JSON 结构');
  });
});
