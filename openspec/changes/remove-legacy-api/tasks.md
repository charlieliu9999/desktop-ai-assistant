## 1. Implementation
- [x] 1.1 Add feature flag `ENABLE_LEGACY_API` to settings; default `true` for dev
- [x] 1.2 Gate legacy router mounts in `backend-service/app/main.py`
- [x] 1.3 Add v1 router `backend-service/app/api/v1/patient_extraction.py` with:
  - [x] POST `/v1/patient/extraction/extract`
  - [x] POST `/v1/patient/extraction/recommendations`
  - [x] Delegate to existing services (VisionService/AI manager or compatible local service)
- [x] 1.4 Confirm v1 config models endpoints are canonical; align behavior with legacy `model-config` if gaps exist
- [x] 1.5 Frontend: switch `src/services/api-client.ts` calls from `/api/model-config/*` and `/api/patient-extraction/*` to v1 equivalents
- [x] 1.6 Tests: add/port backend tests under `backend-service/tests/api/v1/`
- [x] 1.7 Deprecation: emit warnings when legacy endpoints are called (during transition only)
- [x] 1.8 Remove legacy routers and services after migration window

## 2. Validation
- [x] 2.1 openspec validate remove-legacy-api --strict
- [ ] 2.2 Backend unit tests pass (pytest, coverage ≥80%)
- [ ] 2.3 Frontend unit tests pass (Vitest)

## 3. Docs
- [x] 3.1 Update README_API.md to prefer v1 endpoints
- [x] 3.2 Note feature flag and migration steps
