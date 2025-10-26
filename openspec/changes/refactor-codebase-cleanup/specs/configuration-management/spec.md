# Configuration Management - Spec Delta

## ADDED Requirements

### Requirement: Unified Configuration API

The system SHALL provide a centralized configuration API.

#### Scenario: Backend serves as configuration source

- **WHEN** frontend needs configuration
- **THEN** it SHALL request configuration from `/v1/config` endpoint
- **AND** backend SHALL return the complete configuration object
- **AND** configuration SHALL be validated using Pydantic schemas

#### Scenario: Configuration updates propagate

- **WHEN** configuration is updated via `/v1/config/{key}` endpoint
- **THEN** backend SHALL persist the change
- **AND** all connected clients SHALL be notified of the change
- **AND** frontend SHALL update its cached configuration

### Requirement: Frontend Configuration Caching

The system SHALL cache configuration locally for offline support.

#### Scenario: Configuration cached on load

- **WHEN** frontend successfully loads configuration from backend
- **THEN** it SHALL cache the configuration in localStorage
- **AND** cache SHALL include timestamp and version information

#### Scenario: Offline mode uses cached configuration

- **WHEN** backend is unavailable
- **THEN** frontend SHALL use cached configuration from localStorage
- **AND** user SHALL be notified that offline mode is active
- **AND** configuration updates SHALL be queued for sync when online

### Requirement: Configuration Validation

The system SHALL validate all configuration changes.

#### Scenario: Frontend validates with Zod

- **WHEN** configuration is loaded or updated
- **THEN** frontend SHALL validate using Zod schemas
- **AND** invalid configuration SHALL be rejected with clear error messages

#### Scenario: Backend validates with Pydantic

- **WHEN** configuration update request is received
- **THEN** backend SHALL validate using Pydantic models
- **AND** invalid requests SHALL return 422 Unprocessable Entity
- **AND** error response SHALL include detailed validation errors

### Requirement: Configuration File Consolidation

The system SHALL minimize the number of configuration files.

#### Scenario: Three configuration files maximum

- **WHEN** counting configuration files
- **THEN** only the following SHALL exist:
  - `backend-service/.env` (environment variables)
  - `backend-service/.env.example` (template)
  - Backend configuration API (dynamic configuration)
- **AND** no other configuration files SHALL be present

## MODIFIED Requirements

### Requirement: Environment Variable Management

The system SHALL use a standardized approach to environment variables.

**Previous**: Environment variables were scattered across multiple files with inconsistent naming.

**Updated**: Environment variables SHALL follow a consistent naming convention and be documented.

#### Scenario: Environment variables follow naming convention

- **WHEN** defining environment variables
- **THEN** they SHALL use SCREAMING_SNAKE_CASE
- **AND** they SHALL be prefixed by category (AI_, BISHENG_, DATABASE_, etc.)
- **AND** they SHALL be documented in `.env.example` with comments

#### Scenario: Environment variables are validated

- **WHEN** application starts
- **THEN** required environment variables SHALL be validated
- **AND** missing required variables SHALL cause startup failure with clear error
- **AND** optional variables SHALL use documented defaults

## REMOVED Requirements

### Requirement: Multiple Configuration Sources

**Reason**: Having configuration in `config/models.json`, `config/scenarios.json`, and code caused synchronization issues.

**Migration**: All model and scenario configuration moved to backend configuration system. Frontend loads configuration via API.

### Requirement: Frontend Independent Configuration

**Reason**: Frontend managing its own configuration separately from backend caused inconsistencies.

**Migration**: Frontend now loads configuration from backend API. Local storage used only for caching and offline support.

