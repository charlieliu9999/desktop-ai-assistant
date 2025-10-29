/* @vitest-environment jsdom */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OneClickDesktopChat } from './OneClickDesktopChat';

vi.mock('../../../services/adapters/vision-adapter', () => ({
  visionAdapter: {
    understandImage: vi.fn(async () => { throw new Error('no_result'); })
  }
}));

vi.mock('../../../services/api-client', () => ({
  apiClient: {
    generateCombinedRecommendationsStream: vi.fn(async (_patient: any, _cfg: any, onChunk?: (c: string)=>void) => {
      onChunk && onChunk('ignored');
      return { success: true, recommendations: { combined: 'ignored' } } as any;
    })
  },
  default: {}
}));

// Stub electronAPI for screenshot
function installElectronAPIMock() {
  (globalThis as any).window = window;
  (window as any).electronAPI = {
    screenshot: {
      checkPermissions: vi.fn(async () => ({ hasPermission: true })),
      capture: vi.fn(async () => ({ success: true, data: { dataUrl: 'data:image/png;base64,AAA', width: 100, height: 100, timestamp: Date.now() } }))
    },
    ai: {
      onStreamChunk: vi.fn(() => () => {}),
      onStreamEnd: vi.fn(() => () => {}),
      processMessageStream: vi.fn(async () => ({ success: false }))
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

describe('OneClickDesktopChat - v2 no_result path', () => {
  beforeEach(() => {
    installElectronAPIMock();
    try { localStorage.clear(); } catch {}
  });

  it('shows guidance error when vision returns no_result', async () => {
    const { container } = render(<OneClickDesktopChat />);
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    const startBtn = container.querySelector('[data-testid="oneclick-start-btn"]') as HTMLButtonElement;
    expect(startBtn).toBeTruthy();
    startBtn.click();
    await new Promise((r) => setTimeout(r, 60));
    const txt = container.textContent || '';
    expect(txt).toMatch(/识别失败：未得到严格JSON结构/);
  });
});
