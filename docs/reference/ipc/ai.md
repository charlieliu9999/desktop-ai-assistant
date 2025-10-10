# IPC: ai

Handlers:
- 'ai-process-message', message => returns string content
- 'ai-process-with-tools', message => returns string content
- 'ai-process-message-stream', message => SSE-like chunks via 'ai-stream-chunk' and final 'ai-stream-end'
- 'ai-clear-history'
- 'ai-generate-summary', text
- 'ai-search-web', query, maxResults

Renderer usage:
```ts
const text = await window.electronAPI.ai.processMessage('你好');
await window.electronAPI.ai.clearHistory();
const { success, content } = await window.electronAPI.ai.processMessageStream('流式测试');
```

Events:
```ts
const offChunk = window.electronAPI.ai.onStreamChunk(chunk => { /* ... */ });
const offEnd = window.electronAPI.ai.onStreamEnd(result => { /* ... */ });
```
