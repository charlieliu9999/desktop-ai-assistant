# IPC: bisheng

Handlers:
- 'bisheng-login', username, password
- 'bisheng-get-workflows', pageSize?, pageNum?
- 'bisheng-invoke-workflow', (workflowId, input, stream?, sessionId?, messageId?, inputNodeId?) => returns { streamId }
- 'bisheng-stop-workflow', (workflowId, sessionId)
- 'bisheng-get-config'
- 'bisheng-update-config'
- 'bisheng-is-authenticated'
- 'bisheng-get-proxy-status'
- 'bisheng-test-workflow-list'
- 'bisheng-test-workflow-invoke'
- 'bisheng-run-connection-tests'

Renderer usage:
```ts
await window.electronAPI.bisheng.login('user','pass');
const { streamId } = await window.electronAPI.bisheng.invokeWorkflow('wf_123', { input: 'hello' }, true);
```

Events:
```ts
const offStart = window.electronAPI.bisheng.onStreamStart(e => {});
const offChunk = window.electronAPI.bisheng.onStreamChunk(e => {});
const offEnd = window.electronAPI.bisheng.onStreamEnd(e => {});
```
