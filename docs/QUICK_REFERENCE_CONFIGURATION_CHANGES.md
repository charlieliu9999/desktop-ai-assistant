# 前后端配置统一 - 快速参考指南

> 本文档提供快速的代码示例和修改清单，帮助开发人员快速实施前后端配置统一。

## 📋 目录

- [配置迁移对照表](#配置迁移对照表)
- [前端代码变更示例](#前端代码变更示例)
- [后端API实现示例](#后端api实现示例)
- [数据库表设计](#数据库表设计)
- [快速实施检查清单](#快速实施检查清单)

---

## 📊 配置迁移对照表

### 需要删除的前端配置

| 配置路径 | 类型 | 原因 | 替代方案 |
|---------|------|------|---------|
| `config.ai.apiKey` | string | 🔴 敏感信息 | 后端环境变量 |
| `config.ai.provider` | string | 🟡 业务配置 | 后端API返回 |
| `config.ai.model` | string | 🟡 业务配置 | 后端API返回 |
| `config.medical.apiKey` | string | 🔴 敏感信息 | 后端环境变量 |
| `config.bisheng.username` | string | 🔴 敏感信息 | 后端环境变量 |
| `config.bisheng.password` | string | 🔴 敏感信息 | 后端环境变量 |
| `config.bisheng.accessToken` | string | 🔴 敏感信息 | 后端管理 |
| `config.aiImage.apiKey` | string | 🔴 敏感信息 | 后端环境变量 |
| `config.aiRecommend.diagnosisModel` | string | 🟡 业务配置 | 后端场景配置 |
| `config.aiRecommend.examModel` | string | 🟡 业务配置 | 后端场景配置 |
| `config.aiRecommend.medicationModel` | string | 🟡 业务配置 | 后端场景配置 |

### 需要保留的前端配置

| 配置路径 | 类型 | 原因 |
|---------|------|------|
| `config.windows.*` | UI配置 | 纯UI相关 |
| `config.theme` | UI配置 | 用户偏好 |
| `config.language` | UI配置 | 用户偏好 |
| `config.shortcuts.*` | UI配置 | 用户偏好 |
| `config.voice.recognition.model` | 功能配置 | 本地识别 |
| `config.voice.recognition.whisper.apiUrl` | 功能配置 | 可选本地服务 |
| `config.voice.recognition.funasr.apiUrl` | 功能配置 | 可选本地服务 |

### 需要添加的后端配置

| 配置项 | 位置 | 说明 |
|-------|------|------|
| `BISHENG_ENABLED` | .env | Bisheng服务开关 |
| `BISHENG_BASE_URL` | .env | Bisheng服务地址 |
| `BISHENG_USERNAME` | .env | Bisheng用户名 |
| `BISHENG_PASSWORD` | .env | Bisheng密码 |
| 模型配置 | 数据库 | 可用模型列表 |
| 场景配置 | 数据库 | 场景与模型映射 |

---

## 🔄 前端代码变更示例

### 1. 移除config.ts中的敏感配置

#### Before (删除这些)
```typescript
// src/services/config.ts
const DEFAULT_CONFIG: AppConfig = {
  // ... 其他配置
  
  // ❌ 删除 - 敏感信息
  ai: {
    enabled: true,
    provider: 'local',
    model: 'qwen3:30b',
    apiKey: '',  // ❌ 删除
    apiUrl: 'http://127.0.0.1:11434/v1/chat/completions',
    temperature: 0.7,
    maxTokens: 2048,
    // ...
  },
  
  // ❌ 删除 - 敏感信息
  medical: {
    enabled: true,
    apiUrl: 'http://127.0.0.1:8010/api',
    apiKey: '',  // ❌ 删除
    // ...
  },
  
  // ❌ 删除 - 敏感信息
  bisheng: {
    enabled: false,
    baseUrl: 'http://localhost:7860',
    frontendUrl: 'http://localhost:3001',
    username: '',  // ❌ 删除
    password: '',  // ❌ 删除
    accessToken: '',  // ❌ 删除
    tokenExpiry: 0,
    // ...
  },
  
  // ✅ 保留 - UI配置
  windows: { ... },
  theme: 'glass',
  language: 'zh-CN',
  shortcuts: { ... },
};
```

#### After (保留这些)
```typescript
// src/services/config.ts
const DEFAULT_CONFIG: AppConfig = {
  // ✅ 保留 - UI配置
  version: '1.0.0',
  firstRun: true,
  theme: 'glass',
  language: 'zh-CN',
  
  windows: {
    main: { ... },
    floating: { ... },
    voice: { ... }
  },
  
  shortcuts: {
    enabled: true,
    toggleMainWindow: 'CommandOrControl+Shift+A',
    // ...
  },
  
  voice: {
    enabled: true,
    recognition: {
      enabled: true,
      model: 'browser',  // 本地识别
      language: 'zh-CN',
      // Whisper/FunASR API URL是可选的本地服务
      whisper: {
        apiUrl: '',  // 可选
      },
      funasr: {
        apiUrl: '',  // 可选
      }
    },
    synthesis: {
      enabled: true,
      // ...
    }
  },
  
  // 其他UI相关配置...
};
```

### 2. 创建后端配置服务

```typescript
// src/services/backend-config.ts
import { apiClient } from './api-client';

/**
 * 后端配置服务
 * 用于获取和管理后端提供的配置信息
 */
export class BackendConfigService {
  /**
   * 获取可用模型列表
   */
  async getAvailableModels(): Promise<{
    chat: ModelInfo[];
    vision: ModelInfo[];
    embedding: ModelInfo[];
  }> {
    const response = await apiClient.request('/config/models');
    return response.models;
  }

  /**
   * 获取场景配置列表
   */
  async getScenarios(): Promise<ScenarioConfig[]> {
    const response = await apiClient.request('/config/scenarios');
    return response.scenarios;
  }

  /**
   * 获取特定场景的配置
   */
  async getScenarioConfig(scenarioId: string): Promise<ScenarioConfig> {
    return await apiClient.request(`/config/scenarios/${scenarioId}`);
  }

  /**
   * 更新场景配置（管理员）
   */
  async updateScenarioConfig(
    scenarioId: string,
    config: Partial<ScenarioConfig>
  ): Promise<void> {
    await apiClient.request(`/config/scenarios/${scenarioId}`, {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  /**
   * 获取Bisheng状态
   */
  async getBishengStatus(): Promise<{
    enabled: boolean;
    connected: boolean;
    base_url: string;
  }> {
    return await apiClient.request('/bisheng/status');
  }

  /**
   * 获取Bisheng工作流列表
   */
  async getBishengWorkflows(): Promise<BishengWorkflow[]> {
    const response = await apiClient.request('/bisheng/workflows');
    return response.workflows;
  }

  /**
   * 调用Bisheng工作流
   */
  async invokeBishengWorkflow(
    workflowId: string,
    input: Record<string, any>,
    sessionId?: string
  ): Promise<any> {
    return await apiClient.request(`/bisheng/workflows/${workflowId}/invoke`, {
      method: 'POST',
      body: JSON.stringify({ input, session_id: sessionId })
    });
  }
}

export const backendConfigService = new BackendConfigService();

// 类型定义
export interface ModelInfo {
  id: string;
  name: string;
  provider: 'local' | 'openai' | 'claude' | 'gemini';
  capabilities: string[];
  context_length: number;
}

export interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  model_id: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  prompt_template?: string;
}

export interface BishengWorkflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
}
```

### 3. 更新设置面板

```typescript
// src/renderer/components/SettingsPanel.tsx

// ❌ Before - 直接配置敏感信息
const renderAISettings = () => (
  <div>
    <input
      type="text"
      value={config.ai.apiKey}  // ❌ 删除
      onChange={(e) => handleConfigChange('ai.apiKey', e.target.value)}
      placeholder="输入API Key"
    />
    <input
      type="text"
      value={config.ai.model}  // ❌ 删除
      onChange={(e) => handleConfigChange('ai.model', e.target.value)}
      placeholder="输入模型名称"
    />
  </div>
);

// ✅ After - 从后端获取可用选项
const renderAISettings = () => {
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([]);
  
  useEffect(() => {
    backendConfigService.getScenarios().then(setScenarios);
  }, []);
  
  return (
    <div>
      <h3>AI场景配置</h3>
      <p className="text-sm text-gray-500">
        选择不同场景使用的AI模型（由管理员配置）
      </p>
      
      {scenarios.map(scenario => (
        <div key={scenario.id} className="border rounded p-4 mb-2">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">{scenario.name}</h4>
              <p className="text-sm text-gray-500">{scenario.description}</p>
              <p className="text-xs text-gray-400">
                模型: {scenario.model_name}
              </p>
            </div>
            {/* 管理员可以配置 */}
            <button onClick={() => handleConfigureScenario(scenario.id)}>
              配置
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ❌ Before - Bisheng配置敏感信息
const renderBishengSettings = () => (
  <div>
    <input
      type="text"
      value={config.bisheng.username}  // ❌ 删除
      placeholder="用户名"
    />
    <input
      type="password"
      value={config.bisheng.password}  // ❌ 删除
      placeholder="密码"
    />
  </div>
);

// ✅ After - 只显示状态和工作流
const renderBishengSettings = () => {
  const [status, setStatus] = useState<any>(null);
  const [workflows, setWorkflows] = useState<BishengWorkflow[]>([]);
  
  useEffect(() => {
    backendConfigService.getBishengStatus().then(setStatus);
    backendConfigService.getBishengWorkflows().then(setWorkflows);
  }, []);
  
  return (
    <div>
      <h3>Bisheng智能体</h3>
      
      {/* 显示连接状态 */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{status?.connected ? '已连接' : '未连接'}</span>
      </div>
      
      {/* 显示可用工作流 */}
      <div className="mt-4">
        <h4 className="font-medium mb-2">可用工作流</h4>
        {workflows.map(workflow => (
          <div key={workflow.id} className="border rounded p-3 mb-2">
            <h5 className="font-medium">{workflow.name}</h5>
            <p className="text-sm text-gray-500">{workflow.description}</p>
            <button onClick={() => handleInvokeWorkflow(workflow.id)}>
              调用
            </button>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-gray-500 mt-4">
        注意: Bisheng连接配置由系统管理员在后端配置
      </p>
    </div>
  );
};
```

---

## 🔧 后端API实现示例

### 1. 配置管理API

```python
# backend-service/app/api/config.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from ..database import get_db
from ..models import ModelConfig, ScenarioConfig
from ..schemas import (
    ModelInfo,
    ScenarioConfigResponse,
    ScenarioConfigUpdate
)
import os

router = APIRouter(prefix="/config", tags=["配置管理"])

@router.get("/models")
async def get_available_models(db: Session = Depends(get_db)) -> Dict[str, List[ModelInfo]]:
    """
    获取可用模型列表
    """
    # 从数据库或配置文件读取
    models = db.query(ModelConfig).filter_by(enabled=True).all()
    
    result = {
        "chat": [],
        "vision": [],
        "embedding": []
    }
    
    for model in models:
        model_info = ModelInfo(
            id=model.id,
            name=model.name,
            provider=model.provider,
            capabilities=model.capabilities.split(','),
            context_length=model.context_length
        )
        
        if 'chat' in model.capabilities:
            result['chat'].append(model_info)
        if 'vision' in model.capabilities:
            result['vision'].append(model_info)
        if 'embedding' in model.capabilities:
            result['embedding'].append(model_info)
    
    return result

@router.get("/scenarios")
async def get_scenarios(db: Session = Depends(get_db)) -> List[ScenarioConfigResponse]:
    """
    获取场景配置列表
    """
    scenarios = db.query(ScenarioConfig).all()
    return [
        ScenarioConfigResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            model_id=s.model_id,
            model_name=s.model.name,
            temperature=s.temperature,
            max_tokens=s.max_tokens,
            prompt_template=s.prompt_template
        )
        for s in scenarios
    ]

@router.get("/scenarios/{scenario_id}")
async def get_scenario(
    scenario_id: str,
    db: Session = Depends(get_db)
) -> ScenarioConfigResponse:
    """
    获取特定场景配置
    """
    scenario = db.query(ScenarioConfig).filter_by(id=scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")
    
    return ScenarioConfigResponse(
        id=scenario.id,
        name=scenario.name,
        description=scenario.description,
        model_id=scenario.model_id,
        model_name=scenario.model.name,
        temperature=scenario.temperature,
        max_tokens=scenario.max_tokens,
        prompt_template=scenario.prompt_template
    )

@router.put("/scenarios/{scenario_id}")
async def update_scenario(
    scenario_id: str,
    config: ScenarioConfigUpdate,
    db: Session = Depends(get_db)
):
    """
    更新场景配置（管理员）
    """
    scenario = db.query(ScenarioConfig).filter_by(id=scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")
    
    if config.model_id:
        scenario.model_id = config.model_id
    if config.temperature is not None:
        scenario.temperature = config.temperature
    if config.max_tokens is not None:
        scenario.max_tokens = config.max_tokens
    if config.prompt_template is not None:
        scenario.prompt_template = config.prompt_template
    
    db.commit()
    return {"success": True, "message": "场景配置已更新"}
```

### 2. Bisheng代理API

```python
# backend-service/app/api/bisheng.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
import httpx
import os

router = APIRouter(prefix="/bisheng", tags=["Bisheng智能体"])

# 从环境变量读取Bisheng配置
BISHENG_ENABLED = os.getenv('BISHENG_ENABLED', 'False') == 'True'
BISHENG_BASE_URL = os.getenv('BISHENG_BASE_URL', 'http://localhost:7860')
BISHENG_USERNAME = os.getenv('BISHENG_USERNAME', '')
BISHENG_PASSWORD = os.getenv('BISHENG_PASSWORD', '')

# 全局token缓存
_bisheng_token = None
_token_expiry = 0

async def get_bisheng_token() -> str:
    """获取Bisheng访问令牌（自动管理）"""
    global _bisheng_token, _token_expiry
    
    import time
    if _bisheng_token and time.time() < _token_expiry:
        return _bisheng_token
    
    # 登录获取token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BISHENG_BASE_URL}/api/v1/user/login",
            json={
                "user_name": BISHENG_USERNAME,
                "password": BISHENG_PASSWORD
            }
        )
        data = response.json()
        _bisheng_token = data['data']['access_token']
        _token_expiry = time.time() + 86400  # 24小时
        return _bisheng_token

@router.get("/status")
async def get_bisheng_status() -> Dict[str, Any]:
    """获取Bisheng连接状态"""
    if not BISHENG_ENABLED:
        return {
            "enabled": False,
            "connected": False,
            "base_url": None
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BISHENG_BASE_URL}/health", timeout=5)
            connected = response.status_code == 200
    except:
        connected = False
    
    return {
        "enabled": True,
        "connected": connected,
        "base_url": BISHENG_BASE_URL
    }

@router.get("/workflows")
async def get_workflows() -> Dict[str, List[Dict[str, Any]]]:
    """获取可用工作流列表"""
    if not BISHENG_ENABLED:
        raise HTTPException(status_code=503, detail="Bisheng服务未启用")
    
    token = await get_bisheng_token()
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BISHENG_BASE_URL}/api/v1/workflow/list",
            headers={"Authorization": f"Bearer {token}"},
            params={"page_size": 100, "page_num": 1}
        )
        data = response.json()
        
        workflows = data.get('data', {}).get('data', [])
        
        return {
            "success": True,
            "workflows": [
                {
                    "id": w['id'],
                    "name": w['name'],
                    "description": w.get('description', ''),
                    "status": w.get('status', 'active')
                }
                for w in workflows
            ]
        }

@router.post("/workflows/{workflow_id}/invoke")
async def invoke_workflow(
    workflow_id: str,
    request: Dict[str, Any]
) -> Dict[str, Any]:
    """调用Bisheng工作流"""
    if not BISHENG_ENABLED:
        raise HTTPException(status_code=503, detail="Bisheng服务未启用")
    
    token = await get_bisheng_token()
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BISHENG_BASE_URL}/api/v2/workflow/invoke",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "workflow_id": workflow_id,
                "input": request.get('input', {}),
                "session_id": request.get('session_id'),
                "stream": False
            }
        )
        
        return response.json()
```

---

## 🗄️ 数据库表设计

```sql
-- 模型配置表
CREATE TABLE model_configs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(20) NOT NULL,  -- local, openai, claude, gemini
    api_endpoint VARCHAR(255),
    capabilities VARCHAR(255),  -- 逗号分隔: chat,vision,embedding
    context_length INTEGER DEFAULT 8192,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 场景配置表
CREATE TABLE scenario_configs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    model_id VARCHAR(50) NOT NULL,
    temperature FLOAT DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    top_p FLOAT DEFAULT 1.0,
    frequency_penalty FLOAT DEFAULT 0,
    presence_penalty FLOAT DEFAULT 0,
    prompt_template TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES model_configs(id)
);

-- 系统设置表
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 初始化数据
INSERT INTO model_configs (id, name, provider, capabilities, context_length) VALUES
('qwen3-30b', '通义千问 3 (30B)', 'local', 'chat,reasoning', 32768),
('qwen2.5vl', '通义千问 2.5 Vision', 'local', 'vision,chat', 8192);

INSERT INTO scenario_configs (id, name, description, model_id, temperature, max_tokens) VALUES
('patient_diagnosis', '患者诊断', '基于患者信息生成诊断建议', 'qwen3-30b', 0.3, 2000),
('patient_exam', '检查推荐', '推荐需要进行的检查项目', 'qwen3-30b', 0.2, 1500),
('patient_medication', '用药建议', '提供用药建议和注意事项', 'qwen3-30b', 0.3, 1500);
```

---

## ✅ 快速实施检查清单

### 后端任务

- [ ] **环境配置**
  - [ ] 添加Bisheng配置到`.env`文件
    ```bash
    BISHENG_ENABLED=True
    BISHENG_BASE_URL=http://localhost:7860
    BISHENG_USERNAME=admin
    BISHENG_PASSWORD=your_password_here
    ```
  
- [ ] **数据库**
  - [ ] 创建`model_configs`表
  - [ ] 创建`scenario_configs`表
  - [ ] 创建`system_settings`表
  - [ ] 插入初始数据

- [ ] **API实现**
  - [ ] 实现`/api/config/models`
  - [ ] 实现`/api/config/scenarios`
  - [ ] 实现`/api/config/scenarios/{id}`
  - [ ] 实现`/api/bisheng/status`
  - [ ] 实现`/api/bisheng/workflows`
  - [ ] 实现`/api/bisheng/workflows/{id}/invoke`

- [ ] **测试**
  - [ ] 测试配置API
  - [ ] 测试Bisheng代理API
  - [ ] 测试权限控制

### 前端任务

- [ ] **配置清理**
  - [ ] 删除`config.ai.apiKey`
  - [ ] 删除`config.medical.apiKey`
  - [ ] 删除`config.bisheng.username/password/accessToken`
  - [ ] 删除`config.aiRecommend`各模型配置

- [ ] **服务创建**
  - [ ] 创建`backend-config.ts`服务
  - [ ] 实现模型获取方法
  - [ ] 实现场景配置方法
  - [ ] 实现Bisheng方法

- [ ] **UI更新**
  - [ ] 重构AI设置面板
  - [ ] 重构Bisheng设置面板
  - [ ] 移除敏感信息输入框
  - [ ] 添加场景选择UI

- [ ] **功能调用**
  - [ ] 更新推荐功能调用后端API
  - [ ] 更新Bisheng调用使用后端代理
  - [ ] 更新模型配置使用后端数据

- [ ] **测试**
  - [ ] 测试设置面板显示
  - [ ] 测试功能调用
  - [ ] 测试错误处理

### 文档任务

- [ ] **更新文档**
  - [ ] 更新配置指南
  - [ ] 更新API文档
  - [ ] 更新用户手册
  - [ ] 创建迁移指南

---

## 🔍 验证步骤

### 1. 后端验证

```bash
# 启动后端服务
cd backend-service
./run.sh

# 测试配置API
curl http://localhost:8010/api/config/models
curl http://localhost:8010/api/config/scenarios

# 测试Bisheng API
curl http://localhost:8010/api/bisheng/status
curl http://localhost:8010/api/bisheng/workflows
```

### 2. 前端验证

```bash
# 启动前端应用
npm run dev

# 验证步骤:
# 1. 打开设置面板
# 2. 确认没有API Key输入框
# 3. 确认场景列表正确显示
# 4. 确认Bisheng状态正确显示
# 5. 测试推荐功能
# 6. 测试Bisheng工作流调用
```

### 3. 安全验证

```bash
# 检查配置文件
grep -r "apiKey\|api_key\|password\|token" src/services/config.ts
# 应该没有敏感信息

# 检查本地存储
# 打开DevTools -> Application -> Storage
# 确认没有敏感信息存储
```

---

## 📞 获取帮助

如遇问题，请参考：

1. [详细分析报告](./FRONTEND_BACKEND_CONFIGURATION_ANALYSIS.md)
2. [执行摘要](./FRONTEND_BACKEND_UNIFICATION_SUMMARY.md)
3. [后端配置指南](../backend-service/CONFIGURATION_GUIDE.md)
4. [API文档](./API_DOCUMENTATION.md)

---

**最后更新**: 2025-10-11  
**版本**: v1.0
