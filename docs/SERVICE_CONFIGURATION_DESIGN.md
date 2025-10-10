# 服务配置管理设计文档

## 文档信息
- **版本**: v1.0
- **日期**: 2025-10-10
- **状态**: 设计中

---

## 一、配置管理需求

### 1.1 核心需求
1. **灵活的模型配置**: 支持多种AI模型的动态配置和切换
2. **智能体平台配置**: 支持Bisheng等智能体平台的接入配置
3. **服务接入配置**: 支持新服务的快速接入
4. **用户级配置**: 支持多用户、多租户配置隔离
5. **配置热更新**: 配置变更无需重启服务
6. **配置版本管理**: 支持配置回滚和审计

### 1.2 配置层级
```
全局配置 (Global Config)
  ├── 系统配置 (System Config)
  │   ├── 服务端口、日志级别等
  │   └── 数据库、Redis连接等
  ├── 服务配置 (Service Config)
  │   ├── AI服务配置
  │   ├── OCR服务配置
  │   ├── 语音服务配置
  │   └── ...
  └── 用户配置 (User Config)
      ├── 用户A的配置
      ├── 用户B的配置
      └── ...
```

---

## 二、AI模型配置设计

### 2.1 多场景模型配置

#### 配置结构
```python
# backend-service/app/config.py
class ModelConfig(BaseModel):
    """单个模型配置"""
    provider: str  # openai | ollama | deepseek | claude | custom
    model_name: str
    base_url: str
    api_key: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2000
    timeout: int = 60
    retry_times: int = 3
    fallback_model: Optional[str] = None  # 降级模型
    enabled: bool = True

class ScenarioConfig(BaseModel):
    """场景配置"""
    scenario_name: str
    description: str
    primary_model: ModelConfig
    fallback_models: List[ModelConfig] = []
    cache_enabled: bool = True
    cache_ttl: int = 3600

class AIServiceConfig(BaseSettings):
    """AI服务配置"""
    scenarios: Dict[str, ScenarioConfig] = {
        "chat": ScenarioConfig(
            scenario_name="chat",
            description="通用对话",
            primary_model=ModelConfig(
                provider="openai",
                model_name="gpt-4",
                base_url="https://api.openai.com/v1",
                api_key="${OPENAI_API_KEY}",
                temperature=0.7
            ),
            fallback_models=[
                ModelConfig(
                    provider="ollama",
                    model_name="qwen2.5:32b",
                    base_url="http://localhost:11434"
                )
            ]
        ),
        "vision": ScenarioConfig(
            scenario_name="vision",
            description="图像识别",
            primary_model=ModelConfig(
                provider="ollama",
                model_name="qwen2.5vl:latest",
                base_url="http://localhost:11434",
                temperature=0.1
            )
        ),
        "medical_recommendation": ScenarioConfig(
            scenario_name="medical_recommendation",
            description="医疗推荐",
            primary_model=ModelConfig(
                provider="deepseek",
                model_name="deepseek-chat",
                base_url="https://api.deepseek.com/v1",
                api_key="${DEEPSEEK_API_KEY}",
                temperature=0.3
            )
        )
    }
```

### 2.2 动态模型管理

