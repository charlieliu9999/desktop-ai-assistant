"""
AI提供商基类
"""
from abc import ABC, abstractmethod
from typing import List, AsyncIterator, Optional
from datetime import datetime
from loguru import logger

from .models import (
    Message,
    ChatOptions,
    ChatResponse,
    StreamChunk,
    AnalyzeResponse,
    ProviderConfig,
    ProviderHealth,
)


class AIProviderBase(ABC):
    """AI提供商基类"""

    def __init__(self, config: ProviderConfig):
        """
        初始化提供商

        Args:
            config: 提供商配置
        """
        self.config = config
        self.name = config.name
        self._last_health_check: Optional[datetime] = None
        self._is_healthy: bool = False
        logger.info(f"Initializing AI provider: {self.name}")

    @abstractmethod
    async def chat(
        self, messages: List[Message], options: Optional[ChatOptions] = None
    ) -> ChatResponse:
        """
        标准对话

        Args:
            messages: 消息列表
            options: 对话选项

        Returns:
            对话响应

        Raises:
            Exception: 调用失败时抛出异常
        """
        pass

    @abstractmethod
    async def chat_stream(
        self, messages: List[Message], options: Optional[ChatOptions] = None
    ) -> AsyncIterator[StreamChunk]:
        """
        流式对话

        Args:
            messages: 消息列表
            options: 对话选项

        Yields:
            流式响应块

        Raises:
            Exception: 调用失败时抛出异常
        """
        pass

    @abstractmethod
    async def analyze(
        self,
        content: str,
        analysis_type: str,
        extract_fields: Optional[List[str]] = None,
        options: Optional[ChatOptions] = None,
    ) -> AnalyzeResponse:
        """
        内容分析

        Args:
            content: 要分析的内容
            analysis_type: 分析类型
            extract_fields: 要提取的字段
            options: 对话选项

        Returns:
            分析响应

        Raises:
            Exception: 分析失败时抛出异常
        """
        pass

    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        """
        健康检查

        Returns:
            健康状态

        Raises:
            Exception: 检查失败时抛出异常
        """
        pass

    def _build_system_prompt(self, analysis_type: str) -> str:
        """
        构建系统提示词

        Args:
            analysis_type: 分析类型

        Returns:
            系统提示词
        """
        prompts = {
            "patient_info": (
                "你是一个专业的医疗信息提取助手。"
                "请从给定的文本中提取患者信息，包括姓名、年龄、性别、主诉等。"
                "以JSON格式返回提取的信息。"
            ),
            "medical_record": (
                "你是一个专业的病历分析助手。"
                "请分析给定的病历内容，提取关键医疗信息。"
                "以JSON格式返回分析结果。"
            ),
            "diagnosis": (
                "你是一个资深的临床医生。"
                "请根据给定的症状和检查结果，提供可能的诊断建议。"
                "以JSON格式返回诊断建议。"
            ),
            "general": (
                "你是一个通用的AI助手。"
                "请分析给定的内容并提供有用的信息。"
                "以JSON格式返回分析结果。"
            ),
        }
        return prompts.get(analysis_type, prompts["general"])

    def _build_analysis_prompt(
        self, content: str, analysis_type: str, extract_fields: Optional[List[str]] = None
    ) -> str:
        """
        构建分析提示词

        Args:
            content: 内容
            analysis_type: 分析类型
            extract_fields: 要提取的字段

        Returns:
            分析提示词
        """
        prompt = f"请分析以下内容:\n\n{content}\n\n"

        if extract_fields:
            prompt += f"请提取以下字段: {', '.join(extract_fields)}\n\n"

        if analysis_type == "patient_info":
            prompt += (
                "请提取患者信息，包括:\n"
                "- name: 姓名\n"
                "- age: 年龄\n"
                "- gender: 性别\n"
                "- chief_complaint: 主诉\n"
                "- medical_history: 病史\n"
                "- current_medications: 当前用药\n"
                "- allergies: 过敏史\n"
            )
        elif analysis_type == "medical_record":
            prompt += (
                "请分析病历内容，提取:\n"
                "- diagnosis: 诊断\n"
                "- symptoms: 症状\n"
                "- examination_results: 检查结果\n"
                "- treatment_plan: 治疗方案\n"
            )
        elif analysis_type == "diagnosis":
            prompt += (
                "请提供诊断建议，包括:\n"
                "- possible_diagnoses: 可能的诊断列表\n"
                "- recommended_tests: 建议的检查\n"
                "- treatment_suggestions: 治疗建议\n"
            )

        prompt += "\n请以JSON格式返回结果。"
        return prompt

    def _extract_json_from_response(self, response: str) -> dict:
        """
        从响应中提取JSON

        Args:
            response: AI响应

        Returns:
            提取的JSON数据

        Raises:
            ValueError: 无法提取JSON时抛出异常
        """
        import json
        import re

        # 尝试直接解析
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # 尝试提取JSON代码块
        json_match = re.search(r"```json\s*(\{.*?\})\s*```", response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # 尝试提取花括号内容
        json_match = re.search(r"\{.*\}", response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass

        # 无法提取，返回原始响应
        logger.warning(f"Failed to extract JSON from response: {response[:200]}")
        return {"raw_response": response}

    def _calculate_confidence(self, extracted_data: dict) -> float:
        """
        计算提取置信度

        Args:
            extracted_data: 提取的数据

        Returns:
            置信度 (0.0-1.0)
        """
        if not extracted_data or "raw_response" in extracted_data:
            return 0.3

        # 基于提取字段数量计算置信度
        field_count = len([v for v in extracted_data.values() if v])
        if field_count == 0:
            return 0.3
        elif field_count <= 2:
            return 0.5
        elif field_count <= 4:
            return 0.7
        else:
            return 0.9

    async def is_healthy(self) -> bool:
        """
        检查是否健康

        Returns:
            是否健康
        """
        if not self.config.enabled:
            return False

        # 如果最近检查过（5分钟内），返回缓存结果
        if self._last_health_check:
            elapsed = (datetime.now() - self._last_health_check).total_seconds()
            if elapsed < 300:  # 5分钟
                return self._is_healthy

        # 执行健康检查
        try:
            health = await self.health_check()
            self._is_healthy = health.healthy
            self._last_health_check = datetime.now()
            return self._is_healthy
        except Exception as e:
            logger.error(f"Health check failed for {self.name}: {e}")
            self._is_healthy = False
            self._last_health_check = datetime.now()
            return False

