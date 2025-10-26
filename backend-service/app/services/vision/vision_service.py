"""
视觉理解服务

使用视觉模型进行图像理解
"""
import base64
import time
from typing import Optional
import json
import re
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
            provider = getattr(request, "provider", None)

            # 由外部提示词定义识别规范：不在代码内注入提示模板
            required_keys = []
            if request.schema_name == "patient_info_v1":
                required_keys = [
                    "patient_name",
                    "gender",
                    "age",
                    "medical_record_number",
                    "chief_complaint",
                    "diagnosis",
                    "confidence",
                ]

            # 小工具：从文本中挑选最合适的 JSON 块
            def _pick_structured_from_text(text: str, required: list[str]) -> Optional[dict]:
                try:
                    blocks = re.findall(r"\{[\s\S]*?\}", text)
                except Exception:
                    blocks = []
                best = None
                best_score = -1.0
                for b in blocks:
                    try:
                        obj = json.loads(b)
                        if not isinstance(obj, dict):
                            continue
                        # 评分：
                        # 1) 命中 required key 的数量
                        hits = sum(1 for k in required if k in obj)
                        # 2) 键值质量：核心字段若是非空字符串加更高分；数值型(如1/0)得分低
                        quality = 0.0
                        def _is_nonempty_str(v):
                            return isinstance(v, str) and v.strip() != ''
                        if 'patient_name' in obj and _is_nonempty_str(obj.get('patient_name')):
                            quality += 5
                        if 'gender' in obj and _is_nonempty_str(obj.get('gender')):
                            quality += 3
                        if 'medical_record_number' in obj and _is_nonempty_str(obj.get('medical_record_number')):
                            quality += 4
                        if 'chief_complaint' in obj and _is_nonempty_str(obj.get('chief_complaint')):
                            quality += 4
                        if 'diagnosis' in obj and _is_nonempty_str(obj.get('diagnosis')):
                            quality += 4
                        # 年龄：数字或包含数字的字符串
                        if 'age' in obj:
                            v = obj.get('age')
                            if isinstance(v, (int, float)) and v > 0:
                                quality += 3
                            elif isinstance(v, str) and re.search(r"\d+", v or ''):
                                quality += 2
                        # 3) 长度轻微加成
                        length_bonus = len(b) / 2000.0
                        score = hits * 10.0 + quality + length_bonus
                        # 偏好包含 patient_name/chief_complaint 等关键字段的块
                        if score > best_score:
                            best = obj
                            best_score = score
                    except Exception:
                        continue
                return best

            def _extract_from_kv(text: str) -> Optional[dict]:
                if not text or not text.strip():
                    return None
                mapping = {
                    'patient_name': [r'(?:姓名|name|患者姓名)\s*[:：]\s*([^\n，。,;；]+)'],
                    'gender': [r'(?:性别|gender)\s*[:：]\s*([^\n，。,;；]+)'],
                    'age': [r'(?:年龄|age)\s*[:：]\s*([^\n，。,;；]+)'],
                    'medical_record_number': [r'(?:患者ID|患者编号|patient\s*id|病历号|住院号|门诊号)\s*[:：]\s*([^\n，。,;；]+)'],
                    'chief_complaint': [r'(?:主诉|chief\s*complaint)\s*[:：]\s*([\s\S]+?)(?:\n|$)'],
                    'diagnosis': [r'(?:诊断|diagnosis)\s*[:：]\s*([\s\S]+?)(?:\n|$)'],
                    'medical_history': [r'(?:病史|medical\s*history|既往史)\s*[:：]\s*([\s\S]+?)(?:\n|$)'],
                    'confidence': [r'(?:置信度|confidence)\s*[:：]\s*([^\n，。,;；]+)'],
                }
                result: dict[str, str] = {}
                for key, patterns in mapping.items():
                    for pattern in patterns:
                        match = re.search(pattern, text, flags=re.IGNORECASE)
                        if match:
                            value = match.group(1).strip()
                            if value:
                                result[key] = value
                                break
                # 如果逐行格式，进一步尝试按行拆分
                if not result:
                    for line in text.splitlines():
                        line = line.strip()
                        if not line:
                            continue
                        if '：' in line or ':' in line:
                            parts = re.split(r'[:：]', line, maxsplit=1)
                            if len(parts) != 2:
                                continue
                            k_raw, v_raw = parts[0].strip().lower(), parts[1].strip()
                            key_map = {
                                '姓名': 'patient_name',
                                'name': 'patient_name',
                                '性别': 'gender',
                                'gender': 'gender',
                                '年龄': 'age',
                                'age': 'age',
                                '患者id': 'medical_record_number',
                                'patient id': 'medical_record_number',
                                '病历号': 'medical_record_number',
                                '住院号': 'medical_record_number',
                                '门诊号': 'medical_record_number',
                                '主诉': 'chief_complaint',
                                'chief complaint': 'chief_complaint',
                                '诊断': 'diagnosis',
                                'diagnosis': 'diagnosis',
                                '病史': 'medical_history',
                                'medical history': 'medical_history',
                            }
                            key = key_map.get(k_raw)
                            if key and v_raw:
                                result[key] = v_raw
                if not result:
                    return None
                if 'patient_name' in result and 'name' not in result:
                    result['name'] = result['patient_name']
                if 'medical_record_number' in result:
                    result.setdefault('patient_id', result['medical_record_number'])
                    result.setdefault('patientId', result['medical_record_number'])
                if 'chief_complaint' in result:
                    result.setdefault('chiefComplaint', result['chief_complaint'])
                if 'medical_history' in result:
                    result.setdefault('medicalHistory', result['medical_history'])
                return result

            # 优先：DashScope 原生多模态（当 provider 指定为 dashscope）
            if provider == "dashscope":
                try:
                    from app.registry import load_registry
                    reg = load_registry()
                    p = next((x for x in reg.providers if x.id == "dashscope" and x.enabled), None)
                    if not p:
                        raise RuntimeError("dashscope_provider_not_configured")
                    api_base = p.base_url
                    api_key = None
                    if p.auth and p.auth.env_key:
                        import os as _os
                        api_key = _os.getenv(p.auth.env_key, "") or None
                    # 兼容：若环境变量未设置，则回退到 settings 中的 DASHSCOPE_API_KEY
                    if not api_key:
                        try:
                            from app.config import settings as _settings
                            api_key = getattr(_settings, 'DASHSCOPE_API_KEY', '') or None
                        except Exception:
                            api_key = None
                    from .dashscope_client import understand_image as ds_understand
                    # 仅使用请求/场景注入的提示词，不在代码中附加模板
                    text_prompt = request.prompt or ""
                    # 需要明确提供模型（通过场景解析或请求体），不得硬编码
                    if not request.model:
                        raise ValueError("model_required_for_dashscope_vl")
                    content, usage = await ds_understand(
                        image_input=request.image_data,
                        text=text_prompt,
                        model=request.model,
                        api_base=api_base,
                        api_key=api_key,
                        image_mime=request.image_mime or "image/png",
                        temperature=request.temperature,
                        max_tokens=request.max_tokens,
                        force_json=bool(getattr(request, "strict_json", False)),
                    )
                    try:
                        # 原始内容日志（截断）
                        snippet = content if isinstance(content, str) else str(type(content))
                        logger.info(f"DashScope raw content snippet: {snippet[:300]}")
                    except Exception:
                        pass
                    processing_time = (time.time() - start_time) * 1000
                    structured = None
                    if request.schema_name:
                        # 先直接解析，失败则按 required_keys 选择最佳 JSON 块
                        try:
                            structured = json.loads(content)
                            # 如果是一个包含多个分区的对象（如 {"患者信息": {...}, "confidence": {...}}），
                            # 优先选择患者信息分区作为结构化主体。
                            if isinstance(structured, dict):
                                for key in ('患者信息', 'patient_info', 'patientInfo', 'patient-info', 'patient', '基本信息', '患者基本信息'):
                                    sub = structured.get(key)
                                    if isinstance(sub, dict):
                                        structured = sub
                                        break
                                # 如果主体看起来像“置信度映射”（值大多为数字1/0），尝试从文本中再挑选包含字符串值的 JSON 块
                                def _looks_like_confidence_map(d: dict) -> bool:
                                    keys = ('patient_name','gender','age','medical_record_number','chief_complaint','diagnosis')
                                    numeric_hits = 0
                                    total_hits = 0
                                    for k in keys:
                                        if k in d:
                                            total_hits += 1
                                            if isinstance(d[k], (int, float)):
                                                numeric_hits += 1
                                    return total_hits > 0 and numeric_hits/ max(1,total_hits) >= 0.6
                                if isinstance(structured, dict) and _looks_like_confidence_map(structured):
                                    alt = _pick_structured_from_text(content, required_keys)
                                    if isinstance(alt, dict):
                                        structured = alt
                        except Exception:
                            structured = _pick_structured_from_text(content, required_keys)
                            if structured is None:
                                structured = _extract_from_kv(content)
                        # 同义键名归一化（例如 name -> patient_name, patientId -> medical_record_number 等）
                        def _normalize_keys(d: dict) -> dict:
                            if not isinstance(d, dict):
                                return d
                            # 递归处理子结构
                            normalized: dict = {}
                            for key, value in d.items():
                                if isinstance(value, dict):
                                    normalized[key] = _normalize_keys(value)
                                elif isinstance(value, list):
                                    normalized[key] = [
                                        _normalize_keys(item) if isinstance(item, dict) else item
                                        for item in value
                                    ]
                                else:
                                    normalized[key] = value

                            def _alias(keys: list[str], target: str):
                                for alias in keys:
                                    if alias in normalized:
                                        if target not in normalized:
                                            normalized[target] = normalized[alias]
                                        # 若别名与目标不同，保留原字段供参考
                                return

                            # 展平 patient_info / patient / 患者信息 / 基本信息 等嵌套
                            for nested_key in ('患者信息','基本信息','patient_info', 'patientInfo', 'patient-info', 'patient'):
                                if nested_key in normalized and isinstance(normalized[nested_key], dict):
                                    nested_dict = normalized[nested_key]
                                    normalized.update(
                                        {k: v for k, v in nested_dict.items() if k not in normalized}
                                    )

                            _alias(['name', '姓名', '患者姓名'], 'patient_name')
                            _alias(['gender', 'sex', '性别'], 'gender')
                            _alias(['age', '年龄'], 'age')
                            _alias(['patientId', 'patient_id', 'record_id', '病历号', '住院号', '门诊号'], 'medical_record_number')
                            _alias(['chiefComplaint', 'chief_complaint', '主诉'], 'chief_complaint')
                            _alias(['diagnosis', '诊断'], 'diagnosis')
                            _alias(['medicalHistory', 'medical_history', '既往史', '病史'], 'medical_history')
                            _alias(['confidence', '置信度'], 'confidence')

                            # 数值规范化
                            if 'age' in normalized:
                                try:
                                    age_str = str(normalized['age']).strip()
                                    match = re.search(r'\d+', age_str)
                                    normalized['age'] = int(match.group()) if match else 0
                                except Exception:
                                    normalized['age'] = 0
                            if 'confidence' in normalized:
                                try:
                                    conf_str = str(normalized['confidence']).strip().replace('%', '')
                                    normalized['confidence'] = float(conf_str)
                                except Exception:
                                    normalized['confidence'] = 0.0

                            # 兼容旧字段命名
                            if 'patient_name' in normalized:
                                normalized.setdefault('name', normalized['patient_name'])
                            if 'medical_record_number' in normalized:
                                normalized.setdefault('patient_id', normalized['medical_record_number'])
                                normalized.setdefault('patientId', normalized['medical_record_number'])
                            if 'chief_complaint' in normalized:
                                normalized.setdefault('chiefComplaint', normalized['chief_complaint'])
                            if 'medical_history' in normalized:
                                normalized.setdefault('medicalHistory', normalized['medical_history'])

                            return normalized
                        if structured is not None and isinstance(structured, dict):
                            structured = _normalize_keys(structured)
                        elif isinstance(structured, list):
                            first_dict = next((item for item in structured if isinstance(item, dict)), None)
                            structured = _normalize_keys(first_dict) if first_dict else None
                        if structured is not None and isinstance(structured, dict) and required_keys:
                            for k in required_keys:
                                structured.setdefault(k, "" if k != "confidence" else 0.0)
                    if request.strict_json and structured is None and request.schema_name:
                        # 严格模式解析失败：若允许兜底，尝试 OCR+LLM 回退；否则直接失败
                        if getattr(request, "allow_fallback", False):
                            try:
                                # 提取纯 base64 数据
                                img_data = request.image_data
                                if isinstance(img_data, str) and img_data.startswith("data:"):
                                    try:
                                        img_data = img_data.split(",", 1)[1]
                                    except Exception:
                                        pass
                                from .ocr_service import OCRService, OCRRequest as _OCRReq
                                ocr = OCRService()
                                ocr_resp = await ocr.recognize(_OCRReq(image_data=img_data))
                                if ocr_resp.success and ocr_resp.result:
                                    ocr_text = (ocr_resp.result.text or "").strip()
                                    from ..ai.models import ChatOptions as _Opts, Message as _Msg
                                    fallback_hint = (
                                        "严格规则：仅从右侧详情/信息面板提取（基本信息/诊断信息/医嘱录入/病历详情）；"
                                        "忽略左侧边栏与中间的患者列表/历史记录/导航/候选卡片/表格行，绝不要从列表或卡片集合取值；"
                                        "所有字段必须来自同一位患者的同一详情面板。\n"
                                    )
                                    if request.schema_name == "patient_info_v1":
                                        fallback_hint += (
                                            "请仅输出严格JSON，键名必须为："
                                            "\"patient_name\",\"gender\",\"age\",\"medical_record_number\"," 
                                            "\"chief_complaint\",\"diagnosis\",\"confidence\"；"
                                            "没有的信息用空字符串或0表示。"
                                        )
                                    prompt2 = (
                                        "请基于以下 OCR 文本稳健提取患者信息，并严格输出 JSON。\n\n"
                                        + fallback_hint +
                                        "\n只返回严格JSON，不要任何解释。\n\nOCR：\n" + ocr_text
                                    )
                                    fb_opts = _Opts(model="qwen3-max", max_tokens=request.max_tokens, temperature=request.temperature)
                                    fb_resp = await self.ai_manager.chat(
                                        messages=[_Msg(role="system", content="你是医疗信息抽取助手。"), _Msg(role="user", content=prompt2)],
                                        provider="dashscope",
                                        options=fb_opts,
                                    )
                                    try:
                                        structured2 = json.loads(fb_resp.message.content)
                                    except Exception:
                                        structured2 = _pick_structured_from_text(fb_resp.message.content, required_keys)
                                    if isinstance(structured2, dict):
                                        for k in required_keys:
                                            structured2.setdefault(k, "" if k != "confidence" else 0.0)
                                        structured = structured2
                                        content = fb_resp.message.content
                                        usage = {"tokens_used": fb_resp.usage.total_tokens}
                                        logger.info("DashScope OCR+LLM fallback applied")
                            except Exception as _e:
                                logger.warning(f"DashScope OCR+LLM fallback failed: {_e}")
                        # 如果仍然没有结构化结果，则报错
                        if structured is None:
                            snippet = content[:500] if isinstance(content, str) else str(type(content))
                            logger.warning(f"DashScope strict JSON parse failed. snippet={snippet}")
                            return VisionResponse(
                                success=False,
                                error="strict_json_parse_failed",
                                processing_time_ms=(time.time() - start_time) * 1000,
                                model_used=request.model,
                            )
                    result = VisionResult(
                        description=content,
                        confidence=0.8,
                        details={"model": request.model, "usage": usage or {}},
                        structured=structured,
                    )
                    try:
                        preview = json.dumps(structured, ensure_ascii=False)[:300] if structured else "null"
                        logger.info(f"DashScope structured output: {preview}")
                    except Exception:
                        pass
                    return VisionResponse(
                        success=True,
                        result=result,
                        model_used=request.model,
                        processing_time_ms=processing_time,
                    )
                except Exception as e:
                    logger.warning(f"DashScope VL 调用失败: {e}")
                    # 若不允许降级，直接返回失败
                    if not getattr(request, "allow_fallback", False):
                        return VisionResponse(
                            success=False,
                            error=f"dashscope_vl_error: {e}",
                            processing_time_ms=(time.time() - start_time) * 1000,
                            model_used=request.model,
                        )
            
            if not self.ai_manager:
                raise ValueError("AI服务管理器未初始化")

            # 仅使用请求/场景注入的提示词
            prompt = request.prompt or ""

            # 调用AI服务进行图像理解（当前使用文本对话能力占位实现）
            # 注意：此处未直接向模型传递图像数据，需后续接入具备VL能力的Provider。
            from ..ai.models import ChatOptions, Message

            options = ChatOptions(
                model=request.model,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
            )

            # 以系统+用户消息形式调用统一AI对话接口
            messages = [
                Message(role="system", content="你是图像理解助手，请稳健、结构化地回答。"),
                Message(role="user", content=prompt),
            ]
            try:
                response = await self.ai_manager.chat(
                    messages=messages,
                    provider=getattr(request, "provider", None),
                    options=options,
                )
            except Exception as e:
                if not getattr(request, "allow_fallback", False):
                    raise
                logger.warning(f"primary vision call failed, trying openai fallback: {e}")
                from ..ai.models import ChatOptions as _Opts
                fb_opts = _Opts(model="gpt-4o-mini", max_tokens=options.max_tokens, temperature=options.temperature)
                response = await self.ai_manager.chat(
                    messages=messages,
                    provider="openai",
                    options=fb_opts,
                )

            processing_time = (time.time() - start_time) * 1000

            structured = None
            if request.schema_name:
                try:
                    structured = json.loads(response.message.content)
                except Exception:
                    structured = _pick_structured_from_text(response.message.content, required_keys)
                    if structured is None:
                        structured = _extract_from_kv(response.message.content)
                # 同义键名归一化
                def _normalize_keys2(d: dict) -> dict:
                    if not isinstance(d, dict):
                        return d
                    m = dict(d)
                    if 'name' in m and 'patient_name' not in m:
                        m['patient_name'] = m.pop('name')
                    if 'patientId' in m and 'medical_record_number' not in m:
                        m['medical_record_number'] = m.pop('patientId')
                    if 'patient_id' in m and 'medical_record_number' not in m:
                        m['medical_record_number'] = m.pop('patient_id')
                    if 'sex' in m and 'gender' not in m:
                        m['gender'] = m.pop('sex')
                    if 'chiefComplaint' in m and 'chief_complaint' not in m:
                        m['chief_complaint'] = m.pop('chiefComplaint')
                    if 'medicalHistory' in m and 'medical_history' not in m:
                        m['medical_history'] = m.pop('medicalHistory')
                    if 'age' in m:
                        try:
                            age_str = str(m['age']).strip()
                            match = re.search(r'\d+', age_str)
                            m['age'] = int(match.group()) if match else 0
                        except Exception:
                            m['age'] = 0
                    if 'confidence' in m:
                        try:
                            conf_str = str(m['confidence']).strip().replace('%', '')
                            m['confidence'] = float(conf_str)
                        except Exception:
                            m['confidence'] = 0.0
                    if 'patient_name' in m:
                        m.setdefault('name', m['patient_name'])
                    if 'medical_record_number' in m:
                        m.setdefault('patient_id', m['medical_record_number'])
                        m.setdefault('patientId', m['medical_record_number'])
                    if 'chief_complaint' in m:
                        m.setdefault('chiefComplaint', m['chief_complaint'])
                    if 'medical_history' in m:
                        m.setdefault('medicalHistory', m['medical_history'])
                    return m
                if structured is not None and isinstance(structured, dict):
                    structured = _normalize_keys2(structured)
                if structured is not None and isinstance(structured, dict) and required_keys:
                    for k in required_keys:
                        structured.setdefault(k, "" if k != "confidence" else 0.0)
            if request.strict_json and structured is None and request.schema_name:
                logger.warning(
                    "Vision strict JSON parse failed",
                    content=response.message.content[:500],
                    schema=request.schema_name,
                    provider=getattr(request, "provider", None),
                )
                return VisionResponse(
                    success=False,
                    error="strict_json_parse_failed",
                    processing_time_ms=(time.time() - start_time) * 1000,
                    model_used=response.model,
                )
            result = VisionResult(
                description=response.message.content,
                confidence=0.8,
                details={"model": response.model, "tokens_used": response.usage.total_tokens},
                structured=structured,
            )
            try:
                preview = json.dumps(structured, ensure_ascii=False)[:300] if structured else "null"
                logger.info(f"Vision structured output: {preview}")
            except Exception:
                pass

            logger.info(
                f"视觉理解成功: 模型={response.model}, "
                f"处理时间={processing_time:.2f}ms"
            )

            # 若结构化覆盖率过低（大多为空），尝试 OCR + 文本LLM 回退
            def _coverage(d: Optional[dict]) -> int:
                if not d or not isinstance(d, dict):
                    return 0
                keys = [
                    "patient_name",
                    "medical_record_number",
                    "chief_complaint",
                    "diagnosis",
                    "age",
                    "gender",
                ]
                cnt = 0
                for k in keys:
                    v = d.get(k)
                    if isinstance(v, str) and v.strip():
                        cnt += 1
                    elif isinstance(v, (int, float)) and float(v) > 0:
                        cnt += 1
                return cnt

            cov = _coverage(structured)
            if getattr(request, "allow_fallback", False) and request.schema_name and cov < 2:
                try:
                    logger.info("Structured coverage low, trying OCR + text LLM fallback")
                    # 提取纯 base64 数据
                    img_data = request.image_data
                    if img_data.startswith("data:"):
                        try:
                            img_data = img_data.split(",", 1)[1]
                        except Exception:
                            pass
                    from .ocr_service import OCRService, OCRRequest as _OCRReq
                    ocr = OCRService()
                    ocr_resp = await ocr.recognize(_OCRReq(image_data=img_data))
                    if ocr_resp.success and ocr_resp.result:
                        ocr_text = ocr_resp.result.text.strip()
                        from ..ai.models import ChatOptions as _Opts, Message as _Msg
                        # Fallback 提示词（加入区域选择规则，避免取到中间列表/左侧边栏）
                        fallback_hint = (
                            "严格规则：仅从右侧详情/信息面板提取（基本信息/诊断信息/医嘱录入/病历详情）；"
                            "忽略左侧边栏与中间的患者列表/历史记录/导航/候选卡片/表格行，绝不要从列表或卡片集合取值；"
                            "所有字段必须来自同一位患者的同一详情面板。\n"
                        )
                        if request.schema_name == "patient_info_v1":
                            fallback_hint += (
                                "请仅输出严格JSON，键名必须为："
                                "\"patient_name\",\"gender\",\"age\",\"medical_record_number\"," 
                                "\"chief_complaint\",\"diagnosis\",\"confidence\"；"
                                "没有的信息用空字符串或0表示。"
                            )
                        prompt2 = (
                            "请基于以下 OCR 文本稳健提取患者信息，并严格输出 JSON。\n\n"
                            + fallback_hint +
                            "\n只返回严格JSON，不要任何解释。\n\nOCR：\n" + ocr_text
                        )
                        fb_opts = _Opts(model="qwen3-max", max_tokens=request.max_tokens, temperature=request.temperature)
                        fb_resp = await self.ai_manager.chat(
                            messages=[_Msg(role="system", content="你是医疗信息抽取助手。"), _Msg(role="user", content=prompt2)],
                            provider="dashscope",
                            options=fb_opts,
                        )
                        try:
                            structured2 = json.loads(fb_resp.message.content)
                        except Exception:
                            structured2 = _pick_structured_from_text(fb_resp.message.content, required_keys)
                        if isinstance(structured2, dict):
                            for k in required_keys:
                                structured2.setdefault(k, "" if k != "confidence" else 0.0)
                            structured = structured2
                            result.description = fb_resp.message.content
                            result.details = {"model": fb_resp.model, "tokens_used": fb_resp.usage.total_tokens}
                            logger.info("OCR + text LLM fallback applied")
                except Exception as _e:
                    logger.warning(f"OCR+LLM fallback failed: {_e}")

            return VisionResponse(
                success=True,
                result=result,
                model_used=result.details.get("model") if isinstance(result.details, dict) else response.model,
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
