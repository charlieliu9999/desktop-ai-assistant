# Project Context

## Purpose
Desktop AI Assistant for clinicians and knowledge workers. It provides a lightweight, privacy‑aware Electron desktop app with React UI and a FastAPI backend for AI chat, vision OCR/understanding, voice, and workflow automations. In the medical domain, it streamlines patient intake from screenshots/images, generates structured summaries and recommendations, and keeps PHI local or scoped per configuration.

## Tech Stack
- Frontend: TypeScript, React 18, Vite, TailwindCSS, Zustand
- Desktop: Electron (main, preload, renderer via `vite-plugin-electron`)
- Backend: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy (optional), Redis (optional)
- AI/ML: OpenAI‑compatible SDKs, local models via Ollama, Tesseract OCR
- Tooling: ESLint + Prettier, Vitest, Playwright (optional), electron‑builder

## Project Conventions

### Code Style
- TypeScript/React
  - Prettier: 2 spaces, single quotes, semicolons, printWidth 100, trailing commas `es5` (see `.prettierrc`)
  - ESLint: `@typescript-eslint`, React hooks rules, import sorting; CI requires `npm run lint` to pass
  - Naming: React components/types use PascalCase; files use `camelCase.ts(x)`; CSS uses `kebab-case.css`
- Python
  - Pydantic v2 models and settings
  - Keep modules small and focused; prefer FastAPI routers under `app/api/v1/*`
- Adapters‑first
  - New integrations under `src/services/adapters/*` behind feature flags; avoid extending `legacy` code
  - Feature flags in `src/services/adapters/feature-flags.ts`

### Architecture Patterns
- Electron app split: `src/main/` (Electron main process), `src/renderer/` (React UI), `src/preload/`
- Service layer: `src/services/` with adapters for AI, voice, vision, agent; frontend talks to backend via `api-client.ts`
- Backend structure: `backend-service/app/`
  - `api/v1/*` FastAPI routers (e.g., `vision.py`, `config_flags.py`, `registry.py`, `patient_extraction.py`)
  - `services/*` business logic (AI chat, vision/ocr, local AI via Ollama)
  - `schemas/*` Pydantic request/response models; `config.py` central settings with per‑scenario model configs
  - Database optional via SQLAlchemy; default flows do not require DB
- Config routing
  - Frontend can route AI work to frontend/backed per feature (e.g., `aiImage`, `aiRecommend`), with global `ai.routingMode`
  - Electron IPC helpers available for streaming where applicable

### Testing Strategy
- Frontend: Vitest unit tests (`npm test`), coverage via `npm run test:coverage`. Co‑locate tests as `*.test.ts(x)` or `*.spec.ts(x)`
- Backend: Pytest with coverage enforced `--cov-fail-under=80` (see `backend-service/pytest.ini`, `coverage.xml` and `htmlcov/`)
- E2E (optional): Playwright via `playwright.config.ts` (`npx playwright test`)
- Lint/type‑check as gates: `npm run lint`, `npm run type-check`

### Git Workflow
- Conventional Commits: `feat|fix|docs|refactor|test|chore(scope): message` (≤72 chars)
- Small, focused PRs; update docs/tests alongside code; ensure `lint`, `type-check`, and tests pass
- Reference issues in commit/PR body (`Closes #123`), include testing steps, and screenshots/logs for UI changes

## Domain Context
- Medical patient flows: intake from EMR/EHR screens (CN/EN), extract structured fields (name, age, gender, MRN/ID, department, chief complaint, diagnosis, history), then generate recommendations (exam, medication, diagnosis) as Markdown
- Privacy/PHI: aim to keep PHI local; when calling cloud APIs, use explicit routing and user consent; provide redaction/review steps where applicable
- Multilingual UI content (Chinese/English), clinical terms expected; outputs should be professional and succinct

## Important Constraints
- No secrets in repo; copy and edit `backend-service/.env.example` to `.env`
- Backend coverage ≥80% for CI (pytest + coverage)
- PHI handling: provide clear user control over where data flows (local vs cloud). Prefer strict JSON schemas for structured extraction
- Desktop packaging via electron‑builder must include only built artifacts (`dist/**`, `assets/**`)
- Keep changes under adapters; avoid adding to `src/services/legacy/*`

## External Dependencies
- LLMs: `openai` SDKs (OpenAI compatible), DeepSeek; local models via Ollama (`qwen2.5`, `qwen2.5vl`, `llama3.2-vision`)
- Vision/OCR: `tesseract.js` (renderer), FastAPI vision endpoints (`/v1/vision/ocr`, `/v1/vision/understand`)
- Voice: Azure/Google Speech SDKs (optional), `pydub`
- UI: TailwindCSS, Lucide React icons, React Router
- Desktop: `electron-updater`, `electron-store`, `screenshot-desktop`
- Backend infra (optional): PostgreSQL via SQLAlchemy, Redis; Celery for async tasks (optional), Prometheus client for metrics
