## ADDED Requirements

### Requirement: Vision Understand
`POST /v2/vision/understand` SHALL accept `source` (url/base64) and `prompt`; supports `strict_json` and `json_schema`.

#### Scenario: Basic understand
- WHEN source is url and prompt provided
- THEN return summary/structured fields per prompt.

### Requirement: OCR
`POST /v2/vision/ocr` SHALL return detected text segments.

#### Scenario: OCR success
- WHEN an image contains text
- THEN return text and segments in `data`.

### Requirement: Extract Text (Structured)
`POST /v2/vision/extract-text` SHALL honor strict JSON; no hardcoded fallbacks.

#### Scenario: Strict JSON fail
- WHEN extraction fails under strict mode
- THEN return `success=false` with `error.code="no_result"`.

### Requirement: Models & Health
`GET /v2/vision/models|health` SHALL follow unified structures.

#### Scenario: Vision models list
- WHEN calling `GET /v2/vision/models`
- THEN response contains `success=true` and `data.default` with `data.models[]`.
