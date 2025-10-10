# Bisheng Service API

Base path: `/api/bisheng`

- GET /api/bisheng/config
- GET /api/bisheng/status
- POST /api/bisheng/login
- GET /api/bisheng/workflows
- POST /api/bisheng/workflow/invoke

Examples:
```bash
curl "http://localhost:8010/api/bisheng/status"

curl -X POST "http://localhost:8010/api/bisheng/login" -H "Content-Type: application/json" -d '{"username":"user","password":"***"}'
```
