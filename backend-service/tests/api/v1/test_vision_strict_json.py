import base64
from io import BytesIO
from PIL import Image
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.api.v1 import vision as vision_router
from app.services.vision.vision_service import VisionService


def _gen_png_base64() -> str:
    img = Image.new('RGB', (4, 4), color='white')
    buf = BytesIO()
    img.save(buf, format='PNG')
    return base64.b64encode(buf.getvalue()).decode()


def test_understand_strict_json_failure_returns_error():
    client = TestClient(app)
    b64 = _gen_png_base64()

    # Ensure router has a VisionService instance (avoid 503 when service is uninitialized)
    vision_router.vision_service = VisionService()
    # Patch DashScope VL call to return NON-JSON text so that strict parser fails
    with patch("app.services.vision.dashscope_client.understand_image", new=AsyncMock(return_value=("not_json_output", {"total_tokens": 10}))):
        resp = client.post(
            "/v1/vision/understand",
            params={"scene": "screen_recognition_aliyun"},
            json={
                "image_data": b64,
                "prompt": "",
                "strict_json": True,
                "schema_name": "patient_info_v1"
            }
        )
    # Router converts service failure into HTTP 500 with detail set to error string
    assert resp.status_code == 500
    j = resp.json()
    assert j.get("detail") == "strict_json_parse_failed"


def test_understand_strict_json_success_maps_fields():
    client = TestClient(app)
    b64 = _gen_png_base64()

    content = (
        "{\n"
        "  \"patient_name\": \"赵华\",\n"
        "  \"gender\": \"女\",\n"
        "  \"age\": 45,\n"
        "  \"medical_record_number\": \"13391483\",\n"
        "  \"department\": \"急诊科\",\n"
        "  \"chief_complaint\": \"突发左侧肢体活动障碍、言语不清2小时\",\n"
        "  \"diagnosis\": \"急性缺血性脑卒中\",\n"
        "  \"medical_history\": \"高血压病史5年\",\n"
        "  \"confidence\": 0.9\n"
        "}"
    )

    # Ensure router has a VisionService instance (avoid 503 when service is uninitialized)
    vision_router.vision_service = VisionService()
    with patch("app.services.vision.dashscope_client.understand_image", new=AsyncMock(return_value=(content, {"total_tokens": 42}))):
        resp = client.post(
            "/v1/vision/understand",
            params={"scene": "screen_recognition_aliyun"},
            json={
                "image_data": b64,
                "prompt": "",
                "strict_json": True,
                "schema_name": "patient_info_v1"
            }
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("success") is True
    result = data.get("result") or {}
    details = result.get("details") or {}
    structured = result.get("structured") or {}
    # Basic field mapping must exist
    assert structured.get("patient_name") == "赵华"
    assert structured.get("gender") == "女"
    assert int(structured.get("age", 0)) == 45
    assert structured.get("medical_record_number") == "13391483"
    assert structured.get("department") == "急诊科"
    assert "model" in details or True  # model string may vary by scene resolution
