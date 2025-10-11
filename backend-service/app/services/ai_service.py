"""
AI服务 - 调用Deepseek API
"""
from openai import OpenAI
from typing import List, Dict, Any
import json
from loguru import logger

from app.config import settings


class AIService:
    """AI服务类"""
    
    def __init__(self):
        """初始化AI客户端"""
        self.client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_API_BASE
        )
        self.model = settings.DEEPSEEK_MODEL
    
    async def generate_recommendations(
        self,
        patient_name: str,
        gender: str,
        age: int,
        chief_complaint: str,
        medical_history: str = ""
    ) -> List[Dict[str, Any]]:
        """
        生成检查项目推荐
        
        Args:
            patient_name: 患者姓名
            gender: 性别
            age: 年龄
            chief_complaint: 主诉
            medical_history: 病史
            
        Returns:
            推荐列表
        """
        try:
            # 构建prompt
            prompt = self._build_recommendation_prompt(
                patient_name, gender, age, chief_complaint, medical_history
            )
            
            logger.info(f"调用AI API生成推荐,患者: {patient_name}")
            
            # 调用API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是一名资深的临床医生,擅长根据患者症状推荐合适的影像检查项目。请以JSON格式返回推荐结果。"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            # 解析响应
            content = response.choices[0].message.content
            logger.debug(f"AI响应: {content}")
            
            # 提取JSON部分
            recommendations = self._parse_recommendations(content)
            
            logger.info(f"成功生成 {len(recommendations)} 条推荐")
            return recommendations
            
        except Exception as e:
            logger.error(f"AI推荐生成失败: {e}")
            raise
    
    def _build_recommendation_prompt(
        self,
        patient_name: str,
        gender: str,
        age: int,
        chief_complaint: str,
        medical_history: str
    ) -> str:
        """构建推荐prompt"""
        prompt = f"""
请根据以下患者信息推荐合适的影像检查项目:

患者信息:
- 姓名: {patient_name}
- 性别: {gender}
- 年龄: {age}岁
- 主诉: {chief_complaint}
"""
        
        if medical_history:
            prompt += f"- 病史: {medical_history}\n"
        
        prompt += """
请按照以下JSON格式返回推荐结果(返回1-3个最相关的检查项目):

```json
[
  {
    "title": "检查项目名称",
    "exam_type": "CT/MRI/X-Ray/超声",
    "body_part": "检查部位",
    "priority": "high/medium/low",
    "reason": "详细的推荐理由,说明为什么需要这个检查",
    "urgency": "急诊/择期",
    "estimated_cost": "预估费用范围(如: 300-500元)",
    "confidence": 0.85
  }
]
```

注意:
1. 优先级(priority): high表示强烈推荐,medium表示建议,low表示可选
2. 紧急程度(urgency): 急诊表示需要立即检查,择期表示可以安排时间
3. 置信度(confidence): 0-1之间的数值,表示推荐的可信度
4. 推荐理由要详细,说明临床依据
"""
        
        return prompt
    
    def _parse_recommendations(self, content: str) -> List[Dict[str, Any]]:
        """解析AI返回的推荐结果"""
        try:
            # 尝试直接解析JSON
            if content.strip().startswith('['):
                return json.loads(content)
            
            # 提取JSON代码块
            if '```json' in content:
                start = content.find('```json') + 7
                end = content.find('```', start)
                json_str = content[start:end].strip()
                return json.loads(json_str)
            
            # 查找JSON数组
            start = content.find('[')
            end = content.rfind(']') + 1
            if start != -1 and end > start:
                json_str = content[start:end]
                return json.loads(json_str)
            
            logger.warning("无法解析AI响应,返回空列表")
            return []
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析失败: {e}")
            logger.debug(f"原始内容: {content}")
            return []
    
    async def chat(self, message: str, history: List[Dict[str, str]] = None) -> str:
        """
        AI对话

        Args:
            message: 用户消息
            history: 对话历史

        Returns:
            AI回复
        """
        try:
            messages = [
                {
                    "role": "system",
                    "content": "你是一名专业的医疗AI助手,可以回答医疗相关的问题。请提供准确、专业的建议。"
                }
            ]

            # 添加历史对话
            if history:
                messages.extend(history)

            # 添加当前消息
            messages.append({
                "role": "user",
                "content": message
            })

            logger.info(f"AI对话请求: {message}")

            # 调用API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )

            reply = response.choices[0].message.content
            logger.info(f"AI回复: {reply[:100]}...")

            return reply

        except Exception as e:
            logger.error(f"AI对话失败: {e}")
            raise

    async def extract_patient_info(self, ocr_text: str) -> Dict[str, Any]:
        """
        从OCR文本中提取患者信息

        Args:
            ocr_text: OCR识别的文本

        Returns:
            提取的患者信息
        """
        try:
            prompt = f"""
请从以下OCR识别的文本中提取患者信息,并以JSON格式返回。

OCR文本:
{ocr_text}

请提取以下字段(如果文本中没有相关信息,则该字段可以为空):
- name: 患者姓名
- age: 年龄(数字)
- gender: 性别(男/女/未知)
- patientId: 患者ID或病历号
- department: 就诊科室
- chiefComplaint: 主诉或症状描述
- diagnosis: 诊断(如果有)
- medicalHistory: 病史(如果有)

请严格按照以下JSON格式返回:
```json
{{
  "name": "患者姓名",
  "age": 年龄数字,
  "gender": "男/女/未知",
  "patientId": "患者ID",
  "department": "科室名称",
  "chiefComplaint": "主诉内容",
  "diagnosis": "诊断内容",
  "medicalHistory": "病史内容",
  "confidence": 0.85
}}
```

注意:
1. confidence字段表示提取的置信度(0-1之间),根据文本清晰度和信息完整度评估
2. 如果某个字段无法从文本中提取,请设置为空字符串或null
3. 只返回JSON,不要包含其他说明文字
"""

            logger.info("调用AI提取患者信息")

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是一个专业的医疗信息提取助手,擅长从OCR文本中准确提取患者信息。"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # 降低温度以提高准确性
                max_tokens=1000
            )

            content = response.choices[0].message.content
            logger.debug(f"AI响应: {content}")

            # 解析JSON
            patient_info = self._parse_patient_info(content)

            logger.info(f"成功提取患者信息: {patient_info.get('name', 'Unknown')}")
            return patient_info

        except Exception as e:
            logger.error(f"提取患者信息失败: {e}")
            raise

    def _parse_patient_info(self, content: str) -> Dict[str, Any]:
        """解析AI返回的患者信息"""
        try:
            # 尝试直接解析JSON
            if content.strip().startswith('{'):
                return json.loads(content)

            # 提取JSON代码块
            if '```json' in content:
                start = content.find('```json') + 7
                end = content.find('```', start)
                json_str = content[start:end].strip()
                return json.loads(json_str)

            # 查找JSON对象
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end > start:
                json_str = content[start:end]
                return json.loads(json_str)

            logger.warning("无法解析患者信息,返回空对象")
            return {
                "name": "",
                "confidence": 0.0
            }

        except json.JSONDecodeError as e:
            logger.error(f"JSON解析失败: {e}")
            logger.debug(f"原始内容: {content}")
            return {
                "name": "",
                "confidence": 0.0
            }


# 创建全局AI服务实例
ai_service = AIService()

