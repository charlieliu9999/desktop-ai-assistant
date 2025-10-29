## MODIFIED Requirements

### Requirement: Project‑wide Code Standards Adoption
All new changes SHALL follow `openspec/specs/code-standards/spec.md`. CI and PR process MUST enforce minimal checks.

#### Scenario: Frontend checks
- WHEN a PR is opened
- THEN CI runs `npm run lint` and `npm run type-check` and MUST pass.

#### Scenario: Backend checks
- WHEN a PR is opened
- THEN CI runs `pytest -q` with coverage ≥ 80% and MUST pass.

#### Scenario: PR template guidance
- WHEN creating a PR
- THEN template reminds contributors to run the above commands locally.

