# AI Chat API

Base path: `/api/ai`

## Chat
- Method: POST
- URL: /api/ai/chat
- Body (example):
```json
{
  "message": "头痛需要做什么检查?",
  "history": []
}
```
- cURL:
```bash
curl -X POST "http://localhost:8010/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "头痛需要做什么检查?",
    "history": []
  }'
```
