"""
API测试
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    """测试根路径"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data
    assert data["status"] == "running"


def test_health_check():
    """测试健康检查"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_create_patient():
    """测试创建患者"""
    patient_data = {
        "patient_id": "TEST001",
        "name": "测试患者",
        "gender": "男",
        "age": 30
    }
    
    response = client.post("/api/patients/", json=patient_data)
    
    # 如果患者已存在,应该返回400
    if response.status_code == 400:
        assert "已存在" in response.json()["detail"]
    else:
        assert response.status_code == 201
        data = response.json()
        assert data["patient_id"] == patient_data["patient_id"]
        assert data["name"] == patient_data["name"]


def test_get_patient():
    """测试获取患者信息"""
    # 先创建患者
    patient_data = {
        "patient_id": "TEST002",
        "name": "测试患者2",
        "gender": "女",
        "age": 25
    }
    client.post("/api/patients/", json=patient_data)
    
    # 获取患者信息
    response = client.get(f"/api/patients/{patient_data['patient_id']}")
    
    if response.status_code == 200:
        data = response.json()
        assert data["patient_id"] == patient_data["patient_id"]


def test_list_patients():
    """测试获取患者列表"""
    response = client.get("/api/patients/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

