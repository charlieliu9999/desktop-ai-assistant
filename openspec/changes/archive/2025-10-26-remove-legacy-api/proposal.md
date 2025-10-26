## Why
Legacy REST routers under `/api/*` are largely unused by the current UI and duplicate functionality that already exists under `/v1/*`. Keeping both paths increases maintenance, confuses integration points, and risks divergence. Two legacy endpoints remain in use by the UI (`/api/model-config/*`, `/api/patient-extraction/*`) and need a compatible v1 path for smooth migration.

## What Changes
- Add v1 patient extraction endpoints (`/v1/patient/extraction/*`) that delegate to the existing vision/AI services
- Confirm/configure v1 model config endpoints as the canonical API and migrate UI usage
- Introduce a feature flag `ENABLE_LEGACY_API` to gate legacy router mounts during transition
- Deprecate and plan removal of unused legacy routers: `/api/patients/*`, `/api/recommendations/*`, `/api/ai/*`, `/api/local-ai/*`, `/api/bisheng/*`
- Update documentation and tests to target v1 endpoints

## Impact
- Affected specs: `api-legacy`, `api-patient-extraction`, `config-models`
- Affected code:
  - Backend: `backend-service/app/main.py` (router gating), `backend-service/app/api/v1/*` (new patient extraction router), `backend-service/app/api/model_config.py` (transition notes only)
  - Frontend: `src/services/api-client.ts` (switch to v1 paths), adapters that call extraction/config endpoints
  - Tests: Port API tests to v1; keep a short transition period for legacy tests if any

