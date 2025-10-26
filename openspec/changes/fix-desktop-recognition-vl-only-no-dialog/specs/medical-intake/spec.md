## MODIFIED Requirements

### Requirement: Intake Image OCR and Screen Recognition
System MUST accept screenshots or images (PNG/JPG; PDF optional) and produce extracted text suitable for structured parsing.

#### Scenario: VL-only screen recognition via backend scene
- GIVEN routing is backend or inherit→backend
- WHEN calling `/v1/vision/understand?scene=screen_recognition(_aliyun)` with `strict_json=true`, `schemaName=patient_info_v1`, `allow_fallback=false`
- THEN the system uses a Vision Language model (no OCR/text fallback) and returns either structured data or `strict_json_parse_failed` error

#### Scenario: Auto flow without confirmation dialog
- GIVEN `desktopRecognition.autoAnalyze=true`
- WHEN the user finishes a screenshot
- THEN the app immediately triggers recognition and navigates to results view showing patient info and streaming recommendations without showing a preview/confirmation dialog


### Requirement: Strict JSON Structured Extraction (patient_info_v1)
System MUST return strict JSON fields usable by the UI without post‑hoc parsing.

Required fields:
- patient_name (string), gender (string), age (number)
- medical_record_number (string), department (string)
- chief_complaint (string), diagnosis (string), medical_history (string)
- confidence (number 0..1)

#### Scenario: VL-only strict JSON success
- WHEN `schemaName=patient_info_v1` and the vision model succeeds
- THEN response contains `details.structured` with all fields present (missing → empty string or 0)
- AND the UI maps fields to its `PatientInfo` interface without inventing values

#### Scenario: Strict JSON failure without fallback
- WHEN the model returns non‑JSON or unparsable output
- THEN backend returns error `strict_json_parse_failed`
- AND UI displays a retry hint focusing on capturing the right details panel
- AND the system MUST NOT fallback to OCR+LLM or textual heuristics


### Requirement: Review and Edit UI
User MUST be able to review and edit the extracted fields before generating recommendations.

#### Scenario: Auto mode skips preview
- GIVEN auto mode is ON
- WHEN extraction completes successfully
- THEN the app shows a compact patient summary and streams recommendations immediately, while allowing later edits


### Requirement: Combined Recommendations Stream (Markdown)
System MUST produce a single streamed Markdown output with clear section headings.

#### Scenario: Immediate streaming without tab switching
- GIVEN a successful extraction
- WHEN recommendations generation starts
- THEN the stream renders incrementally in the same view (no need to switch tabs), and the session persists the final combined result


### Requirement: Config Routing and Feature Flags
System MUST respect per‑feature routing and global routing defaults; adapters MUST be flag‑guarded.

#### Scenario: Scene/prompt consistency
- GIVEN the `screen_recognition(_aliyun)` scene is used
- WHEN the backend resolves the prompt
- THEN the active prompt version for the scene is applied (e.g., `20251023T10081`) including rules to only read the right details panel and strict name/age sourcing


## ADDED Requirements

### Requirement: No Hardcoding and No OCR+LLM Fallback
The system MUST avoid hardcoded field fallbacks and textual heuristics for structured extraction in strict mode.

#### Scenario: No hardcoded patient_id or gender defaults
- WHEN `strict_json=true`
- THEN the UI must not invent defaults (e.g., temporary patient_id, guessed gender/age)
- AND missing fields remain empty (or 0 for age) while prompting the user to recapture

