"""
智能推荐API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from loguru import logger

from app.database import get_db
from app.models.patient import Patient
from app.models.visit import Visit
from app.models.recommendation import Recommendation
from app.models.feedback import Feedback
from app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    RecommendationItem,
    FeedbackRequest,
    FeedbackResponse
)
from app.services.ai_service import ai_service

router = APIRouter()


@router.post("/generate", response_model=RecommendationResponse)
async def generate_recommendations(
    request: RecommendationRequest,
    db: Session = Depends(get_db)
):
    """生成检查项目推荐"""
    try:
        # 查找患者
        patient = db.query(Patient).filter(Patient.patient_id == request.patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"患者ID {request.patient_id} 不存在"
            )
        
        # 创建就诊记录
        visit = Visit(
            patient_id=patient.id,
            chief_complaint=request.chief_complaint,
            medical_history=request.medical_history,
            physical_examination=request.physical_examination
        )
        db.add(visit)
        db.commit()
        db.refresh(visit)
        
        logger.info(f"创建就诊记录: visit_id={visit.id}, patient={patient.name}")
        
        # 调用AI服务生成推荐
        ai_recommendations = await ai_service.generate_recommendations(
            patient_name=patient.name,
            gender=patient.gender or "未知",
            age=patient.age or 0,
            chief_complaint=request.chief_complaint,
            medical_history=request.medical_history or ""
        )
        
        # 保存推荐到数据库
        recommendations = []
        for ai_rec in ai_recommendations:
            recommendation = Recommendation(
                visit_id=visit.id,
                exam_title=ai_rec.get("title", ""),
                exam_type=ai_rec.get("exam_type"),
                body_part=ai_rec.get("body_part"),
                priority=ai_rec.get("priority"),
                reason=ai_rec.get("reason"),
                urgency=ai_rec.get("urgency"),
                estimated_cost=ai_rec.get("estimated_cost"),
                ai_confidence=ai_rec.get("confidence")
            )
            db.add(recommendation)
            recommendations.append(recommendation)
        
        db.commit()
        
        # 刷新所有推荐对象以获取ID
        for rec in recommendations:
            db.refresh(rec)
        
        logger.info(f"保存了 {len(recommendations)} 条推荐记录")
        
        # 转换为响应格式
        recommendation_items = [
            RecommendationItem.model_validate(rec) for rec in recommendations
        ]
        
        return RecommendationResponse(
            success=True,
            visit_id=visit.id,
            recommendations=recommendation_items
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成推荐失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成推荐失败: {str(e)}"
        )


@router.get("/{recommendation_id}", response_model=RecommendationItem)
async def get_recommendation(recommendation_id: int, db: Session = Depends(get_db)):
    """获取推荐详情"""
    recommendation = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"推荐记录 {recommendation_id} 不存在"
        )
    
    return recommendation


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    request: FeedbackRequest,
    db: Session = Depends(get_db)
):
    """提交用户反馈"""
    try:
        # 检查推荐记录是否存在
        recommendation = db.query(Recommendation).filter(
            Recommendation.id == request.recommendation_id
        ).first()

        if not recommendation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"推荐记录 {request.recommendation_id} 不存在"
            )

        # 创建反馈记录
        feedback = Feedback(
            recommendation_id=request.recommendation_id,
            feedback_type=request.feedback_type,
            comment=request.comment
        )
        db.add(feedback)
        db.commit()

        logger.info(f"收到反馈: recommendation_id={request.recommendation_id}, type={request.feedback_type}")

        return FeedbackResponse(
            success=True,
            message="感谢您的反馈!"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"提交反馈失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"提交反馈失败: {str(e)}"
        )


@router.post("/from-screen-capture", response_model=RecommendationResponse)
async def generate_recommendations_from_screen_capture(
    request: dict,
    db: Session = Depends(get_db)
):
    """
    从屏幕捕获的患者信息生成推荐

    接收从OCR提取的患者信息,生成检查项目推荐
    """
    try:
        patient_info = request.get('patient_info', {})

        # 验证必要字段
        if not patient_info.get('name'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="患者姓名不能为空"
            )

        # 查找或创建患者记录
        patient_id = patient_info.get('patient_id') or f"SCREEN_{patient_info['name']}_{hash(patient_info.get('chief_complaint', ''))}"
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()

        if not patient:
            # 创建新患者
            patient = Patient(
                patient_id=patient_id,
                name=patient_info['name'],
                gender=patient_info.get('gender'),
                age=patient_info.get('age', 0)
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)
            logger.info(f"创建新患者: {patient.name}")

        # 创建就诊记录
        visit = Visit(
            patient_id=patient.id,
            chief_complaint=patient_info.get('chief_complaint', ''),
            medical_history=patient_info.get('medical_history', ''),
            physical_examination=patient_info.get('diagnosis', '')
        )
        db.add(visit)
        db.commit()
        db.refresh(visit)

        logger.info(f"创建就诊记录: visit_id={visit.id}, patient={patient.name}")

        # 调用AI服务生成推荐
        ai_recommendations = await ai_service.generate_recommendations(
            patient_name=patient.name,
            gender=patient_info.get('gender', '未知'),
            age=patient_info.get('age', 0),
            chief_complaint=patient_info.get('chief_complaint', ''),
            medical_history=patient_info.get('medical_history', '')
        )

        # 保存推荐到数据库
        recommendations = []
        for ai_rec in ai_recommendations:
            recommendation = Recommendation(
                visit_id=visit.id,
                exam_title=ai_rec.get("title", ""),
                exam_type=ai_rec.get("exam_type"),
                body_part=ai_rec.get("body_part"),
                priority=ai_rec.get("priority"),
                reason=ai_rec.get("reason"),
                urgency=ai_rec.get("urgency"),
                estimated_cost=ai_rec.get("estimated_cost"),
                ai_confidence=ai_rec.get("confidence")
            )
            db.add(recommendation)
            recommendations.append(recommendation)

        db.commit()

        # 刷新所有推荐对象以获取ID
        for rec in recommendations:
            db.refresh(rec)

        logger.info(f"保存了 {len(recommendations)} 条推荐记录")

        # 转换为响应格式
        recommendation_items = [
            RecommendationItem.model_validate(rec) for rec in recommendations
        ]

        return RecommendationResponse(
            success=True,
            visit_id=visit.id,
            recommendations=recommendation_items
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成推荐失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成推荐失败: {str(e)}"
        )

