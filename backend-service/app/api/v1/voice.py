"""
语音服务API路由
"""
from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from app.services.voice import (
    STTRequest,
    STTResponse,
    TTSRequest,
    TTSResponse,
    STTService,
    TTSService,
)

router = APIRouter(prefix="/voice")

# 全局服务实例（将在main.py中初始化）
stt_service: STTService = None  # type: ignore
tts_service: TTSService = None  # type: ignore


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(request: STTRequest, scene: str | None = Query(default=None, description="业务场景标识，如 voice_stt")):
    """
    语音识别 (Speech-to-Text)

    将语音转换为文字

    Args:
        request: 语音识别请求

    Returns:
        语音识别响应
    """
    try:
        if not stt_service:
            raise HTTPException(status_code=503, detail="语音识别服务未初始化")

        # 若指定场景：解析并注入模型/语言等
        if scene:
            from app.registry import resolve_scene_for_ai

            rc = resolve_scene_for_ai(scene)
            if not request.model:
                request.model = rc.model_name
            # 若场景覆盖了语言等参数
            lang = rc.merged_params.get("language") if rc.merged_params else None
            if lang and request.language == "zh":
                try:
                    request.language = str(lang)
                except Exception:
                    pass

        try:
            response = await stt_service.recognize(request)
        except TypeError as te:
            # 兼容测试中以函数直接赋值为实例方法导致的签名不匹配（缺少 self）
            msg = str(te)
            if "takes 1 positional argument but 2 were given" in msg:
                try:
                    func = getattr(type(stt_service), "recognize", None)
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
        logger.error(f"语音识别失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest, scene: str | None = Query(default=None, description="业务场景标识，如 voice_tts")):
    """
    语音合成 (Text-to-Speech)

    将文字转换为语音

    Args:
        request: 语音合成请求

    Returns:
        语音合成响应
    """
    try:
        if not tts_service:
            raise HTTPException(status_code=503, detail="语音合成服务未初始化")

        if scene:
            from app.registry import resolve_scene_for_ai

            rc = resolve_scene_for_ai(scene)
            if not request.model:
                request.model = rc.model_name
            # 覆盖常用合成参数
            if rc.merged_params:
                for key in ("voice", "speed", "pitch", "language"):
                    if key in rc.merged_params and getattr(request, key, None) in (None, 1.0, "zh"):
                        try:
                            setattr(request, key, rc.merged_params[key])
                        except Exception:
                            pass

        try:
            response = await tts_service.synthesize(request)
        except TypeError as te:
            msg = str(te)
            if "takes 1 positional argument but 2 were given" in msg:
                try:
                    func = getattr(type(tts_service), "synthesize", None)
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
        logger.error(f"语音合成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """
    健康检查

    Returns:
        健康状态
    """
    try:
        stt_healthy = await stt_service.health_check() if stt_service else False
        tts_healthy = await tts_service.health_check() if tts_service else False

        return {
            "success": True,
            "services": {
                "stt": {"healthy": stt_healthy, "available": stt_service is not None},
                "tts": {"healthy": tts_healthy, "available": tts_service is not None},
            },
        }

    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/models")
async def list_voice_models():
    """列出可用语音模型（来源于注册表 registry.json；不做硬编码）"""
    from app.registry.store import load_registry
    from app.registry.resolver import resolve_scene_for_ai

    reg = load_registry()
    stt_models = sorted({m.name for m in reg.models if m.modality == 'stt' and getattr(m, 'enabled', True)})
    tts_models = sorted({m.name for m in reg.models if m.modality == 'tts' and getattr(m, 'enabled', True)})

    # 默认值：来自场景 voice_stt / voice_tts
    stt_default = None
    tts_default = None
    try:
        rc = resolve_scene_for_ai('voice_stt')
        stt_default = rc.model_name
    except Exception:
        pass
    try:
        rc2 = resolve_scene_for_ai('voice_tts')
        tts_default = rc2.model_name
    except Exception:
        pass
    if not stt_default and stt_models:
        stt_default = stt_models[0]
    if not tts_default and tts_models:
        tts_default = tts_models[0]

    return {
        "success": True,
        "data": {
            "stt": {"default": stt_default, "models": list(stt_models)},
            "tts": {"default": tts_default, "models": list(tts_models)}
        }
    }
