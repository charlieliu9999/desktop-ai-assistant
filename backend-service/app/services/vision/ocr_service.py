"""
OCR文字识别服务

使用Tesseract进行文字识别
"""
import base64
import time
from typing import Optional
from io import BytesIO
from PIL import Image
import pytesseract
from loguru import logger

from .models import OCRRequest, OCRResponse, OCRResult


class OCRService:
    """OCR文字识别服务"""

    def __init__(self, tesseract_cmd: Optional[str] = None):
        """
        初始化OCR服务

        Args:
            tesseract_cmd: Tesseract可执行文件路径
        """
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

        logger.info("OCR服务初始化完成")

    async def recognize(self, request: OCRRequest) -> OCRResponse:
        """
        识别图像中的文字

        Args:
            request: OCR识别请求

        Returns:
            OCR识别响应
        """
        start_time = time.time()

        try:
            # 解码Base64图像
            image_bytes = base64.b64decode(request.image_data)
            image = Image.open(BytesIO(image_bytes))

            # 配置Tesseract参数
            config = f"--psm {request.psm} --oem {request.oem}"

            # 执行OCR识别
            text = pytesseract.image_to_string(
                image, lang=request.language, config=config
            )

            # 获取详细信息（包括置信度和位置）
            data = pytesseract.image_to_data(
                image, lang=request.language, config=config, output_type=pytesseract.Output.DICT
            )

            # 计算平均置信度
            confidences = [
                float(conf) for conf in data["conf"]
                if conf != "-1" and conf != "" and float(conf) >= 0
            ]
            avg_confidence = (
                sum(confidences) / len(confidences) / 100.0 if confidences else 0.0
            )
            # 确保置信度在有效范围内
            avg_confidence = max(0.0, min(1.0, avg_confidence))

            # 提取文本框信息
            boxes = []
            n_boxes = len(data["text"])
            for i in range(n_boxes):
                if int(data["conf"][i]) > 0:
                    boxes.append(
                        {
                            "text": data["text"][i],
                            "confidence": float(data["conf"][i]) / 100.0,
                            "x": data["left"][i],
                            "y": data["top"][i],
                            "width": data["width"][i],
                            "height": data["height"][i],
                        }
                    )

            processing_time = (time.time() - start_time) * 1000

            result = OCRResult(
                text=text.strip(), confidence=avg_confidence, boxes=boxes
            )

            logger.info(
                f"OCR识别成功: 文本长度={len(text)}, 置信度={avg_confidence:.2f}, "
                f"处理时间={processing_time:.2f}ms"
            )

            return OCRResponse(
                success=True, result=result, processing_time_ms=processing_time
            )

        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            error_msg = f"OCR识别失败: {str(e)}"
            logger.error(error_msg)

            return OCRResponse(
                success=False, error=error_msg, processing_time_ms=processing_time
            )

    async def health_check(self) -> bool:
        """
        健康检查

        Returns:
            是否健康
        """
        try:
            # 创建一个简单的测试图像
            test_image = Image.new("RGB", (100, 30), color="white")
            pytesseract.image_to_string(test_image)
            return True
        except Exception as e:
            logger.error(f"OCR服务健康检查失败: {e}")
            return False

