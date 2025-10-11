"""
AI服务API路由
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from loguru import logger

from app.services.ai import (
    ai_manager,
    ChatRequest,
    AnalyzeRequest,
    APIResponse,
    Message,
    ChatOptions,
)

router = APIRouter(prefix="/ai")


@router.post("/chat", response_model=APIResponse)
async def chat(request: ChatRequest):
    """
    AI对话 - 标准模式

    Args:
        request: 对话请求

    Returns:
        对话响应

    Raises:
        HTTPException: 请求失败时抛出异常
    """
    try:
        request_id = str(uuid.uuid4())
        start_time = datetime.now()

        logger.info(f"[{request_id}] AI chat request, messages: {len(request.messages)}")

        # 验证消息
        if not request.messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Messages cannot be empty"
            )

        # 调用AI服务
        response = await ai_manager.chat(
            messages=request.messages, provider=request.provider, options=request.options
        )

        # 计算处理时间
        processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000

        logger.info(
            f"[{request_id}] AI chat completed, "
            f"provider: {response.provider}, "
            f"tokens: {response.usage.total_tokens}, "
            f"time: {processing_time_ms:.2f}ms"
        )

        return APIResponse(
            success=True,
            data={
                "message": response.message.dict(),
                "usage": response.usage.dict(),
                "model": response.model,
                "finish_reason": response.finish_reason,
                "provider": response.provider,
            },
            meta={
                "request_id": request_id,
                "timestamp": datetime.now().isoformat(),
                "processing_time_ms": processing_time_ms,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI chat failed: {str(e)}",
        )


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    AI对话 - 流式模式

    Args:
        request: 对话请求

    Returns:
        SSE流式响应

    Raises:
        HTTPException: 请求失败时抛出异常
    """
    try:
        request_id = str(uuid.uuid4())

        logger.info(f"[{request_id}] AI stream chat request, messages: {len(request.messages)}")

        # 验证消息
        if not request.messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Messages cannot be empty"
            )

        # 生成SSE流
        async def generate():
            try:
                async for chunk in ai_manager.chat_stream(
                    messages=request.messages, provider=request.provider, options=request.options
                ):
                    # 发送SSE事件
                    yield f"data: {chunk.json()}\n\n"

                logger.info(f"[{request_id}] AI stream chat completed")

            except Exception as e:
                logger.error(f"[{request_id}] AI stream chat error: {e}")
                error_chunk = {
                    "type": "error",
                    "error": str(e),
                    "request_id": request_id,
                }
                yield f"data: {error_chunk}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI stream chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI stream chat failed: {str(e)}",
        )


@router.post("/analyze", response_model=APIResponse)
async def analyze(request: AnalyzeRequest):
    """
    AI内容分析

    Args:
        request: 分析请求

    Returns:
        分析响应

    Raises:
        HTTPException: 请求失败时抛出异常
    """
    try:
        request_id = str(uuid.uuid4())
        start_time = datetime.now()

        logger.info(
            f"[{request_id}] AI analyze request, "
            f"type: {request.analysis_type}, "
            f"content_length: {len(request.content)}"
        )

        # 验证内容
        if not request.content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Content cannot be empty"
            )

        # 调用AI服务
        response = await ai_manager.analyze(
            content=request.content,
            analysis_type=request.analysis_type,
            extract_fields=request.extract_fields,
            options=request.options,
        )

        # 计算处理时间
        processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000

        logger.info(
            f"[{request_id}] AI analyze completed, "
            f"provider: {response.provider}, "
            f"confidence: {response.confidence:.2f}, "
            f"time: {processing_time_ms:.2f}ms"
        )

        return APIResponse(
            success=True,
            data={
                "analysis_type": response.analysis_type,
                "extracted_data": response.extracted_data,
                "confidence": response.confidence,
                "raw_response": response.raw_response,
                "provider": response.provider,
            },
            meta={
                "request_id": request_id,
                "timestamp": datetime.now().isoformat(),
                "processing_time_ms": processing_time_ms,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI analyze error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analyze failed: {str(e)}",
        )


@router.get("/health", response_model=APIResponse)
async def health():
    """
    获取所有AI提供商健康状态

    Returns:
        健康状态响应
    """
    try:
        health_status = await ai_manager.get_all_providers_health()

        # 转换为字典格式
        health_dict = {name: status.dict() for name, status in health_status.items()}

        return APIResponse(
            success=True,
            data={"providers": health_dict},
            meta={"timestamp": datetime.now().isoformat()},
        )

    except Exception as e:
        logger.error(f"Health check error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}",
        )


@router.get("/providers", response_model=APIResponse)
async def list_providers():
    """
    列出所有已注册的AI提供商

    Returns:
        提供商列表响应
    """
    try:
        providers = ai_manager.list_providers()

        return APIResponse(
            success=True,
            data={"providers": providers},
            meta={"timestamp": datetime.now().isoformat()},
        )

    except Exception as e:
        logger.error(f"List providers error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"List providers failed: {str(e)}",
        )

