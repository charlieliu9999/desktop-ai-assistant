# IPC: config

Handlers:
- 'config-get', key?
- 'config-set', key, value
- 'config-update', updates
- 'config-reset'

Renderer usage:
```ts
const cfg = await window.electronAPI.config.get();
await window.electronAPI.config.update({ theme: 'light' });
```

Events:
```ts
const off = window.electronAPI.config.onChange(({ config }) => { /* ... */ });
off();
```
