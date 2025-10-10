# IPC: medical

Handlers:
- 'medical-search-patients', query, options
- 'medical-get-patient', patientId

Renderer usage:
```ts
const results = await window.electronAPI.medical.searchPatients('张三');
const patient = await window.electronAPI.medical.getPatient('P001');
```

Events:
```ts
const off = window.electronAPI.medical.onSearchResult(results => { /* ... */ });
off();
```
