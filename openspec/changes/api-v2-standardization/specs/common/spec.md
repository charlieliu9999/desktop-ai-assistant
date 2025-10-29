## ADDED Requirements

### Requirement: Unified Response Envelope
All v2 endpoints SHALL return `{ success, data?, error?, meta }` with `meta.timestamp` and `meta.version`.

#### Scenario: Success and failure
- WHEN a v2 endpoint succeeds
- THEN it returns `success=true` with `data` and `meta.timestamp`.
- WHEN a v2 endpoint fails validation
- THEN it returns `success=false` with `error={code,message}`.

### Requirement: Unified Error Codes
All v2 endpoints MUST use a shared error code set (e.g., `validation_error`, `no_result`, `provider_unavailable`, `upstream_error`).

#### Scenario: Strict JSON failure
- GIVEN `strict_json=true`
- WHEN extraction fails
- THEN return `success=false` and `error.code="no_result"`.

### Requirement: Health Structure
All v2 health endpoints SHALL return `data.services = { name: { healthy, available, ... } }`.

#### Scenario: Service health
- WHEN calling `GET /v2/voice/health`
- THEN `data.services.stt` and `data.services.tts` objects exist with boolean flags.

### Requirement: Pagination Structure
List endpoints MUST return `data={ items, page, page_size, total }`.

#### Scenario: Provider list pagination
- WHEN requesting `GET /v2/registry/providers?page=2&page_size=10`
- THEN response includes `data.page=2`, `data.page_size=10`, and numeric `total`.

### Requirement: Streaming Frames
SSE frames for v2 endpoints SHALL be JSON with `type=chunk|end|error`.

#### Scenario: AI stream frames
- WHEN streaming from `POST /v2/ai/chat/stream`
- THEN multiple `{type:"chunk"}` frames followed by `{type:"end"}` are emitted.

