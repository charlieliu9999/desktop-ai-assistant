## ADDED Requirements

### Requirement: Providers CRUD & Health
`/v2/registry/providers` SHALL support list/create/update/delete and `/{pid}/health`.

#### Scenario: Create provider
- WHEN posting a new provider
- THEN it appears in list and health endpoint responds.

### Requirement: Models CRUD & Health
`/v2/registry/models` SHALL support list/create/update/delete and `/{mid}/health`.

#### Scenario: Model health
- WHEN probing a model
- THEN return `{ healthy, provider, model }` in data.

### Requirement: Pagination & Filtering
List endpoints SHALL support `page/page_size` and filtering by fields (e.g., kind, enabled, modality).

#### Scenario: Filter by modality with pagination
- WHEN calling `GET /v2/registry/models?modality=vl&page=1&page_size=50`
- THEN response includes `data.items` containing only VL models and correct pagination fields.
