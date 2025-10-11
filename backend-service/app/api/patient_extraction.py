"""
患者信息提取 API
"""
from fastapi import APIRouter, HTTPException
from loguru import logger
from typing import Dict, Any

from app.schemas.patient_extraction import (
    PatientExtractionRequest,
    PatientExtractionResponse,
    RecommendationGenerationRequest,
    RecommendationGenerationResponse
)
from app.services.local_ai_service import local_ai_service

router = APIRouter()


@router.post("/extract", response_model=PatientExtractionResponse)
async def extract_patient_info(request: PatientExtractionRequest):
    """从屏幕截图中提取患者信息"""
    try:
        logger.info("开始提取患者信息")
        
        # 调用本地AI服务提取患者信息
        patient_info = await local_ai_service.extract_patient_info_from_image(
            image_data=request.image_data,
            prompt_template=request.prompt_template
        )
        
        logger.info(f"成功提取患者信息: {patient_info.get('name', 'Unknown')}")
        
        return PatientExtractionResponse(
            success=True,
            patient_info=patient_info
        )
        
    except Exception as e:
        logger.error(f"提取患者信息失败: {e}")
        return PatientExtractionResponse(
            success=False,
            error=str(e)
        )


@router.post("/recommendations", response_model=RecommendationGenerationResponse)
async def generate_recommendations(request: RecommendationGenerationRequest):
    """生成多类型推荐(检查、用药、诊断)"""
    try:
        logger.info(f"开始生成推荐: patient={request.patient_name}, types={request.recommendation_types}")
        
        recommendations = {}
        
        # 为每种推荐类型生成推荐
        for rec_type in request.recommendation_types:
            try:
                recs = await local_ai_service.generate_recommendations(
                    patient_name=request.patient_name,
                    gender=request.gender,
                    age=request.age,
                    chief_complaint=request.chief_complaint,
                    medical_history=request.medical_history,
                    recommendation_type=rec_type
                )
                recommendations[rec_type] = recs
                logger.info(f"成功生成 {len(recs)} 条 {rec_type} 推荐")
            except Exception as e:
                logger.error(f"生成 {rec_type} 推荐失败: {e}")
                recommendations[rec_type] = []
        
        return RecommendationGenerationResponse(
            success=True,
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"生成推荐失败: {e}")
        return RecommendationGenerationResponse(
            success=False,
            error=str(e)
        )

