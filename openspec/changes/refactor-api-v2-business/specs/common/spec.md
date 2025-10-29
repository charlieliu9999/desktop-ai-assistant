## ADDED Requirements

### Requirement: Unified Response Envelope
All v2 endpoints SHALL return `{ success, data?, error?, meta }`.

#### Scenario: Success
- WHEN a v2 endpoint processes a valid request
- THEN it returns `success=true`, `data={...}`, and `meta.timestamp` with version.

#### Scenario: Failure
- WHEN validation fails or upstream errors occur
- THEN it returns `success=false`, `error={code,message,details?}`, and `meta.timestamp`.

### Requirement: Unified Health Structure
Health endpoints SHALL return `data.services = { name: { healthy, available, ... } }`.

#### Scenario: Voice health
- WHEN calling `GET /v2/voice/health`
- THEN `success=true`, `data.services.stt` and `data.services.tts` present with booleans.

### Requirement: Pagination
List endpoints SHALL return `data={ items, page, page_size, total }`.

#### Scenario: Provider list
- WHEN calling `GET /v2/registry/providers?page=1&page_size=20`
- THEN `data.items` is an array, `page=1`, `page_size=20`, `total>=0`.

### Requirement: Streaming (SSE)
SSE frames SHALL be JSON objects with `type=chunk|end|error`.

#### Scenario: AI chat stream
- WHEN streaming from `POST /v2/ai/chat/stream`
- THEN frames with `{type:"chunk"}` followed by `{type:"end"}`; on errors `{type:"error"}`.

### Requirement: Strict JSON Policy
Strict JSON mode SHALL not fallback or hardcode outputs.

#### Scenario: No result
- GIVEN `strict_json=true` and extraction fails
- WHEN calling Vision extraction
- THEN return `success=false` with `error.code="no_result"`.

