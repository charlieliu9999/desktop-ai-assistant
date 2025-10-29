## ADDED Requirements

### Requirement: STT
`POST /v2/voice/stt` SHALL accept `audio` (url/base64) and `model/language`.

#### Scenario: STT success
- WHEN audio provided
- THEN return `{ text, confidence, language }` in `data`.

### Requirement: TTS
`POST /v2/voice/tts` SHALL accept text and synthesis params.

#### Scenario: TTS success
- WHEN valid text and model
- THEN return `{ audio_data, format, duration_ms }` in `data`.

### Requirement: Models & Health
`GET /v2/voice/models|health` SHALL return unified structures.

#### Scenario: Voice models and health
- WHEN calling `GET /v2/voice/models` and `GET /v2/voice/health`
- THEN models list is in `data` and health shows `data.services.stt` and `data.services.tts`.
