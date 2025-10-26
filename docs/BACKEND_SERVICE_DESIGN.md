# Backend Service Design

This document standardizes the backend-service architecture for Desktop AI Assistant. It aligns with FastAPI best practices and preserves backward compatibility for gradual migration from legacy routes to /v1.

## Architecture
```mermaid
flowchart TD
  FE[Electron/Renderer] --> |HTTP/SSE| API[/FastAPI /v1/* Routes/]
  API --> SVC[Service Layer]
  SVC -->|AI| AI[AIServiceManager]
  SVC -->|Vision| Vision[OCRService / VisionService]
  SVC -->|Voice| Voice[STTService / TTSService]
  SVC -->|Agent| Agent[AgentManager -> BishengService]
  AI --> Providers{{Providers}}
  Providers --> OAI[OpenAI]
  Providers --> DSK[Deepseek]
  Providers --> LLM[Ollama(OpenAI-compatible)]
  API --> Cfg[Config Models / Flags]
  Cfg --> Settings[(Pydantic Settings + .env)]
  SVC --> DB[(SQLAlchemy Models)]
```

Key principles
- Clear layering: API -> Services -> Providers/Infra.
- v1 routes are canonical; legacy routes remain read-only for compatibility during transition.
- Central AI manager with provider registry + fallback; no per-endpoint vendor code.

## API Specification
- Base path: `/v1` (e.g., `/v1/ai/chat`, `/v1/ai/chat/stream`, `/v1/vision/ocr`, `/v1/voice/tts`, `/v1/agent/*`, `/v1/config/*`).
- Versioning: path-based; bump to `/v2` for breaking changes. Keep `/api/*` as deprecated.
- Request/Response wrapper:
  - Request: typed Pydantic models (e.g., `ChatRequest`, `AnalyzeRequest`).
  - Response: unified `APIResponse { success, data, error?, meta? }`.
- Errors: use `HTTPException` with precise `status_code` (400, 401, 403, 404, 409, 422, 429, 500). Surface a consistent `error.code` and `error.message` when possible.
- Streaming: SSE endpoints return `text/event-stream` with events `start|chunk|done|error` (see `v1/ai.py`).

Example
```py
from fastapi import APIRouter, HTTPException, status
from app.services.ai import ai_manager, APIResponse, ChatRequest

router = APIRouter(prefix="/ai")

@router.post("/chat", response_model=APIResponse)
async def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Messages cannot be empty")
    res = await ai_manager.chat(messages=req.messages, provider=req.provider, options=req.options)
    return APIResponse(success=True, data={"message": res.message, "usage": res.usage, "model": res.model, "finish_reason": res.finish_reason, "provider": res.provider})
```

## Configuration Management
- Base: `app.config.Settings` (Pydantic BaseSettings) with `.env` for secrets; no secrets in code or JSON.
- Runtime overlay: `config/models.json` via `app.config_models` (editable from `/v1/config/models`, `/v1/config/flags`). Applies to `settings` at runtime, no .env writes.
- Validation: use types/constraints in `Settings` and schema models; reject invalid updates with 422.
- Examples:
  - `.env`: `OPENAI_API_KEY=...`, `LOCAL_AI_ENDPOINT=http://127.0.0.1:11434`.
  - Programmatic: `apply_to_settings(cfg)` already implemented.

## Services Inventory
- AI: `app/services/ai/*` with `AIServiceManager`, providers `OpenAIProvider`, `DeepseekProvider` (OpenAI-compatible), optional local OpenAI-compatible for Ollama. Inputs: `ChatRequest`, `AnalyzeRequest`. Outputs: `ChatResponse`, `StreamChunk`, `AnalyzeResponse`.
- Vision: `OCRService`, `VisionService` (OCR, image understanding). Inputs: image/text; Outputs: JSON text or structured data.
- Voice: `STTService`, `TTSService`. Inputs: audio/text; Outputs: text/audio.
- Agent: `AgentManager` with `BishengService`. Inputs: workflow invoke/stop; Outputs: SSE events, health info.
- Config: `/v1/config/models`, `/v1/config/flags`, `/v1/tools/*` for model presets and diagnostics.

## Data Model & Schemas
- ORM: SQLAlchemy models in `app/models/*` (`Patient`, `Visit`, `Recommendation`, `Feedback`).
- Schemas: Pydantic models in `app/schemas/*` for request/response; enable `from_attributes = True` for ORM bridging.
- Rule: API uses schemas; services manipulate domain DTOs or ORM via repositories.

## Current State & Issues
Identified problems in backend-service:
- Duplicate AI paths/logic: legacy `app/api/ai_chat.py`, `app/services/ai_service*.py`, and new `app/services/ai/*`. Mixed response shapes (`reply` vs `APIResponse`).
- Inconsistent routing: both `/api/*` (legacy) and `/v1/*` coexist; unclear deprecation.
- Config duplication: env-driven fields in `Settings` plus `config/models.json` overlap; legacy `AI_SERVICE_MODE` and local vs cloud paths complicate selection.
- Cross-cutting concerns (HTTP client, error types, tracing) not centralized (`app/core` mostly empty).

## Refactor Plan (Phased, non-breaking)
Phase 0 – Baseline (done/in place)
- Keep `/api/*` mounted; adopt `/v1/*` for the app; central `AIServiceManager` with providers; runtime config endpoints.

Phase 1 – Unify AI (High)
- Migrate all callers to `/v1/ai/*`; mark `/api/ai` deprecated. Remove `app/services/ai_service.py` and `ai_service_manager.py` after migration. Tests: update to new models and `APIResponse`.

Phase 2 – Config Consolidation (High)
- Treat `.env` as base, `config/models.json` as editable overlay. Remove unused/overlapping env keys (e.g., `AI_SERVICE_MODE`) from code-paths. Add strict validation on config update APIs.

Phase 3 – Core Utilities (Medium)
- Introduce `app/core/{http.py,errors.py,deps.py}` for shared httpx client, domain errors, DI dependencies (e.g., request-id, rate-limits, auth hooks). Standardize logging fields.

Phase 4 – API Cleanup (Medium)
- Standardize `APIResponse` across all v1 routes (Vision/Voice/Agent/Config). Add correlation-id in `meta`, consistent error payloads. Document `/v1` as stable; start removing legacy `/api/*` routes.

Phase 5 – Data Access (Low)
- Add repositories/use-cases for ORM access; decouple schemas from models; expand tests around `patients`, `recommendations`, and feedback flows.

## Conventions & Examples
- Providers: add new providers by implementing `AIProviderBase` and registering in `lifespan` with `ProviderConfig`.
- Fallbacks: set via `ai_manager.set_fallback_providers(["deepseek","openai"])`.
- SSE pattern: yield events `{type, content?, usage?, error?}`; Electron subscribes and stitches text.

Compatibility & Strategy
- Continue mounting legacy routes for a release cycle; front-end switches to `/v1`. Feature-flag any risky toggles. No behavioral regressions.

