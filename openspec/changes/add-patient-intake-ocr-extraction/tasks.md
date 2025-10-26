## 1. Implementation
- [ ] 1.1 Frontend: wire `PatientInfoCapture` strict JSON path with clear errors for non‑strict
- [ ] 1.2 Frontend: confirm edit/review UI saves to session and supports re‑capture
- [ ] 1.3 Frontend: combined recommendations stream (Markdown with section headings)
- [ ] 1.4 Config: ensure routing (frontend/backend/inherit) is respected across `aiImage` and `aiRecommend`
- [ ] 1.5 Feature flags: verify `FEATURE_FLAGS` and toggle behavior for adapters

## 2. Backend
- [ ] 2.1 Validate `/patient_extraction/extract` returns `patient_info_v1` fields when strict requested
- [ ] 2.2 Add schema validation and error reason `strict_json_parse_failed` on malformed outputs
- [ ] 2.3 Ensure `/v1/vision/understand` supports `schemaName=patient_info_v1` and returns `details.structured`
- [ ] 2.4 Unit tests for parsing, error mapping, and schema conformance

## 3. Documentation
- [ ] 3.1 Update `README.md` usage for medical intake workflow
- [ ] 3.2 Add config examples for local vs cloud routing
- [ ] 3.3 Note PHI handling guidance and privacy defaults

## 4. QA / Release
- [ ] 4.1 Manual test on macOS and Windows screenshot flows
- [ ] 4.2 Validate strict/lenient fallbacks and error copy
- [ ] 4.3 Backend tests pass with coverage ≥80%
