# Agent (Bisheng) Stable Mapping (v1.1)

This document standardizes the Bisheng agent integration used by backend `/v1/agent/*`.

- Login (backend internal): try `/api/v1/user/login` first, fallback to `/api/v1/login`
- List workflows: `/api/v1/workflow/list`
- Invoke workflow (SSE): `/api/v2/workflow/invoke`
- Stop workflow: `/api/v2/workflow/stop`

Why this mapping
- Matches the latest, working patterns found in `bisheng-integration/services/bisheng.ts`
- Observed responses vary; backend normalizes tokens and list payloads
- Provides a single, stable façade to frontend via `/v1/agent/*`

Frontend usage
- Get health: `GET /v1/agent/health`
- List workflows: `GET /v1/agent/workflows`
- Invoke: `POST /v1/agent/invoke` (SSE), header `Authorization: Bearer <token>`
- Stop: `POST /v1/agent/stop` (JSON)

Notes
- Sensitive credentials and tokens are managed server-side; frontend passes only bearer token when needed.
- All responses are normalized to the unified APIResponse shape in v1.1 where applicable.
