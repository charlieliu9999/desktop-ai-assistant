# IPC: desktop

Handlers:
- 'desktop-capture-screen', options => capture screen
- 'desktop-analyze-screen', options => capture + analyze
- 'desktop-get-displays' => list displays

Renderer usage:
```ts
const capture = await window.electronAPI.desktop.captureScreen({ includeOCR: true });
const { success, content } = await window.electronAPI.ai.processMessageStream('分析截图');
const displays = await window.electronAPI.desktop.getDisplays();
```

Events:
```ts
const off = window.electronAPI.desktop.onAnalysisResult(analysis => { /* ... */ });
off();
```
