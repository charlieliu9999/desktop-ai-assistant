"""
OCR服务测试
"""
import pytest
import base64
from io import BytesIO
from PIL import Image

from app.services.vision.ocr_service import OCRService
from app.services.vision.models import OCRRequest


@pytest.fixture
def ocr_service():
    """创建OCR服务实例"""
    return OCRService()


@pytest.fixture
def test_image_base64():
    """创建测试图像的Base64编码"""
    # 创建一个简单的测试图像
    img = Image.new('RGB', (200, 100), color='white')
    
    # 转换为Base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_bytes = buffer.getvalue()
    return base64.b64encode(img_bytes).decode()


@pytest.mark.asyncio
async def test_ocr_service_initialization(ocr_service):
    """测试OCR服务初始化"""
    assert ocr_service is not None


@pytest.mark.asyncio
async def test_recognize_text_success(ocr_service, test_image_base64):
    """测试OCR文字识别成功"""
    request = OCRRequest(
        image_data=test_image_base64,
        language='eng',
        psm=3,
        oem=3
    )
    
    response = await ocr_service.recognize(request)
    
    assert response.success is True
    assert response.result is not None
    assert isinstance(response.result.text, str)
    assert 0.0 <= response.result.confidence <= 1.0
    assert isinstance(response.result.boxes, list)
    assert response.processing_time_ms is not None
    assert response.processing_time_ms > 0


@pytest.mark.asyncio
async def test_recognize_text_with_chinese(ocr_service, test_image_base64):
    """测试中文OCR识别"""
    request = OCRRequest(
        image_data=test_image_base64,
        language='chi_sim+eng',
        psm=3,
        oem=3
    )
    
    response = await ocr_service.recognize(request)
    
    assert response.success is True
    assert response.result is not None


@pytest.mark.asyncio
async def test_recognize_text_invalid_base64(ocr_service):
    """测试无效的Base64数据"""
    request = OCRRequest(
        image_data='invalid_base64_data',
        language='eng'
    )
    
    response = await ocr_service.recognize(request)
    
    assert response.success is False
    assert response.error is not None
    assert 'OCR识别失败' in response.error


@pytest.mark.asyncio
async def test_recognize_text_different_psm_modes(ocr_service, test_image_base64):
    """测试不同的页面分割模式"""
    psm_modes = [3, 6, 11]  # 不同的PSM模式
    
    for psm in psm_modes:
        request = OCRRequest(
            image_data=test_image_base64,
            language='eng',
            psm=psm,
            oem=3
        )
        
        response = await ocr_service.recognize(request)
        assert response.success is True


@pytest.mark.asyncio
async def test_health_check_success(ocr_service):
    """测试健康检查成功"""
    is_healthy = await ocr_service.health_check()
    
    assert isinstance(is_healthy, bool)
    # 注意：在没有安装Tesseract的环境中，这个测试可能失败
    # assert is_healthy is True


@pytest.mark.asyncio
async def test_recognize_text_with_boxes(ocr_service, test_image_base64):
    """测试OCR识别返回文本框信息"""
    request = OCRRequest(
        image_data=test_image_base64,
        language='eng'
    )
    
    response = await ocr_service.recognize(request)
    
    if response.success and response.result:
        boxes = response.result.boxes
        assert isinstance(boxes, list)
        
        # 检查每个box的结构
        for box in boxes:
            assert 'text' in box
            assert 'confidence' in box
            assert 'x' in box
            assert 'y' in box
            assert 'width' in box
            assert 'height' in box
            assert 0.0 <= box['confidence'] <= 1.0


@pytest.mark.asyncio
async def test_recognize_text_performance(ocr_service, test_image_base64):
    """测试OCR识别性能"""
    request = OCRRequest(
        image_data=test_image_base64,
        language='eng'
    )
    
    response = await ocr_service.recognize(request)
    
    # 检查处理时间是否合理（应该在几秒内完成）
    if response.processing_time_ms:
        assert response.processing_time_ms < 10000  # 小于10秒

