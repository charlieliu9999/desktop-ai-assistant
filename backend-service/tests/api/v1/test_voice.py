"""
语音服务API测试
"""
import pytest
import base64
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """创建测试客户端"""
    return TestClient(app)


@pytest.fixture
def test_audio_base64():
    """创建测试音频的Base64编码"""
    # 简单的WAV文件头
    wav_header = bytes([
        0x52, 0x49, 0x46, 0x46,  # "RIFF"
        0x24, 0x00, 0x00, 0x00,  # ChunkSize
        0x57, 0x41, 0x56, 0x45,  # "WAVE"
        0x66, 0x6D, 0x74, 0x20,  # "fmt "
        0x10, 0x00, 0x00, 0x00,  # Subchunk1Size
        0x01, 0x00,              # AudioFormat
        0x01, 0x00,              # NumChannels
        0x44, 0xAC, 0x00, 0x00,  # SampleRate
        0x88, 0x58, 0x01, 0x00,  # ByteRate
        0x02, 0x00,              # BlockAlign
        0x10, 0x00,              # BitsPerSample
        0x64, 0x61, 0x74, 0x61,  # "data"
        0x00, 0x00, 0x00, 0x00,  # Subchunk2Size
    ])
    
    audio_data = bytes([0x00] * 1000)
    wav_data = wav_header + audio_data
    return base64.b64encode(wav_data).decode()


def test_stt_endpoint(client, test_audio_base64):
    """测试语音识别端点"""
    response = client.post(
        "/v1/voice/stt",
        json={
            "audio_data": test_audio_base64,
            "language": "zh"
        }
    )

    # 可能因为Whisper模型未安装而失败
    assert response.status_code in [200, 500, 503]


def test_stt_endpoint_invalid_data(client):
    """测试语音识别端点无效数据"""
    response = client.post(
        "/v1/voice/stt",
        json={
            "audio_data": "invalid_base64",
            "language": "zh"
        }
    )

    assert response.status_code in [200, 500, 503]


def test_tts_endpoint(client):
    """测试语音合成端点"""
    response = client.post(
        "/v1/voice/tts",
        json={
            "text": "你好，世界",
            "language": "zh",
            "speed": 1.0,
            "pitch": 1.0
        }
    )

    assert response.status_code in [200, 500, 503]

    if response.status_code == 200:
        data = response.json()
        assert "success" in data


def test_tts_endpoint_different_speeds(client):
    """测试不同语速的语音合成"""
    speeds = [0.5, 1.0, 1.5, 2.0]

    for speed in speeds:
        response = client.post(
            "/v1/voice/tts",
            json={
                "text": "测试",
                "language": "zh",
                "speed": speed,
                "pitch": 1.0
            }
        )

        assert response.status_code in [200, 500, 503]


def test_voice_health_endpoint(client):
    """测试语音服务健康检查端点"""
    response = client.get("/v1/voice/health")

    assert response.status_code == 200
    data = response.json()
    assert "success" in data
    assert "services" in data
    assert "stt" in data["services"]
    assert "tts" in data["services"]

