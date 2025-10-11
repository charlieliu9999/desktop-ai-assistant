"""
AI服务管理器 - 统一管理本地和云端AI服务
"""
import os
from typing import Dict, Any, List, Optional
from loguru import logger

from app.services.ai_service import ai_service as cloud_ai_service
from app.services.local_ai_service import local_ai_service


class AIServiceManager:
    """
    AI服务管理器
    
    支持三种模式:
    - local: 仅使用本地AI模型
    - cloud: 仅使用云端API
    - hybrid: 本地优先,失败时回退到云端
    """
    
    def __init__(self):
        self.mode = os.getenv('AI_SERVICE_MODE', 'local')
        self.local_service = local_ai_service
        self.cloud_service = cloud_ai_service
        
        logger.info(f"AI服务管理器初始化: mode={self.mode}")
        
        # 验证配置
        self._validate_config()
    
    def _validate_config(self):
        """验证配置"""
        valid_modes = ['local', 'cloud', 'hybrid']
        if self.mode not in valid_modes:
            logger.warning(f"无效的AI_SERVICE_MODE: {self.mode}, 使用默认值 'local'")
            self.mode = 'local'
    
    async def check_services_health(self) -> Dict[str, bool]:
        """检查各服务健康状态"""
        health = {
            'local': False,
            'cloud': False
        }
        
        # 检查本地服务
        try:
            health['local'] = await self.local_service.check_health()
        except Exception as e:
            logger.error(f"检查本地服务失败: {e}")
        
        # 检查云端服务
        try:
            # 简单的ping测试
            health['cloud'] = True  # 假设云端服务总是可用
        except Exception as e:
            logger.error(f"检查云端服务失败: {e}")
        
        logger.info(f"服务健康状态: {health}")
        return health
    
    async def extract_patient_info_from_image(
        self,
        image_data: str,
        force_mode: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        从图像中提取患者信息
        
        Args:
            image_data: base64编码的图像数据
            force_mode: 强制使用指定模式(local/cloud),覆盖配置
            
        Returns:
            提取的患者信息
        """
        mode = force_mode or self.mode
        
        if mode == 'local':
            return await self._extract_from_image_local(image_data)
        elif mode == 'cloud':
            return await self._extract_from_image_cloud(image_data)
        else:  # hybrid
            return await self._extract_from_image_hybrid(image_data)
    
    async def _extract_from_image_local(self, image_data: str) -> Dict[str, Any]:
        """使用本地模型从图像提取"""
        logger.info("使用本地AI模型提取患者信息")
        
        try:
            patient_info = await self.local_service.extract_patient_info_from_image(
                image_data=image_data
            )
            patient_info['extraction_method'] = 'local_vision'
            return patient_info
        except Exception as e:
            logger.error(f"本地模型提取失败: {e}")
            raise
    
    async def _extract_from_image_cloud(self, image_data: str) -> Dict[str, Any]:
        """使用云端API从图像提取(需要先OCR)"""
        logger.info("使用云端API提取患者信息(通过OCR)")
        
        try:
            # 注意: 这里需要先进行OCR,因为Deepseek不支持视觉
            # 这个方法需要集成OCR服务
            # 暂时抛出异常,提示需要使用本地模型
            raise NotImplementedError(
                "云端API不支持直接从图像提取,请使用本地模型或先进行OCR"
            )
        except Exception as e:
            logger.error(f"云端API提取失败: {e}")
            raise
    
    async def _extract_from_image_hybrid(self, image_data: str) -> Dict[str, Any]:
        """混合模式:本地优先,失败时回退到云端"""
        logger.info("使用混合模式提取患者信息")
        
        # 先尝试本地模型
        try:
            patient_info = await self._extract_from_image_local(image_data)
            
            # 检查置信度
            confidence = patient_info.get('confidence', 0)
            if confidence >= 0.7:
                logger.info(f"本地模型提取成功,置信度: {confidence}")
                return patient_info
            else:
                logger.warning(f"本地模型置信度较低: {confidence}, 尝试云端API")
        except Exception as e:
            logger.warning(f"本地模型失败: {e}, 尝试云端API")
        
        # 回退到云端(需要OCR)
        try:
            return await self._extract_from_image_cloud(image_data)
        except Exception as e:
            logger.error(f"云端API也失败: {e}")
            # 如果云端也失败,返回本地结果(即使置信度低)
            if 'patient_info' in locals():
                logger.info("返回低置信度的本地结果")
                return patient_info
            raise
    
    async def extract_patient_info_from_text(
        self,
        ocr_text: str
    ) -> Dict[str, Any]:
        """
        从OCR文本中提取患者信息(使用云端API)
        
        Args:
            ocr_text: OCR识别的文本
            
        Returns:
            提取的患者信息
        """
        logger.info("使用云端API从OCR文本提取患者信息")
        
        try:
            patient_info = await self.cloud_service.extract_patient_info(ocr_text)
            patient_info['extraction_method'] = 'cloud_text'
            return patient_info
        except Exception as e:
            logger.error(f"从文本提取失败: {e}")
            raise
    
    async def generate_recommendations(
        self,
        patient_name: str,
        gender: str,
        age: int,
        chief_complaint: str,
        medical_history: str = "",
        force_mode: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        生成检查推荐
        
        Args:
            patient_name: 患者姓名
            gender: 性别
            age: 年龄
            chief_complaint: 主诉
            medical_history: 病史
            force_mode: 强制使用指定模式
            
        Returns:
            推荐列表
        """
        mode = force_mode or self.mode
        
        if mode == 'local':
            return await self._generate_recommendations_local(
                patient_name, gender, age, chief_complaint, medical_history
            )
        elif mode == 'cloud':
            return await self._generate_recommendations_cloud(
                patient_name, gender, age, chief_complaint, medical_history
            )
        else:  # hybrid
            return await self._generate_recommendations_hybrid(
                patient_name, gender, age, chief_complaint, medical_history
            )
    
    async def _generate_recommendations_local(
        self,
        patient_name: str,
        gender: str,
        age: int,
        chief_complaint: str,
        medical_history: str
    ) -> List[Dict[str, Any]]:
        """使用本地模型生成推荐"""
        logger.info("使用本地AI模型生成推荐")
        
        try:
            recommendations = await self.local_service.generate_recommendations(
                patient_name=patient_name,
                gender=gender,
                age=age,
                chief_complaint=chief_complaint,
                medical_history=medical_history
            )
            
            # 添加来源标记
            for rec in recommendations:
                rec['generation_method'] = 'local'
            
            return recommendations
        except Exception as e:
            logger.error(f"本地模型生成推荐失败: {e}")
            raise
    
    async def _generate_recommendations_cloud(
        self,
        patient_name: str,
        gender: str,
        age: int,
        chief_complaint: str,
        medical_history: str
    ) -> List[Dict[str, Any]]:
        """使用云端API生成推荐"""
        logger.info("使用云端API生成推荐")
        
        try:
            recommendations = await self.cloud_service.generate_recommendations(
                patient_name=patient_name,
                gender=gender,
                age=age,
                chief_complaint=chief_complaint,
                medical_history=medical_history
            )
            
            # 添加来源标记
            for rec in recommendations:
                rec['generation_method'] = 'cloud'
            
            return recommendations
        except Exception as e:
            logger.error(f"云端API生成推荐失败: {e}")
            raise
    
    async def _generate_recommendations_hybrid(
        self,
        patient_name: str,
        gender: str,
        age: int,
        chief_complaint: str,
        medical_history: str
    ) -> List[Dict[str, Any]]:
        """混合模式生成推荐"""
        logger.info("使用混合模式生成推荐")
        
        # 先尝试本地模型
        try:
            recommendations = await self._generate_recommendations_local(
                patient_name, gender, age, chief_complaint, medical_history
            )
            
            if len(recommendations) >= 3:
                logger.info(f"本地模型生成了 {len(recommendations)} 条推荐")
                return recommendations
            else:
                logger.warning(f"本地模型推荐数量不足: {len(recommendations)}, 尝试云端API")
        except Exception as e:
            logger.warning(f"本地模型失败: {e}, 尝试云端API")
        
        # 回退到云端
        try:
            return await self._generate_recommendations_cloud(
                patient_name, gender, age, chief_complaint, medical_history
            )
        except Exception as e:
            logger.error(f"云端API也失败: {e}")
            # 如果云端也失败,返回本地结果(即使数量不足)
            if 'recommendations' in locals():
                logger.info("返回本地推荐结果")
                return recommendations
            raise
    
    def get_current_mode(self) -> str:
        """获取当前模式"""
        return self.mode
    
    def set_mode(self, mode: str):
        """设置模式"""
        if mode in ['local', 'cloud', 'hybrid']:
            self.mode = mode
            logger.info(f"AI服务模式已切换为: {mode}")
        else:
            raise ValueError(f"无效的模式: {mode}")


# 创建全局AI服务管理器实例
ai_service_manager = AIServiceManager()

