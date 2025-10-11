"""
Pytest配置文件
提供测试fixtures和配置
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db


# 创建内存数据库用于测试
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """
    创建测试数据库会话
    每个测试函数执行前创建表,执行后删除表
    """
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    创建测试客户端
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def mock_openai_response():
    """
    Mock OpenAI API响应
    """
    return {
        "id": "chatcmpl-123",
        "object": "chat.completion",
        "created": 1677652288,
        "model": "gpt-4",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "这是一个测试响应"
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30
        }
    }


@pytest.fixture
def mock_patient_data():
    """
    Mock患者数据
    """
    return {
        "name": "张三",
        "age": 45,
        "gender": "男",
        "id_number": "110101197001011234",
        "phone": "13800138000",
        "address": "北京市朝阳区",
        "medical_history": "高血压病史5年",
        "allergies": "青霉素过敏"
    }


@pytest.fixture
def mock_image_base64():
    """
    Mock Base64编码的图片
    """
    # 1x1像素的透明PNG图片
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


@pytest.fixture
def sample_chat_messages():
    """
    示例对话消息
    """
    return [
        {"role": "system", "content": "你是一个医疗AI助手"},
        {"role": "user", "content": "患者主诉头痛,应该做哪些检查?"}
    ]

