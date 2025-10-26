## ADDED Requirements
### Requirement: v1 Config Models API Canonicalization
The v1 config endpoints SHALL be the canonical API for runtime model settings.

#### Scenario: Read all configs
- WHEN client calls `GET /v1/config/models`
- THEN server returns full models config

#### Scenario: Update a scenario's config
- WHEN client sends `PUT /v1/config/models` with valid payload
- THEN server persists and applies to runtime settings

#### Scenario: Apply a preset
- WHEN client sets a preset via config flags
- THEN server reflects the preset across v1 endpoints

### Requirement: Legacy model-config deprecation
Legacy endpoints under `/api/model-config/*` SHALL be deprecated and removed after UI migration to v1.

#### Scenario: UI migrated to v1
- WHEN UI only consumes v1 config endpoints
- THEN legacy model-config endpoints MUST be removed from router includes