#### 模型管理器
```python
# backend-service/app/services/ai/model_manager.py
class ModelManager:
    """AI模型管理器"""
    
    def __init__(self):
        self.models: Dict[str, ModelConfig] = {}
        self.scenarios: Dict[str, ScenarioConfig] = {}
        self.load_config()
    
    def load_config(self):
        """从配置加载模型"""
        config = get_ai_service_config()
        self.scenarios = config.scenarios
    
    def get_model_for_scenario(self, scenario: str) -> ModelConfig:
        """获取场景对应的模型"""
        scenario_config = self.scenarios.get(scenario)
        if not scenario_config:
            raise ValueError(f"Unknown scenario: {scenario}")
        
        # 检查主模型是否可用
        if scenario_config.primary_model.enabled:
            return scenario_config.primary_model
        
        # 尝试降级模型
        for fallback in scenario_config.fallback_models:
            if fallback.enabled:
                logger.warning(f"Using fallback model for {scenario}")
                return fallback
        
        raise RuntimeError(f"No available model for scenario: {scenario}")
    
    def add_model(self, scenario: str, model_config: ModelConfig):
        """动态添加模型"""
        if scenario not in self.scenarios:
            self.scenarios[scenario] = ScenarioConfig(
                scenario_name=scenario,
                description=f"Custom scenario: {scenario}",
                primary_model=model_config
            )
        else:
            self.scenarios[scenario].primary_model = model_config
        
        # 持久化到数据库
        self.save_config()
    
    def update_model(self, scenario: str, updates: Dict):
        """更新模型配置"""
        if scenario not in self.scenarios:
            raise ValueError(f"Unknown scenario: {scenario}")
        
        scenario_config = self.scenarios[scenario]
        for key, value in updates.items():
            if hasattr(scenario_config.primary_model, key):
                setattr(scenario_config.primary_model, key, value)
        
        self.save_config()
    
    def disable_model(self, scenario: str):
        """禁用模型"""
        if scenario in self.scenarios:
            self.scenarios[scenario].primary_model.enabled = False
            self.save_config()
    
    def save_config(self):
        """保存配置到数据库"""
        # 实现配置持久化
        pass
```

---

## 三、智能体平台配置

### 3.1 Bisheng平台配置

#### 配置结构
```python
class BishengConfig(BaseModel):
    """Bisheng智能体平台配置"""
    enabled: bool = True
    base_url: str = "http://localhost:7860"
    frontend_url: str = "http://localhost:3001"
    iframe_proxy_port: int = 3002
    
    # 认证配置
    auth_type: str = "password"  # password | token | oauth
    username: Optional[str] = None
    password: Optional[str] = None
    access_token: Optional[str] = None
    token_expiry: int = 86400
    
    # 工作流配置
    default_workflow_id: Optional[str] = None
    workflow_timeout: int = 300
    
    # 代理配置
    proxy_enabled: bool = True
    proxy_cors_origins: List[str] = ["*"]
    
    # 缓存配置
    cache_enabled: bool = True
    cache_ttl: int = 3600

class AgentPlatformConfig(BaseSettings):
    """智能体平台配置"""
    platforms: Dict[str, BishengConfig] = {
        "bisheng": BishengConfig(),
        # 可扩展其他平台
        # "langflow": LangflowConfig(),
        # "dify": DifyConfig(),
    }
```

### 3.2 平台管理器

```python
class AgentPlatformManager:
    """智能体平台管理器"""
    
    def __init__(self):
        self.platforms: Dict[str, Any] = {}
        self.load_platforms()
    
    def load_platforms(self):
        """加载平台配置"""
        config = get_agent_platform_config()
        for name, platform_config in config.platforms.items():
            if platform_config.enabled:
                self.platforms[name] = self.create_platform_client(
                    name, platform_config
                )
    
    def create_platform_client(self, name: str, config: BishengConfig):
        """创建平台客户端"""
        if name == "bisheng":
            return BishengClient(config)
        # 扩展其他平台
        raise ValueError(f"Unknown platform: {name}")
    
    def get_platform(self, name: str):
        """获取平台客户端"""
        if name not in self.platforms:
            raise ValueError(f"Platform not enabled: {name}")
        return self.platforms[name]
    
    def add_platform(self, name: str, config: Dict):
        """动态添加平台"""
        # 验证配置
        platform_config = BishengConfig(**config)
        
        # 创建客户端
        client = self.create_platform_client(name, platform_config)
        self.platforms[name] = client
        
        # 持久化配置
        self.save_config(name, platform_config)
```

---

## 四、服务接入配置

### 4.1 服务注册机制

