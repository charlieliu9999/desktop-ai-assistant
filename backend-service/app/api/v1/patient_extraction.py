"""
v1 患者信息提取 API
"""
from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from app.schemas.patient_extraction import (
    PatientExtractionRequest,
    PatientExtractionResponse,
    RecommendationGenerationRequest,
    RecommendationGenerationResponse,
)
from app.services.vision.models import VisionRequest

# 复用 vision 路由中初始化的服务实例
from app.api.v1 import vision as vision_api

# 兼容旧的本地AI服务（在无场景参数时可使用）
from app.services.local_ai_service import local_ai_service

router = APIRouter(prefix="/patient/extraction")


@router.post("/extract", response_model=PatientExtractionResponse)
async def extract_patient_info_v1(
    request: PatientExtractionRequest,
    scene: str | None = Query(default=None, description="业务场景标识，如 screen_recognition")
):
    """
    从图像中提取患者信息（v1）

    优先支持基于场景的视觉识别；若未提供场景，回退到本地AI服务的实现。
    """
    try:
        # 场景驱动：通过视觉服务按场景注入模型/系统提示，并启用严格JSON与内置 schema
        if scene:
            if not vision_api.vision_service:
                raise HTTPException(status_code=503, detail="视觉服务未初始化")

            vr = VisionRequest(
                image_data=request.image_data,
                prompt=("请从图像中稳健提取患者信息并输出严格JSON。"),
                strict_json=True,
                schema_name="patient_info_v1",
                allow_fallback=True,
            )

            # 引入与 /v1/vision/understand 相同的场景注入策略
            if scene:
                from app.registry import resolve_scene_for_ai

                rc = resolve_scene_for_ai(scene)
                if rc.system_prompt:
                    vr.prompt = f"{rc.system_prompt}\n\n{vr.prompt}".strip()
                if not vr.model:
                    vr.model = rc.model_name
                if not getattr(vr, 'provider', None):
                    try:
                        object.__setattr__(vr, 'provider', rc.provider_id)
                    except Exception:
                        try:
                            vr.provider = rc.provider_id  # type: ignore
                        except Exception:
                            pass
                if "temperature" in rc.merged_params and (vr.temperature == 0.7):
                    try:
                        vr.temperature = float(rc.merged_params.get("temperature"))
                    except Exception:
                        pass
                if "max_tokens" in rc.merged_params and (vr.max_tokens == 1000):
                    try:
                        vr.max_tokens = int(rc.merged_params.get("max_tokens"))
                    except Exception:
                        pass

            logger.info(f"/v1/patient/extraction/extract via vision scene={scene}")
            resp = await vision_api.vision_service.understand(vr)
            if not resp.success:
                raise HTTPException(status_code=500, detail=resp.error)

            patient_info = None
            try:
                if resp.result and resp.result.structured:
                    patient_info = resp.result.structured
                elif resp.result and resp.result.description:
                    # 若无 structured，尽力返回文本描述供前端兜底解析
                    patient_info = {"raw": resp.result.description}
            except Exception:
                patient_info = None

            return PatientExtractionResponse(success=True, patient_info=patient_info)

        # 无场景：兼容旧实现
        logger.info("/v1/patient/extraction/extract via local_ai_service (no scene)")
        patient_info = await local_ai_service.extract_patient_info_from_image(
            image_data=request.image_data,
            prompt_template=request.prompt_template,
        )
        return PatientExtractionResponse(success=True, patient_info=patient_info)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"v1 extract_patient_info failed: {e}")
        return PatientExtractionResponse(success=False, error=str(e))


@router.post("/recommendations", response_model=RecommendationGenerationResponse)
async def generate_recommendations_v1(request: RecommendationGenerationRequest):
    """
    生成多类型推荐（检查、用药、诊断）（v1）
    兼容旧有本地AI服务的实现。
    """
    try:
        logger.info(
            f"/v1/patient/extraction/recommendations patient={request.patient_name}, types={request.recommendation_types}"
        )

        recommendations = {}
        for rec_type in request.recommendation_types:
            try:
                recs = await local_ai_service.generate_recommendations(
                    patient_name=request.patient_name,
                    gender=request.gender,
                    age=request.age,
                    chief_complaint=request.chief_complaint,
                    medical_history=request.medical_history,
                    recommendation_type=rec_type,
                )
                recommendations[rec_type] = recs
            except Exception as e:
                logger.error(f"generate {rec_type} failed: {e}")
                recommendations[rec_type] = []

        return RecommendationGenerationResponse(success=True, recommendations=recommendations)

    except Exception as e:
        logger.error(f"v1 generate_recommendations failed: {e}")
        return RecommendationGenerationResponse(success=False, error=str(e), recommendations={})
