# UI Components

This section lists key React components and their public props.

- src/components/FloatingWindow.tsx
  - Props: { status: AppStatus; isListening?: boolean; onVoiceToggle?(): void; onScreenCapture?(): void; onShowMain?(): void; onClose?(): void; suggestions?: Array<{ id: string; title: string; priority: 'high' | 'medium' | 'low' }>; }
  - Usage:
```tsx
<FloatingWindow status={status} isListening={false} onVoiceToggle={()=>{}} />
```

- src/components/StatusBar.tsx
  - Props: { status: AppStatus; size?: 'sm' | 'md' | 'lg'; showText?: boolean }

- src/renderer/components/medical/PatientInfoForm.tsx
  - Props: { patientInfo: PatientInfo; onChange(info: PatientInfo): void; onConfirm(): void; isEditable?: boolean }

- src/renderer/components/medical/RecommendationTypeSelector.tsx
  - Props: { selectedTypes: RecommendationType[]; onChange(types: RecommendationType[]): void; onGenerate(): void; isGenerating?: boolean }

- src/renderer/components/AgentIframe.tsx
  - Props: { workflow: BishengWorkflow; onClose?(): void }

- src/renderer/components/BishengStatusIndicator.tsx
  - Exports: `BishengStatusIndicator`, `BishengStatusDot`, `BishengStatusPanel`

- src/renderer/components/VoiceRecognitionTest.tsx
  - Props: { onTestComplete(result: any): void; onClose(): void }

See source files for additional components under `src/renderer/components` and `src/components`.
