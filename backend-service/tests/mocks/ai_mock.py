"""
AI服务Mock
用于测试时模拟AI模型调用
"""
from typing import List, Dict, Any, AsyncIterator


class MockOpenAIClient:
    """
    Mock OpenAI客户端
    """
    
    def __init__(self, api_key: str = "mock_key"):
        self.api_key = api_key
    
    async def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "gpt-4",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        模拟聊天完成
        """
        if stream:
            return self._stream_response(messages)
        
        return {
            "id": "chatcmpl-mock-123",
            "object": "chat.completion",
            "created": 1677652288,
            "model": model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": f"这是对'{messages[-1]['content']}'的模拟响应"
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30
            }
        }
    
    async def _stream_response(self, messages: List[Dict[str, str]]) -> AsyncIterator[Dict[str, Any]]:
        """
        模拟流式响应
        """
        content = f"这是对'{messages[-1]['content']}'的模拟流式响应"
        words = content.split()
        
        for i, word in enumerate(words):
            yield {
                "id": "chatcmpl-mock-123",
                "object": "chat.completion.chunk",
                "created": 1677652288,
                "model": "gpt-4",
                "choices": [{
                    "index": 0,
                    "delta": {
                        "content": word + " " if i < len(words) - 1 else word
                    },
                    "finish_reason": None if i < len(words) - 1 else "stop"
                }]
            }


class MockOllamaClient:
    """
    Mock Ollama客户端
    """
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
    
    async def generate(
        self,
        model: str,
        prompt: str,
        images: List[str] = None,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        模拟生成响应
        """
        if stream:
            return self._stream_response(prompt)
        
        response_text = f"这是Ollama对'{prompt}'的模拟响应"
        if images:
            response_text += f" (包含{len(images)}张图片)"
        
        return {
            "model": model,
            "created_at": "2024-01-01T00:00:00Z",
            "response": response_text,
            "done": True
        }
    
    async def _stream_response(self, prompt: str) -> AsyncIterator[Dict[str, Any]]:
        """
        模拟流式响应
        """
        content = f"这是Ollama对'{prompt}'的模拟流式响应"
        words = content.split()
        
        for i, word in enumerate(words):
            yield {
                "model": "qwen2.5:32b",
                "created_at": "2024-01-01T00:00:00Z",
                "response": word + " " if i < len(words) - 1 else word,
                "done": i == len(words) - 1
            }


class MockDeepseekClient:
    """
    Mock Deepseek客户端
    """
    
    def __init__(self, api_key: str = "mock_key"):
        self.api_key = api_key
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "deepseek-chat",
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> Dict[str, Any]:
        """
        模拟聊天完成
        """
        return {
            "id": "deepseek-mock-123",
            "object": "chat.completion",
            "created": 1677652288,
            "model": model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": f"这是Deepseek对'{messages[-1]['content']}'的模拟响应"
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30
            }
        }


class MockVisionModel:
    """
    Mock视觉模型
    """
    
    async def analyze_image(
        self,
        image_base64: str,
        prompt: str = "分析这张图片"
    ) -> Dict[str, Any]:
        """
        模拟图片分析
        """
        return {
            "success": True,
            "data": {
                "description": "这是一张医疗影像图片的模拟分析结果",
                "objects": ["患者信息", "检查报告"],
                "text": "姓名: 张三\n年龄: 45岁\n性别: 男",
                "confidence": 0.95
            }
        }
    
    async def extract_patient_info(
        self,
        image_base64: str
    ) -> Dict[str, Any]:
        """
        模拟患者信息提取
        """
        return {
            "success": True,
            "data": {
                "name": "张三",
                "age": 45,
                "gender": "男",
                "id_number": "110101197001011234",
                "phone": "13800138000",
                "diagnosis": "高血压",
                "confidence": 0.92
            }
        }

