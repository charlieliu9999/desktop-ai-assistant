# Public Functions and Services

This section documents exported functions, classes, and hooks from the TypeScript codebase.

- src/utils/index.ts: `delay`, `debounce`, `throttle`, `deepClone`, `deepMerge`, `isObject`, `generateId`, `formatFileSize`, `formatTimeDiff`, `formatRelativeTime`, `truncateText`, `highlightText`, `escapeRegExp`, `isValidEmail`, `isValidUrl`, `getFileExtension`, `getMimeType`, `uniqueArray`, `groupBy`, `sortBy`, `formatNumber`, `formatPercentage`, `colorUtils`, `storageUtils`, `clipboardUtils`, `deviceUtils`, `performanceUtils`, `errorUtils`
- src/utils/audio-utils.ts: `getSupportedAudioFormats`, `getSupportedPlaybackFormats`, `convertToWav`, `createCompatibleAudioPlayer`, `playAudioData`, `getBestRecordingFormat`, `isValidAudioData`
- src/utils/logger.ts: class `Logger`, singletons `logger`, helpers `trace`, `debug`, `info`, `warn`, `error`, `fatal`
- src/services/api-client.ts: singleton `apiClient` with methods: `getAllConfigs`, `getScenarioConfig`, `testModelConnection`, `updateScenarioConfig`, `getScenarios`, `extractPatientInfo`, `generateRecommendations`, `generateRecommendationsWithAI`, `generateCombinedRecommendationsStream`
- src/services/ai.ts: class `AIService` core methods: `initialize`, `processMessage`, `processMessageStream`, `processMessageWithTools`, `generateSummary`, `analyzeDesktopContent`, `clearHistory`, `getHistory`, `updateConfig`, `getState`, `searchWeb`, `cleanup`
- src/services/voice.ts: class `VoiceService` with `initialize`, `startRecognition`, `stopRecognition`, `speak`, `stopSpeaking`, `pauseSpeaking`, `resumeSpeaking`, `getAvailableVoices`, `startListening`, `stopListening`, `processText`, `updateConfig`, `getState`, `cleanup`
- src/services/desktop-recognition.ts: class `DesktopRecognitionService` with `initialize`, `captureScreen`, `captureAndAnalyze`, `getActiveWindow`, `getAvailableDisplays`, `getCaptureHistory`, `clearCaptureHistory`, `updateConfig`, `getState`, `cleanup`
- src/services/screenshot.ts: class `ScreenshotService` with `captureScreen`, `captureWindow`, `checkPermissions`, `getDisplays`
- src/services/config.ts: class `ConfigService` with `initialize`, `getConfig`, `get`, `set`, `updateConfig`, `resetConfig`, `resetConfigKey`, `watch`, `getConfigPath`, `exportConfig`, `importConfig`, `cleanup`
- src/renderer/hooks/useElectronAPI.ts: `useElectronAPI()` hook exposing typed React helpers
- src/renderer/services/persistence.ts: `savePatientRecord`, `listPatientRecords`, `listAllPatientRecords`, `saveChatMessage`, `listChatMessages`, `listAllChatSessions`
