"""
智能体管理器
"""
from typing import Dict, List, Optional, AsyncIterator
from loguru import logger

from .models import (
    AgentWorkflow,
    AgentInvokeRequest,
    AgentHealthStatus,
)
from .bisheng_service import BishengService


class AgentManager:
    """智能体管理器"""

    def __init__(self):
        """初始化智能体管理器"""
        self.services: Dict[str, BishengService] = {}
        logger.info("智能体管理器初始化")

    def register_service(self, name: str, service: BishengService) -> None:
        """
        注册智能体服务
        
        Args:
            name: 服务名称
            service: 服务实例
        """
        self.services[name] = service
        logger.info(f"注册智能体服务: {name}")

    def get_service(self, name: str = "bisheng") -> Optional[BishengService]:
        """
        获取智能体服务
        
        Args:
            name: 服务名称
            
        Returns:
            服务实例
        """
        return self.services.get(name)

    async def get_workflows(
        self,
        service_name: str = "bisheng",
        page_size: int = 50,
        page_num: int = 1,
        token: Optional[str] = None
    ) -> List[AgentWorkflow]:
        """
        获取工作流列表
        
        Args:
            service_name: 服务名称
            page_size: 每页数量
            page_num: 页码
            token: 访问令牌
            
        Returns:
            工作流列表
        """
        service = self.get_service(service_name)
        if not service:
            logger.error(f"服务不存在: {service_name}")
            return []
        
        return await service.get_workflows(page_size, page_num, token)

    async def invoke(
        self,
        service_name: str,
        request: AgentInvokeRequest,
        token: Optional[str] = None
    ) -> AsyncIterator[str]:
        """
        调用智能体
        
        Args:
            service_name: 服务名称
            request: 调用请求
            token: 访问令牌
            
        Yields:
            SSE事件流
        """
        service = self.get_service(service_name)
        if not service:
            yield f"data: {{'error': '服务不存在: {service_name}'}}\n\n"
            return
        
        async for chunk in service.invoke_workflow(request, token):
            yield chunk

    async def stop(
        self,
        service_name: str,
        workflow_id: str,
        session_id: str,
        token: Optional[str] = None
    ) -> bool:
        """
        停止智能体
        
        Args:
            service_name: 服务名称
            workflow_id: 工作流ID
            session_id: 会话ID
            token: 访问令牌
            
        Returns:
            是否成功
        """
        service = self.get_service(service_name)
        if not service:
            logger.error(f"服务不存在: {service_name}")
            return False
        
        return await service.stop_workflow(workflow_id, session_id, token)

    async def get_health(self) -> Dict[str, AgentHealthStatus]:
        """
        获取所有服务的健康状态
        
        Returns:
            健康状态字典
        """
        health_status = {}
        for name, service in self.services.items():
            health_status[name] = await service.health_check()
        
        return health_status

    def list_services(self) -> List[str]:
        """
        列出所有服务
        
        Returns:
            服务名称列表
        """
        return list(self.services.keys())

