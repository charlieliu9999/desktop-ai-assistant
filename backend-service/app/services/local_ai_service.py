"""
本地AI服务 - 使用Ollama运行本地多模态模型
"""
import os
import json
import base64
import httpx
from typing import Dict, Any, Optional, List
from loguru import logger
from app.config import settings


class LocalAIService:
    """本地AI服务,使用Ollama API"""

    def __init__(self):
        self.endpoint = os.getenv('LOCAL_AI_ENDPOINT', 'http://localhost:11434')
        self.model = os.getenv('LOCAL_AI_MODEL', 'llama3.2-vision')
        self.timeout = int(os.getenv('LOCAL_AI_TIMEOUT', '60'))
        self.max_retries = int(os.getenv('LOCAL_AI_MAX_RETRIES', '3'))

        logger.info(f"初始化本地AI服务: endpoint={self.endpoint}, model={self.model}")

    def _get_model_config(self, scenario: str) -> Dict[str, Any]:
        """获取指定场景的模型配置"""
        return settings.get_model_config(scenario)
    
    async def check_health(self) -> bool:
        """检查Ollama服务是否可用"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.endpoint}/api/tags")
                if response.status_code == 200:
                    models = response.json().get('models', [])
                    model_names = [m['name'] for m in models]
                    logger.info(f"Ollama服务可用,已安装模型: {model_names}")
                    return self.model in model_names or any(self.model in name for name in model_names)
                return False
        except Exception as e:
            logger.error(f"Ollama服务不可用: {e}")
            return False
    
    async def extract_patient_info_from_image(
        self,
        image_data: str,
        prompt_template: str = "medical_patient_info"
    ) -> Dict[str, Any]:
        """
        从图像中提取患者信息

        Args:
            image_data: base64编码的图像数据
            prompt_template: 提示词模板类型

        Returns:
            提取的患者信息
        """
        try:
            # 获取屏幕识别场景的模型配置
            config = self._get_model_config("screen_recognition")

            # 构建提示词
            prompt = self._build_extraction_prompt(prompt_template)

            logger.info(f"开始从图像提取患者信息,模型: {config['model_name']}")

            # 调用Ollama API
            patient_info = await self._call_ollama_vision(
                prompt=prompt,
                image_data=image_data,
                model_name=config['model_name'],
                base_url=config['base_url'],
                timeout=config.get('timeout', 60)
            )

            logger.info(f"成功提取患者信息: {patient_info.get('name', 'Unknown')}")
            return patient_info

        except Exception as e:
            logger.error(f"从图像提取患者信息失败: {e}")
            raise
    
    async def generate_recommendations(
        self,
        patient_name: str,
        gender: str,
        age: int,
        chief_complaint: str,
        medical_history: str = "",
        recommendation_type: str = "exam"  # exam, medication, diagnosis
    ) -> List[Dict[str, Any]]:
        """
        基于本地模型生成推荐

        Args:
            patient_name: 患者姓名
            gender: 性别
            age: 年龄
            chief_complaint: 主诉
            medical_history: 病史
            recommendation_type: 推荐类型 (exam/medication/diagnosis)

        Returns:
            推荐列表
        """
        try:
            # 根据推荐类型选择场景
            scenario_map = {
                "exam": "exam_recommendation",
                "medication": "medication_recommendation",
                "diagnosis": "diagnosis_suggestion"
            }
            scenario = scenario_map.get(recommendation_type, "exam_recommendation")
            config = self._get_model_config(scenario)

            prompt = self._build_recommendation_prompt(
                patient_name, gender, age, chief_complaint, medical_history, recommendation_type
            )

            logger.info(f"开始生成{recommendation_type}推荐: patient={patient_name}, complaint={chief_complaint}")

            # 调用Ollama API(文本模式)
            response_text = await self._call_ollama_text(
                prompt,
                model_name=config['model_name'],
                base_url=config['base_url'],
                temperature=config['temperature'],
                max_tokens=config['max_tokens'],
                timeout=config.get('timeout', 60)
            )

            # 解析推荐结果
            recommendations = self._parse_recommendations(response_text, recommendation_type)

            logger.info(f"成功生成 {len(recommendations)} 条推荐")
            return recommendations

        except Exception as e:
            logger.error(f"生成推荐失败: {e}")
            raise
    
    async def _call_ollama_vision(
        self,
        prompt: str,
        image_data: str,
        model_name: str = None,
        base_url: str = None,
        timeout: int = None
    ) -> Dict[str, Any]:
        """调用Ollama视觉模型API"""

        # 使用传入的参数或默认值
        model = model_name or self.model
        endpoint = base_url or self.endpoint
        timeout_val = timeout or self.timeout

        # 移除base64前缀(如果有)
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        payload = {
            "model": model,
            "prompt": prompt,
            "images": [image_data],
            "stream": False,
            "format": "json"
        }

        async with httpx.AsyncClient(timeout=timeout_val) as client:
            response = await client.post(
                f"{endpoint}/api/generate",
                json=payload
            )

            if response.status_code != 200:
                raise Exception(f"Ollama API错误: {response.status_code} - {response.text}")

            result = response.json()
            response_text = result.get('response', '')

            # 解析JSON响应
            patient_info = self._parse_patient_info(response_text)

            return patient_info
    
    async def _call_ollama_text(
        self,
        prompt: str,
        model_name: str = None,
        base_url: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        timeout: int = None
    ) -> str:
        """调用Ollama文本模型API"""

        # 使用传入的参数或默认值
        model = model_name or self.model
        endpoint = base_url or self.endpoint
        timeout_val = timeout or self.timeout

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }

        async with httpx.AsyncClient(timeout=timeout_val) as client:
            response = await client.post(
                f"{endpoint}/api/generate",
                json=payload
            )

            if response.status_code != 200:
                raise Exception(f"Ollama API错误: {response.status_code} - {response.text}")

            result = response.json()
            return result.get('response', '')
    
    def _build_extraction_prompt(self, template: str) -> str:
        """构建患者信息提取提示词"""
        
        if template == "medical_patient_info":
            return """请仔细分析这张医疗系统的屏幕截图,提取其中的患者信息。

