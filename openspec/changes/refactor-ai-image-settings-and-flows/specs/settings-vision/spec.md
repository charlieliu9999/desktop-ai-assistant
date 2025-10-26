## ADDED Requirements

### Requirement: AI Image Settings Consistency
The settings view for Vision (AI 图片) MUST reflect backend scene/prompt and test with strict parameters.

#### Scenario: Load VL models from backend
- WHEN opening the settings page
- THEN the app loads available VL models from `/v1/vision/models` and displays them for selection

#### Scenario: Resolve scene prompt version for display
- GIVEN a selected scene (e.g., `screen_recognition_aliyun`)
- WHEN fetching prompt details
- THEN the app prioritizes the scene-bound `prompt_version` for display; if missing, fallback to the prompt's `active_version`

#### Scenario: Test button uses strict JSON without fallback
- WHEN the user uploads an image for testing
- THEN the call to `/v1/vision/understand` sets `strict_json=true`, `schemaName=patient_info_v1`, and `allow_fallback=false`
- AND on non‑JSON result, show a dedicated message indicating `strict_json_parse_failed` with guidance to capture the right details panel

#### Scenario: No hardcoded overrides
- WHEN saving settings or testing
- THEN the app MUST NOT hardcode provider/model/scene beyond what is configured; defaults are applied only via backend scene resolution

