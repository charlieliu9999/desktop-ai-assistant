"""
患者信息提取服务
"""

import re
import time
from typing import Optional
from app.services.patient.models import PatientInfo, ExtractionRequest, ExtractionResponse
from app.services.ai.manager import AIServiceManager
from app.services.ai.models import Message


class PatientInfoExtractor:
    """患者信息提取器"""

    def __init__(self, ai_manager: Optional[AIServiceManager] = None):
        self.ai_manager = ai_manager

    async def extract(self, request: ExtractionRequest) -> ExtractionResponse:
        """提取患者信息"""
        start_time = time.time()

        # 确定文本来源
        text = request.text or ""

        # 如果提供了图片，先进行OCR（这里简化处理，实际应调用OCR服务）
        if request.image_base64 and not text:
            # TODO: 调用OCR服务
            text = "OCR功能待实现"

        # 选择提取方法
        if request.use_ai and self.ai_manager:
            try:
                patient_info = await self._extract_with_ai(text)
                if patient_info.confidence >= request.min_confidence:
                    processing_time = (time.time() - start_time) * 1000
                    return ExtractionResponse(
                        patient_info=patient_info,
                        extraction_method="ai",
                        processing_time_ms=processing_time,
                    )
            except Exception as e:
                # AI提取失败，回退到规则提取
                pass

        # 使用规则提取
        patient_info = self._extract_with_rules(text)
        processing_time = (time.time() - start_time) * 1000

        return ExtractionResponse(
            patient_info=patient_info,
            extraction_method="rules",
            processing_time_ms=processing_time,
        )

    async def _extract_with_ai(self, text: str) -> PatientInfo:
        """使用AI提取患者信息"""
        if not self.ai_manager:
            raise ValueError("AI manager not available")

        # 构建提示词
        prompt = f"""请从以下医疗文本中提取患者信息，以JSON格式返回。

文本内容：
{text}

请提取以下字段（如果存在）：
- name: 患者姓名
- age: 年龄（数字）
- gender: 性别（"男"或"女"）
- patient_id: 患者ID/病历号
- department: 科室
- chief_complaint: 主诉
- diagnosis: 诊断
- medical_history: 病史

返回格式：
{{
  "name": "张三",
  "age": 45,
  "gender": "男",
  ...
}}

只返回JSON，不要其他说明。"""

        messages = [Message(role="user", content=prompt)]

        # 调用AI服务
        response = await self.ai_manager.analyze(
            content=text,
            analysis_type="patient_info",
            extract_fields=[
                "name",
                "age",
                "gender",
                "patient_id",
                "department",
                "chief_complaint",
                "diagnosis",
                "medical_history",
            ],
        )

        # 转换为PatientInfo
        data = response.extracted_data
        patient_info = PatientInfo(
            name=data.get("name", ""),
            age=data.get("age"),
            gender=data.get("gender"),
            patient_id=data.get("patient_id"),
            department=data.get("department"),
            chief_complaint=data.get("chief_complaint"),
            diagnosis=data.get("diagnosis"),
            medical_history=data.get("medical_history"),
            confidence=response.confidence,
        )

        return patient_info

    def _extract_with_rules(self, text: str) -> PatientInfo:
        """使用规则提取患者信息"""
        info = PatientInfo(name="", confidence=0.5)

        # 提取姓名
        name_patterns = [
            r"(?:姓名|患者|病人)[：:]\s*([^\s\n]{2,4})",
            r"(?:姓名|患者|病人)\s+([^\s\n]{2,4})",
            r"^([^\s\n]{2,4})\s+(?:男|女)",
        ]

        for pattern in name_patterns:
            match = re.search(pattern, text, re.MULTILINE)
            if match:
                info.name = match.group(1).strip()
                break

        # 提取年龄
        age_patterns = [
            r"(?:年龄|年齡)[：:]\s*(\d{1,3})\s*[岁歲]",
            r"(\d{1,3})\s*[岁歲]",
            r"(?:年龄|年齡)\s+(\d{1,3})",
        ]

        for pattern in age_patterns:
            match = re.search(pattern, text)
            if match:
                age = int(match.group(1))
                if 0 < age < 150:
                    info.age = age
                    break

        # 提取性别
        gender_patterns = [
            r"(?:性别|性別)[：:]\s*(男|女)",
            r"(?:性别|性別)\s+(男|女)",
            r"\s(男|女)\s",
        ]

        for pattern in gender_patterns:
            match = re.search(pattern, text)
            if match:
                info.gender = match.group(1)
                break

        # 提取患者ID
        id_patterns = [
            r"(?:患者ID|病历号|就诊号|门诊号)[：:]\s*([A-Z0-9\-]+)",
            r"(?:ID|编号)[：:]\s*([A-Z0-9\-]+)",
            r"[A-Z]{1,3}\d{6,}",
        ]

        for pattern in id_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                info.patient_id = match.group(1).strip() if match.lastindex else match.group(0)
                break

        # 提取科室
        dept_patterns = [
            r"(?:科室|就诊科室|门诊科室)[：:]\s*([^\s\n]{2,10})",
            r"([^\s\n]{2,6}(?:科|内科|外科|儿科|妇科|骨科|神经科|心内科|呼吸科|消化科))",
        ]

        for pattern in dept_patterns:
            match = re.search(pattern, text)
            if match:
                info.department = match.group(1).strip()
                break

        # 提取主诉
        complaint_patterns = [
            r"(?:主诉|主訴)[：:]\s*([^\n]{5,100})",
            r"(?:症状|症狀)[：:]\s*([^\n]{5,100})",
        ]

        for pattern in complaint_patterns:
            match = re.search(pattern, text)
            if match:
                info.chief_complaint = match.group(1).strip()
                break

        # 提取诊断
        diagnosis_patterns = [
            r"(?:诊断|診斷|初步诊断)[：:]\s*([^\n]{5,100})",
            r"(?:疾病|病名)[：:]\s*([^\n]{5,100})",
        ]

        for pattern in diagnosis_patterns:
            match = re.search(pattern, text)
            if match:
                info.diagnosis = match.group(1).strip()
                break

        # 计算置信度
        fields_found = sum(
            [
                bool(info.name),
                bool(info.age),
                bool(info.gender),
                bool(info.patient_id),
                bool(info.department),
                bool(info.chief_complaint),
            ]
        )

        info.confidence = min(0.9, 0.3 + (fields_found * 0.1))

        return info

    def validate(self, patient_info: PatientInfo) -> dict:
        """验证患者信息"""
        errors = []
        warnings = []

        # 验证姓名
        if not patient_info.name or len(patient_info.name) < 2:
            errors.append("患者姓名无效或缺失")

        # 验证年龄
        if patient_info.age is not None:
            if patient_info.age < 0 or patient_info.age > 150:
                errors.append("年龄超出有效范围")
            elif patient_info.age > 120:
                warnings.append("年龄异常高，请确认")

        # 验证性别
        if patient_info.gender and patient_info.gender not in ["男", "女", "未知"]:
            errors.append("性别值无效")

        # 验证置信度
        if patient_info.confidence < 0.5:
            warnings.append("提取置信度较低，建议人工核对")

        return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}

