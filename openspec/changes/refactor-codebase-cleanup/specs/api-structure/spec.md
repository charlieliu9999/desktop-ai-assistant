# API Structure - Spec Delta

## ADDED Requirements

### Requirement: API Version Control

The system SHALL implement URL-based API versioning.

#### Scenario: v1 API endpoints

- **WHEN** accessing API endpoints
- **THEN** all current stable endpoints SHALL be under `/v1/` prefix
- **AND** endpoints SHALL include: `/v1/ai/*`, `/v1/vision/*`, `/v1/voice/*`, `/v1/agent/*`, `/v1/config/*`, `/v1/patient/*`

#### Scenario: API deprecation warnings

- **WHEN** deprecated API endpoint is called
- **THEN** response SHALL include `X-API-Deprecated: true` header
- **AND** response SHALL include `X-API-Deprecated-Replacement` header with new endpoint
- **AND** server SHALL log the deprecated API usage

### Requirement: Unified Response Format

The system SHALL use consistent response format across all APIs.

#### Scenario: Success response format

- **WHEN** API request succeeds
- **THEN** response SHALL follow this structure:
  ```json
  {
    "success": true,
    "data": { /* response data */ },
    "metadata": {
      "timestamp": "2025-10-26T10:00:00Z",
      "version": "1.0.0"
    }
  }
  ```

#### Scenario: Error response format

- **WHEN** API request fails
- **THEN** response SHALL follow this structure:
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "Human readable message",
      "details": { /* optional error details */ }
    },
    "metadata": {
      "timestamp": "2025-10-26T10:00:00Z",
      "version": "1.0.0"
    }
  }
  ```

### Requirement: Standardized Error Handling

The system SHALL use consistent error codes and handling.

#### Scenario: Standard error codes

- **WHEN** error occurs
- **THEN** error code SHALL be one of the predefined codes:
  - `VALIDATION_ERROR` (400)
  - `UNAUTHORIZED` (401)
  - `FORBIDDEN` (403)
  - `NOT_FOUND` (404)
  - `RATE_LIMIT_EXCEEDED` (429)
  - `INTERNAL_ERROR` (500)
  - `SERVICE_UNAVAILABLE` (503)

#### Scenario: Error details included

- **WHEN** validation error occurs
- **THEN** error details SHALL include field-level validation errors
- **AND** each error SHALL specify field name and validation rule violated

## REMOVED Requirements

### Requirement: Legacy API Endpoints

**Reason**: Legacy endpoints under `/api/` prefix are being replaced by v1 endpoints.

**Migration**: All frontend code SHALL be updated to use v1 endpoints before legacy endpoints are removed.

**Deprecated Endpoints**:
- `/api/ai-chat` → `/v1/ai/chat`
- `/api/model-config` → `/v1/config/models`
- `/api/patient-extraction` → `/v1/patient/extraction/extract`
- `/api/patient-extraction/recommendations` → `/v1/patient/extraction/recommendations`

**Removal Timeline**:
1. Mark as deprecated (add warning headers)
2. Update all frontend calls to v1
3. Monitor usage for 1 month
4. Remove legacy endpoints

### Requirement: Inconsistent Response Formats

**Reason**: Different endpoints returned different response structures, causing frontend complexity.

**Migration**: All endpoints SHALL be updated to use `APIResponse` wrapper. Frontend code SHALL be updated to handle the new format.

**Example Migration**:
```python
# Before (inconsistent)
@router.post("/chat")
async def chat(request: ChatRequest):
    result = await ai_service.chat(request)
    return {"reply": result}  # Inconsistent format

# After (consistent)
@router.post("/chat")
async def chat(request: ChatRequest):
    result = await ai_service.chat(request)
    return APIResponse(success=True, data={"message": result})
```

