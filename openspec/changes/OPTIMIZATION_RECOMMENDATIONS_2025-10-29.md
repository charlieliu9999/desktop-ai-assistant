# OpenSpec 优化建议

**日期**: 2025-10-29  
**基于**: AUDIT_REPORT_2025-10-29.md  
**目标**: 提供具体的改进方案和代码示例

---

## 目录

1. [P0问题优化方案](#1-p0问题优化方案)
2. [P1问题优化方案](#2-p1问题优化方案)
3. [架构改进建议](#3-架构改进建议)
4. [代码示例](#4-代码示例)

---

## 1. P0问题优化方案

### 1.1 统一v1响应结构

#### 问题
健康检查端点返回格式不一致，影响前端适配和v2迁移。

#### 解决方案

**步骤1**: 定义统一的健康检查响应模型

```python
# backend-service/app/models/health.py
from pydantic import BaseModel, Field
from typing import Dict, Optional
from datetime import datetime

class ServiceHealth(BaseModel):
    """单个服务的健康状态"""
    healthy: bool = Field(..., description="是否健康")
    available: bool = Field(..., description="是否可用")
    latency_ms: Optional[float] = Field(None, description="延迟(毫秒)")
    last_check: str = Field(..., description="最后检查时间(ISO格式)")
    error: Optional[str] = Field(None, description="错误信息")
    version: Optional[str] = Field(None, description="服务版本")

class HealthResponse(BaseModel):
    """统一的健康检查响应"""
    success: bool = True
    data: Dict[str, Dict[str, ServiceHealth]] = Field(
        ..., 
        description="服务健康状态",
        example={
            "services": {
                "openai": {
                    "healthy": True,
                    "available": True,
                    "latency_ms": 123.45,
                    "last_check": "2025-10-29T10:00:00Z",
                    "error": None
                }
            }
        }
    )
    meta: Dict[str, str] = Field(
        ...,
        description="元数据",
        example={
            "timestamp": "2025-10-29T10:00:00Z",
            "version": "1.1.0",
            "request_id": "req-123"
        }
    )
```

**步骤2**: 修改各域的健康检查端点

```python
# backend-service/app/api/v1/ai.py
@router.get("/health", response_model=HealthResponse)
async def health():
    """AI服务健康检查"""
    try:
        health_status = await ai_manager.get_all_providers_health()
        
        # 转换为统一格式
        services = {}
        for name, status in health_status.items():
            services[name] = {
                "healthy": status.healthy,
                "available": status.healthy,  # 简化：healthy即available
                "latency_ms": status.latency_ms,
                "last_check": status.last_check.isoformat(),
                "error": status.error
            }
        
        return HealthResponse(
            success=True,
            data={"services": services},
            meta={
                "timestamp": datetime.now().isoformat(),
                "version": "1.1.0",
                "request_id": get_request_id()  # 需要实现request_id中间件
            }
        )
    except Exception as e:
        logger.error(f"Health check error: {e}")
        raise HTTPException(status_code=500, detail="health_check_failed")
```

**步骤3**: 同样修改vision、voice、agent的健康检查端点

**向后兼容策略**：
- 在v1中同时返回新旧格式（deprecated字段）
- 在响应头中添加`X-Deprecated-Fields: providers`警告
- 在v2中只返回新格式

---

### 1.2 实现敏感字段遮蔽

#### 问题
配置API返回完整API key，存在安全风险。

#### 解决方案

**步骤1**: 创建敏感字段遮蔽工具

```python
# backend-service/app/core/security.py
from typing import Any, Dict, List, Set
import re

# 敏感字段模式（支持多种命名风格）
SENSITIVE_PATTERNS = {
    r'.*api[_-]?key.*',
    r'.*secret.*',
    r'.*password.*',
    r'.*passwd.*',
    r'.*token.*',
    r'.*access[_-]?token.*',
    r'.*private[_-]?key.*',
    r'.*credential.*',
}

def is_sensitive_field(field_name: str) -> bool:
    """判断字段是否敏感"""
    field_lower = field_name.lower()
    return any(re.match(pattern, field_lower) for pattern in SENSITIVE_PATTERNS)

def mask_value(value: str, show_length: int = 4) -> str:
    """
    遮蔽敏感值
    
    Args:
        value: 原始值
        show_length: 显示的前后字符数
        
    Returns:
        遮蔽后的值，格式: "abc...xyz" 或 "***"
    """
    if not value:
        return "***"
    
    value_str = str(value)
    if len(value_str) <= show_length * 2:
        return "***"
    
    return f"{value_str[:show_length]}...{value_str[-show_length:]}"

def mask_sensitive_data(data: Any, depth: int = 0, max_depth: int = 10) -> Any:
    """
    递归遮蔽字典/列表中的敏感字段
    
    Args:
        data: 要处理的数据
        depth: 当前递归深度
        max_depth: 最大递归深度（防止循环引用）
        
    Returns:
        遮蔽后的数据
    """
    if depth > max_depth:
        return data
    
    if isinstance(data, dict):
        masked = {}
        for key, value in data.items():
            if is_sensitive_field(key):
                # 遮蔽敏感字段
                masked[key] = mask_value(str(value)) if value else "***"
            elif isinstance(value, (dict, list)):
                # 递归处理嵌套结构
                masked[key] = mask_sensitive_data(value, depth + 1, max_depth)
            else:
                masked[key] = value
        return masked
    
    elif isinstance(data, list):
        return [
            mask_sensitive_data(item, depth + 1, max_depth) 
            if isinstance(item, (dict, list)) 
            else item 
            for item in data
        ]
    
    else:
        return data
```

**步骤2**: 在配置API中应用

```python
# backend-service/app/api/v1/config_api.py
from app.core.security import mask_sensitive_data

@router.get("")
async def get_full_config():
    """获取完整运行期配置（敏感字段已遮蔽）"""
    try:
        config_data = settings.model_dump()
        
        # 遮蔽敏感字段
        masked_data = mask_sensitive_data(config_data)
        
        return {
            "success": True, 
            "data": masked_data, 
            "meta": {
                "timestamp": datetime.now().isoformat(),
                "version": "1.1.0",
                "request_id": get_request_id(),
                "masked_fields": True  # 标识已遮蔽
            }
        }
    except Exception as e:
        logger.error(f"get_full_config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{key}")
async def get_config_key(key: str):
    """获取单个配置项（敏感字段已遮蔽）"""
    try:
        config_data = settings.model_dump()
        
        if key not in config_data:
            raise HTTPException(status_code=404, detail="config_key_not_found")
        
        value = config_data[key]
        
        # 如果是敏感字段，遮蔽值
        if is_sensitive_field(key):
            value = mask_value(str(value))
        
        return {
            "success": True,
            "data": {key: value},
            "meta": {
                "timestamp": datetime.now().isoformat(),
                "masked": is_sensitive_field(key)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_config_key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

**步骤3**: 在日志中应用

```python
# backend-service/app/main.py
from app.core.security import mask_sensitive_data

# 配置日志时添加过滤器
def mask_log_record(record):
    """遮蔽日志中的敏感信息"""
    if "extra" in record and isinstance(record["extra"], dict):
        record["extra"] = mask_sensitive_data(record["extra"])
    return True

logger.add(
    settings.LOG_FILE,
    rotation="200 MB",
    retention="10 days",
    level=settings.LOG_LEVEL,
    filter=mask_log_record  # 添加过滤器
)
```

---

### 1.3 实现request_id中间件

#### 问题
缺少统一的请求追踪机制，问题排查困难。

#### 解决方案

**步骤1**: 创建request_id中间件

```python
# backend-service/app/middleware/request_id.py
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from contextvars import ContextVar
from typing import Callable

# 使用ContextVar存储request_id，支持异步上下文
request_id_var: ContextVar[str] = ContextVar('request_id', default='')

class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    请求ID中间件
    
    功能：
    1. 从请求头获取或生成新的request_id
    2. 存储到ContextVar供全局访问
    3. 在响应头中返回request_id
    4. 在日志中自动包含request_id
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        # 从请求头获取或生成新的request_id
        request_id = request.headers.get('X-Request-ID')
        if not request_id:
            request_id = f"req-{uuid.uuid4().hex[:16]}"
        
        # 存储到ContextVar
        request_id_var.set(request_id)
        
        # 添加到请求状态，供路由使用
        request.state.request_id = request_id
        
        # 处理请求
        response = await call_next(request)
        
        # 在响应头中返回request_id
        response.headers['X-Request-ID'] = request_id
        
        return response

def get_request_id() -> str:
    """获取当前请求的request_id"""
    return request_id_var.get() or 'unknown'
```

**步骤2**: 注册中间件

```python
# backend-service/app/main.py
from app.middleware.request_id import RequestIDMiddleware, get_request_id

# 在CORS中间件之后添加
app.add_middleware(RequestIDMiddleware)
```

**步骤3**: 在日志中使用request_id

```python
# backend-service/app/main.py
from app.middleware.request_id import get_request_id

# 配置日志格式，包含request_id
logger.add(
    settings.LOG_FILE,
    rotation="200 MB",
    retention="10 days",
    level=settings.LOG_LEVEL,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | {extra[request_id]} | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    filter=lambda record: record["extra"].update(request_id=get_request_id()) or True
)
```

**步骤4**: 在API响应中使用request_id

```python
# 在所有API响应的meta中包含request_id
return APIResponse(
    success=True,
    data={...},
    meta={
        "timestamp": datetime.now().isoformat(),
        "version": "1.1.0",
        "request_id": get_request_id()  # 自动获取
    }
)
```

---

### 1.4 实现并发限流保护

#### 问题
缺少并发限流机制，服务可能被打垮。

#### 解决方案

**步骤1**: 创建限流器

```python
# backend-service/app/core/rate_limiter.py
import asyncio
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List
from fastapi import HTTPException
from loguru import logger

class RateLimiter:
    """
    速率限制器
    
    功能：
    1. 全局并发限制
    2. 每分钟请求数限制
    3. Provider级别限制
    """
    
    def __init__(
        self,
        max_concurrent: int = 100,
        max_per_minute: int = 1000,
        provider_max_concurrent: int = 10
    ):
        self.max_concurrent = max_concurrent
        self.max_per_minute = max_per_minute
        self.provider_max_concurrent = provider_max_concurrent
        
        # 全局并发信号量
        self.global_semaphore = asyncio.Semaphore(max_concurrent)
        
        # Provider级别并发信号量
        self.provider_semaphores: Dict[str, asyncio.Semaphore] = {}
        
        # 请求时间戳记录（用于速率限制）
        self.requests: Dict[str, List[datetime]] = defaultdict(list)
        
        # 锁（保护requests字典）
        self.lock = asyncio.Lock()
    
    def _get_provider_semaphore(self, provider: str) -> asyncio.Semaphore:
        """获取Provider的信号量"""
        if provider not in self.provider_semaphores:
            self.provider_semaphores[provider] = asyncio.Semaphore(
                self.provider_max_concurrent
            )
        return self.provider_semaphores[provider]
    
    async def acquire(self, key: str = "global", provider: str = None):
        """
        获取限流许可
        
        Args:
            key: 限流键（用于速率限制）
            provider: Provider名称（用于Provider级别限制）
            
        Raises:
            HTTPException: 超过限流时抛出429错误
        """
        # 1. 全局并发限制
        acquired_global = await self.global_semaphore.acquire()
        if not acquired_global:
            raise HTTPException(
                status_code=429,
                detail="rate_limited: global concurrent limit exceeded"
            )
        
        # 2. Provider并发限制
        provider_sem = None
        if provider:
            provider_sem = self._get_provider_semaphore(provider)
            acquired_provider = await provider_sem.acquire()
            if not acquired_provider:
                self.global_semaphore.release()
                raise HTTPException(
                    status_code=429,
                    detail=f"rate_limited: provider {provider} concurrent limit exceeded"
                )
        
        # 3. 速率限制（每分钟请求数）
        async with self.lock:
            now = datetime.now()
            minute_ago = now - timedelta(minutes=1)
            
            # 清理过期记录
            self.requests[key] = [t for t in self.requests[key] if t > minute_ago]
            
            # 检查是否超过限制
            if len(self.requests[key]) >= self.max_per_minute:
                # 释放已获取的信号量
                self.global_semaphore.release()
                if provider_sem:
                    provider_sem.release()
                
                raise HTTPException(
                    status_code=429,
                    detail=f"rate_limited: {key} exceeded {self.max_per_minute} requests per minute"
                )
            
            # 记录本次请求
            self.requests[key].append(now)
        
        # 返回释放函数
        return lambda: self.release(provider)
    
    def release(self, provider: str = None):
        """释放限流许可"""
        self.global_semaphore.release()
        if provider and provider in self.provider_semaphores:
            self.provider_semaphores[provider].release()

# 全局限流器实例
rate_limiter = RateLimiter(
    max_concurrent=100,
    max_per_minute=1000,
    provider_max_concurrent=10
)
```

**步骤2**: 在API中使用限流器

```python
# backend-service/app/api/v1/ai.py
from app.core.rate_limiter import rate_limiter

@router.post("/chat", response_model=APIResponse)
async def chat(request: ChatRequest):
    """AI对话（非流式）"""
    
    # 获取限流许可
    release = await rate_limiter.acquire(
        key=f"ai_chat_{get_request_id()}",
        provider=request.provider
    )
    
    try:
        # 处理请求
        response = await ai_manager.chat(request)
        
        return APIResponse(
            success=True,
            data={...},
            meta={...}
        )
    finally:
        # 释放限流许可
        release()
```

---

### 1.5 审查并修复严格JSON策略

#### 问题
Vision服务的严格JSON实现不完整，可能存在回退逻辑。

#### 解决方案

**步骤1**: 创建统一的JSON验证器

```python
# backend-service/app/core/json_validator.py
import json
from typing import Optional, Dict, Any
from jsonschema import validate, ValidationError, Draft7Validator
from app.core.errors import AppError
from loguru import logger

# 预定义的schema
SCHEMAS = {
    "patient_info_v1": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": ["name", "gender", "age"],
        "properties": {
            "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 100,
                "description": "患者姓名"
            },
            "gender": {
                "type": "string",
                "enum": ["男", "女", "未知"],
                "description": "性别"
            },
            "age": {
                "type": "integer",
                "minimum": 0,
                "maximum": 150,
                "description": "年龄"
            },
            "patient_id": {
                "type": "string",
                "description": "患者ID"
            },
            "department": {
                "type": "string",
                "description": "科室"
            },
            "diagnosis": {
                "type": "string",
                "description": "诊断"
            },
            "chief_complaint": {
                "type": "string",
                "description": "主诉"
            }
        },
        "additionalProperties": False  # 不允许额外字段
    }
}

class StrictJSONValidator:
    """严格JSON验证器"""
    
    @staticmethod
    def validate(
        data: str,
        schema_name: Optional[str] = None,
        custom_schema: Optional[Dict[str, Any]] = None,
        strict: bool = True
    ) -> Dict[str, Any]:
        """
        验证JSON字符串是否符合schema
        
        Args:
            data: JSON字符串
            schema_name: 预定义schema名称
            custom_schema: 自定义schema（优先于schema_name）
            strict: 是否严格模式（失败时抛出no_result错误）
            
        Returns:
            解析后的JSON对象
            
        Raises:
            AppError: 验证失败时抛出
                - strict=True: 抛出no_result错误（HTTP 200）
                - strict=False: 抛出validation_error错误（HTTP 400）
        """
        # 1. 解析JSON
        try:
            parsed = json.loads(data)
        except json.JSONDecodeError as e:
            error_msg = f"JSON解析失败: {str(e)}"
            logger.warning(f"JSON parse error: {error_msg}")
            
            if strict:
                # 严格模式：返回no_result（HTTP 200）
                raise AppError(
                    code="no_result",
                    message=error_msg,
                    status_code=200,
                    details={"raw_data": data[:200]}  # 只记录前200字符
                )
            else:
                # 非严格模式：返回validation_error（HTTP 400）
                raise AppError(
                    code="validation_error",
                    message=error_msg,
                    status_code=400
                )
        
        # 2. 验证schema
        if schema_name or custom_schema:
            schema = custom_schema or SCHEMAS.get(schema_name)
            
            if not schema:
                raise AppError(
                    code="invalid_schema",
                    message=f"未知的schema: {schema_name}",
                    status_code=400
                )
            
            try:
                # 使用Draft7Validator进行验证
                validator = Draft7Validator(schema)
                validator.validate(parsed)
                
            except ValidationError as e:
                error_msg = f"JSON验证失败: {e.message}"
                logger.warning(f"JSON validation error: {error_msg}, path: {list(e.path)}")
                
                if strict:
                    # 严格模式：返回no_result（HTTP 200）
                    raise AppError(
                        code="no_result",
                        message=error_msg,
                        status_code=200,
                        details={
                            "path": list(e.path),
                            "validator": e.validator,
                            "failed_value": e.instance
                        }
                    )
                else:
                    # 非严格模式：返回validation_error（HTTP 400）
                    raise AppError(
                        code="validation_error",
                        message=error_msg,
                        status_code=400,
                        details={
                            "path": list(e.path),
                            "validator": e.validator
                        }
                    )
        
        return parsed
    
    @staticmethod
    def add_schema(name: str, schema: Dict[str, Any]):
        """添加自定义schema"""
        SCHEMAS[name] = schema
    
    @staticmethod
    def get_schema(name: str) -> Optional[Dict[str, Any]]:
        """获取schema定义"""
        return SCHEMAS.get(name)
```

**步骤2**: 在Vision服务中使用

```python
# backend-service/app/api/v1/vision.py
from app.core.json_validator import StrictJSONValidator

@router.post("/understand")
async def understand(request: VisionUnderstandRequest):
    """
    图像理解
    
    支持严格JSON模式：
    - strict_json=True: 失败返回no_result（HTTP 200）
    - strict_json=False: 正常处理
    """
    try:
        # 调用Vision服务
        result = await vision_service.understand(request)
        
        # 如果启用严格JSON且指定了schema
        if request.strict_json and request.json_schema:
            # 验证返回的JSON
            validated_data = StrictJSONValidator.validate(
                data=result.get("structured", "{}"),
                schema_name=request.json_schema,
                strict=True  # 严格模式
            )
            
            # 替换为验证后的数据
            result["structured"] = validated_data
        
        return APIResponse(
            success=True,
            data=result,
            meta={...}
        )
        
    except AppError as e:
        # AppError已经包含了正确的状态码和错误结构
        if e.code == "no_result":
            # 严格JSON失败：返回200状态码
            return JSONResponse(
                status_code=200,
                content={
                    "success": False,
                    "error": {
                        "code": e.code,
                        "message": e.message,
                        "details": e.details
                    },
                    "meta": {
                        "timestamp": datetime.now().isoformat(),
                        "request_id": get_request_id()
                    }
                }
            )
        else:
            # 其他错误：正常抛出
            raise
    
    except Exception as e:
        logger.error(f"Vision understand error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

**步骤3**: 禁止回退逻辑

在Vision服务实现中，确保：
1. ❌ 不使用OCR+LLM回退
2. ❌ 不返回硬编码的默认值
3. ❌ 不在失败时返回部分结果
4. ✅ 失败时直接抛出AppError

```python
# backend-service/app/services/vision_service.py
async def understand(self, request: VisionUnderstandRequest):
    """图像理解（严格模式）"""
    
    # 调用VL模型
    try:
        response = await self.call_vl_model(request)
    except Exception as e:
        logger.error(f"VL model call failed: {e}")
        
        # ❌ 禁止回退到OCR+LLM
        # if request.allow_fallback:
        #     return await self.fallback_to_ocr(request)
        
        # ✅ 直接抛出错误
        raise AppError(
            code="provider_unavailable",
            message=f"VL模型调用失败: {str(e)}",
            status_code=503
        )
    
    # 提取结构化数据
    structured_text = response.get("structured")
    
    if not structured_text:
        # ❌ 禁止返回硬编码默认值
        # return {"structured": {"name": "未知", "gender": "未知", "age": 0}}
        
        # ✅ 如果是严格模式，抛出no_result
        if request.strict_json:
            raise AppError(
                code="no_result",
                message="VL模型未返回结构化数据",
                status_code=200
            )
    
    return response
```

---

## 2. P1问题优化方案

### 2.1 实现HTTP连接池

#### 问题
各Provider独立创建httpx.AsyncClient，没有复用连接。

#### 解决方案

```python
# backend-service/app/core/http_client.py
import httpx
from typing import Optional
from app.config import settings
from loguru import logger

class HTTPClientManager:
    """
    HTTP客户端管理器（单例）
    
    功能：
    1. 全局连接池
    2. 统一超时配置
    3. HTTP/2支持
    4. 自动重试
    """
    
    _instance: Optional['HTTPClientManager'] = None
    _client: Optional[httpx.AsyncClient] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def get_client(self) -> httpx.AsyncClient:
        """获取全局HTTP客户端"""
        if self._client is None:
            # 连接池配置
            limits = httpx.Limits(
                max_keepalive_connections=20,  # 保持连接数
                max_connections=100,            # 最大连接数
                keepalive_expiry=30.0          # 保持连接过期时间（秒）
            )
            
            # 超时配置
            timeout = httpx.Timeout(
                connect=5.0,   # 连接超时
                read=30.0,     # 读取超时
                write=10.0,    # 写入超时
                pool=5.0       # 连接池超时
            )
            
            # 重试配置（使用httpx-retry扩展）
            transport = httpx.AsyncHTTPTransport(
                retries=3,  # 最大重试次数
                limits=limits
            )
            
            self._client = httpx.AsyncClient(
                limits=limits,
                timeout=timeout,
                transport=transport,
                http2=True,  # 启用HTTP/2
                follow_redirects=True
            )
            
            logger.info("HTTP client initialized with connection pool")
        
        return self._client
    
    async def close(self):
        """关闭HTTP客户端"""
        if self._client:
            await self._client.aclose()
            self._client = None
            logger.info("HTTP client closed")

# 全局实例
http_client_manager = HTTPClientManager()
```

**在Provider中使用**：

```python
# backend-service/app/services/ai/providers/openai_provider.py
from app.core.http_client import http_client_manager

class OpenAIProvider(BaseProvider):
    async def chat(self, request: ChatRequest) -> ChatResponse:
        # 使用全局HTTP客户端
        client = await http_client_manager.get_client()
        
        response = await client.post(
            f"{self.config.api_base}/chat/completions",
            json=payload,
            headers=headers
        )
        
        # 不需要关闭client，由manager管理
        return self._parse_response(response)
```

**在应用生命周期中管理**：

```python
# backend-service/app/main.py
from app.core.http_client import http_client_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化
    await http_client_manager.get_client()
    logger.info("HTTP client pool initialized")
    
    yield
    
    # 关闭时清理
    await http_client_manager.close()
    logger.info("HTTP client pool closed")
```

---

### 2.2 实现统一的超时和重试策略

#### 解决方案

```python
# backend-service/app/core/retry.py
import asyncio
from typing import Callable, TypeVar, Optional, Set
from functools import wraps
from loguru import logger
import httpx

T = TypeVar('T')

# 可重试的HTTP状态码
RETRYABLE_STATUS_CODES: Set[int] = {
    408,  # Request Timeout
    429,  # Too Many Requests
    500,  # Internal Server Error
    502,  # Bad Gateway
    503,  # Service Unavailable
    504,  # Gateway Timeout
}

# 可重试的异常类型
RETRYABLE_EXCEPTIONS = (
    httpx.TimeoutException,
    httpx.NetworkError,
    httpx.RemoteProtocolError,
    ConnectionError,
    asyncio.TimeoutError,
)

def with_retry(
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True
):
    """
    重试装饰器（指数退避）
    
    Args:
        max_attempts: 最大尝试次数
        initial_delay: 初始延迟（秒）
        max_delay: 最大延迟（秒）
        exponential_base: 指数基数
        jitter: 是否添加随机抖动
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            last_exception = None
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                
                except RETRYABLE_EXCEPTIONS as e:
                    last_exception = e
                    
                    if attempt == max_attempts:
                        logger.error(
                            f"{func.__name__} failed after {max_attempts} attempts: {e}"
                        )
                        raise
                    
                    # 计算延迟时间（指数退避）
                    delay = min(
                        initial_delay * (exponential_base ** (attempt - 1)),
                        max_delay
                    )
                    
                    # 添加随机抖动（避免惊群效应）
                    if jitter:
                        import random
                        delay = delay * (0.5 + random.random())
                    
                    logger.warning(
                        f"{func.__name__} attempt {attempt}/{max_attempts} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    
                    await asyncio.sleep(delay)
                
                except httpx.HTTPStatusError as e:
                    # 检查是否可重试的状态码
                    if e.response.status_code in RETRYABLE_STATUS_CODES:
                        last_exception = e
                        
                        if attempt == max_attempts:
                            logger.error(
                                f"{func.__name__} failed after {max_attempts} attempts: "
                                f"HTTP {e.response.status_code}"
                            )
                            raise
                        
                        delay = min(
                            initial_delay * (exponential_base ** (attempt - 1)),
                            max_delay
                        )
                        
                        if jitter:
                            import random
                            delay = delay * (0.5 + random.random())
                        
                        logger.warning(
                            f"{func.__name__} attempt {attempt}/{max_attempts} failed: "
                            f"HTTP {e.response.status_code}. Retrying in {delay:.2f}s..."
                        )
                        
                        await asyncio.sleep(delay)
                    else:
                        # 不可重试的状态码，直接抛出
                        raise
                
                except Exception as e:
                    # 其他异常不重试
                    logger.error(f"{func.__name__} failed with non-retryable error: {e}")
                    raise
            
            # 理论上不会到这里
            raise last_exception
        
        return wrapper
    return decorator
```

**使用示例**：

```python
# backend-service/app/services/ai/providers/openai_provider.py
from app.core.retry import with_retry

class OpenAIProvider(BaseProvider):
    @with_retry(max_attempts=3, initial_delay=1.0, max_delay=10.0)
    async def chat(self, request: ChatRequest) -> ChatResponse:
        """AI对话（带重试）"""
        client = await http_client_manager.get_client()
        
        response = await client.post(
            f"{self.config.api_base}/chat/completions",
            json=payload,
            headers=headers,
            timeout=30.0  # 单次请求超时
        )
        
        response.raise_for_status()  # 抛出HTTPStatusError供重试装饰器处理
        
        return self._parse_response(response)
```

---

### 2.3 统一SSE事件结构

#### 问题
v1使用`start|chunk|done|error`，v2规范要求`chunk|end|error`。

#### 解决方案

**步骤1**: 定义统一的SSE事件模型

```python
# backend-service/app/models/sse.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime

class SSEEvent(BaseModel):
    """统一的SSE事件结构"""

    type: Literal["chunk", "end", "error"] = Field(
        ...,
        description="事件类型: chunk(数据块) | end(结束) | error(错误)"
    )

    data: Optional[Any] = Field(
        None,
        description="事件数据（type=chunk或end时）"
    )

    error: Optional[Dict[str, Any]] = Field(
        None,
        description="错误信息（type=error时）",
        example={
            "code": "provider_error",
            "message": "Provider调用失败",
            "details": {}
        }
    )

    meta: Dict[str, str] = Field(
        default_factory=dict,
        description="元数据",
        example={
            "timestamp": "2025-10-29T10:00:00Z",
            "request_id": "req-123"
        }
    )

    def to_sse_format(self) -> str:
        """转换为SSE格式"""
        import json
        return f"data: {json.dumps(self.model_dump(), ensure_ascii=False)}\n\n"

# 向后兼容：v1事件类型映射
V1_TO_V2_EVENT_TYPE = {
    "start": None,      # v2中不需要start事件
    "chunk": "chunk",
    "done": "end",
    "error": "error"
}
```

**步骤2**: 在AI流式端点中使用

```python
# backend-service/app/api/v1/ai.py
from app.models.sse import SSEEvent
from sse_starlette.sse import EventSourceResponse

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """AI对话（流式）- v2格式"""

    async def event_generator():
        try:
            # 不再发送start事件（v2规范）

            # 流式生成
            async for chunk in ai_manager.chat_stream(request):
                # 发送chunk事件
                event = SSEEvent(
                    type="chunk",
                    data={"content": chunk},
                    meta={
                        "timestamp": datetime.now().isoformat(),
                        "request_id": get_request_id()
                    }
                )
                yield event.to_sse_format()

            # 发送end事件
            event = SSEEvent(
                type="end",
                data={"finish_reason": "stop"},
                meta={
                    "timestamp": datetime.now().isoformat(),
                    "request_id": get_request_id()
                }
            )
            yield event.to_sse_format()

        except Exception as e:
            logger.error(f"Stream error: {e}")

            # 发送error事件
            event = SSEEvent(
                type="error",
                error={
                    "code": "stream_error",
                    "message": str(e)
                },
                meta={
                    "timestamp": datetime.now().isoformat(),
                    "request_id": get_request_id()
                }
            )
            yield event.to_sse_format()

    return EventSourceResponse(event_generator())
```

**步骤3**: 前端适配（支持v1和v2）

```typescript
// src/services/adapters/ai-adapter.ts
interface SSEEvent {
  type: 'chunk' | 'end' | 'error';
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    request_id: string;
  };
}

async function* streamChat(request: ChatRequest): AsyncGenerator<string> {
  const response = await fetch('/api/v1/ai/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      const data = line.slice(6);
      const event: SSEEvent = JSON.parse(data);

      if (event.type === 'chunk') {
        yield event.data.content;
      } else if (event.type === 'end') {
        return;
      } else if (event.type === 'error') {
        throw new Error(event.error!.message);
      }
    }
  }
}
```

---

### 2.4 实现缓存机制

#### 问题
GET端点和健康检查没有缓存，重复请求浪费资源。

#### 解决方案

```python
# backend-service/app/core/cache.py
import asyncio
from typing import Optional, Any, Callable
from datetime import datetime, timedelta
from functools import wraps
import hashlib
import json
from loguru import logger

class SimpleCache:
    """
    简单的内存缓存（支持TTL）

    注意：生产环境建议使用Redis
    """

    def __init__(self):
        self._cache: dict[str, tuple[Any, datetime]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        """获取缓存"""
        async with self._lock:
            if key in self._cache:
                value, expire_at = self._cache[key]

                # 检查是否过期
                if datetime.now() < expire_at:
                    logger.debug(f"Cache hit: {key}")
                    return value
                else:
                    # 过期，删除
                    del self._cache[key]
                    logger.debug(f"Cache expired: {key}")

            logger.debug(f"Cache miss: {key}")
            return None

    async def set(self, key: str, value: Any, ttl_seconds: int = 60):
        """设置缓存"""
        async with self._lock:
            expire_at = datetime.now() + timedelta(seconds=ttl_seconds)
            self._cache[key] = (value, expire_at)
            logger.debug(f"Cache set: {key}, TTL: {ttl_seconds}s")

    async def delete(self, key: str):
        """删除缓存"""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                logger.debug(f"Cache deleted: {key}")

    async def clear(self):
        """清空缓存"""
        async with self._lock:
            self._cache.clear()
            logger.info("Cache cleared")

    async def cleanup_expired(self):
        """清理过期缓存"""
        async with self._lock:
            now = datetime.now()
            expired_keys = [
                key for key, (_, expire_at) in self._cache.items()
                if now >= expire_at
            ]

            for key in expired_keys:
                del self._cache[key]

            if expired_keys:
                logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

# 全局缓存实例
cache = SimpleCache()

def cached(ttl_seconds: int = 60, key_prefix: str = ""):
    """
    缓存装饰器

    Args:
        ttl_seconds: 缓存过期时间（秒）
        key_prefix: 缓存键前缀
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 生成缓存键
            cache_key = _generate_cache_key(func, args, kwargs, key_prefix)

            # 尝试从缓存获取
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # 缓存未命中，执行函数
            result = await func(*args, **kwargs)

            # 存入缓存
            await cache.set(cache_key, result, ttl_seconds)

            return result

        return wrapper
    return decorator

def _generate_cache_key(func: Callable, args: tuple, kwargs: dict, prefix: str) -> str:
    """生成缓存键"""
    # 函数名
    func_name = f"{func.__module__}.{func.__name__}"

    # 参数序列化
    try:
        args_str = json.dumps(args, sort_keys=True, default=str)
        kwargs_str = json.dumps(kwargs, sort_keys=True, default=str)
    except:
        # 无法序列化，使用repr
        args_str = repr(args)
        kwargs_str = repr(kwargs)

    # 生成hash
    key_data = f"{prefix}:{func_name}:{args_str}:{kwargs_str}"
    key_hash = hashlib.md5(key_data.encode()).hexdigest()

    return f"{prefix}:{func_name}:{key_hash}"
```

**使用示例**：

```python
# backend-service/app/api/v1/ai.py
from app.core.cache import cached

@router.get("/health")
@cached(ttl_seconds=30, key_prefix="ai_health")  # 缓存30秒
async def health():
    """AI服务健康检查（带缓存）"""
    health_status = await ai_manager.get_all_providers_health()

    # ... 构造响应
    return HealthResponse(...)

@router.get("/providers")
@cached(ttl_seconds=300, key_prefix="ai_providers")  # 缓存5分钟
async def list_providers():
    """列出所有Provider（带缓存）"""
    providers = await ai_manager.list_providers()
    return APIResponse(success=True, data=providers, meta={...})
```

**定期清理过期缓存**：

```python
# backend-service/app/main.py
from app.core.cache import cache

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动后台任务清理过期缓存
    async def cleanup_task():
        while True:
            await asyncio.sleep(300)  # 每5分钟清理一次
            await cache.cleanup_expired()

    cleanup_task_handle = asyncio.create_task(cleanup_task())

    yield

    # 关闭时取消任务
    cleanup_task_handle.cancel()
```

---

### 2.5 统一错误处理

#### 问题
错误处理不统一，可能泄漏内部信息。

#### 解决方案

**步骤1**: 增强AppError类

```python
# backend-service/app/core/errors.py
from typing import Optional, Dict, Any
from fastapi import HTTPException

class AppError(Exception):
    """
    应用错误基类

    特性：
    1. 统一错误码
    2. 用户友好的错误消息
    3. 详细信息（仅开发环境）
    4. HTTP状态码映射
    """

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
        user_message: Optional[str] = None
    ):
        self.code = code
        self.message = message  # 技术消息（日志用）
        self.user_message = user_message or self._get_user_friendly_message(code)
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

    @staticmethod
    def _get_user_friendly_message(code: str) -> str:
        """获取用户友好的错误消息"""
        USER_MESSAGES = {
            "validation_error": "请求参数不正确，请检查输入",
            "unauthorized": "未授权，请先登录",
            "forbidden": "没有权限访问此资源",
            "not_found": "请求的资源不存在",
            "conflict": "资源冲突，请稍后重试",
            "rate_limited": "请求过于频繁，请稍后再试",
            "timeout": "请求超时，请稍后重试",
            "provider_unavailable": "服务暂时不可用，请稍后重试",
            "upstream_error": "上游服务错误，请稍后重试",
            "no_result": "无法解析结果，请重试或调整输入",
            "internal_error": "服务器内部错误，我们会尽快修复",
        }
        return USER_MESSAGES.get(code, "发生未知错误")

    def to_dict(self, include_details: bool = False) -> Dict[str, Any]:
        """转换为字典"""
        error_dict = {
            "code": self.code,
            "message": self.user_message,  # 返回用户友好消息
        }

        # 仅在开发环境或明确要求时包含详细信息
        if include_details and self.details:
            error_dict["details"] = self.details

        return error_dict

# 预定义错误
class ValidationError(AppError):
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            code="validation_error",
            message=message,
            status_code=400,
            details=details
        )

class NotFoundError(AppError):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            code="not_found",
            message=f"{resource} not found: {identifier}",
            status_code=404,
            details={"resource": resource, "identifier": identifier}
        )

class RateLimitError(AppError):
    def __init__(self, limit: int, window: str):
        super().__init__(
            code="rate_limited",
            message=f"Rate limit exceeded: {limit} requests per {window}",
            status_code=429,
            details={"limit": limit, "window": window}
        )

class ProviderError(AppError):
    def __init__(self, provider: str, message: str):
        super().__init__(
            code="provider_unavailable",
            message=f"Provider {provider} error: {message}",
            status_code=503,
            details={"provider": provider}
        )
```

**步骤2**: 统一异常处理器

```python
# backend-service/app/main.py
from app.core.errors import AppError
from app.middleware.request_id import get_request_id
from app.config import settings

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    """AppError统一处理"""

    # 记录日志（包含技术消息）
    logger.error(
        f"AppError: {exc.code} - {exc.message}",
        extra={
            "request_id": get_request_id(),
            "code": exc.code,
            "details": exc.details
        }
    )

    # 返回用户友好消息
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.to_dict(
                include_details=settings.DEBUG  # 仅开发环境返回详细信息
            ),
            "meta": {
                "timestamp": datetime.now().isoformat(),
                "version": "1.1.0",
                "request_id": get_request_id()
            }
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTPException统一处理"""

    logger.warning(
        f"HTTPException: {exc.status_code} - {exc.detail}",
        extra={"request_id": get_request_id()}
    )

    # 转换为统一格式
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"http_{exc.status_code}",
                "message": str(exc.detail)
            },
            "meta": {
                "timestamp": datetime.now().isoformat(),
                "request_id": get_request_id()
            }
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """通用异常处理（兜底）"""

    # 记录完整堆栈
    logger.exception(
        f"Unhandled exception: {exc}",
        extra={"request_id": get_request_id()}
    )

    # 返回通用错误（不泄漏内部信息）
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "internal_error",
                "message": "服务器内部错误，我们会尽快修复"
                # ❌ 不返回 str(exc)，避免泄漏堆栈信息
            },
            "meta": {
                "timestamp": datetime.now().isoformat(),
                "request_id": get_request_id()
            }
        }
    )
```

**步骤3**: 在API中使用

```python
# backend-service/app/api/v1/ai.py
from app.core.errors import ValidationError, ProviderError, NotFoundError

@router.post("/chat")
async def chat(request: ChatRequest):
    """AI对话"""

    # 参数验证
    if not request.messages:
        raise ValidationError(
            message="messages不能为空",
            details={"field": "messages"}
        )

    # Provider检查
    if request.provider not in ai_manager.providers:
        raise NotFoundError(
            resource="provider",
            identifier=request.provider
        )

    # 调用Provider
    try:
        response = await ai_manager.chat(request)
    except Exception as e:
        # 转换为ProviderError
        raise ProviderError(
            provider=request.provider,
            message=str(e)
        )

    return APIResponse(success=True, data=response, meta={...})
```

---

## 3. 架构改进建议

### 3.1 v2 API架构设计

#### 目录结构

```
backend-service/app/
├── api/
│   ├── v1/              # v1 API（保持向后兼容）
│   │   ├── __init__.py
│   │   ├── ai.py
│   │   ├── vision.py
│   │   └── ...
│   └── v2/              # v2 API（新实现）
│       ├── __init__.py
│       ├── dependencies.py  # 通用依赖
│       ├── ai.py
│       ├── vision.py
│       ├── voice.py
│       ├── agent.py
│       ├── registry.py
│       ├── config.py
│       └── tools.py
├── models/
│   ├── v1/              # v1模型
│   └── v2/              # v2模型
│       ├── common.py    # 通用模型（Envelope, Error, Meta）
│       ├── ai.py
│       ├── vision.py
│       └── ...
├── services/            # 服务层（v1和v2共享）
│   ├── ai/
│   ├── vision/
│   └── ...
├── core/                # 核心组件
│   ├── errors.py
│   ├── security.py
│   ├── cache.py
│   ├── retry.py
│   ├── http_client.py
│   ├── rate_limiter.py
│   └── json_validator.py
└── middleware/
    ├── request_id.py
    ├── rate_limit.py
    └── ...
```

#### 统一响应模型

```python
# backend-service/app/models/v2/common.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Generic, TypeVar
from datetime import datetime

T = TypeVar('T')

class Meta(BaseModel):
    """元数据"""
    timestamp: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="时间戳（ISO格式）"
    )
    version: str = Field(default="2.0.0", description="API版本")
    request_id: str = Field(..., description="请求ID")

    # 可选字段
    pagination: Optional[Dict[str, Any]] = Field(None, description="分页信息")
    rate_limit: Optional[Dict[str, Any]] = Field(None, description="限流信息")

class Error(BaseModel):
    """错误信息"""
    code: str = Field(..., description="错误码")
    message: str = Field(..., description="错误消息")
    details: Optional[Dict[str, Any]] = Field(None, description="详细信息")

class Envelope(BaseModel, Generic[T]):
    """统一响应包装"""
    success: bool = Field(..., description="是否成功")
    data: Optional[T] = Field(None, description="响应数据")
    error: Optional[Error] = Field(None, description="错误信息")
    meta: Meta = Field(..., description="元数据")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {"key": "value"},
                "error": None,
                "meta": {
                    "timestamp": "2025-10-29T10:00:00Z",
                    "version": "2.0.0",
                    "request_id": "req-123"
                }
            }
        }
```

---

### 3.2 迁移策略

#### 阶段1：v1和v2并存

```python
# backend-service/app/main.py
from app.api import v1, v2

# 挂载v1路由（保持向后兼容）
app.include_router(v1.router, prefix="/api/v1", tags=["v1"])

# 挂载v2路由（新实现）
app.include_router(v2.router, prefix="/api/v2", tags=["v2"])

# 添加版本协商中间件
@app.middleware("http")
async def version_negotiation(request: Request, call_next):
    """
    版本协商中间件

    支持：
    1. URL路径: /api/v1/... 或 /api/v2/...
    2. Accept头: Accept: application/vnd.api+json; version=2
    3. 自定义头: X-API-Version: 2
    """
    # 从路径判断版本
    if request.url.path.startswith("/api/v2"):
        request.state.api_version = "2.0.0"
    elif request.url.path.startswith("/api/v1"):
        request.state.api_version = "1.1.0"
    else:
        # 从头部判断
        version_header = request.headers.get("X-API-Version", "1")
        request.state.api_version = f"{version_header}.0.0"

    response = await call_next(request)

    # 在响应头中返回版本
    response.headers["X-API-Version"] = request.state.api_version

    return response
```

#### 阶段2：前端适配

```typescript
// src/services/api-client.ts
export class APIClient {
  private baseURL: string;
  private version: '1' | '2';

  constructor(version: '1' | '2' = '1') {
    this.baseURL = `/api/v${version}`;
    this.version = version;
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': this.version,
        ...options?.headers,
      },
    });

    const data = await response.json();

    // v2统一响应结构
    if (this.version === '2') {
      if (!data.success) {
        throw new APIError(data.error.code, data.error.message, data.error.details);
      }
      return data.data;
    }

    // v1兼容处理
    return data;
  }
}

// 使用
const v1Client = new APIClient('1');
const v2Client = new APIClient('2');

// 逐步迁移
const aiResponse = await v2Client.request('/ai/chat', {...});
```

#### 阶段3：弃用v1

```python
# 在v1端点添加弃用警告
@router.get("/health")
async def health():
    """健康检查（已弃用，请使用v2）"""
    # 添加弃用头
    response = HealthResponse(...)
    response.headers["X-Deprecated"] = "true"
    response.headers["X-Sunset"] = "2026-01-01"  # 下线日期
    response.headers["Link"] = "</api/v2/ai/health>; rel=\"successor-version\""

    return response
```

---

**下一步**: 创建修订计划文档

