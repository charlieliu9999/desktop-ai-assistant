# IPC API (window.electronAPI)

These APIs are exposed via `contextBridge.exposeInMainWorld('electronAPI', ...)` in `src/main/preload.ts` and `src/renderer/preload.ts`.

Major namespaces:
- app: quit, minimizeToTray, getVersion, getStatus, setVisibility, reportError, reportPerformance, restart, toggleDevTools, showNotification, createReminder
- window: minimize, close, toggleAlwaysOnTop, showMain, hideMain, toggleMain, showFloating, hideFloating, showVoice, hide
- voice: startRecognition, stopRecognition, speak, stopSpeaking, testAllModels, onRecognitionResult, onStateChange
- ai: processMessage, processMessageStream, processMessageWithTools, clearHistory, generateSummary, searchWeb, onResponse, onStreamChunk, onStreamEnd, onStateChange
- desktop: captureScreen, analyzeScreen, getDisplays, onAnalysisResult, onStateChange
- medical: searchPatients, getPatient, onSearchResult, onStateChange
- bisheng: login, getWorkflows, invokeWorkflow, stopWorkflow, onStreamStart, onStreamChunk, onStreamEnd, getConfig, updateConfig, isAuthenticated, getProxyStatus, testWorkflowList, testWorkflowInvoke, runConnectionTests
- config: get, set, update, reset, onChange
- screenshot: capture, captureWindow, checkPermissions, getDisplays
- on/off/invoke/send: generic event helpers

Detailed files:
- ./app.md
- ./window.md
- ./voice.md
- ./ai.md
- ./desktop.md
- ./medical.md
- ./bisheng.md
- ./config.md
