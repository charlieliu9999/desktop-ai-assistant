# Model Config API

Base path: `/api/model-config`

- GET /api/model-config/scenarios
- GET /api/model-config/configs
- GET /api/model-config/configs/{scenario}
- POST /api/model-config/test

Examples:
```bash
curl "http://localhost:8010/api/model-config/scenarios"

curl "http://localhost:8010/api/model-config/configs"

curl "http://localhost:8010/api/model-config/configs/diagnosis"

curl -X POST "http://localhost:8010/api/model-config/test" \
  -H "Content-Type: application/json" \
  -d '{"model_name":"qwen2.5:32b","base_url":"http://localhost:11434"}'
```
