## ADDED Requirements
### Requirement: Legacy API Feature Flag
The system SHALL provide a runtime feature flag to gate mounting legacy `/api/*` routers.

- Flag name: `ENABLE_LEGACY_API`
- Default: `true` in development; may be `false` in production builds
- Scope: Controls whether legacy FastAPI routers are included in `app/main.py`

#### Scenario: Legacy routers enabled
- WHEN `ENABLE_LEGACY_API` is `true`
- THEN the server mounts legacy routers under `/api/*`
- AND legacy endpoints remain reachable for compatibility

#### Scenario: Legacy routers disabled
- WHEN `ENABLE_LEGACY_API` is `false`
- THEN the server SHALL NOT mount legacy routers
- AND requests to legacy paths return 404

## REMOVED Requirements
### Requirement: Legacy REST Endpoints
**Reason**: Unused and duplicate the v1 API; maintaining both causes divergence and confusion.
**Migration**: Migrate remaining active calls off `/api/model-config/*` and `/api/patient-extraction/*` to v1 equivalents.

Legacy routers slated for removal after migration:
- `/api/patients/*`
- `/api/recommendations/*`
- `/api/ai/*`
- `/api/local-ai/*`
- `/api/bisheng/*`

#### Scenario: Removal after migration
- WHEN all UI calls use v1 endpoints
- THEN the legacy routers MUST be removed from `app/main.py`
- AND associated unused services/models MAY be deleted or archived

