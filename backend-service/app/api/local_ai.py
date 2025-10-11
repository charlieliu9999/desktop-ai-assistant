"""
本地AI API路由
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Optional
from loguru import logger

from app.services.ai_service_manager import ai_service_manager

router = APIRouter()


class ExtractPatientInfoFromImageRequest(BaseModel):
    """从图像提取患者信息请求"""
    image: str = Field(..., description="base64编码的图像数据")
    model: str = Field(default="llama3.2-vision", description="使用的模型")
    prompt_template: str = Field(default="medical_patient_info", description="提示词模板")
    force_mode: Optional[str] = Field(default=None, description="强制使用的模式(local/cloud/hybrid)")


class ExtractPatientInfoFromImageResponse(BaseModel):
    """从图像提取患者信息响应"""
    success: bool
    patient_info: Dict
    processing_time: Optional[float] = None
    model_used: Optional[str] = None
    extraction_method: Optional[str] = None
    message: str = ""


class GenerateRecommendationsRequest(BaseModel):
    """生成推荐请求"""
    patient_info: Dict = Field(..., description="患者信息")
    force_mode: Optional[str] = Field(default=None, description="强制使用的模式")


class GenerateRecommendationsResponse(BaseModel):
    """生成推荐响应"""
    success: bool
    recommendations: list
    generation_method: Optional[str] = None
    message: str = ""


class ServiceHealthResponse(BaseModel):
    """服务健康状态响应"""
    success: bool
    services: Dict[str, bool]
    current_mode: str
    message: str = ""


@router.get("/health", response_model=ServiceHealthResponse)
async def check_health():
    """检查本地AI服务健康状态"""
    try:
        health = await ai_service_manager.check_services_health()
        current_mode = ai_service_manager.get_current_mode()

        return ServiceHealthResponse(
            success=True,
            services=health,
            current_mode=current_mode,
            message=f"当前模式: {current_mode}"
        )
    except Exception as e:
        logger.error(f"检查服务健康状态失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"检查服务健康状态失败: {str(e)}"
        )


@router.get("/models")
async def list_models():
    """获取本地AI可用模型列表"""
    try:
        import httpx
        from app.config import settings

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{settings.LOCAL_AI_ENDPOINT}/api/tags")

            if response.status_code == 200:
                data = response.json()
                models = data.get("models", [])
                return {
                    "success": True,
                    "count": len(models),
                    "models": [
                        {
                            "name": m.get("name"),
                            "size": m.get("size"),
                            "modified_at": m.get("modified_at")
                        }
                        for m in models
                    ]
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"获取模型列表失败: {response.text}"
                )
    except httpx.RequestError as e:
        logger.error(f"连接本地AI服务失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"连接本地AI服务失败: {str(e)}"
        )
    except Exception as e:
        logger.error(f"获取模型列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取模型列表失败: {str(e)}"
        )


@router.post("/extract-patient-info-from-image", response_model=ExtractPatientInfoFromImageResponse)
async def extract_patient_info_from_image(request: ExtractPatientInfoFromImageRequest):
    """
    从图像中提取患者信息
    
    使用本地视觉模型直接从屏幕截图中提取患者信息,无需OCR中间步骤
    """
    try:
        if not request.image:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="图像数据不能为空"
            )
        
        logger.info(f"收到图像患者信息提取请求,模型: {request.model}, 模式: {request.force_mode or '默认'}")
        
        import time
        start_time = time.time()
        
        # 调用AI服务管理器
        patient_info = await ai_service_manager.extract_patient_info_from_image(
            image_data=request.image,
            force_mode=request.force_mode
        )
        
        processing_time = time.time() - start_time
        
        extraction_method = patient_info.pop('extraction_method', 'unknown')
        
        logger.info(f"患者信息提取成功: {patient_info.get('name', 'Unknown')}, 耗时: {processing_time:.2f}s")
        
        return ExtractPatientInfoFromImageResponse(
            success=True,
            patient_info=patient_info,
            processing_time=processing_time,
            model_used=request.model,
            extraction_method=extraction_method,
            message="患者信息提取成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"提取患者信息失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"提取患者信息失败: {str(e)}"
        )


@router.post("/generate-recommendations", response_model=GenerateRecommendationsResponse)
async def generate_recommendations(request: GenerateRecommendationsRequest):
    """
    基于本地模型生成检查推荐
    
    使用本地AI模型根据患者信息生成检查项目推荐
    """
    try:
        patient_info = request.patient_info
        
        # 验证必要字段
        if not patient_info.get('name'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="患者姓名不能为空"
            )
        
        logger.info(f"收到推荐生成请求: patient={patient_info.get('name')}, 模式: {request.force_mode or '默认'}")
        
        # 调用AI服务管理器
        recommendations = await ai_service_manager.generate_recommendations(
            patient_name=patient_info.get('name', ''),
            gender=patient_info.get('gender', '未知'),
            age=patient_info.get('age', 0),
            chief_complaint=patient_info.get('chiefComplaint', patient_info.get('chief_complaint', '')),
            medical_history=patient_info.get('medicalHistory', patient_info.get('medical_history', '')),
            force_mode=request.force_mode
        )
        
        # 提取生成方法
        generation_method = 'unknown'
        if recommendations and len(recommendations) > 0:
            generation_method = recommendations[0].pop('generation_method', 'unknown')
            # 移除其他推荐中的generation_method
            for rec in recommendations[1:]:
                rec.pop('generation_method', None)
        
        logger.info(f"推荐生成成功: {len(recommendations)} 条推荐")
        
        return GenerateRecommendationsResponse(
            success=True,
            recommendations=recommendations,
            generation_method=generation_method,
            message=f"成功生成 {len(recommendations)} 条推荐"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成推荐失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成推荐失败: {str(e)}"
        )


@router.post("/switch-mode")
async def switch_mode(mode: str):
    """
    切换AI服务模式
    
    Args:
        mode: 模式(local/cloud/hybrid)
    """
    try:
        ai_service_manager.set_mode(mode)
        
        return {
            "success": True,
            "current_mode": mode,
            "message": f"已切换到 {mode} 模式"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"切换模式失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"切换模式失败: {str(e)}"
        )

