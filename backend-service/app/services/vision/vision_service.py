"""
视觉理解服务

使用视觉模型进行图像理解
"""
import base64
import time
from typing import Optional
from loguru import logger

from ..ai.manager import AIServiceManager
from .models import VisionRequest, VisionResponse, VisionResult


class VisionService:
    """视觉理解服务"""

    def __init__(self, ai_manager: Optional[AIServiceManager] = None):
        """
        初始化视觉服务

        Args:
            ai_manager: AI服务管理器
        """
        self.ai_manager = ai_manager
        logger.info("视觉理解服务初始化完成")

    async def understand(self, request: VisionRequest) -> VisionResponse:
        """
        理解图像内容

        Args:
            request: 视觉理解请求

        Returns:
            视觉理解响应
        """
        start_time = time.time()

        try:
            if not self.ai_manager:
                raise ValueError("AI服务管理器未初始化")

            # 构建视觉理解提示
            prompt = f"""请分析这张图片并回答以下问题：

{request.prompt}

请提供详细的描述和分析。"""

            # 调用AI服务进行图像理解
            # 注意：这里需要AI服务支持视觉输入
            # 实际实现需要根据具体的AI服务API调整
            from ..ai.models import ChatOptions

            options = ChatOptions(
                model=request.model,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
            )

            # TODO: 实现视觉模型调用
            # 目前使用文本模型作为占位符
            # 实际应该调用支持图像输入的模型
            response = await self.ai_manager.chat(
                message=prompt,
                options=options,
            )

            processing_time = (time.time() - start_time) * 1000

            result = VisionResult(
                description=response.message.content,
                confidence=0.8,  # TODO: 从模型响应中获取实际置信度
                details={
                    "model": response.model,
                    "tokens_used": response.usage.total_tokens,
                },
            )

            logger.info(
                f"视觉理解成功: 模型={response.model}, "
                f"处理时间={processing_time:.2f}ms"
            )

            return VisionResponse(
                success=True,
                result=result,
                model_used=response.model,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            error_msg = f"视觉理解失败: {str(e)}"
            logger.error(error_msg)

            return VisionResponse(
                success=False, error=error_msg, processing_time_ms=processing_time
            )

    async def analyze_medical_image(
        self, image_data: str, focus: Optional[str] = None
    ) -> VisionResponse:
        """
        分析医疗图像

        Args:
            image_data: Base64编码的图像数据
            focus: 关注点（如"骨折"、"肿瘤"等）

        Returns:
            视觉理解响应
        """
        prompt = "请分析这张医疗图像，描述你看到的内容。"
        if focus:
            prompt += f"\n特别关注: {focus}"

        request = VisionRequest(image_data=image_data, prompt=prompt)

        return await self.understand(request)

    async def extract_text_from_image(self, image_data: str) -> VisionResponse:
        """
        从图像中提取文字（使用视觉模型）

        Args:
            image_data: Base64编码的图像数据

        Returns:
            视觉理解响应
        """
        prompt = "请提取这张图片中的所有文字内容，保持原有格式。"

        request = VisionRequest(image_data=image_data, prompt=prompt)

        return await self.understand(request)

    async def health_check(self) -> bool:
        """
        健康检查

        Returns:
            是否健康
        """
        try:
            if not self.ai_manager:
                return False

            # 检查AI服务管理器是否可用
            return True
        except Exception as e:
            logger.error(f"视觉服务健康检查失败: {e}")
            return False

