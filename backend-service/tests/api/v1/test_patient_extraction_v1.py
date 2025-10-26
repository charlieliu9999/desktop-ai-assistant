"""
v1 患者信息提取 API 测试
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_extract_no_scene_uses_local_service(client):
    with patch("app.api.v1.patient_extraction.local_ai_service") as mock_svc:
        mock_svc.extract_patient_info_from_image = AsyncMock(return_value={
            "name": "张三", "age": 30, "gender": "男", "patient_id": "P001"
        })
        resp = client.post("/v1/patient/extraction/extract", json={
            "image_data": "data:image/png;base64,xxx",
            "prompt_template": "medical_patient_info"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["patient_info"]["name"] == "张三"


def test_extract_with_scene_uses_vision(client):
    from app.services.vision.models import VisionResponse, VisionResult
    with patch("app.api.v1.vision.vision_service") as mock_vision:
        vr = VisionResponse(success=True, result=VisionResult(
            description="{\"patient_name\":\"李四\",\"age\":28}",
            confidence=0.9,
            details={},
            structured={"name": "李四", "age": 28}
        ))
        mock_vision.understand = AsyncMock(return_value=vr)
        resp = client.post("/v1/patient/extraction/extract?scene=screen_recognition", json={
            "image_data": "data:image/png;base64,yyy",
            "prompt_template": "medical_patient_info"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["patient_info"]["age"] == 28


def test_generate_recommendations(client):
    with patch("app.api.v1.patient_extraction.local_ai_service") as mock_svc:
        mock_svc.generate_recommendations = AsyncMock(side_effect=lambda **kwargs: [{"title": "血常规", "type": "exam", "details": {}}])
        resp = client.post("/v1/patient/extraction/recommendations", json={
            "patient_name": "王五",
            "gender": "男",
            "age": 40,
            "chief_complaint": "头痛",
            "medical_history": "",
            "recommendation_types": ["exam"]
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert isinstance(data["recommendations"].get("exam"), list)

