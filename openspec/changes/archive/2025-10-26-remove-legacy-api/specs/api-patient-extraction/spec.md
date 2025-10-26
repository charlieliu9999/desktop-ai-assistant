## ADDED Requirements
### Requirement: v1 Patient Extraction Endpoints
The system SHALL provide v1 endpoints for patient intake extraction and recommendations to replace legacy `/api/patient-extraction/*`.

#### Scenario: Extract patient info successfully
- WHEN client posts an image payload to `/v1/patient/extraction/extract`
- THEN server returns structured patient info or raw description

#### Scenario: Generate multi-type recommendations
- WHEN client posts patient basic info and requested types to `/v1/patient/extraction/recommendations`
- THEN server returns diagnosis/exam/medication recommendations

### Requirement: Scene-aware Extraction via Vision
Scenes SHALL override model and system prompt for vision-based extraction.

#### Scenario: Scene overrides model and system prompt
- WHEN client sets `scene=screen_recognition( _aliyun)`
- THEN vision service injects system prompt and model per registry config

