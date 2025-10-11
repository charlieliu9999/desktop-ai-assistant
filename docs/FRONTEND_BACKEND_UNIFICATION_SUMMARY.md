# 前后端配置统一方案 - 执行摘要

## 🎯 核心问题

当前系统存在**前后端配置职责不清、敏感信息前端存储、缺乏统一管理**的问题：

### 发现的主要问题

| 序号 | 问题类别 | 具体问题 | 风险等级 |
|------|---------|---------|---------|
| 1 | 安全问题 | AI模型、医疗系统、Bisheng的API Key存储在前端electron-store | 🔴 高 |
| 2 | 安全问题 | Bisheng用户名密码明文存储在前端配置 | 🔴 高 |
| 3 | 架构问题 | 前端直接配置模型名称、Provider、参数等 | 🟡 中 |
| 4 | 架构问题 | Bisheng智能体配置、认证在前端处理 | 🟡 中 |
| 5 | 功能问题 | 推荐系统的诊断、检查、用药模型配置分散 | 🟡 中 |
| 6 | 管理问题 | 无法统一管理可用模型列表 | 🟢 低 |

---

## 📋 当前配置现状

### 前端配置 (`src/services/config.ts`)

```
✅ 应该保留的配置:
   - windows: 窗口大小、位置、透明度
   - theme: 主题颜色
   - language: 语言偏好
   - shortcuts: 快捷键
   - voice.recognition: 语音识别模型选择（本地）

❌ 应该迁移到后端的配置:
   - ai.apiKey: AI模型API密钥
   - ai.provider: AI提供商
   - ai.model: 模型名称
   - medical.apiKey: 医疗系统API密钥
   - bisheng.username/password: Bisheng认证信息
   - bisheng.accessToken: Bisheng访问令牌
   - aiImage.apiKey: 图片识别API密钥
   - aiRecommend: 推荐系统配置
```

### 后端配置 (`backend-service/.env`)

```
✅ 已有的配置:
   - LOCAL_AI_ENDPOINT: 本地AI服务端点
   - LOCAL_AI_MODEL: 本地AI模型
   - DEEPSEEK_API_KEY: Deepseek API密钥
   - DATABASE_URL: 数据库连接

❌ 缺失的配置:
   - BISHENG_ENABLED: Bisheng服务开关
   - BISHENG_BASE_URL: Bisheng服务地址
   - BISHENG_USERNAME: Bisheng用户名
   - BISHENG_PASSWORD: Bisheng密码
   - MODEL_CONFIGS: 模型配置（应存数据库）
   - SCENARIO_CONFIGS: 场景配置（应存数据库）
```

### 后端API现状

```
✅ 已实现的API:
   - GET  /api/model-config/configs
   - GET  /api/model-config/configs/{scenario}
   - POST /api/model-config/test
   - PUT  /api/model-config/configs/{scenario}
   - POST /api/patient-extraction/extract
   - POST /api/patient-extraction/recommendations

❌ 缺失的API:
   - GET  /api/config/models (获取可用模型列表)
   - GET  /api/bisheng/status (Bisheng连接状态)
   - GET  /api/bisheng/workflows (工作流列表)
   - POST /api/bisheng/workflows/{id}/invoke (调用工作流)
```

---

## 🎯 统一方案设计

### 核心原则

```
🔒 敏感信息后端管理
   → API Key、密码、Token等必须在后端配置和管理

🎛️ 业务配置后端管理
   → 模型选择、智能体配置、推荐策略等由后端提供

🎨 UI配置前端管理
   → 窗口大小、主题、语言、快捷键等纯UI配置保留在前端

🔗 接口明确分离
   → 前端通过API获取可用选项，不直接配置敏感信息
```

### 配置分工表

