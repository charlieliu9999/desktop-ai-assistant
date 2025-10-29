## ADDED Requirements

### Requirement: AI Chat (Non-stream)
`POST /v2/ai/chat` SHALL accept messages, optional provider, scene, and options.

#### Scenario: Basic chat
- WHEN user sends messages with provider/model
- THEN return assistant message, usage, model, finish_reason in `data`.

### Requirement: AI Chat (Stream)
`POST /v2/ai/chat/stream` SHALL stream SSE with unified frames.

#### Scenario: Streaming chunks
- WHEN streaming
- THEN emit multiple `{type:"chunk"}` frames and a final `{type:"end"}`.

### Requirement: AI Analyze
`POST /v2/ai/analyze` SHALL support content analysis with `analysis_type` and `extract_fields?`.

#### Scenario: Analyze text
- WHEN content and analysis_type provided
- THEN return `extracted_data`, `confidence`, and `provider`.

### Requirement: Provider & Models
`GET /v2/ai/providers|models` SHALL return provider-grouped models and health status via registry.

#### Scenario: List providers
- WHEN listing providers
- THEN `data.providers[]` contains id/kind/base_url/capabilities/enabled/models? fields.

### Requirement: Scenes
Scene resolution SHALL allow injecting system prompt/model/param overrides.

#### Scenario: Scene injection
- WHEN `scene=ai_chat`
- THEN prepend system prompt and override `options` as specified.

