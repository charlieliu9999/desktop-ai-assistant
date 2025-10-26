# Service Adapters - Spec Delta

## ADDED Requirements

### Requirement: Complete Adapter Coverage

The system SHALL provide adapters for all service integrations.

#### Scenario: All services have adapters

- **WHEN** listing service implementations
- **THEN** the following adapters SHALL exist:
  - `ai-adapter.ts` (AI services)
  - `vision-adapter.ts` (Vision/OCR services)
  - `voice-adapter.ts` (Voice services)
  - `patient-adapter.ts` (Patient extraction)
  - `agent-adapter.ts` (Bisheng agent)
  - `config-adapter.ts` (Configuration)
- **AND** all adapters SHALL implement consistent interfaces

#### Scenario: Adapters support backend and legacy modes

- **WHEN** adapter is initialized
- **THEN** it SHALL support both backend API and legacy implementation
- **AND** it SHALL automatically failover to legacy on backend failure
- **AND** mode selection SHALL be configurable via feature flags

### Requirement: Patient Information Adapter

The system SHALL provide a patient information extraction adapter.

#### Scenario: Extract patient info from image

- **WHEN** `extractPatientInfo(imageData)` is called
- **THEN** adapter SHALL attempt backend API call to `/v1/patient/extraction/extract`
- **AND** on failure, SHALL fallback to legacy implementation
- **AND** SHALL return structured patient information

#### Scenario: Generate medical recommendations

- **WHEN** `generateRecommendations(patientInfo, type)` is called
- **THEN** adapter SHALL call `/v1/patient/extraction/recommendations`
- **AND** SHALL support diagnosis, exam, and medication recommendation types
- **AND** SHALL return formatted recommendations

### Requirement: Configuration Adapter

The system SHALL provide a configuration management adapter.

#### Scenario: Get configuration

- **WHEN** `getConfig()` is called
- **THEN** adapter SHALL fetch from `/v1/config`
- **AND** SHALL cache result locally
- **AND** SHALL return validated configuration object

#### Scenario: Update configuration

- **WHEN** `updateConfig(key, value)` is called
- **THEN** adapter SHALL validate the update
- **AND** SHALL send PUT request to `/v1/config/{key}`
- **AND** SHALL update local cache on success

## MODIFIED Requirements

### Requirement: Agent Adapter Implementation

The system SHALL provide a complete Bisheng agent adapter.

**Previous**: Agent adapter was partially implemented with missing methods.

**Updated**: Agent adapter SHALL provide complete functionality for Bisheng integration.

#### Scenario: List available workflows

- **WHEN** `listWorkflows()` is called
- **THEN** adapter SHALL fetch workflows from backend or Bisheng API
- **AND** SHALL return array of workflow objects with id, name, description

#### Scenario: Invoke workflow

- **WHEN** `invokeWorkflow(workflowId, input)` is called
- **THEN** adapter SHALL send request to backend or Bisheng API
- **AND** SHALL support both streaming and non-streaming modes
- **AND** SHALL handle session management automatically

## REMOVED Requirements

### Requirement: Legacy Service Implementations

**Reason**: Legacy implementations in `src/services/legacy/` are being replaced by adapters.

**Migration**: All legacy service code SHALL be deleted after adapter migration is complete. Components SHALL update imports to use adapters.

**Affected Files**:
- `src/services/legacy/ai.ts` → `src/services/adapters/ai-adapter.ts`
- `src/services/legacy/desktop-recognition.ts` → `src/services/adapters/patient-adapter.ts`
- `src/services/legacy/voice.ts` → `src/services/adapters/voice-adapter.ts`
- `src/services/legacy/bisheng.ts` → `src/services/adapters/agent-adapter.ts`
- `src/services/legacy/patient-info-extractor.ts` → `src/services/adapters/patient-adapter.ts`

### Requirement: Direct Legacy Service Usage

**Reason**: Components should not directly import legacy services.

**Migration**: All component imports SHALL be updated to use adapters instead of legacy services. Feature flags control whether adapters use backend or legacy implementation internally.

