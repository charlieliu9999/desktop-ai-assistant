# Backend HTTP API Reference

This document aggregates public FastAPI endpoints exposed by `backend-service`.

Sources: `backend-service/README.md`, `backend-service/QUICK_START.md`.

- Health
  - GET /health
  - GET /health/detailed

- Local AI
  - GET /api/local-ai/health
  - GET /api/local-ai/models
  - POST /api/local-ai/extract-patient-info-from-image

- Model Config
  - GET /api/model-config/scenarios
  - GET /api/model-config/configs
  - GET /api/model-config/configs/{scenario}
  - POST /api/model-config/test

- Bisheng Service
  - GET /api/bisheng/config
  - GET /api/bisheng/status
  - POST /api/bisheng/login
  - GET /api/bisheng/workflows
  - POST /api/bisheng/workflow/invoke

- Patients
  - POST /api/patients
  - GET /api/patients/{patient_id}
  - GET /api/patients
  - PUT /api/patients/{id}
  - DELETE /api/patients/{id}

- Recommendations
  - POST /api/recommendations/generate
  - GET /api/recommendations/{id}
  - POST /api/recommendations/feedback

- AI Chat
  - POST /api/ai/chat

See individual endpoint docs:
- ./patients.md
- ./recommendations.md
- ./ai.md
- ./model-config.md
- ./bisheng.md
- ./local-ai.md