#### 服务配置
```python
class ServiceConfig(BaseModel):
    """服务配置"""
    service_name: str
    service_type: str  # ai | ocr | voice | medical | custom
    enabled: bool = True
    
    # 连接配置
    endpoint: str
    auth_type: str = "none"  # none | api_key | oauth | custom
    api_key: Optional[str] = None
    
    # 性能配置
    timeout: int = 30
    retry_times: int = 3
    max_concurrent: int = 10
    
    # 熔断配置
    circuit_breaker_enabled: bool = True
    failure_threshold: int = 5
    recovery_timeout: int = 60
    
    # 限流配置
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100
    rate_limit_period: int = 60
    
    # 健康检查
    health_check_enabled: bool = True
    health_check_interval: int = 60
    health_check_endpoint: str = "/health"

class ServiceRegistry:
    """服务注册表"""
    
    def __init__(self):
        self.services: Dict[str, ServiceConfig] = {}
        self.load_services()
    
    def register_service(self, config: ServiceConfig):
        """注册服务"""
        # 验证配置
        self.validate_config(config)
        
        # 注册服务
        self.services[config.service_name] = config
        
        # 初始化服务客户端
        self.init_service_client(config)
        
        # 持久化
        self.save_config(config)
    
    def unregister_service(self, service_name: str):
        """注销服务"""
        if service_name in self.services:
            del self.services[service_name]
            self.save_config_all()
    
    def get_service(self, service_name: str) -> ServiceConfig:
        """获取服务配置"""
        if service_name not in self.services:
            raise ValueError(f"Service not found: {service_name}")
        return self.services[service_name]
    
    def list_services(self, service_type: Optional[str] = None) -> List[ServiceConfig]:
        """列出服务"""
        services = list(self.services.values())
        if service_type:
            services = [s for s in services if s.service_type == service_type]
        return services
```

### 4.2 服务接入示例

#### 接入新的OCR服务
```python
# 注册新的OCR服务
ocr_service_config = ServiceConfig(
    service_name="google_vision_ocr",
    service_type="ocr",
    enabled=True,
    endpoint="https://vision.googleapis.com/v1",
    auth_type="api_key",
    api_key="${GOOGLE_VISION_API_KEY}",
    timeout=30,
    retry_times=3
)

service_registry.register_service(ocr_service_config)
```

#### 接入新的AI模型服务
```python
# 注册新的AI服务
ai_service_config = ServiceConfig(
    service_name="custom_llm",
    service_type="ai",
    enabled=True,
    endpoint="http://custom-llm-server:8080/v1",
    auth_type="api_key",
    api_key="${CUSTOM_LLM_API_KEY}",
    timeout=60,
    max_concurrent=5
)

service_registry.register_service(ai_service_config)
```

---

## 五、用户配置管理

### 5.1 用户配置结构

```python
class UserConfig(BaseModel):
    """用户配置"""
    user_id: str
    
    # AI偏好
    preferred_ai_model: Optional[str] = None
    ai_temperature: float = 0.7
    ai_max_tokens: int = 2000
    
    # 语音偏好
    voice_language: str = "zh-CN"
    voice_model: str = "whisper-large-v3"
    tts_voice: str = "zh-CN-XiaoxiaoNeural"
    
    # 界面偏好
    theme: str = "light"
    language: str = "zh-CN"
    
    # 功能开关
    features: Dict[str, bool] = {
        "ai_chat": True,
        "voice": True,
        "ocr": True,
        "bisheng": True
    }
    
    # 自定义配置
    custom_config: Dict[str, Any] = {}

class UserConfigManager:
    """用户配置管理器"""
    
    def get_user_config(self, user_id: str) -> UserConfig:
        """获取用户配置"""
        # 从数据库加载
        config = self.load_from_db(user_id)
        if not config:
            # 使用默认配置
            config = UserConfig(user_id=user_id)
            self.save_user_config(config)
        return config
    
    def update_user_config(self, user_id: str, updates: Dict):
        """更新用户配置"""
        config = self.get_user_config(user_id)
        for key, value in updates.items():
            if hasattr(config, key):
                setattr(config, key, value)
        self.save_user_config(config)
    
    def save_user_config(self, config: UserConfig):
        """保存用户配置"""
        # 保存到数据库
        self.save_to_db(config)
```

---

## 六、配置热更新机制

### 6.1 配置变更通知

```python
class ConfigChangeNotifier:
    """配置变更通知器"""
    
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
    
    def subscribe(self, config_key: str, callback: Callable):
        """订阅配置变更"""
        if config_key not in self.subscribers:
            self.subscribers[config_key] = []
        self.subscribers[config_key].append(callback)
    
    def notify(self, config_key: str, old_value: Any, new_value: Any):
        """通知配置变更"""
        if config_key in self.subscribers:
            for callback in self.subscribers[config_key]:
                try:
                    callback(config_key, old_value, new_value)
                except Exception as e:
                    logger.error(f"Config change callback error: {e}")

# 使用示例
notifier = ConfigChangeNotifier()

def on_model_config_change(key, old_value, new_value):
    logger.info(f"Model config changed: {key}")
    # 重新加载模型
    model_manager.load_config()

notifier.subscribe("ai.models", on_model_config_change)
```