请提取以下字段(如果图像中没有相关信息,则该字段设置为空字符串或null):
- name: 患者姓名
- age: 年龄(数字)
- gender: 性别(男/女/未知)
- patientId: 患者ID或病历号
- department: 就诊科室
- chiefComplaint: 主诉或症状描述
- diagnosis: 诊断(如果有)
- medicalHistory: 病史(如果有)

请严格按照以下JSON格式返回,不要包含任何其他文字:
{
  "name": "患者姓名",
  "age": 年龄数字,
  "gender": "男/女/未知",
  "patientId": "患者ID",
  "department": "科室名称",
  "chiefComplaint": "主诉内容",
  "diagnosis": "诊断内容",
  "medicalHistory": "病史内容",
  "confidence": 0.85
}

注意:
1. confidence字段表示提取的置信度(0-1之间),根据图像清晰度和信息完整度评估
2. 如果某个字段无法从图像中提取,请设置为空字符串""或null
3. 只返回JSON,不要包含其他说明文字
4. 确保JSON格式正确,可以被解析"""
        
        return template
    
    def _build_recommendation_prompt(
        self,
        patient_name: str,
        gender: str,
        age: int,
        chief_complaint: str,
        medical_history: str,
        recommendation_type: str = "exam"
    ) -> str:
        """构建推荐生成提示词"""

        patient_info = f"""患者信息:
- 姓名: {patient_name}
- 性别: {gender}
- 年龄: {age}岁
- 主诉: {chief_complaint}
- 病史: {medical_history or '无'}"""

        if recommendation_type == "exam":
            return f"""作为一名专业的医疗AI助手,请根据以下患者信息推荐合适的检查项目:

{patient_info}

请推荐3-5个最相关的检查项目,每个推荐包含:
1. title: 检查项目名称
2. exam_type: 检查类型(如:CT、MRI、X光、超声、血液检查等)
3. body_part: 检查部位
4. priority: 优先级(high/medium/low)
5. reason: 推荐理由(简短说明)
6. urgency: 紧急程度(急诊/普通/择期)
7. estimated_cost: 预估费用范围
8. confidence: 推荐置信度(0-1)

