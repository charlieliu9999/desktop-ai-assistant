## Why
- Clinicians need a fast, reliable way to extract patient demographics and clinical context from EMR/EHR screens and images without manual re‑typing.
- Current flows exist but are not formally specified; strict JSON guarantees, review UI, and consistent routing are needed to improve reliability and safety for PHI.

## What Changes
- Add a spec‑driven intake workflow that:
  - Captures screenshot or accepts image/PDF, performs OCR/vision, and returns strict `patient_info_v1` JSON
  - Provides an edit/review UI before downstream use
  - Generates combined Markdown recommendations (exam, medication, diagnosis) in one streamed response
  - Respects adapter feature flags and routing (frontend vs backend) with clear defaults
- Expose/confirm backend endpoints under `/v1/vision/*` and `/patient_extraction/*` for structured extraction

## Impact
- UX: Reduces time to create structured notes; fewer copy/paste errors
- Reliability: Strict JSON schema and clear error messages for non‑strict outputs
- Safety: Keeps PHI local when configured; explicit routing when cloud is used
- Code: Adds deltas for medical intake capability spec; no breaking API removal

## Rollout
- Guarded by feature flags and config routing
- Ship behind a beta flag; progressively enable for selected users

## Metrics / Success
- Extraction success rate (strict JSON) and average time to first result
- Edit rate (how often users change extracted fields)
- Drop‑off points (capture → preview → edit → results)

## Risks
- OCR variance across templates/EMR UIs
- Model JSON drift; mitigated via strict mode and schema validation
- PHI handling across cloud providers; mitigated with local/offline routing and warnings

## Open Questions
- Do we need additional fields for insurance, contact, allergies, meds? If yes, extend `patient_info_v1` schema.
- Should redaction be included in v1 or v1.1?

