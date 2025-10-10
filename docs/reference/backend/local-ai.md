# Local AI API

Base path: `/api/local-ai`

- GET /api/local-ai/health
- GET /api/local-ai/models
- POST /api/local-ai/extract-patient-info-from-image

Examples:
```bash
curl "http://localhost:8010/api/local-ai/health"

curl "http://localhost:8010/api/local-ai/models"

curl -X POST "http://localhost:8010/api/local-ai/extract-patient-info-from-image" \
  -H "Content-Type: application/json" \
  -d '{"image_data":"<base64>"}'
```
