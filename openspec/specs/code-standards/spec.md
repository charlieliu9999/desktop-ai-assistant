# Code Standards (Project‑wide)

Version: 1.0.0
Status: Active
Last‑Updated: 2025‑10‑29

## Purpose
Provide project‑wide conventions for structure, naming, modules, and style that every change SHALL follow. These codify existing repository guidelines and remove ambiguity during implementation and review.

## Directory Structure
- Electron main: `src/main/` (entry `main.ts`; `window-manager.ts`; preload under `src/main/preload.ts`)
- Renderer (React + TS): `src/renderer/` (pages, components, stores, styles)
- Service layer: `src/services/` (new integrations in `src/services/adapters/*`; avoid `legacy/*`)
- Backend: `backend-service/app/` (APIs, services, models, schemas); tests in `backend-service/tests/`
- Assets/Docs/Tests: `assets/`, `docs/`, `tests/`

## Naming Rules
- TypeScript
  - Files: `camelCase.ts` / `camelCase.tsx`
  - React components, types, enums: `PascalCase` (e.g., `PatientInfoCapture`)
  - CSS/Stylesheets: `kebab-case.css`
  - Constants: `UPPER_SNAKE_CASE`
- Python
  - Modules/files: `snake_case.py`
  - Classes: `PascalCase`；functions/variables: `snake_case`
  - Pydantic v2: use `model_dump()` instead of `.dict()`

## Module Boundaries
- Adapters‑first: new external integrations MUST live in `src/services/adapters/` with feature flags in `src/services/adapters/feature-flags.ts`
- Do not introduce or extend code under `src/services/legacy/*`
- UI never imports Electron `app`/`ipcMain` directly; use preload bridge + IPC channels only
- Backend: APIs expose versioned routers (`/v1`, `/v2` per OpenSpec); service logic resides in `app/services/*`

## API Conventions (Summary)
- v1: maintain existing shapes; minimal standardization allowed where tests expect it
- v2: SHALL use unified envelope `{ success, data?, error?, meta }` and shared errors; Health, SSE, Pagination per `api-v2-standardization`
- No fallback / no hardcoded returns in business flows; failures MUST surface as structured errors

## Style & Tooling
- TypeScript
  - Formatting: Prettier (2 spaces, single quotes, semicolons, printWidth 100, trailing commas `es5`)
  - Linting: ESLint with `@typescript-eslint`, React rules, import sorting
  - Scripts: `npm run lint`, `npm run lint:fix`, `npm run type-check`
- Python
  - Follow PEP 8; prefer type hints; pydantic v2 patterns (`model_dump`, `model_validate`)
  - Keep functions small; avoid broad `except:`; log with context
- Tests
  - Frontend: Vitest; name `**/*.test.tsx?` or `**/*.spec.tsx?`; colocate when practical
  - Backend: Pytest; files `test_*.py`; coverage threshold ≥ 80%

## Error Handling & Logging
- Never swallow errors; map to structured payloads (v2) or consistent v1 forms
- Log with minimal PII; mask sensitive values (tokens, keys, secrets)
- Prefer returning `success:false` + error code over synthetic/hardcoded data

## Commits & PRs
- Conventional Commits: `feat|fix|docs|refactor|test|chore(scope): message` (≤ 72 chars)
- PRs MUST include: summary, linked issues, testing steps, and screenshots/logs for UI changes
- Keep changes focused; update docs/tests alongside code; ensure lint/type-check/tests pass

## Scenarios
- Scenario: Adding a new provider
  - Place adapter in `src/services/adapters/<provider>/`; expose via registry; no code in `legacy/*`
- Scenario: New API route (v2)
  - Implement under `backend-service/app/api/v2/<domain>.py`; return unified envelope; no hardcoded placeholders
- Scenario: New React component
  - Filename `camelCase.tsx`; component `PascalCase`; co-locate test `*.test.tsx`

## Requirements

### Requirement: Directory Structure
The repository SHALL follow the defined top-level directories and place new modules accordingly.

#### Scenario: New service module
- WHEN adding a new external integration
- THEN it is placed under `src/services/adapters/<provider>/` and not under `legacy/*`.

### Requirement: Naming Conventions
TypeScript and Python naming conventions MUST be followed for files, components, classes, and constants.

#### Scenario: New React component file
- WHEN creating a React component
- THEN the filename is `camelCase.tsx` and the component is `PascalCase` with a colocated `*.test.tsx`.

### Requirement: Module Boundaries
UI code SHALL NOT import Electron main modules directly; Electron access MUST go through preload IPC. Backend service logic SHALL reside under `app/services/*`.

#### Scenario: Electron usage
- WHEN renderer needs a native capability
- THEN it calls the preload bridge/IPC rather than importing `electron` main APIs directly.

### Requirement: API Conventions
v2 endpoints MUST return the unified envelope `{ success, data?, error?, meta }` and SHALL NOT return hardcoded/fallback results.

#### Scenario: New v2 endpoint
- WHEN adding `/v2/<domain>/...`
- THEN responses use the unified envelope and errors use standard codes.

### Requirement: Commits & PRs
Conventional Commits and PR content requirements SHALL be followed.

#### Scenario: New PR
- WHEN opening a PR
- THEN the title follows Conventional Commits and the description includes summary and testing steps.
