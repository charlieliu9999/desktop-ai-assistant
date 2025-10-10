"""
FastAPI应用主入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.api import patients, recommendations, ai_chat, local_ai, model_config, patient_extraction, bisheng
from app.api.v1 import router as v1_router
from app.services.ai import ai_manager, ProviderConfig, OpenAIProvider, DeepseekProvider

# 配置日志
logger.remove()
logger.add(
    sys.stdout,
    level=settings.LOG_LEVEL,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
)
logger.add(
    settings.LOG_FILE,
    rotation="500 MB",
    retention="10 days",
    level=settings.LOG_LEVEL
)


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

# 旧版API路由 (保持兼容)
app.include_router(patients.router, prefix="/api/patients", tags=["患者管理"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["智能推荐"])
app.include_router(ai_chat.router, prefix="/api/ai", tags=["AI问答"])
app.include_router(local_ai.router, prefix="/api/local-ai", tags=["本地AI"])
app.include_router(model_config.router, prefix="/api/model-config", tags=["模型配置"])
app.include_router(patient_extraction.router, prefix="/api/patient-extraction", tags=["患者信息提取"])
app.include_router(bisheng.router, prefix="/api/bisheng", tags=["Bisheng智能体"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )

