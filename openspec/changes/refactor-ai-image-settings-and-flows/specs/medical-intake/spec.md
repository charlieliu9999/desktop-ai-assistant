## MODIFIED Requirements

### Requirement: Intake Flow Execution
System MUST follow a clear step-by-step execution for medical intake.

#### Scenario: Auto mode skips preview
- GIVEN `desktopRecognition.autoAnalyze=true`
- WHEN the user completes a screenshot
- THEN recognition starts immediately and the app navigates to the results view without a preview dialog
- AND patient info is shown and recommendations start streaming at once

#### Scenario: Strict error handling without fallback
- WHEN `strict_json=true` and the model output is not strict JSON
- THEN the backend returns `strict_json_parse_failed`
- AND the UI shows a retry hint and does NOT fallback to OCR+LLM or textual parsing


## ADDED Requirements

### Requirement: One-Click Desktop Recognition Execution
The “一键开始” flow MUST execute recognition and recommendations correctly without intermediate dialogs.

#### Scenario: VL-only recognition with strict JSON
- WHEN starting one-click recognition
- THEN call `/v1/vision/understand?scene=screen_recognition(_aliyun)` with `strict_json=true`, `schemaName=patient_info_v1`, `allow_fallback=false`
- AND do not invent fields (no temporary IDs), missing values remain empty or 0

#### Scenario: Immediate streaming without tab switching
- WHEN recommendations generation starts
- THEN the assistant message updates incrementally in the same view without requiring tab switching, and final content is persisted

