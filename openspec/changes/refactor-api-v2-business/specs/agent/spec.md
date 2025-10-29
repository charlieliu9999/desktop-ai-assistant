## ADDED Requirements

### Requirement: Agent Auth & Workflows
`POST /v2/agent/login`, `GET /v2/agent/workflows` SHALL manage agent session and list workflows.

#### Scenario: List workflows
- WHEN authenticated
- THEN return paginated workflows in `data.items`.

### Requirement: Agent Invoke (SSE)
`POST /v2/agent/invoke` SHALL stream `{type}` frames; `POST /v2/agent/stop` stops session.

#### Scenario: Invoke stream
- WHEN invoking a workflow
- THEN stream events until `{type:"end"}` or stop.

### Requirement: Health & Config
`GET /v2/agent/health|config` SHALL use the unified response envelope and health structure.

#### Scenario: Agent health
- WHEN calling `GET /v2/agent/health`
- THEN response contains `success`, and `data.services` with at least one service entry.

#### Scenario: Agent config
- WHEN calling `GET /v2/agent/config`
- THEN response contains `success=true` and configuration fields in `data` (with sensitive values masked if present).
