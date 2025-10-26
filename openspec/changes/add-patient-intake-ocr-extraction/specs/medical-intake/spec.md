## ADDED Requirements

### Requirement: Intake Image OCR and Screen Recognition
System MUST accept screenshots or images (PNG/JPG; PDF optional) and produce extracted text suitable for structured parsing.

#### Scenario: User captures a screenshot
- WHEN the user clicks capture in `src/renderer/components/medical/PatientInfoCapture.tsx`
- THEN the app stores a data URL of the image to session/localStorage
- AND proceeds to preview with options to re‑capture or continue

#### Scenario: OCR via backend vision
- GIVEN routing is backend or inherit→backend
- WHEN calling `/v1/vision/understand` with `scene=screen_recognition*`
- THEN response MUST include `details.structured` or an error code

### Requirement: Strict JSON Structured Extraction (patient_info_v1)
System MUST return strict JSON fields usable by the UI without post‑hoc parsing.

Required fields:
- name (string), age (number), gender (string)
- patient_id (string), department (string)
- chief_complaint (string), diagnosis (string), medical_history (string)
- confidence (number 0..1)

#### Scenario: Strict JSON success
- WHEN `schemaName=patient_info_v1` and OCR/vision succeeds
- THEN response contains `details.structured` with all fields present (missing → empty string or null)
- AND UI converts/canonicalizes keys to match the `PatientInfo` interface in `PatientInfoCapture.tsx`

#### Scenario: Strict JSON failure
- WHEN the model returns non‑strict or unparsable output
- THEN backend returns error with code `strict_json_parse_failed`
- AND UI shows actionable guidance to re‑capture with appropriate focus (e.g., include right‑side details panel)

### Requirement: Review and Edit UI
User MUST be able to review and edit the extracted fields before generating recommendations.

#### Scenario: Review step
- WHEN extraction completes successfully
- THEN the app shows a compact text summary (`PatientInfoText`) with a confirm action
- AND edits persist to session (`medical:lastSession`)

### Requirement: Combined Recommendations Stream (Markdown)
System MUST produce a single streamed Markdown output with clear section headings.

#### Scenario: Frontend‑routed recommendations
- GIVEN `aiRecommend.routingMode=frontend`
- WHEN generating recommendations
- THEN the app streams Markdown into a single buffer with sections for exam, medication, and diagnosis

#### Scenario: Backend‑routed recommendations
- GIVEN `aiRecommend.routingMode=backend` or inherit→backend
- WHEN generating recommendations via `/v1/ai/chat/stream` (or equivalent main process bridge)
- THEN the UI displays the stream progressively and persists final content to session/history

### Requirement: Config Routing and Feature Flags
System MUST respect per‑feature routing and global routing defaults; adapters MUST be flag‑guarded.

#### Scenario: Inherit routing
- GIVEN `aiImage.routingMode=inherit`
- WHEN global `ai.routingMode=backend`
- THEN image understanding uses backend; otherwise uses frontend

#### Scenario: Disabled feature flag
- GIVEN `FEATURE_FLAGS.USE_BACKEND_VISION=false`
- WHEN a backend path would be chosen
- THEN the system falls back to the supported path or shows a clear error

