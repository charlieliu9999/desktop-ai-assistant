"""
患者信息API路由
"""

import time
import uuid
from fastapi import APIRouter, HTTPException
from app.services.patient.models import (
    ExtractionRequest,
    ExtractionResponse,
    PatientInfo,
    ValidationResult,
)
from app.services.patient.extractor import PatientInfoExtractor
from app.models.response import APIResponse

router = APIRouter(prefix="/patient", tags=["patient"])

# 全局患者信息提取器实例（将在main.py中初始化）
patient_extractor: PatientInfoExtractor = None


@router.post("/extract", response_model=APIResponse)
async def extract_patient_info(request: ExtractionRequest):
    """
    提取患者信息

    从文本或图片中提取患者信息，支持AI和规则两种方法。

    Args:
        request: 提取请求，包含文本或图片

    Returns:
        APIResponse: 包含提取的患者信息
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())

    try:
        if not patient_extractor:
            raise HTTPException(status_code=500, detail="Patient extractor not initialized")

        # 验证请求
        if not request.text and not request.image_base64:
            raise HTTPException(
                status_code=400, detail="Either text or image_base64 must be provided"
            )

        # 提取患者信息
        result = await patient_extractor.extract(request)

        processing_time = (time.time() - start_time) * 1000

        return APIResponse(
            success=True,
            data={
                "patient_info": result.patient_info.dict(),
                "extraction_method": result.extraction_method,
                "processing_time_ms": result.processing_time_ms,
            },
            meta={
                "request_id": request_id,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "processing_time_ms": processing_time,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        return APIResponse(
            success=False,
            error={
                "code": "EXTRACTION_ERROR",
                "message": str(e),
                "details": {"request_id": request_id},
            },
            meta={
                "request_id": request_id,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            },
        )


@router.post("/validate", response_model=APIResponse)
async def validate_patient_info(patient_info: PatientInfo):
    """
    验证患者信息

    检查患者信息的有效性，返回错误和警告。

    Args:
        patient_info: 待验证的患者信息

    Returns:
        APIResponse: 包含验证结果
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())

    try:
        if not patient_extractor:
            raise HTTPException(status_code=500, detail="Patient extractor not initialized")

        # 验证患者信息
        validation_result = patient_extractor.validate(patient_info)

        processing_time = (time.time() - start_time) * 1000

        return APIResponse(
            success=True,
            data=validation_result,
            meta={
                "request_id": request_id,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "processing_time_ms": processing_time,
            },
        )

    except Exception as e:
        return APIResponse(
            success=False,
            error={
                "code": "VALIDATION_ERROR",
                "message": str(e),
                "details": {"request_id": request_id},
            },
            meta={
                "request_id": request_id,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            },
        )


@router.post("/extract-batch", response_model=APIResponse)
async def extract_patient_info_batch(requests: list[ExtractionRequest]):
    """
    批量提取患者信息

    从多个文本或图片中批量提取患者信息。

    Args:
        requests: 提取请求列表

    Returns:
        APIResponse: 包含所有提取结果
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())

    try:
        if not patient_extractor:
            raise HTTPException(status_code=500, detail="Patient extractor not initialized")

        if len(requests) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 requests allowed")

        # 批量提取
        results = []
        for req in requests:
            try:
                result = await patient_extractor.extract(req)
                results.append(
                    {
                        "success": True,
                        "patient_info": result.patient_info.dict(),
                        "extraction_method": result.extraction_method,
                        "processing_time_ms": result.processing_time_ms,
                    }
                )
            except Exception as e:
                results.append({"success": False, "error": str(e)})

        processing_time = (time.time() - start_time) * 1000

        return APIResponse(
            success=True,
            data={
                "results": results,
                "total": len(requests),
                "successful": sum(1 for r in results if r.get("success")),
                "failed": sum(1 for r in results if not r.get("success")),
            },
            meta={
                "request_id": request_id,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "processing_time_ms": processing_time,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        return APIResponse(
            success=False,
            error={
                "code": "BATCH_EXTRACTION_ERROR",
                "message": str(e),
                "details": {"request_id": request_id},
            },
            meta={
                "request_id": request_id,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            },
        )

