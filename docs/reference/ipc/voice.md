# IPC: voice

Handlers (main -> ipcMain.handle in `src/main/main.ts`):
- 'voice-start-recognition' => startRecognition()
- 'voice-stop-recognition' => stopRecognition()
- 'voice-speak', text => speak(text)
- 'voice-stop-speaking' => stopSpeaking()
- 'voice-test-all-models', audioData => testAllModels

Renderer usage:
```ts
await window.electronAPI.voice.startRecognition();
await window.electronAPI.voice.stopRecognition();
await window.electronAPI.voice.speak('你好');
await window.electronAPI.voice.stopSpeaking();
const results = await window.electronAPI.voice.testAllModels(audioArrayBuffer);
```

Events:
```ts
const off = window.electronAPI.voice.onRecognitionResult(({ input, response }) => { /* ... */ });
off();
```
