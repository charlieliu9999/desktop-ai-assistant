# Patients API

Base path: `/api/patients`

## Create Patient
- Method: POST
- URL: /api/patients
- Body (example):
```json
{
  "patient_id": "P001",
  "name": "张三",
  "gender": "男",
  "age": 45,
  "phone": "13800138000"
}
```
- cURL:
```bash
curl -X POST "http://localhost:8010/api/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P001",
    "name": "张三",
    "gender": "男",
    "age": 45
  }'
```

## Get Patient
- Method: GET
- URL: /api/patients/{patient_id}
- cURL:
```bash
curl "http://localhost:8010/api/patients/P001"
```

## List Patients
- Method: GET
- URL: /api/patients
- cURL:
```bash
curl "http://localhost:8010/api/patients"
```

## Update Patient
- Method: PUT
- URL: /api/patients/{id}
- Body: same as create

## Delete Patient
- Method: DELETE
- URL: /api/patients/{id}