| 配置项 | 当前位置 | 应该在 | 访问方式 | 优先级 |
|--------|---------|--------|---------|--------|
| **AI模型** |
| API Key | 前端 | 后端 | 后端内部使用 | 🔴 |
| Provider列表 | 前端硬编码 | 后端 | API返回 | 🔴 |
| 模型列表 | 前端输入 | 后端 | API返回 | 🔴 |
| 模型参数 | 前端 | 后端 | API返回（管理员可配置） | 🟡 |
| **推荐系统** |
| 诊断模型 | 前端 | 后端 | API选择场景 | 🔴 |
| 检查模型 | 前端 | 后端 | API选择场景 | 🔴 |
| 用药模型 | 前端 | 后端 | API选择场景 | 🔴 |
| **Bisheng智能体** |
| 连接配置 | 前端 | 后端 | API返回状态 | 🔴 |
| 认证信息 | 前端 | 后端 | 后端管理 | 🔴 |
| 工作流列表 | 前端API调用 | 后端代理 | API返回 | 🔴 |
| **UI配置** |
| 窗口设置 | 前端 | 前端 | 本地管理 | ✅ |
| 主题颜色 | 前端 | 前端 | 本地管理 | ✅ |

---

## 🏗️ 实施计划

### 阶段1：后端配置管理API（2-3天）

```bash
优先级: 🔴 高
预计时间: 2-3天

任务:
1. 创建配置管理API端点
   - GET  /api/config/models
   - GET  /api/config/scenarios
   - PUT  /api/config/scenarios/{id}

2. 实现Bisheng代理API
   - GET  /api/bisheng/status
   - GET  /api/bisheng/workflows
   - POST /api/bisheng/workflows/{id}/invoke

3. 完善推荐API
   - 使用后端配置的模型
   - 返回使用的模型信息

4. 数据库表设计
   - model_configs (模型配置)
   - scenario_configs (场景配置)
   - system_settings (系统设置)
```

### 阶段2：前端配置重构（2-3天）

```bash
优先级: 🔴 高
预计时间: 2-3天

任务:
1. 移除敏感配置
   - 删除 config.ai.apiKey
   - 删除 config.medical.apiKey
   - 删除 config.bisheng.username/password/accessToken

2. 创建后端配置服务
   - src/services/backend-config.ts
   - 封装后端配置API调用

3. 重构设置面板
   - 简化AI设置（只显示场景选择）
   - 简化Bisheng设置（只显示状态和工作流）
   - 移除敏感信息输入框

4. 更新功能调用
   - 使用后端API获取配置
   - 使用后端API调用功能
```

### 阶段3：测试和文档（1-2天）

```bash
优先级: 🟡 中
预计时间: 1-2天

任务:
1. 配置迁移
   - 从.env迁移到数据库
   - 创建默认场景配置

2. 测试
   - 后端API单元测试
   - 前端功能测试
   - 端到端集成测试

3. 文档更新
   - 更新配置指南
   - 更新API文档
   - 更新用户手册
```

---

## 📊 后端API设计示例

### 1. 模型配置API

```python
# GET /api/config/models
# 返回: 可用模型列表
{
  "success": true,
  "models": {
    "chat": [
      {
        "id": "qwen3-30b",
        "name": "通义千问 3 (30B)",
        "provider": "local",
        "capabilities": ["chat", "reasoning"],
        "context_length": 32768
      }
    ],
    "vision": [...]
  }
}

# GET /api/config/scenarios
# 返回: 场景配置列表
{
  "success": true,
  "scenarios": [
    {
      "id": "patient_diagnosis",
      "name": "患者诊断",
      "model_id": "qwen3-30b",
      "temperature": 0.3
    }
  ]
}
```

### 2. Bisheng API

```python
# GET /api/bisheng/status
# 返回: Bisheng连接状态
{
  "enabled": true,
  "connected": true,
  "base_url": "http://localhost:7860"
}

# GET /api/bisheng/workflows
# 返回: 可用工作流
{
  "success": true,
  "workflows": [
    {
      "id": "workflow-123",
      "name": "医疗咨询助手",
      "status": "active"
    }
  ]
}
```

---

## 🎁 预期收益

### 安全性 (Security)
- ✅ **敏感信息隔离**: API Key等不再暴露在前端
- ✅ **集中管理**: 统一的密钥管理和轮换
- ✅ **权限控制**: 可实施细粒度的访问控制

