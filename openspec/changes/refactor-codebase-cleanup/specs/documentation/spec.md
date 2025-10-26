# Documentation - Spec Delta

## ADDED Requirements

### Requirement: Documentation Index

The system SHALL provide a centralized documentation index.

#### Scenario: Main documentation index exists

- **WHEN** developer needs to find documentation
- **THEN** `docs/README.md` SHALL provide a categorized index
- **AND** index SHALL include links to all major documentation
- **AND** index SHALL be organized by category (Development, API, Deployment, Testing)

#### Scenario: Root directory documentation limited

- **WHEN** listing markdown files in root directory
- **THEN** fewer than 5 markdown files SHALL be present
- **AND** only essential files SHALL remain (README.md, QUICK_START.md, LICENSE, CONTRIBUTING.md)

### Requirement: Documentation Archival

The system SHALL archive historical and outdated documentation.

#### Scenario: Historical documents archived

- **WHEN** documentation becomes outdated
- **THEN** it SHALL be moved to `docs/archive/YYYY-MM/` directory
- **AND** archive SHALL be organized by date
- **AND** active documentation SHALL link to archived versions if relevant

#### Scenario: Archive structure maintained

- **WHEN** archiving documents
- **THEN** directory structure SHALL be `docs/archive/YYYY-MM/category/`
- **AND** archive SHALL include README explaining what was archived and why

### Requirement: Core Documentation Completeness

The system SHALL maintain complete core documentation.

#### Scenario: Essential documentation exists

- **WHEN** checking for core documentation
- **THEN** the following SHALL exist and be up-to-date:
  - `README.md` - Project overview
  - `QUICK_START.md` - Getting started guide
  - `docs/ARCHITECTURE.md` - System architecture
  - `docs/API_DOCUMENTATION.md` - Complete API reference
  - `docs/CONFIGURATION_GUIDE.md` - Configuration reference
  - `docs/TESTING_GUIDE.md` - Testing guidelines
  - `docs/CONTRIBUTING.md` - Contribution guidelines

#### Scenario: Documentation stays current

- **WHEN** code changes are made
- **THEN** related documentation SHALL be updated in the same PR
- **AND** PR checklist SHALL include documentation update verification

### Requirement: Documentation Search

The system SHALL provide documentation search capabilities.

#### Scenario: Documentation searchable

- **WHEN** developer needs to find specific information
- **THEN** documentation index SHALL provide search guidance
- **AND** common search commands SHALL be documented
- **AND** documentation SHALL use consistent terminology for searchability

## MODIFIED Requirements

### Requirement: API Documentation

The system SHALL provide comprehensive API documentation.

**Previous**: API documentation was scattered across multiple files and often outdated.

**Updated**: API documentation SHALL be centralized, complete, and automatically validated.

#### Scenario: All endpoints documented

- **WHEN** checking API documentation
- **THEN** every v1 endpoint SHALL have documentation including:
  - Endpoint URL and HTTP method
  - Request parameters and body schema
  - Response format and status codes
  - Example requests and responses
  - Error codes and meanings

#### Scenario: API documentation validated

- **WHEN** API changes are made
- **THEN** documentation SHALL be updated
- **AND** automated tests SHALL verify documentation accuracy
- **AND** OpenAPI/Swagger spec SHALL be generated from code

## REMOVED Requirements

### Requirement: Scattered Analysis Reports

**Reason**: Multiple analysis reports in root directory caused clutter and confusion.

**Migration**: All analysis reports SHALL be moved to `docs/archive/2025-01/analysis/`.

**Affected Files**:
- `STYLE_ANALYSIS_SUMMARY.md`
- `BACKEND_REFACTOR_ANALYSIS.md`
- `DUAL_VERSION_FEASIBILITY_ANALYSIS.md`
- `FRONTEND_STYLE_CONSISTENCY_ANALYSIS.md`
- `前端样式统一性分析结果.md`

### Requirement: Multiple Testing Guides

**Reason**: Multiple testing-related documents caused confusion about which to follow.

**Migration**: All testing documentation SHALL be consolidated into `docs/TESTING_GUIDE.md`.

**Affected Files**:
- `TESTING_GUIDE.md` (root) → `docs/TESTING_GUIDE.md`
- `tests/TESTING_GUIDE.md` → merged into main guide
- `backend-service/tests/README.md` → merged into main guide

### Requirement: Duplicate README Files

**Reason**: Multiple README files in subdirectories duplicated information.

**Migration**: Subdirectory READMEs SHALL be consolidated or removed if redundant.

**Affected Files**:
- `backend-service/README.md` → Keep (backend-specific)
- `backend-service/QUICK_START.md` → Merge into main QUICK_START.md
- `bisheng-integration/README.md` → Keep (integration-specific)
- `glass-test-app/README.md` → Keep (test app-specific)

