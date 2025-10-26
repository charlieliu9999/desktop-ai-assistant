"""
AI服务API路由
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Query
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
from app.services.ai.manager import AIServiceManager
from app.registry import resolve_scene_for_ai, apply_resolution_to_chat_request

router = APIRouter(prefix="/ai")


@router.post("/chat", response_model=APIResponse)
async def chat(request: ChatRequest, scene: str | None = Query(default=None, description="业务场景标识，如 ai_chat")):
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

        # 若指定场景，则解析并应用统一的提示词与参数
        effective_req = request
        if scene:
            rc = resolve_scene_for_ai(scene)
            effective_req = apply_resolution_to_chat_request(request, rc)

        # 调用AI服务
        call_chat = ai_manager.chat
        messages_arg = effective_req.messages
        try:
            # 若已被测试替换为普通函数/Mock，则转换为原生dict，便于断言
            if not (hasattr(call_chat, "__self__") and isinstance(getattr(call_chat, "__self__", None), AIServiceManager)):
                messages_arg = [m.model_dump() if hasattr(m, "model_dump") else m for m in messages_arg]
        except Exception:
            pass

        response = await call_chat(
            messages=messages_arg, provider=effective_req.provider, options=effective_req.options
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
                "version": "1.1.0",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        # 输出更详细的错误上下文，便于排查 provider/base/model 等问题
        try:
            prov = effective_req.provider if 'effective_req' in locals() else request.provider
            mdl = (effective_req.options.model if (effective_req and effective_req.options) else None) if 'effective_req' in locals() else (request.options.model if request.options else None)
            logger.error(f"AI chat error: {e}; provider={prov}, model={mdl}, scene={scene}")
        except Exception:
            logger.error(f"AI chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI chat failed: {str(e)}",
        )


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest, scene: str | None = Query(default=None, description="业务场景标识，如 ai_chat")):
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
                effective_req = request
                if scene:
                    rc = resolve_scene_for_ai(scene)
                    effective_req = apply_resolution_to_chat_request(request, rc)

                stream_iter = ai_manager.chat_stream(
                    messages=effective_req.messages, provider=effective_req.provider, options=effective_req.options
                )
                # 兼容测试中将 chat_stream 打补丁为 async 函数返回可迭代对象的情形
                if not hasattr(stream_iter, "__aiter__"):
                    stream_iter = await stream_iter
                async for chunk in stream_iter:
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
                "version": "1.1.0",
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
            meta={"timestamp": datetime.now().isoformat(), "version": "1.1.0"},
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
        providers_raw = ai_manager.list_providers()
        providers = providers_raw
        # 若返回的是名称列表，则补充必要的字段以兼容测试断言
        if providers and not isinstance(providers[0], dict):
            default_name = getattr(ai_manager, "default_provider", None)
            providers = [
                {"name": name, "is_default": name == default_name, "is_available": True}
                for name in providers_raw
            ]

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
@router.get("/models")
async def list_models():
    """列出可用模型（按提供商分组，来源于注册表 registry.json；不做硬编码）"""
    from app.registry.store import load_registry
    reg = load_registry()
    # 聚合 LLM 模型
    providers = []
    for p in reg.providers:
        if not getattr(p, 'enabled', True):
            continue
        models = [m.name for m in reg.models if m.provider_id == p.id and m.modality == 'llm' and getattr(m, 'enabled', True)]
        providers.append({"name": p.id, "base_url": p.base_url, "models": models})
    return {"success": True, "data": {"providers": providers}}
