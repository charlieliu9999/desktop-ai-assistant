import pytest
from fastapi.testclient import TestClient
from app.services.vision.models import VisionResponse, VisionResult


def test_vision_understand_v2_strict_json_no_result(monkeypatch):
    from app.main import app
    client = TestClient(app)

    # monkeypatch v1 vision service to simulate strict_json failure
    import app.api.v1.vision as v1vision

    # 创建一个mock服务类，understand是实例方法
    class MockVisionService:
        async def understand(self, req):
            return VisionResponse(success=False, result=None, error="no_result", model_used="mock", processing_time_ms=1.0)

    monkeypatch.setattr(v1vision, "vision_service", MockVisionService())

    body = {
        "source": {"type": "base64", "data": "Zm9v", "mime": "image/png"},
        "prompt": "请识别患者信息",
        "strict_json": True,
    }
    r = client.post("/v2/vision/understand", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is False
    assert data.get("error", {}).get("code") == "no_result"

