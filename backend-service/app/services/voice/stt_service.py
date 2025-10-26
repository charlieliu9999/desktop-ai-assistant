"""
语音识别服务 (Speech-to-Text)

支持多种STT provider:
- OpenAI Whisper API (推荐,云端)
- Local Whisper (本地,需要安装whisper和ffmpeg)
- Faster Whisper (本地,更快,需要安装faster-whisper)
"""
import base64
import time
import os
from typing import Optional
from io import BytesIO
from loguru import logger

from .models import STTRequest, STTResponse, STTResult


class STTService:
    """语音识别服务"""

    def __init__(self, provider: str = "openai", model_name: str = "whisper-1"):
        """
        初始化语音识别服务

        Args:
            provider: STT提供商 (openai/local/faster-whisper)
            model_name: 模型名称
        """
        self.provider = provider.lower()
        self.model_name = model_name
        self.model = None
        self.client = None

        logger.info(f"语音识别服务初始化: provider={provider}, model={model_name}")

    async def _load_model(self):
        """延迟加载模型"""
        if self.model is not None or self.client is not None:
            return

        try:
            if self.provider == "openai":
                # 使用OpenAI API
                from openai import AsyncOpenAI
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OPENAI_API_KEY not set")
                self.client = AsyncOpenAI(api_key=api_key)
                logger.info("OpenAI Whisper API客户端初始化成功")

            elif self.provider == "local":
                # 使用本地Whisper
                import whisper
                self.model = whisper.load_model(self.model_name)
                logger.info(f"本地Whisper模型加载成功: {self.model_name}")

            elif self.provider == "faster-whisper":
                # 使用Faster Whisper
                from faster_whisper import WhisperModel
                self.model = WhisperModel(self.model_name, device="cpu", compute_type="int8")
                logger.info(f"Faster Whisper模型加载成功: {self.model_name}")

            else:
                raise ValueError(f"不支持的STT provider: {self.provider}")

        except ImportError as e:
            logger.error(f"STT依赖库未安装: {e}")
            logger.warning("请安装: pip install openai-whisper 或 pip install faster-whisper")
            raise
        except Exception as e:
            logger.error(f"STT模型加载失败: {e}")
            raise

    async def recognize(self, request: STTRequest) -> STTResponse:
        """
        识别语音

        Args:
            request: 语音识别请求

        Returns:
            语音识别响应
        """
        start_time = time.time()

        try:
            # 加载模型/客户端
            await self._load_model()

            # 解码Base64音频数据
            audio_data = request.audio_data
            # 移除data URI前缀(如果存在)
            if audio_data.startswith('data:'):
                audio_data = audio_data.split(',', 1)[1]
            audio_bytes = base64.b64decode(audio_data)

            if self.provider == "openai":
                # 使用OpenAI API
                result_text, language = await self._recognize_openai(audio_bytes, request)
                segments = []
                avg_confidence = 0.9  # OpenAI API不返回置信度

            elif self.provider in ["local", "faster-whisper"]:
                # 使用本地Whisper
                result_text, language, segments, avg_confidence = await self._recognize_local(
                    audio_bytes, request
                )

            else:
                raise ValueError(f"不支持的provider: {self.provider}")

            processing_time = (time.time() - start_time) * 1000

            stt_result = STTResult(
                text=result_text,
                confidence=avg_confidence,
                language=language,
                segments=segments,
            )

            logger.info(
                f"语音识别成功: provider={self.provider}, 文本长度={len(result_text)}, "
                f"语言={language}, 处理时间={processing_time:.2f}ms"
            )

            return STTResponse(
                success=True,
                result=stt_result,
                model_used=self.model_name,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            error_msg = f"语音识别失败: {str(e)}"
            logger.error(error_msg)

            return STTResponse(
                success=False, error=error_msg, processing_time_ms=processing_time
            )

    async def _recognize_openai(self, audio_bytes: bytes, request: STTRequest) -> tuple:
        """使用OpenAI API识别"""
        import tempfile

        # 保存到临时文件
        suffix = self._get_audio_suffix(getattr(request, 'audio_mime', 'audio/wav'))
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        try:
            with open(temp_path, 'rb') as audio_file:
                transcript = await self.client.audio.transcriptions.create(
                    model=self.model_name,
                    file=audio_file,
                    language=request.language if request.language != "auto" else None
                )

            text = transcript.text.strip()
            language = request.language if request.language != "auto" else "zh"

            return text, language
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    async def _recognize_local(self, audio_bytes: bytes, request: STTRequest) -> tuple:
        """使用本地Whisper识别"""
        import tempfile

        # 保存到临时文件
        suffix = self._get_audio_suffix(getattr(request, 'audio_mime', 'audio/wav'))
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        try:
            # 执行语音识别
            if self.provider == "faster-whisper":
                segments_iter, info = self.model.transcribe(
                    temp_path,
                    language=request.language if request.language != "auto" else None
                )
                segments_list = list(segments_iter)
                text = " ".join([seg.text for seg in segments_list])
                language = info.language

                segments = [
                    {
                        "start": seg.start,
                        "end": seg.end,
                        "text": seg.text,
                        "confidence": getattr(seg, 'avg_logprob', 0.8),
                    }
                    for seg in segments_list
                ]
            else:
                # 原始whisper
                result = self.model.transcribe(
                    temp_path,
                    language=request.language if request.language != "auto" else None
                )
                text = result["text"].strip()
                language = result.get("language", request.language)

                segments = []
                if "segments" in result:
                    for seg in result["segments"]:
                        segments.append({
                            "start": seg["start"],
                            "end": seg["end"],
                            "text": seg["text"],
                            "confidence": seg.get("confidence", 0.8),
                        })

            # 计算平均置信度
            if segments:
                avg_confidence = sum(s["confidence"] for s in segments) / len(segments)
            else:
                avg_confidence = 0.8

            return text, language, segments, avg_confidence
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    def _get_audio_suffix(self, mime: str) -> str:
        """根据MIME类型获取文件后缀"""
        if not mime:
            return '.wav'
        mime = mime.lower()
        if 'webm' in mime:
            return '.webm'
        elif 'mpeg' in mime or mime.endswith('/mp3'):
            return '.mp3'
        elif 'm4a' in mime or 'mp4' in mime:
            return '.m4a'
        elif 'aac' in mime:
            return '.aac'
        elif 'ogg' in mime:
            return '.ogg'
        else:
            return '.wav'

    async def health_check(self) -> bool:
        """
        健康检查

        Returns:
            是否健康
        """
        try:
            # 检查模型/客户端是否可以加载
            if self.model is None and self.client is None:
                await self._load_model()
            return self.model is not None or self.client is not None
        except Exception as e:
            logger.error(f"语音识别服务健康检查失败: {e}")
            return False
