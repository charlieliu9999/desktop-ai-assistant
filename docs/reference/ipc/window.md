# IPC: window

Handlers:
- 'window-minimize'
- 'window-close'
- 'window-toggle-always-on-top'
- 'window-show-main'
- 'window-hide-main'
- 'window-toggle-main'
- 'window-show-floating'
- 'window-hide-floating'
- 'window-show-voice'

Renderer usage:
```ts
await window.electronAPI.window.minimize();
await window.electronAPI.window.toggleAlwaysOnTop();
await window.electronAPI.window.showFloating();
await window.electronAPI.window.showMain();
```
