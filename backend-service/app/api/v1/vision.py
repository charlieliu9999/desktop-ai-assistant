"""
视觉服务API路由
"""
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.services.vision import (
    OCRRequest,
    OCRResponse,
    VisionRequest,
    VisionResponse,
    OCRService,
    VisionService,
)

router = APIRouter(prefix="/vision")

# 全局服务实例（将在main.py中初始化）
ocr_service: OCRService = None  # type: ignore
vision_service: VisionService = None  # type: ignore


@router.post("/ocr", response_model=OCRResponse)
async def recognize_text(request: OCRRequest):
    """
    OCR文字识别

    识别图像中的文字内容

    Args:
        request: OCR识别请求

    Returns:
        OCR识别响应
    """
    try:
        if not ocr_service:
            raise HTTPException(status_code=503, detail="OCR服务未初始化")

        response = await ocr_service.recognize(request)

        if not response.success:
            raise HTTPException(status_code=500, detail=response.error)

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR识别失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/understand", response_model=VisionResponse)
async def understand_image(request: VisionRequest):
    """
    图像理解

    使用视觉模型理解图像内容

    Args:
        request: 视觉理解请求

    Returns:
        视觉理解响应
    """
    try:
        if not vision_service:
            raise HTTPException(status_code=503, detail="视觉服务未初始化")

        response = await vision_service.understand(request)

        if not response.success:
            raise HTTPException(status_code=500, detail=response.error)

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"图像理解失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-medical", response_model=VisionResponse)
async def analyze_medical_image(image_data: str, focus: str = None):
    """
    分析医疗图像

    Args:
        image_data: Base64编码的图像数据
        focus: 关注点（如"骨折"、"肿瘤"等）

    Returns:
        视觉理解响应
    """
    try:
        if not vision_service:
            raise HTTPException(status_code=503, detail="视觉服务未初始化")

        response = await vision_service.analyze_medical_image(image_data, focus)

        if not response.success:
            raise HTTPException(status_code=500, detail=response.error)

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"医疗图像分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-text", response_model=VisionResponse)
async def extract_text_from_image(image_data: str):
    """
    从图像中提取文字

    使用视觉模型提取图像中的文字

    Args:
        image_data: Base64编码的图像数据

    Returns:
        视觉理解响应
    """
    try:
        if not vision_service:
            raise HTTPException(status_code=503, detail="视觉服务未初始化")

        response = await vision_service.extract_text_from_image(image_data)

        if not response.success:
            raise HTTPException(status_code=500, detail=response.error)

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文字提取失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """
    健康检查

    Returns:
        健康状态
    """
    try:
        ocr_healthy = await ocr_service.health_check() if ocr_service else False
        vision_healthy = (
            await vision_service.health_check() if vision_service else False
        )

        return {
            "success": True,
            "services": {
                "ocr": {"healthy": ocr_healthy, "available": ocr_service is not None},
                "vision": {
                    "healthy": vision_healthy,
                    "available": vision_service is not None,
                },
            },
        }

    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

