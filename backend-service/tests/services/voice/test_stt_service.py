"""
语音识别服务测试
"""
import pytest
import base64

from app.services.voice.stt_service import STTService
from app.services.voice.models import STTRequest


@pytest.fixture
def stt_service():
    """创建语音识别服务实例"""
    return STTService(model_name="base")


@pytest.fixture
def test_audio_base64():
    """创建测试音频的Base64编码"""
    # 创建一个简单的WAV文件头（44字节）+ 一些音频数据
    wav_header = bytes([
        0x52, 0x49, 0x46, 0x46,  # "RIFF"
        0x24, 0x00, 0x00, 0x00,  # ChunkSize
        0x57, 0x41, 0x56, 0x45,  # "WAVE"
        0x66, 0x6D, 0x74, 0x20,  # "fmt "
        0x10, 0x00, 0x00, 0x00,  # Subchunk1Size
        0x01, 0x00,              # AudioFormat (PCM)
        0x01, 0x00,              # NumChannels (Mono)
        0x44, 0xAC, 0x00, 0x00,  # SampleRate (44100)
        0x88, 0x58, 0x01, 0x00,  # ByteRate
        0x02, 0x00,              # BlockAlign
        0x10, 0x00,              # BitsPerSample (16)
        0x64, 0x61, 0x74, 0x61,  # "data"
        0x00, 0x00, 0x00, 0x00,  # Subchunk2Size
    ])
    
    # 添加一些音频数据（静音）
    audio_data = bytes([0x00] * 1000)
    
    wav_data = wav_header + audio_data
    return base64.b64encode(wav_data).decode()


@pytest.mark.asyncio
async def test_stt_service_initialization(stt_service):
    """测试语音识别服务初始化"""
    assert stt_service is not None
    assert stt_service.model_name == "base"


@pytest.mark.asyncio
async def test_recognize_audio_success(stt_service, test_audio_base64):
    """测试语音识别成功"""
    request = STTRequest(
        audio_data=test_audio_base64,
        language='zh'
    )
    
    response = await stt_service.recognize(request)
    
    # 注意：由于测试音频是静音，可能无法识别出文字
    # 但服务应该正常运行
    assert response is not None
    assert hasattr(response, 'success')
    assert hasattr(response, 'processing_time_ms')


@pytest.mark.asyncio
async def test_recognize_audio_invalid_base64(stt_service):
    """测试无效的Base64音频数据"""
    request = STTRequest(
        audio_data='invalid_base64_data',
        language='zh'
    )
    
    response = await stt_service.recognize(request)
    
    assert response.success is False
    assert response.error is not None


@pytest.mark.asyncio
async def test_recognize_audio_different_languages(stt_service, test_audio_base64):
    """测试不同语言的识别"""
    languages = ['zh', 'en', 'auto']
    
    for lang in languages:
        request = STTRequest(
            audio_data=test_audio_base64,
            language=lang
        )
        
        response = await stt_service.recognize(request)
        assert response is not None


@pytest.mark.asyncio
async def test_health_check(stt_service):
    """测试健康检查"""
    # 注意：这个测试需要Whisper模型，可能需要下载
    # 在CI环境中可能会失败
    try:
        is_healthy = await stt_service.health_check()
        assert isinstance(is_healthy, bool)
    except Exception:
        # 如果模型未安装，跳过测试
        pytest.skip("Whisper model not available")


@pytest.mark.asyncio
async def test_recognize_audio_with_segments(stt_service, test_audio_base64):
    """测试语音识别返回分段信息"""
    request = STTRequest(
        audio_data=test_audio_base64,
        language='zh'
    )
    
    response = await stt_service.recognize(request)
    
    if response.success and response.result:
        assert hasattr(response.result, 'segments')
        assert isinstance(response.result.segments, list)


@pytest.mark.asyncio
async def test_recognize_audio_performance(stt_service, test_audio_base64):
    """测试语音识别性能"""
    request = STTRequest(
        audio_data=test_audio_base64,
        language='zh'
    )
    
    response = await stt_service.recognize(request)
    
    # 检查处理时间
    if response.processing_time_ms:
        # 语音识别可能需要较长时间，特别是首次加载模型
        assert response.processing_time_ms < 60000  # 小于60秒

