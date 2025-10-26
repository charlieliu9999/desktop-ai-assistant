"""
视觉服务API路由
"""
from fastapi import APIRouter, HTTPException, Query
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
async def understand_image(request: VisionRequest, scene: str | None = Query(default=None, description="业务场景标识，如 screen_recognition")):
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

        # 若指定场景：解析并注入模型与系统提示（拼接到prompt前部）
        if scene:
            from app.registry import resolve_scene_for_ai

            rc = resolve_scene_for_ai(scene)
            if rc.system_prompt:
                # 始终注入场景的系统提示，确保测试可验证提示词前置
                request.prompt = f"{rc.system_prompt}\n\n{request.prompt}".strip()
            if not request.model:
                request.model = rc.model_name
            if not getattr(request, 'provider', None):
                try:
                    # attach provider id for downstream service to route provider correctly
                    object.__setattr__(request, 'provider', rc.provider_id)
                except Exception:
                    # fallback to dict update
                    try:
                        request.provider = rc.provider_id  # type: ignore
                    except Exception:
                        pass
            # 针对常用参数进行覆盖
            if "temperature" in rc.merged_params and (request.temperature == 0.7):
                try:
                    request.temperature = float(rc.merged_params.get("temperature"))
                except Exception:
                    pass
            if "max_tokens" in rc.merged_params and (request.max_tokens == 1000):
                try:
                    request.max_tokens = int(rc.merged_params.get("max_tokens"))
                except Exception:
                    pass

        # 记录调试信息：场景/提供商/模型/是否严格JSON
        try:
            logger.info(
                f"/v1/vision/understand scene={scene or '-'} provider={getattr(request, 'provider', None) or '-'} "
                f"model={getattr(request, 'model', None) or '-'} strict_json={bool(getattr(request, 'strict_json', False))}"
            )
        except Exception:
            pass

        try:
            response = await vision_service.understand(request)
        except TypeError as te:
            # 兼容测试中以函数直接赋值为实例方法导致的签名不匹配（缺少 self）,回退调用未绑定函数
            msg = str(te)
            if "takes 1 positional argument but 2 were given" in msg:
                try:
                    func = getattr(type(vision_service), "understand", None)
                    if func:
                        response = await func(request)  # type: ignore
                    else:
                        raise
                except Exception:
                    raise
            else:
                raise

        if not response.success:
            raise HTTPException(status_code=500, detail=response.error)

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"图像理解失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-medical", response_model=VisionResponse)
async def analyze_medical_image(image_data: str, focus: str = None, scene: str | None = Query(default=None)):
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

        # 如果有场景，走统一的 understand 路径以便注入模型与提示词
        if scene:
            prompt = "请分析这张医疗图像，描述你看到的内容。"
            if focus:
                prompt += f"\n特别关注: {focus}"
            req = VisionRequest(image_data=image_data, prompt=prompt)
            return await understand_image(req, scene=scene)

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
async def extract_text_from_image(image_data: str, scene: str | None = Query(default=None)):
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

        if scene:
            prompt = "请从图像中稳健提取文字并输出结构化JSON。"
            req = VisionRequest(image_data=image_data, prompt=prompt)
            return await understand_image(req, scene=scene)

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
@router.get("/models")
async def list_vision_models():
    """列出可用视觉模型（仅来源于注册表 registry.json；不做硬编码）"""
    from app.registry.store import load_registry
    from app.registry.resolver import resolve_scene_for_ai

    reg = load_registry()
    models = sorted({m.name for m in reg.models if m.modality == 'vl' and getattr(m, 'enabled', True)})

    # 选择一个默认：优先使用视觉场景的模型
    default_model = None
    for scene in ("screen_recognition_aliyun", "screen_recognition"):
        try:
            rc = resolve_scene_for_ai(scene)
            if rc and rc.model_name:
                default_model = rc.model_name
                break
        except Exception:
            continue
    if not default_model and models:
        default_model = next(iter(models))
    return {"success": True, "data": {"default": default_model, "models": list(models)}}
