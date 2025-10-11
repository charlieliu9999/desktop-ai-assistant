# 前后端配置统一方案 - 分析与设计

## 📋 目录

1. [当前问题诊断](#当前问题诊断)
2. [前后端配置现状分析](#前后端配置现状分析)
3. [存在的主要问题](#存在的主要问题)
4. [统一配置方案设计](#统一配置方案设计)
5. [实施计划](#实施计划)

---

## 🔍 当前问题诊断

### 核心问题

**前端直接配置敏感信息和模型参数，后端未提供统一的配置管理服务，导致：**

1. **安全问题**：API Key等敏感信息存储在前端配置中
2. **配置分散**：前后端各自管理配置，无法统一控制
3. **模型管理混乱**：前端直接配置模型，无法统一管理可用模型
4. **智能体配置前置**：Bisheng智能体配置在前端，应该由后端管理
5. **缺乏权限控制**：前端可以任意配置模型和服务

---

## 📊 前后端配置现状分析

### 前端配置结构

#### 1. 配置文件位置
- **主配置服务**: `src/services/config.ts`
- **默认配置**: `DEFAULT_CONFIG` 对象
- **存储方式**: `electron-store` (本地JSON文件)

#### 2. 当前前端配置的内容

```typescript
interface AppConfig {
  // ❌ 问题：AI模型配置在前端
  ai: {
    enabled: boolean;
    provider: 'local' | 'openai' | 'claude' | 'gemini';
    model: string;
    apiKey: string;  // ⚠️ 敏感信息
    apiUrl: string;
    temperature: number;
    maxTokens: number;
    // ... 其他AI参数
  };
  
  // ❌ 问题：医疗系统配置在前端
  medical: {
    enabled: boolean;
    apiUrl: string;
    apiKey: string;  // ⚠️ 敏感信息
    // ... 其他配置
  };
  
  // ❌ 问题：Bisheng智能体配置在前端
  bisheng: {
    enabled: boolean;
    baseUrl: string;
    frontendUrl: string;
    username: string;
    password: string;  // ⚠️ 敏感信息
    accessToken: string;  // ⚠️ 敏感信息
    // ... 其他配置
  };
  
  // ✅ 合理：UI相关配置在前端
  windows: { ... };
  theme: string;
  language: string;
  shortcuts: { ... };
  
  // ✅ 合理：语音识别配置（部分）
  voice: {
    enabled: boolean;
    recognition: {
      model: 'browser' | 'whisper' | 'funasr';
      // ... 其他配置
    };
  };
}
```

### 后端配置结构

#### 1. 配置文件位置
- **环境变量**: `backend-service/.env`
- **配置示例**: `backend-service/.env.example`

#### 2. 后端当前配置内容

```bash
# 本地AI配置(Ollama)
AI_SERVICE_MODE=local  # local | cloud | hybrid
LOCAL_AI_ENDPOINT=http://localhost:11434
LOCAL_AI_MODEL=qwen2.5vl:latest
LOCAL_AI_TIMEOUT=60

# Deepseek AI配置(云端API)
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# 数据库配置
DATABASE_URL=postgresql://medical_user:medical_pass@localhost:5433/medical_ai

# Bisheng配置（❌ 当前缺失）
# BISHENG_ENABLED=True
# BISHENG_BASE_URL=http://localhost:7860
# BISHENG_USERNAME=admin
# BISHENG_PASSWORD=***
```

### 后端API现状

#### 已实现的API端点（从api-client.ts分析）

```typescript
// ✅ 模型配置API（已存在）
GET  /api/model-config/configs           // 获取所有场景配置
GET  /api/model-config/configs/{scenario} // 获取特定场景配置
POST /api/model-config/test              // 测试模型连接
PUT  /api/model-config/configs/{scenario} // 更新场景配置
GET  /api/model-config/scenarios         // 获取场景列表

// ✅ 患者信息提取API
POST /api/patient-extraction/extract     // 提取患者信息
POST /api/patient-extraction/recommendations // 生成推荐

// ❌ 缺失的API
// 后端配置管理API（待实现）
// Bisheng智能体配置API（待实现）
// 模型列表和可用性API（待实现）
```

---

## ⚠️ 存在的主要问题

### 1. 安全问题

| 问题 | 当前状况 | 风险等级 |
|------|---------|---------|
| API Key前端存储 | AI模型、医疗系统、Bisheng的API Key存储在electron-store | 🔴 高 |
| 密码明文存储 | Bisheng用户名密码存储在前端配置 | 🔴 高 |
| Token前端管理 | Bisheng accessToken由前端保存 | 🟡 中 |

### 2. 架构问题

| 问题 | 描述 | 影响 |
|------|------|------|
| 配置职责混乱 | 前端管理了应该由后端管理的配置 | 违反关注点分离原则 |
| 模型管理分散 | 前端可以随意配置任何模型 | 无法统一管理和控制 |
| 智能体配置错位 | Bisheng配置应在后端，前端只需要选择 | 增加前端复杂度 |
| 缺乏权限控制 | 前端可以访问所有配置和服务 | 无法实施细粒度权限 |

### 3. 功能问题

| 问题 | 描述 | 影响 |
|------|------|------|
| 模型列表不可控 | 前端需要知道所有可用模型 | 维护困难 |
| 智能体列表前端获取 | 前端直接调用Bisheng API获取工作流 | 增加前端复杂度 |
| 推荐配置复杂 | 诊断、检查、用药模型分别配置在前端 | 用户配置困难 |
| 配置同步问题 | 前后端配置可能不一致 | 导致功能异常 |

---

## 🎯 统一配置方案设计

### 核心原则

```
1. 敏感信息后端管理：API Key、密码、Token等必须在后端配置和管理
2. 业务配置后端管理：模型选择、智能体配置、推荐策略等由后端提供
3. UI配置前端管理：窗口大小、主题、语言、快捷键等纯UI配置保留在前端
4. 接口明确分离：前端通过API获取可用选项，不直接配置敏感信息
```

### 配置分工矩阵

| 配置类别 | 管理方 | 配置位置 | 前端访问方式 |
|---------|--------|---------|-------------|
| **AI模型配置** |
| 模型Provider和APIKey | 后端 | backend .env | API获取可用provider列表 |
| 模型名称 | 后端 | backend .env | API获取可用模型列表 |
| 模型参数（温度等） | 后端 | 数据库/配置文件 | API获取和更新（管理员） |
| 场景模型映射 | 后端 | 数据库 | API获取可用场景 |
| **推荐系统配置** |
| 诊断模型 | 后端 | 数据库 | API选择场景 |
| 检查模型 | 后端 | 数据库 | API选择场景 |
| 用药模型 | 后端 | 数据库 | API选择场景 |
| 推荐Prompt | 后端 | 数据库 | API获取（可自定义） |
| **Bisheng智能体** |
| Bisheng连接配置 | 后端 | backend .env | API获取连接状态 |
| Bisheng认证信息 | 后端 | backend .env | 后端自动管理 |
| 工作流列表 | 后端 | Bisheng API | API获取可用工作流 |
| 工作流调用 | 后端 | 代理 | API调用工作流 |
| **UI配置** |
| 窗口大小位置 | 前端 | electron-store | 本地管理 |
| 主题颜色 | 前端 | electron-store | 本地管理 |
| 语言偏好 | 前端 | electron-store | 本地管理 |
| 快捷键 | 前端 | electron-store | 本地管理 |
| **语音识别** |
| 识别模型选择 | 前端 | electron-store | 本地管理 |
| Whisper/FunASR端点 | 前端 | electron-store | 本地管理（可选） |
| 语音参数 | 前端 | electron-store | 本地管理 |

---

## 🏗️ 后端API设计

### 1. 配置管理API

```python
# GET /api/config/models
# 获取可用模型列表
Response: {
  "success": true,
  "models": {
    "chat": [
      {
        "id": "qwen3-30b",
        "name": "通义千问 3 (30B)",
        "provider": "local",
        "capabilities": ["chat", "reasoning"],
        "context_length": 32768
      },
      {
        "id": "qwen2.5vl",
        "name": "通义千问 2.5 Vision",
        "provider": "local",
        "capabilities": ["vision", "chat"],
        "context_length": 8192
      }
    ],
    "vision": [...],
    "embedding": [...]
  }
}

# GET /api/config/scenarios
# 获取场景配置列表
Response: {
  "success": true,
  "scenarios": [
    {
      "id": "patient_diagnosis",
      "name": "患者诊断",
      "description": "基于患者信息生成诊断建议",
      "model_id": "qwen3-30b",
      "model_name": "通义千问 3 (30B)",
      "temperature": 0.3,
      "max_tokens": 2000
    },
    {
      "id": "patient_exam",
      "name": "检查推荐",
      "description": "推荐需要进行的检查项目",
      "model_id": "qwen3-30b",
      "temperature": 0.2,
      "max_tokens": 1500
    }
  ]
}

# PUT /api/config/scenarios/{scenario_id}
# 更新场景配置（管理员权限）
Request: {
  "model_id": "qwen3-30b",
  "temperature": 0.3,
  "max_tokens": 2000,
  "prompt_template": "..."
}
```

### 2. Bisheng智能体API

```python
# GET /api/bisheng/status
# 获取Bisheng连接状态
Response: {
  "enabled": true,
  "connected": true,
  "base_url": "http://localhost:7860"
}

# GET /api/bisheng/workflows
# 获取可用工作流列表
Response: {
  "success": true,
  "workflows": [
    {
      "id": "workflow-123",
      "name": "医疗咨询助手",
      "description": "提供医疗咨询服务",
      "status": "active"
    }
  ]
}

# POST /api/bisheng/workflows/{workflow_id}/invoke
# 调用工作流
Request: {
  "input": {
    "user_input": "患者主诉头痛..."
  },
  "session_id": "optional-session-id"
}
Response: {
  "success": true,
  "session_id": "session-456",
  "message_id": 1,
  "response": "..."
}
```

### 3. 推荐系统API

```python
# POST /api/recommendations/generate
# 生成综合推荐（使用后端配置的模型）
Request: {
  "patient_name": "张三",
  "age": 45,
  "gender": "男",
  "chief_complaint": "持续头痛3天",
  "medical_history": "高血压病史",
  "recommendation_types": ["diagnosis", "exam", "medication"]
}
Response: {
  "success": true,
  "recommendations": {
    "diagnosis": "...",
    "exam": "...",
    "medication": "..."
  },
  "models_used": {
    "diagnosis": "qwen3-30b",
    "exam": "qwen3-30b",
    "medication": "qwen3-30b"
  }
}
```

---

## 🔧 前端重构方案

### 1. 移除前端敏感配置

```typescript
// ❌ 移除
interface AppConfig {
  ai: {
    apiKey: string;  // 删除
    // ...
  };
  medical: {
    apiKey: string;  // 删除
  };
  bisheng: {
    username: string;  // 删除
    password: string;  // 删除
    accessToken: string;  // 删除
  };
}

// ✅ 保留UI配置
interface AppConfig {
  windows: { ... };
  theme: string;
  language: string;
  shortcuts: { ... };
  voice: {
    recognition: {
      model: 'browser' | 'whisper' | 'funasr';
      // 本地识别相关配置
    };
  };
}
```

### 2. 使用后端API

```typescript
// 前端通过API获取配置
class ConfigurationService {
  // 获取可用模型
  async getAvailableModels() {
    return await apiClient.request('/config/models');
  }
  
  // 获取场景配置
  async getScenarios() {
    return await apiClient.request('/config/scenarios');
  }
  
  // 获取Bisheng工作流
  async getBishengWorkflows() {
    return await apiClient.request('/bisheng/workflows');
  }
}
```

### 3. 简化设置面板

```typescript
// AI设置面板 - 只显示场景选择
const renderAISettings = () => (
  <div>
    <h3>AI场景配置</h3>
    
    {/* 从后端获取可用场景 */}
    <select>
      <option value="patient_diagnosis">患者诊断</option>
      <option value="patient_exam">检查推荐</option>
      <option value="patient_medication">用药建议</option>
    </select>
    
    {/* 移除：API Key输入框 */}
    {/* 移除：模型名称输入框 */}
    {/* 移除：Provider选择 */}
  </div>
);

// Bisheng设置面板 - 只显示状态和工作流选择
const renderBishengSettings = () => (
  <div>
    <h3>Bisheng智能体</h3>
    
    {/* 显示连接状态（从后端获取） */}
    <div>状态: {bishengStatus.connected ? '已连接' : '未连接'}</div>
    
    {/* 选择工作流（从后端获取列表） */}
    <select>
      {workflows.map(w => (
        <option value={w.id}>{w.name}</option>
      ))}
    </select>
    
    {/* 移除：URL输入框 */}
    {/* 移除：用户名密码输入框 */}
    {/* 移除：Token显示 */}
  </div>
);
```

---

## 📝 实施计划

### 阶段1：后端配置管理API（优先级：🔴 高）

**任务清单：**
- [ ] 创建配置管理模块 `backend-service/app/api/config.py`
- [ ] 实现模型配置API
  - [ ] GET `/api/config/models` - 获取可用模型列表
  - [ ] GET `/api/config/scenarios` - 获取场景配置
  - [ ] PUT `/api/config/scenarios/{id}` - 更新场景配置
- [ ] 实现Bisheng配置API
  - [ ] GET `/api/bisheng/status` - 获取状态
  - [ ] GET `/api/bisheng/workflows` - 获取工作流列表
  - [ ] POST `/api/bisheng/workflows/{id}/invoke` - 调用工作流
- [ ] 完善推荐API
  - [ ] 使用后端配置的模型生成推荐
  - [ ] 返回使用的模型信息
- [ ] 添加配置数据库表
  - [ ] `model_configs` - 模型配置表
  - [ ] `scenario_configs` - 场景配置表
  - [ ] `system_settings` - 系统设置表

### 阶段2：前端配置重构（优先级：🔴 高）

**任务清单：**
- [ ] 移除敏感配置
  - [ ] 删除`config.ai.apiKey`
  - [ ] 删除`config.medical.apiKey`
  - [ ] 删除`config.bisheng.username/password/accessToken`
- [ ] 创建后端配置服务 `src/services/backend-config.ts`
  - [ ] 获取模型列表
  - [ ] 获取场景配置
  - [ ] 获取Bisheng状态和工作流
- [ ] 重构设置面板
  - [ ] 简化AI设置（只显示场景选择）
  - [ ] 简化Bisheng设置（只显示状态和工作流）
  - [ ] 移除敏感信息输入框
- [ ] 更新API调用
  - [ ] 使用后端API获取配置
  - [ ] 使用后端API调用功能

### 阶段3：数据迁移和测试（优先级：🟡 中）

**任务清单：**
- [ ] 创建配置迁移脚本
  - [ ] 从`.env`迁移模型配置到数据库
  - [ ] 创建默认场景配置
- [ ] 测试
  - [ ] 后端API测试
  - [ ] 前端功能测试
  - [ ] 端到端测试
- [ ] 文档更新
  - [ ] 更新配置指南
  - [ ] 更新API文档
  - [ ] 更新用户手册

### 阶段4：优化和增强（优先级：🟢 低）

**任务清单：**
- [ ] 添加配置版本管理
- [ ] 添加配置备份/恢复
- [ ] 添加配置导入/导出
- [ ] 添加配置审计日志
- [ ] 添加管理员界面（可选）

---

## 📈 预期效果

### 安全性提升
- ✅ 敏感信息不再存储在前端
- ✅ API Key集中管理在后端
- ✅ 支持细粒度权限控制

### 可维护性提升
- ✅ 配置职责清晰分离
- ✅ 模型统一管理
- ✅ 智能体配置集中化

### 用户体验提升
- ✅ 简化配置流程
- ✅ 减少配置错误
- ✅ 提供可用选项列表

### 可扩展性提升
- ✅ 易于添加新模型
- ✅ 易于添加新场景
- ✅ 易于集成新的AI服务

---

## 🎓 总结

当前系统存在**前后端配置职责混乱、敏感信息前端存储、模型管理分散**等问题。通过实施统一配置方案，将：

1. **敏感配置迁移到后端**：API Key、密码等统一由后端管理
2. **业务配置后端化**：模型选择、智能体配置由后端提供API
3. **前端简化为UI配置**：只保留窗口、主题、语言等纯UI配置
4. **清晰的接口分离**：前端通过API获取可用选项，不直接配置敏感信息

这将大幅提升系统的**安全性、可维护性和用户体验**。

---

**文档创建时间**: 2025-10-11  
**文档版本**: v1.0  
**状态**: ✅ 分析完成，待实施
