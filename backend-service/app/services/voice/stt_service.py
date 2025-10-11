"""
语音识别服务 (Speech-to-Text)

使用Whisper等模型进行语音识别
"""
import base64
import time
from typing import Optional
from io import BytesIO
from loguru import logger

from .models import STTRequest, STTResponse, STTResult


class STTService:
    """语音识别服务"""

    def __init__(self, model_name: str = "base"):
        """
        初始化语音识别服务

        Args:
            model_name: Whisper模型名称
        """
        self.model_name = model_name
        self.model = None

        logger.info(f"语音识别服务初始化: model={model_name}")

    async def _load_model(self):
        """延迟加载模型"""
        if self.model is None:
            try:
                import whisper

                self.model = whisper.load_model(self.model_name)
                logger.info(f"Whisper模型加载成功: {self.model_name}")
            except Exception as e:
                logger.error(f"Whisper模型加载失败: {e}")
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
            # 加载模型
            await self._load_model()

            # 解码Base64音频数据
            audio_bytes = base64.b64decode(request.audio_data)

            # 保存到临时文件
            import tempfile
            import os

            with tempfile.NamedTemporaryFile(
                suffix=".wav", delete=False
            ) as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name

            try:
                # 执行语音识别
                result = self.model.transcribe(
                    temp_path, language=request.language if request.language != "auto" else None
                )

                # 提取结果
                text = result["text"].strip()
                language = result.get("language", request.language)

                # 提取分段信息
                segments = []
                if "segments" in result:
                    for seg in result["segments"]:
                        segments.append(
                            {
                                "start": seg["start"],
                                "end": seg["end"],
                                "text": seg["text"],
                                "confidence": seg.get("confidence", 0.0),
                            }
                        )

                # 计算平均置信度
                if segments:
                    avg_confidence = sum(s["confidence"] for s in segments) / len(
                        segments
                    )
                else:
                    avg_confidence = 0.8  # 默认置信度

                processing_time = (time.time() - start_time) * 1000

                stt_result = STTResult(
                    text=text,
                    confidence=avg_confidence,
                    language=language,
                    segments=segments,
                )

                logger.info(
                    f"语音识别成功: 文本长度={len(text)}, 语言={language}, "
                    f"处理时间={processing_time:.2f}ms"
                )

                return STTResponse(
                    success=True,
                    result=stt_result,
                    model_used=self.model_name,
                    processing_time_ms=processing_time,
                )

            finally:
                # 删除临时文件
                if os.path.exists(temp_path):
                    os.unlink(temp_path)

        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            error_msg = f"语音识别失败: {str(e)}"
            logger.error(error_msg)

            return STTResponse(
                success=False, error=error_msg, processing_time_ms=processing_time
            )

    async def health_check(self) -> bool:
        """
        健康检查

        Returns:
            是否健康
        """
        try:
            # 检查模型是否可以加载
            if self.model is None:
                await self._load_model()
            return self.model is not None
        except Exception as e:
            logger.error(f"语音识别服务健康检查失败: {e}")
            return False