请以JSON数组格式返回:
[
  {{
    "title": "胸部CT",
    "exam_type": "CT",
    "body_part": "胸部",
    "priority": "high",
    "reason": "根据主诉胸痛,需要排查肺部疾病",
    "urgency": "急诊",
    "estimated_cost": "300-500元",
    "confidence": 0.9
  }}
]

只返回JSON数组,不要包含其他文字。"""

        elif recommendation_type == "medication":
            return f"""作为一名专业的医疗AI助手,请根据以下患者信息推荐合适的用药方案:

{patient_info}

请推荐3-5个最相关的用药建议,每个推荐包含:
1. title: 药品名称
2. category: 药品类别(如:抗生素、止痛药、降压药等)
3. dosage: 用法用量
4. duration: 疗程
5. reason: 推荐理由
6. precautions: 注意事项
7. confidence: 推荐置信度(0-1)

请以JSON数组格式返回:
[
  {{
    "title": "阿莫西林胶囊",
    "category": "抗生素",
    "dosage": "0.5g,每日3次,饭后服用",
    "duration": "7天",
    "reason": "用于治疗呼吸道感染",
    "precautions": "青霉素过敏者禁用",
    "confidence": 0.85
  }}
]

只返回JSON数组,不要包含其他文字。"""

        elif recommendation_type == "diagnosis":
            return f"""作为一名专业的医疗AI助手,请根据以下患者信息提供诊断建议:

{patient_info}

请提供3-5个可能的诊断建议,每个建议包含:
1. title: 诊断名称
2. icd_code: ICD-10编码(如果适用)
3. probability: 可能性(high/medium/low)
4. symptoms: 相关症状
5. reason: 诊断依据
6. next_steps: 建议的下一步检查或治疗
7. confidence: 诊断置信度(0-1)

请以JSON数组格式返回:
[
  {{
    "title": "急性上呼吸道感染",
    "icd_code": "J06.9",
    "probability": "high",
    "symptoms": "咳嗽、发热、咽痛",
    "reason": "根据主诉和症状,符合上呼吸道感染特征",
    "next_steps": "建议进行血常规检查,必要时胸部X光",
    "confidence": 0.8
  }}
]

只返回JSON数组,不要包含其他文字。"""

        else:
            # 默认返回检查推荐
            return self._build_recommendation_prompt(
                patient_name, gender, age, chief_complaint, medical_history, "exam"
            )
    
    def _parse_patient_info(self, response_text: str) -> Dict[str, Any]:
        """解析患者信息响应"""
        try:
            # 尝试直接解析JSON
            if response_text.strip().startswith('{'):
                return json.loads(response_text)
            
            # 提取JSON代码块
            if '```json' in response_text:
                start = response_text.find('```json') + 7
                end = response_text.find('```', start)
                json_str = response_text[start:end].strip()
                return json.loads(json_str)
            
            # 查找JSON对象
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start != -1 and end > start:
                json_str = response_text[start:end]
                return json.loads(json_str)
            
            logger.warning("无法解析患者信息,返回空对象")
            return {
                "name": "",
                "confidence": 0.0
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析失败: {e}")
            logger.debug(f"原始响应: {response_text}")
            return {
                "name": "",
                "confidence": 0.0
            }
    
    def _parse_recommendations(self, response_text: str, recommendation_type: str = "exam") -> List[Dict[str, Any]]:
        """解析推荐响应"""
        try:
            # 尝试直接解析JSON数组
            if response_text.strip().startswith('['):
                return json.loads(response_text)

            # 提取JSON代码块
            if '```json' in response_text:
                start = response_text.find('```json') + 7
                end = response_text.find('```', start)
                json_str = response_text[start:end].strip()
                return json.loads(json_str)

            # 查找JSON数组
            start = response_text.find('[')
            end = response_text.rfind(']') + 1
            if start != -1 and end > start:
                json_str = response_text[start:end]
                return json.loads(json_str)

            logger.warning("无法解析推荐结果,返回空列表")
            return []

        except json.JSONDecodeError as e:
            logger.error(f"JSON解析失败: {e}")
            logger.debug(f"原始响应: {response_text}")
            return []


# 创建全局本地AI服务实例
local_ai_service = LocalAIService()

