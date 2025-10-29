"""
FastAPI应用主入口
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

# 加载环境变量
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

from app.config import settings
from app.database import init_db
from app.api.v1 import router as v1_router
from app.services.ai import ai_manager, ProviderConfig, OpenAIProvider, DeepseekProvider
from app.services.ai.providers import OllamaProvider
from app.registry import load_registry
from app.core.errors import AppError, error_payload

# 配置日志
logger.remove()
# 控制台输出
logger.add(
    sys.stdout,
    level=settings.LOG_LEVEL,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
)
# 主日志文件（统一写到 logs/backend.log）
logger.add(
    settings.LOG_FILE,
    rotation="200 MB",
    retention="10 days",
    level=settings.LOG_LEVEL
)
# 兼容旧路径：同时写一份到 logs/app.log，避免历史脚本/工具找不到日志
try:
    logger.add(
        "logs/app.log",
        rotation="200 MB",
        retention="5 days",
        level=settings.LOG_LEVEL
    )
except Exception:
    pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    import httpx
    from sqlalchemy import text
    from app.database import SessionLocal

    logger.info("=" * 60)
    logger.info(f"启动 {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"调试模式: {settings.DEBUG}")
    logger.info(f"监听地址: {settings.HOST}:{settings.PORT}")
    logger.info("=" * 60)

    # 初始化数据库(可选)
    if settings.DATABASE_REQUIRED:
        try:
            init_db()
            logger.info("✓ 数据库初始化成功")
        except Exception as e:
            logger.error(f"✗ 数据库初始化失败: {e}")
            raise  # 如果数据库是必需的,则抛出异常
    else:
        try:
            init_db()
            logger.info("✓ 数据库初始化成功")
        except Exception as e:
            logger.warning(f"⚠ 数据库初始化失败(非必需): {e}")
            logger.info("应用将继续运行,但依赖数据库的功能将不可用")

    # 服务自检
    logger.info("-" * 60)
    logger.info("开始服务自检...")
    logger.info("-" * 60)

    # 检查本地AI服务
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.LOCAL_AI_ENDPOINT}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                logger.info(f"✓ 本地AI服务 (Ollama) 连接成功")
                logger.info(f"  端点: {settings.LOCAL_AI_ENDPOINT}")
                logger.info(f"  可用模型数: {len(models)}")
                if models:
                    model_names = [m.get("name", "unknown") for m in models[:3]]
                    logger.info(f"  模型示例: {', '.join(model_names)}")
            else:
                logger.warning(f"⚠ 本地AI服务响应异常: HTTP {response.status_code}")
    except Exception as e:
        logger.warning(f"⚠ 本地AI服务不可用: {e}")
        logger.info(f"  请确保 Ollama 已启动: {settings.LOCAL_AI_ENDPOINT}")

    # 检查Bisheng服务
    if settings.BISHENG_ENABLED:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{settings.BISHENG_BASE_URL}/health")
                if response.status_code == 200:
                    logger.info(f"✓ Bisheng 服务连接成功")
                    logger.info(f"  后端: {settings.BISHENG_BASE_URL}")
                    logger.info(f"  前端: {settings.BISHENG_FRONTEND_URL}")
                    if settings.BISHENG_ACCESS_TOKEN:
                        logger.info(f"  认证: 已配置")
                    else:
                        logger.info(f"  认证: 未配置 (需要登录)")
                else:
                    logger.warning(f"⚠ Bisheng 服务响应异常: HTTP {response.status_code}")
        except Exception as e:
            logger.warning(f"⚠ Bisheng 服务不可用: {e}")
            logger.info(f"  请确保 Bisheng 已启动: {settings.BISHENG_BASE_URL}")
    else:
        logger.info("○ Bisheng 服务已禁用")

    # 检查Deepseek API配置
    if settings.DEEPSEEK_API_KEY:
        logger.info(f"✓ Deepseek AI 已配置")
        logger.info(f"  模型: {settings.DEEPSEEK_MODEL}")
    else:
        logger.info(f"○ Deepseek AI 未配置 (可选)")

    # 初始化AI服务管理器
    logger.info("-" * 60)
    logger.info("初始化AI服务管理器...")
    logger.info("-" * 60)

    # 先加载外部模型配置并应用到 settings（运行期）
    try:
        from app.config_models import load_config, apply_to_settings
        cfg = load_config()
        apply_to_settings(cfg)
        logger.info("✓ 已加载运行期模型配置（config/models.json）")
        if getattr(cfg, 'lock', False):
            logger.info("  前端模型编辑：已锁定")
    except Exception as e:
        logger.warning(f"⚠ 加载运行期模型配置失败：{e}")

    # 注册OpenAI提供商
    if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
        try:
            openai_config = ProviderConfig(
                name="openai",
                api_key=settings.OPENAI_API_KEY,
                api_base=getattr(settings, 'OPENAI_API_BASE', 'https://api.openai.com/v1'),
                model=getattr(settings, 'OPENAI_MODEL', 'gpt-4'),
                enabled=True,
                timeout=30,
                max_retries=3
            )
            openai_provider = OpenAIProvider(openai_config)
            ai_manager.register_provider("openai", openai_provider, is_default=True)
            logger.info(f"✓ OpenAI 提供商已注册")
            logger.info(f"  模型: {openai_config.model}")
        except Exception as e:
            logger.warning(f"⚠ OpenAI 提供商注册失败: {e}")
    else:
        logger.info(f"○ OpenAI 未配置")

    # 注册Deepseek提供商
    if settings.DEEPSEEK_API_KEY:
        try:
            deepseek_config = ProviderConfig(
                name="deepseek",
                api_key=settings.DEEPSEEK_API_KEY,
                api_base=settings.DEEPSEEK_API_BASE,
                model=settings.DEEPSEEK_MODEL,
                enabled=True,
                timeout=30,
                max_retries=3
            )
            deepseek_provider = DeepseekProvider(deepseek_config)
            ai_manager.register_provider("deepseek", deepseek_provider, is_default=not hasattr(settings, 'OPENAI_API_KEY'))
            logger.info(f"✓ Deepseek 提供商已注册")
            logger.info(f"  模型: {deepseek_config.model}")
        except Exception as e:
            logger.warning(f"⚠ Deepseek 提供商注册失败: {e}")

    # 注册 DashScope（阿里云）提供商（OpenAI兼容）
    try:
        import os as _os
        # 同时支持 .env(Settings) 与环境变量两种来源
        dash_key = getattr(settings, 'DASHSCOPE_API_KEY', '') or _os.getenv('DASHSCOPE_API_KEY', '')
        dash_base = getattr(settings, 'DASHSCOPE_API_BASE', '') or _os.getenv('DASHSCOPE_API_BASE', 'https://dashscope.aliyuncs.com/compatible-mode/v1')
        if dash_key:
            try:
                # 使用Dashscope的默认模型,而不是AI_CHAT_MODEL
                dash_model = getattr(settings, 'DASHSCOPE_MODEL', 'qwen-max')
                dash_cfg = ProviderConfig(
                    name="dashscope",
                    api_key=dash_key,
                    api_base=dash_base,
                    model=dash_model,
                    enabled=True,
                    timeout=30,
                    max_retries=3
                )
                dash_provider = OpenAIProvider(dash_cfg)
                ai_manager.register_provider("dashscope", dash_provider, is_default=False)
                logger.info("✓ DashScope 提供商已注册")
                logger.info(f"  模型: {dash_model}")
                logger.info(f"  基址: {dash_base}")
            except Exception as e:
                logger.warning(f"⚠ DashScope 提供商注册失败: {e}")
        else:
            logger.info("○ DashScope 未配置（DASHSCOPE_API_KEY 为空）")
    except Exception as e:
        logger.warning(f"⚠ 检查 DashScope 配置失败: {e}")

    # 检测本地 Ollama 并注册为专用 Provider（命名为 'local'）。
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.LOCAL_AI_ENDPOINT}/api/tags")
        if resp.status_code == 200:
            try:
                local_base = f"{settings.LOCAL_AI_ENDPOINT}"
                local_model = getattr(settings, 'AI_CHAT_MODEL', 'qwen2.5:32b')
                local_cfg = ProviderConfig(
                    name="local",
                    api_key="",
                    api_base=local_base,
                    model=local_model,
                    enabled=True,
                    timeout=30,
                    max_retries=3
                )
                local_provider = OllamaProvider(local_cfg)
                ai_manager.register_provider("local", local_provider, is_default=False)
                logger.info("✓ 已注册本地 Ollama 提供商为 'local'")
                logger.info(f"  端点: {local_base}")
                logger.info(f"  模型: {local_model}")
            except Exception as e:
                logger.warning(f"⚠ 本地 OpenAI 兼容提供商注册失败: {e}")
        else:
            logger.info("○ 本地AI服务不可用，未注册本地提供商")
    except Exception as e:
        logger.warning(f"⚠ 检查/注册本地提供商时出错: {e}")

    # 设置故障转移提供商
    fallback_providers = []
    if settings.DEEPSEEK_API_KEY:
        fallback_providers.append("deepseek")
    if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
        fallback_providers.append("openai")

    if fallback_providers:
        ai_manager.set_fallback_providers(fallback_providers)
        logger.info(f"✓ 故障转移提供商: {', '.join(fallback_providers)}")

    logger.info("-" * 60)
    logger.info("AI服务管理器初始化完成")
    logger.info("-" * 60)

    # 从注册中心引导 Provider（兼容 OpenAI 模式的提供商）
    try:
        reg = load_registry()
        for p in reg.providers:
            # 已注册则跳过
            if p.id in ai_manager.providers:
                continue
            # 目前使用 OpenAI 兼容客户端统一接入
            if p.kind == "openai":
                # 取 base_url 与 api_key（优先 env，再回退 settings）
                api_key = None
                import os as _os
                if p.auth and p.auth.type == "env" and p.auth.env_key:
                    api_key = _os.getenv(p.auth.env_key, "") or None
                if not api_key:
                    # 回退 settings 已知字段
                    if p.id == "openai" and getattr(settings, 'OPENAI_API_KEY', ''):
                        api_key = settings.OPENAI_API_KEY
                    elif p.id == "deepseek" and getattr(settings, 'DEEPSEEK_API_KEY', ''):
                        api_key = settings.DEEPSEEK_API_KEY
                    elif p.id == "dashscope":
                        api_key = getattr(settings, 'DASHSCOPE_API_KEY', '') or _os.getenv('DASHSCOPE_API_KEY', '') or None

                try:
                    cfg = ProviderConfig(
                        name=p.id,
                        api_key=api_key or "",
                        api_base=p.base_url,
                        model=getattr(settings, 'AI_CHAT_MODEL', 'gpt-4o-mini'),
                        enabled=p.enabled,
                        timeout=30,
                        max_retries=3,
                    )
                    # 如果需要密钥但未配置，则跳过注册，避免不可用 Provider 误导
                    if p.id in ("openai", "deepseek", "dashscope") and not cfg.api_key:
                        logger.info(f"○ 跳过注册中心 Provider {p.id}（缺少 API Key）")
                    else:
                        prov_client = OpenAIProvider(cfg)
                        ai_manager.register_provider(p.id, prov_client, is_default=False)
                        logger.info(f"✓ 注册中心引导 Provider: {p.id}")
                except Exception as e:
                    logger.warning(f"⚠ Provider({p.id}) 注册失败: {e}")
            elif p.kind == "ollama":
                try:
                    cfg = ProviderConfig(
                        name=p.id,
                        api_key="",
                        api_base=p.base_url,
                        model=getattr(settings, 'AI_CHAT_MODEL', 'qwen2.5:32b'),
                        enabled=p.enabled,
                        timeout=30,
                        max_retries=3,
                    )
                    prov_client = OllamaProvider(cfg)
                    ai_manager.register_provider(p.id, prov_client, is_default=False)
                    logger.info(f"✓ 注册中心引导 Provider: {p.id} (ollama)")
                except Exception as e:
                    logger.warning(f"⚠ Provider({p.id}) 注册失败: {e}")
    except Exception as e:
        logger.warning(f"⚠ 从注册中心引导 Provider 失败: {e}")

    # 初始化视觉服务
    logger.info("-" * 60)
    logger.info("初始化视觉服务...")
    logger.info("-" * 60)

    from app.services.vision import OCRService, VisionService
    from app.api.v1 import vision as vision_api

    ocr_service = OCRService()
    vision_service = VisionService(ai_manager=ai_manager)

    vision_api.ocr_service = ocr_service
    vision_api.vision_service = vision_service

    logger.info("✓ OCR服务初始化完成")
    logger.info("✓ 视觉理解服务初始化完成")

    # 初始化语音服务
    logger.info("-" * 60)
    logger.info("初始化语音服务...")
    logger.info("-" * 60)

    from app.services.voice import STTService, TTSService
    from app.api.v1 import voice as voice_api

    # 使用OpenAI Whisper API作为默认STT provider (更稳定,无需本地依赖)
    # 可选: provider="local", model_name="base" (需要安装whisper和ffmpeg)
    # 可选: provider="faster-whisper", model_name="base" (需要安装faster-whisper)
    stt_service = STTService(provider="openai", model_name="whisper-1")
    tts_service = TTSService(model_name="tts-1")

    voice_api.stt_service = stt_service
    voice_api.tts_service = tts_service

    logger.info("✓ STT服务初始化完成")
    logger.info("✓ TTS服务初始化完成")

    # 初始化智能体服务
    logger.info("-" * 60)
    logger.info("初始化智能体服务...")
    logger.info("-" * 60)

    from app.services.agent import AgentManager, BishengService, BishengConfig
    from app.api.v1 import agent as agent_api

    # 创建智能体管理器
    agent_mgr = AgentManager()

    # 如果Bisheng启用，注册服务
    if settings.BISHENG_ENABLED:
        try:
            bisheng_config = BishengConfig(
                enabled=settings.BISHENG_ENABLED,
                base_url=settings.BISHENG_BASE_URL,
                frontend_url=settings.BISHENG_FRONTEND_URL,
                username=settings.BISHENG_USERNAME,
                password=settings.BISHENG_PASSWORD,
                access_token=settings.BISHENG_ACCESS_TOKEN,
                mode=settings.BISHENG_DEFAULT_MODE,
                timeout=30,
                retry_attempts=3
            )
            bisheng_service = BishengService(bisheng_config)
            agent_mgr.register_service("bisheng", bisheng_service)
            logger.info("✓ Bisheng智能体服务已注册")
        except Exception as e:
            logger.warning(f"⚠ Bisheng智能体服务注册失败: {e}")
    else:
        logger.info("○ Bisheng智能体服务已禁用")

    # 设置到API模块
    agent_api.set_agent_manager(agent_mgr)

    logger.info("-" * 60)
    logger.info("智能体服务初始化完成")
    logger.info("-" * 60)
    voice_api.tts_service = tts_service

    logger.info("✓ 语音识别服务初始化完成")
    logger.info("✓ 语音合成服务初始化完成")

    logger.info("-" * 60)
    logger.info("服务自检完成")
    logger.info("=" * 60)
    logger.info(f"API 文档: http://{settings.HOST}:{settings.PORT}/docs")
    logger.info(f"健康检查: http://{settings.HOST}:{settings.PORT}/health")
    logger.info(f"详细健康检查: http://{settings.HOST}:{settings.PORT}/health/detailed")
    logger.info("=" * 60)

    yield

    # 关闭时执行
    logger.info("应用正在关闭...")


# 创建FastAPI应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI医疗助手后端API服务",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 统一版本与弃用标识（中间件）
@app.middleware("http")
async def version_and_deprecation_headers(request, call_next):
    response = await call_next(request)
    path = request.url.path or ""
    try:
        if path.startswith("/v1/"):
            response.headers["X-API-Version"] = "1.1.0"
        if path.startswith("/api/"):
            # 标注为弃用，并在日志中提示迁移
            response.headers["X-Deprecated"] = "true; use /v1/*"
            from loguru import logger as _lg
            _lg.warning(f"Deprecated API used: {path}. Please migrate to /v1/*")
    except Exception:
        pass
    return response


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content=error_payload(exc.code, exc.message, exc.details))


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # 将HTTP异常包装为统一错误结构
    msg = exc.detail if hasattr(exc, 'detail') else str(exc)
    code = f"http_{exc.status_code}"
    return JSONResponse(status_code=exc.status_code, content=error_payload(code, str(msg)))


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # 兜底异常处理，避免泄漏堆栈
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(status_code=500, content=error_payload("internal_error", "Internal Server Error"))




@app.get("/")
async def root():
    """根路径"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """
    简单健康检查
    用于快速检查服务是否运行
    """
    return {
        "status": "healthy",
        "version": settings.APP_VERSION
    }


@app.get("/health/detailed")
async def detailed_health_check():
    """
    详细健康检查
    检查所有依赖服务的状态
    """
    import httpx
    from sqlalchemy import text
    from app.database import SessionLocal

    health_status = {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "timestamp": __import__('datetime').datetime.now().isoformat(),
        "services": {}
    }

    # 检查数据库
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        health_status["services"]["database"] = {
            "status": "healthy",
            "url": settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "configured"
        }
    except Exception as e:
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        if settings.DATABASE_REQUIRED:
            health_status["status"] = "unhealthy"

    # 检查本地AI服务 (Ollama)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.LOCAL_AI_ENDPOINT}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                health_status["services"]["local_ai"] = {
                    "status": "healthy",
                    "endpoint": settings.LOCAL_AI_ENDPOINT,
                    "models_count": len(models)
                }
            else:
                health_status["services"]["local_ai"] = {
                    "status": "unhealthy",
                    "endpoint": settings.LOCAL_AI_ENDPOINT,
                    "error": f"HTTP {response.status_code}"
                }
    except Exception as e:
        health_status["services"]["local_ai"] = {
            "status": "unreachable",
            "endpoint": settings.LOCAL_AI_ENDPOINT,
            "error": str(e)
        }

    # 检查Bisheng服务
    if settings.BISHENG_ENABLED:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{settings.BISHENG_BASE_URL}/health")
                health_status["services"]["bisheng"] = {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "url": settings.BISHENG_BASE_URL,
                    "authenticated": bool(settings.BISHENG_ACCESS_TOKEN)
                }
        except Exception as e:
            health_status["services"]["bisheng"] = {
                "status": "unreachable",
                "url": settings.BISHENG_BASE_URL,
                "error": str(e)
            }
    else:
        health_status["services"]["bisheng"] = {
            "status": "disabled"
        }

    # 检查Deepseek API (如果配置了)
    if settings.DEEPSEEK_API_KEY:
        health_status["services"]["deepseek_ai"] = {
            "status": "configured",
            "model": settings.DEEPSEEK_MODEL
        }
    else:
        health_status["services"]["deepseek_ai"] = {
            "status": "not_configured"
        }

    return health_status


# 注册路由
# V1 API路由 (新架构)
app.include_router(v1_router)

# 已移除旧版 /api/* 路由挂载（完成迁移后不再提供）


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