### 可维护性 (Maintainability)
- ✅ **职责分离**: 前后端配置职责清晰
- ✅ **统一管理**: 模型和智能体集中配置
- ✅ **易于扩展**: 新增模型/服务无需修改前端

### 用户体验 (User Experience)
- ✅ **简化配置**: 用户只需选择，不需要填写复杂参数
- ✅ **减少错误**: 可用选项由后端提供，避免配置错误
- ✅ **一致性**: 配置在前后端保持一致

### 可运维性 (Operability)
- ✅ **配置迁移**: 可通过API或配置文件批量更新
- ✅ **版本管理**: 配置变更可追溯
- ✅ **备份恢复**: 配置可备份和恢复

---

## 📝 关键变更点

### 前端代码变更

#### Before (当前)
```typescript
// ❌ 前端直接配置敏感信息
const config = {
  ai: {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: 'sk-xxxxx',  // 敏感!
    temperature: 0.7
  }
};

// ❌ 前端直接调用AI API
const response = await fetch(config.ai.apiUrl, {
  headers: { 'Authorization': `Bearer ${config.ai.apiKey}` }
});
```

#### After (重构后)
```typescript
// ✅ 前端只选择场景
const scenarios = await apiClient.getScenarios();
const selectedScenario = 'patient_diagnosis';

// ✅ 通过后端API调用
const response = await apiClient.generateRecommendations({
  scenario: selectedScenario,
  patient_info: { ... }
});
```

### 后端代码变更

#### Before (当前)
```python
# ❌ 配置只在.env中，无法动态管理
LOCAL_AI_MODEL=qwen3:30b
```

#### After (重构后)
```python
# ✅ 配置在数据库中，可通过API管理
@router.get("/config/scenarios")
async def get_scenarios(db: Session = Depends(get_db)):
    scenarios = db.query(ScenarioConfig).all()
    return {"scenarios": scenarios}

@router.put("/config/scenarios/{scenario_id}")
async def update_scenario(
    scenario_id: str,
    config: ScenarioConfigUpdate,
    db: Session = Depends(get_db)
):
    scenario = db.query(ScenarioConfig).filter_by(id=scenario_id).first()
    scenario.model_id = config.model_id
    scenario.temperature = config.temperature
    db.commit()
    return {"success": True}
```

---

## ⚠️ 注意事项

### 1. 数据迁移
- 现有用户的配置需要迁移到后端
- 提供迁移脚本和说明文档
- 保留配置备份以防回滚

### 2. 向后兼容
- 考虑前端旧版本的兼容性
- API版本控制
- 逐步废弃旧的配置方式

### 3. 错误处理
- 后端服务不可用时的降级方案
- 配置加载失败的友好提示
- 网络错误的重试机制

### 4. 性能考虑
- 配置缓存（前端和后端）
- API响应优化
- 减少不必要的配置请求

---

## 📚 相关文档

- [详细分析报告](./FRONTEND_BACKEND_CONFIGURATION_ANALYSIS.md) - 完整的问题分析和方案设计
- [API文档](./API_DOCUMENTATION.md) - 后端API接口文档
- [配置指南](../backend-service/CONFIGURATION_GUIDE.md) - 后端配置说明

---

## ✅ 下一步行动

### 立即行动（本周）
1. ✅ 完成问题分析和方案设计
2. ⬜ 实施后端配置管理API
3. ⬜ 创建数据库表和迁移脚本

### 近期计划（下周）
4. ⬜ 重构前端配置服务
5. ⬜ 更新设置面板UI
6. ⬜ 进行集成测试

### 中期计划（2周后）
7. ⬜ 完善文档和示例
8. ⬜ 用户测试和反馈
9. ⬜ 发布稳定版本

---

**文档创建时间**: 2025-10-11  
**当前状态**: ✅ 分析完成，准备实施  
**负责人**: AI Backend/Frontend Team  
**预计完成时间**: 2025-10-25