### 6.2 配置缓存和刷新

```python
class ConfigCache:
    """配置缓存"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self.local_cache: Dict[str, Any] = {}
        self.cache_ttl = 300  # 5分钟
    
    def get(self, key: str) -> Optional[Any]:
        """获取配置"""
        # 先查本地缓存
        if key in self.local_cache:
            return self.local_cache[key]
        
        # 再查Redis
        value = self.redis.get(f"config:{key}")
        if value:
            self.local_cache[key] = value
            return value
        
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """设置配置"""
        ttl = ttl or self.cache_ttl
        
        # 更新本地缓存
        self.local_cache[key] = value
        
        # 更新Redis
        self.redis.setex(f"config:{key}", ttl, value)
    
    def invalidate(self, key: str):
        """失效配置"""
        if key in self.local_cache:
            del self.local_cache[key]
        self.redis.delete(f"config:{key}")
    
    def refresh_all(self):
        """刷新所有配置"""
        self.local_cache.clear()
```

---

## 七、配置API设计

### 7.1 配置管理API

```python
# GET /api/v1/config - 获取所有配置
# GET /api/v1/config/{key} - 获取指定配置
# PUT /api/v1/config/{key} - 更新配置
# DELETE /api/v1/config/{key} - 删除配置

@router.get("/config")
async def get_all_config(user_id: str = Depends(get_current_user)):
    """获取所有配置"""
    config = config_manager.get_all_config(user_id)
    return {"success": True, "data": config}

@router.put("/config/{key}")
async def update_config(
    key: str,
    value: Any,
    user_id: str = Depends(get_current_user)
):
    """更新配置"""
    config_manager.update_config(user_id, key, value)
    return {"success": True, "message": "Config updated"}
```

### 7.2 模型管理API

```python
# GET /api/v1/models - 获取所有模型
# POST /api/v1/models - 添加模型
# PUT /api/v1/models/{scenario} - 更新模型
# DELETE /api/v1/models/{scenario} - 删除模型

@router.post("/models")
async def add_model(
    scenario: str,
    model_config: ModelConfig,
    user_id: str = Depends(get_admin_user)
):
    """添加模型"""
    model_manager.add_model(scenario, model_config)
    return {"success": True, "message": "Model added"}
```

---

## 八、配置部署和并发管理

### 8.1 Docker部署配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    image: medical-ai-backend:latest
    environment:
      - APP_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    deploy:
      replicas: 3  # 3个实例
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8010/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 8.2 并发管理

```python
class ConcurrencyManager:
    """并发管理器"""
    
    def __init__(self, max_concurrent: int = 100):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.active_requests = 0
    
    async def acquire(self):
        """获取并发许可"""
        await self.semaphore.acquire()
        self.active_requests += 1
    
    def release(self):
        """释放并发许可"""
        self.semaphore.release()
        self.active_requests -= 1
    
    def get_active_count(self) -> int:
        """获取活跃请求数"""
        return self.active_requests
```

---

## 九、前端配置管理

### 9.1 前端配置同步

```typescript
// desktop-ai-assistant/src/services/config-sync.ts
class ConfigSyncService {
  private apiClient: APIClient;
  private localConfig: Map<string, any> = new Map();
  private syncInterval: number = 60000; // 1分钟
  
  async syncConfig() {
    // 从后端获取配置
    const config = await this.apiClient.getConfig();
    
    // 更新本地配置
    for (const [key, value] of Object.entries(config)) {
      this.localConfig.set(key, value);
    }
    
    // 触发配置变更事件
    this.emitConfigChange();
  }
  
  async updateConfig(key: string, value: any) {
    // 更新后端配置
    await this.apiClient.updateConfig(key, value);
    
    // 更新本地配置
    this.localConfig.set(key, value);
  }
  
  startAutoSync() {
    setInterval(() => this.syncConfig(), this.syncInterval);
  }
}
```

---

**下一步**: 实现配置管理系统的核心功能

