"""
应用配置文件
"""
from pydantic_settings import BaseSettings
from typing import List, Dict, Any
from pydantic import Field, ConfigDict


class ModelConfig(BaseSettings):
    """单个模型配置"""
    model_config = {"protected_namespaces": ()}  # 允许 model_ 前缀

    model_name: str
    base_url: str = "http://localhost:11434"
    api_key: str = ""
    temperature: float = 0.7
    max_tokens: int = 2000
    timeout: int = 60


class Settings(BaseSettings):
    """应用配置"""

    # Pydantic v2 配置：允许额外字段（用于 .env 中未在此定义的配置项）
    model_config = ConfigDict(
        extra='allow',  # 允许额外字段
        protected_namespaces=(),  # 允许 model_ 前缀
        env_file='.env',  # 从 .env 文件加载
        case_sensitive=True  # 区分大小写
    )

    # 应用基础配置
    APP_NAME: str = "AI医疗助手后端服务"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8010

    # 数据库配置(可选,Bisheng 功能不依赖数据库)
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/medical_ai"
    DATABASE_ECHO: bool = False
    DATABASE_REQUIRED: bool = False  # 数据库是否必需

    # Redis配置
    REDIS_URL: str = "redis://localhost:6379/0"

    # OpenAI配置
    OPENAI_API_KEY: str = ""
    OPENAI_API_BASE: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4"

    # Deepseek AI配置
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_API_BASE: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # 本地AI配置(Ollama) - 保留用于向后兼容
    AI_SERVICE_MODE: str = "local"  # local | cloud | hybrid
    LOCAL_AI_ENDPOINT: str = "http://localhost:11434"
    LOCAL_AI_MODEL: str = "qwen2.5vl:latest"  # 默认模型,保留用于向后兼容
    LOCAL_AI_TIMEOUT: int = 120
    LOCAL_AI_MAX_RETRIES: int = 3

    # 多场景模型配置
    # AI对话模型
    AI_CHAT_MODEL: str = "qwen2.5:32b"
    AI_CHAT_BASE_URL: str = "http://localhost:11434"
    AI_CHAT_TEMPERATURE: float = 0.7
    AI_CHAT_MAX_TOKENS: int = 2000

    # 检查项目推荐模型
    EXAM_RECOMMENDATION_MODEL: str = "qwen2.5:32b"
    EXAM_RECOMMENDATION_BASE_URL: str = "http://localhost:11434"
    EXAM_RECOMMENDATION_TEMPERATURE: float = 0.3
    EXAM_RECOMMENDATION_MAX_TOKENS: int = 2000

    # 用药推荐模型
    MEDICATION_RECOMMENDATION_MODEL: str = "qwen2.5:32b"
    MEDICATION_RECOMMENDATION_BASE_URL: str = "http://localhost:11434"
    MEDICATION_RECOMMENDATION_TEMPERATURE: float = 0.3
    MEDICATION_RECOMMENDATION_MAX_TOKENS: int = 2000

    # 诊断建议模型
    DIAGNOSIS_SUGGESTION_MODEL: str = "qwen2.5:32b"
    DIAGNOSIS_SUGGESTION_BASE_URL: str = "http://localhost:11434"
    DIAGNOSIS_SUGGESTION_TEMPERATURE: float = 0.5
    DIAGNOSIS_SUGGESTION_MAX_TOKENS: int = 2000

    # 屏幕识别模型(视觉模型)
    SCREEN_RECOGNITION_MODEL: str = "qwen2.5vl:latest"
    SCREEN_RECOGNITION_BASE_URL: str = "http://localhost:11434"
    SCREEN_RECOGNITION_TEMPERATURE: float = 0.1
    SCREEN_RECOGNITION_MAX_TOKENS: int = 1000

    # Bisheng 智能体平台配置
    BISHENG_ENABLED: bool = True  # 默认启用
    BISHENG_BASE_URL: str = "http://localhost:7860"
    BISHENG_FRONTEND_URL: str = "http://localhost:3001"
    BISHENG_IFRAME_PROXY_PORT: int = 3002
    BISHENG_USERNAME: str = ""
    BISHENG_PASSWORD: str = ""
    BISHENG_ACCESS_TOKEN: str = ""
    BISHENG_TOKEN_EXPIRY: int = 86400  # Token有效期（秒）
    BISHENG_DEFAULT_MODE: str = "api"  # api | iframe

    # JWT配置
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS配置
    CORS_ORIGINS: List[str] = [
        "http://localhost:9527",
        "http://localhost:3000",
        "http://localhost:5928",  # 前端开发服务器
        "http://127.0.0.1:5928",  # 前端开发服务器(IP)
        "http://localhost:5173",  # Vite默认端口
        "http://127.0.0.1:5173",  # Vite默认端口(IP)
        "http://localhost:8080",  # 备用端口
        "http://127.0.0.1:8080",  # 备用端口(IP)
    ]

    # 日志配置
    LOG_LEVEL: str = "INFO"
    # 将默认日志文件统一为 logs/backend.log，便于前端/使用者定位
    LOG_FILE: str = "logs/backend.log"

    # 前端模型编辑锁（启用后，前端不能修改模型相关设置）
    FRONTEND_MODEL_EDIT_LOCK: bool = False


    def get_model_config(self, scenario: str) -> Dict[str, Any]:
        """获取指定场景的模型配置"""
        scenario_map = {
            "ai_chat": {
                "model_name": self.AI_CHAT_MODEL,
                "base_url": self.AI_CHAT_BASE_URL,
                "temperature": self.AI_CHAT_TEMPERATURE,
                "max_tokens": self.AI_CHAT_MAX_TOKENS,
            },
            "exam_recommendation": {
                "model_name": self.EXAM_RECOMMENDATION_MODEL,
                "base_url": self.EXAM_RECOMMENDATION_BASE_URL,
                "temperature": self.EXAM_RECOMMENDATION_TEMPERATURE,
                "max_tokens": self.EXAM_RECOMMENDATION_MAX_TOKENS,
            },
            "medication_recommendation": {
                "model_name": self.MEDICATION_RECOMMENDATION_MODEL,
                "base_url": self.MEDICATION_RECOMMENDATION_BASE_URL,
                "temperature": self.MEDICATION_RECOMMENDATION_TEMPERATURE,
                "max_tokens": self.MEDICATION_RECOMMENDATION_MAX_TOKENS,
            },
            "diagnosis_suggestion": {
                "model_name": self.DIAGNOSIS_SUGGESTION_MODEL,
                "base_url": self.DIAGNOSIS_SUGGESTION_BASE_URL,
                "temperature": self.DIAGNOSIS_SUGGESTION_TEMPERATURE,
                "max_tokens": self.DIAGNOSIS_SUGGESTION_MAX_TOKENS,
            },
            "screen_recognition": {
                "model_name": self.SCREEN_RECOGNITION_MODEL,
                "base_url": self.SCREEN_RECOGNITION_BASE_URL,
                "temperature": self.SCREEN_RECOGNITION_TEMPERATURE,
                "max_tokens": self.SCREEN_RECOGNITION_MAX_TOKENS,
            },
        }
        return scenario_map.get(scenario, {})

    def get_all_scenarios(self) -> List[str]:
        """获取所有支持的场景"""
        return [
            "ai_chat",
            "exam_recommendation",
            "medication_recommendation",
            "diagnosis_suggestion",
            "screen_recognition"
        ]


# 创建全局配置实例
settings = Settings()
