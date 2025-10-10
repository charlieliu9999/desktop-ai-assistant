# IPC: app

Examples:
```ts
await window.electronAPI.app.getStatus();
await window.electronAPI.app.getVersion();
await window.electronAPI.app.quit();
await window.electronAPI.app.minimizeToTray();
await window.electronAPI.app.toggleDevTools();
await window.electronAPI.app.showNotification({ title: '提醒', body: '你好' });
```

Events: provided via generic `on(channel, cb)` and specific streams in other namespaces.
