## ADDED Requirements

### Requirement: Runtime Config
`GET /v2/config`, `GET/PUT /v2/config/{key}`, `POST /v2/config/validate` SHALL manage runtime config with optional lock.

#### Scenario: Update single key
- WHEN updating `ai.routingMode`
- THEN validate and persist; return unified response.

### Requirement: Security
Sensitive fields SHALL be masked in responses and logs.

#### Scenario: Mask sensitive values
- WHEN calling `GET /v2/config`
- THEN any sensitive fields (e.g., apiKey, token, secret) appear masked in `data` and are not logged in plaintext.
