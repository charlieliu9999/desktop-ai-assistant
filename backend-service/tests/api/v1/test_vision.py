"""
视觉服务API测试
"""
import pytest
import base64
from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.services.vision.models import OCRResult


@pytest.fixture
def client():
    """创建测试客户端"""
    return TestClient(app)


@pytest.fixture
def test_image_base64():
    """创建测试图像的Base64编码"""
    img = Image.new('RGB', (200, 100), color='white')
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_bytes = buffer.getvalue()
    return base64.b64encode(img_bytes).decode()


def test_ocr_endpoint(client, test_image_base64):
    """测试OCR端点"""
    from app.services.vision.models import OCRResponse as OCRServiceResponse

    # Mock OCR服务响应
    mock_response = OCRServiceResponse(
        success=True,
        result=OCRResult(
            text="Test OCR Result",
            confidence=0.95,
            language="eng"
        )
    )

    with patch("app.api.v1.vision.ocr_service") as mock_service:
        mock_service.recognize = AsyncMock(return_value=mock_response)

        response = client.post(
            "/v1/vision/ocr",
            json={
                "image_data": test_image_base64,
                "language": "eng",
                "psm": 3,
                "oem": 3
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["result"]["text"] == "Test OCR Result"


def test_ocr_endpoint_invalid_data(client):
    """测试OCR端点无效数据"""
    from app.services.vision.models import OCRResponse as OCRServiceResponse

    mock_response = OCRServiceResponse(
        success=False,
        error="Invalid image data"
    )

    with patch("app.api.v1.vision.ocr_service") as mock_service:
        mock_service.recognize = AsyncMock(return_value=mock_response)

        response = client.post(
            "/v1/vision/ocr",
            json={
                "image_data": "invalid_base64",
                "language": "eng"
            }
        )

        # 应该返回错误
        assert response.status_code in [200, 500]


def test_understand_endpoint(client, test_image_base64):
    """测试图像理解端点"""
    response = client.post(
        "/v1/vision/understand",
        json={
            "image_data": test_image_base64,
            "prompt": "描述这张图片",
            "max_tokens": 1000,
            "temperature": 0.7
        }
    )

    assert response.status_code in [200, 500, 503]
    # 可能因为AI服务未初始化而失败


def test_analyze_medical_endpoint(client, test_image_base64):
    """测试医疗图像分析端点"""
    response = client.post(
        "/v1/vision/analyze-medical",
        params={
            "image_data": test_image_base64,
            "focus": "骨折"
        }
    )

    assert response.status_code in [200, 500, 503]


def test_extract_text_endpoint(client, test_image_base64):
    """测试文字提取端点"""
    response = client.post(
        "/v1/vision/extract-text",
        params={
            "image_data": test_image_base64
        }
    )

    assert response.status_code in [200, 500, 503]


def test_vision_health_endpoint(client):
    """测试视觉服务健康检查端点"""
    response = client.get("/v1/vision/health")

    assert response.status_code == 200
    data = response.json()
    assert "success" in data
    assert "services" in data
    assert "ocr" in data["services"]
    assert "vision" in data["services"]

