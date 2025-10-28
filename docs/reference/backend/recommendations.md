# Recommendations API

Base path: `/api/recommendations`

## Generate Recommendations
- Method: POST
- URL: /api/recommendations/generate
- Body (example):
```json
{
  "patient_id": "P001",
  "chief_complaint": "持续性头痛3天,伴有恶心呕吐",
  "medical_history": "高血压病史5年"
}
```
- cURL:
```bash
curl -X POST "http://localhost:8010/api/recommendations/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P001",
    "chief_complaint": "持续性头痛3天,伴有恶心呕吐",
    "medical_history": "高血压病史5年"
  }'
```

## Get Recommendation By Id
- Method: GET
- URL: /api/recommendations/{id}

## Submit Feedback
- Method: POST
- URL: /api/recommendations/feedback
