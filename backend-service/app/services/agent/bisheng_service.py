"""
Bisheng智能体服务实现
"""
import httpx
import time
from typing import List, Optional, AsyncIterator
from loguru import logger
from datetime import datetime

from .models import (
    BishengConfig,
    AgentWorkflow,
    AgentInvokeRequest,
    AgentHealthStatus,
    LoginResponse,
)


class BishengService:
    """Bisheng智能体服务"""

    def __init__(self, config: BishengConfig):
        """
        初始化Bisheng服务
        
        Args:
            config: Bisheng配置
        """
        self.config = config
        self.access_token: Optional[str] = config.access_token
        self.token_expiry: Optional[int] = config.token_expiry
        logger.info(f"Bisheng服务初始化: {config.base_url}")

    async def login(self, username: str, password: str) -> LoginResponse:
        """
        登录Bisheng平台
        
        Args:
            username: 用户名
            password: 密码
            
        Returns:
            登录响应
        """
        try:
            async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                # 优先使用前端已验证路径 /api/v1/user/login，其次回退 /api/v1/login
                login_paths = [
                    f"{self.config.base_url}/api/v1/user/login",
                    f"{self.config.base_url}/api/v1/login",
                ]
                last_error = None
                for url in login_paths:
                    try:
                        response = await client.post(url, json={"user_name": username, "password": password})
                        if response.status_code != 200:
                            last_error = f"HTTP {response.status_code}"
                            continue
                        data = response.json()
                        # 尝试多种响应结构提取 token/expiry
                        token = (
                            data.get("access_token")
                            or (data.get("data") or {}).get("access_token")
                            or (data.get("data") or {}).get("token")
                        )
                        expiry = (
                            data.get("expiry")
                            or (data.get("data") or {}).get("expiry")
                            or int(time.time() + 86400)
                        )
                        if token:
                            self.access_token = token
                            self.token_expiry = expiry
                            logger.info(f"Bisheng登录成功: {username}")
                            return LoginResponse(success=True, token=token, expiry=expiry)
                        else:
                            last_error = "no_token_in_response"
                    except Exception as e:
                        last_error = str(e)
                        continue
                error_msg = f"登录失败: {last_error or 'unknown'}"
                logger.error(error_msg)
                return LoginResponse(success=False, error=error_msg)
                    
        except Exception as e:
            error_msg = f"登录异常: {str(e)}"
            logger.error(error_msg)
            return LoginResponse(
                success=False,
                error=error_msg
            )

    async def get_workflows(
        self,
        page_size: int = 50,
        page_num: int = 1,
        token: Optional[str] = None
    ) -> List[AgentWorkflow]:
        """
        获取工作流列表
        
        Args:
            page_size: 每页数量
            page_num: 页码
            token: 访问令牌
            
        Returns:
            工作流列表
        """
        use_token = token or self.access_token
        if not use_token:
            logger.error("未提供访问令牌")
            return []
        
        try:
            async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                response = await client.get(
                    f"{self.config.base_url}/api/v1/workflow/list",
                    params={"page_size": page_size, "page_num": page_num},
                    headers={"Authorization": f"Bearer {use_token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # 处理不同的响应格式
                    workflows_data = data.get("data", [])
                    if isinstance(workflows_data, dict):
                        workflows_data = workflows_data.get("data", [])
                    
                    workflows = []
                    for item in workflows_data:
                        workflows.append(AgentWorkflow(
                            id=item.get("id", ""),
                            name=item.get("name", ""),
                            description=item.get("description"),
                            status=item.get("status"),
                            create_time=item.get("create_time"),
                            update_time=item.get("update_time")
                        ))
                    
                    logger.info(f"获取工作流列表成功: {len(workflows)}个")
                    return workflows
                else:
                    logger.error(f"获取工作流列表失败: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"获取工作流列表异常: {str(e)}")
            return []

    async def invoke_workflow(
        self,
        request: AgentInvokeRequest,
        token: Optional[str] = None
    ) -> AsyncIterator[str]:
        """
        调用工作流（流式响应）
        
        Args:
            request: 调用请求
            token: 访问令牌
            
        Yields:
            SSE事件流
        """
        use_token = token or self.access_token
        if not use_token:
            yield "data: " + '{"error": "未提供访问令牌"}\n\n'
            return
        
        try:
            # 构建请求体
            body: dict = {
                "workflow_id": request.workflow_id,
                "stream": request.stream,
            }
            
            # 继续对话时添加会话信息
            if request.session_id and request.input_node_id:
                body["session_id"] = request.session_id
                body["message_id"] = int(request.message_id) if request.message_id else 0
                body["input"] = {
                    request.input_node_id: request.input
                }
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.config.base_url}/api/v2/workflow/invoke",
                    json=body,
                    headers={
                        "Authorization": f"Bearer {use_token}",
                        "Accept": "text/event-stream",
                        "Content-Type": "application/json"
                    }
                ) as response:
                    if response.status_code == 200:
                        async for line in response.aiter_lines():
                            if line:
                                yield f"{line}\n"
                    else:
                        error_msg = f"调用工作流失败: {response.status_code}"
                        logger.error(error_msg)
                        yield f"data: {{'error': '{error_msg}'}}\n\n"
                        
        except Exception as e:
            error_msg = f"调用工作流异常: {str(e)}"
            logger.error(error_msg)
            yield f"data: {{'error': '{error_msg}'}}\n\n"

    async def stop_workflow(
        self,
        workflow_id: str,
        session_id: str,
        token: Optional[str] = None
    ) -> bool:
        """
        停止工作流
        
        Args:
            workflow_id: 工作流ID
            session_id: 会话ID
            token: 访问令牌
            
        Returns:
            是否成功
        """
        use_token = token or self.access_token
        if not use_token:
            logger.error("未提供访问令牌")
            return False
        
        try:
            async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                response = await client.post(
                    f"{self.config.base_url}/api/v2/workflow/stop",
                    json={
                        "workflow_id": workflow_id,
                        "session_id": session_id
                    },
                    headers={"Authorization": f"Bearer {use_token}"}
                )
                
                success = response.status_code == 200
                if success:
                    logger.info(f"停止工作流成功: {workflow_id}")
                else:
                    logger.error(f"停止工作流失败: {response.status_code}")
                
                return success
                
        except Exception as e:
            logger.error(f"停止工作流异常: {str(e)}")
            return False

    async def health_check(self) -> AgentHealthStatus:
        """
        健康检查
        
        Returns:
            健康状态
        """
        try:
            # 检查连接
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.config.base_url}/health")
                connected = response.status_code == 200
            
            # 检查认证
            authenticated = self.access_token is not None
            if authenticated and self.token_expiry:
                authenticated = time.time() < self.token_expiry
            
            healthy = connected and authenticated
            
            return AgentHealthStatus(
                service_name="bisheng",
                healthy=healthy,
                connected=connected,
                authenticated=authenticated,
                last_check=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"健康检查异常: {str(e)}")
            return AgentHealthStatus(
                service_name="bisheng",
                healthy=False,
                connected=False,
                authenticated=False,
                last_check=datetime.now(),
                error=str(e)
            )
