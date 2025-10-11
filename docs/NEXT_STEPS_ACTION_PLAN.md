# 下一步行动计划

**创建时间**: 2025-10-11  
**基于**: 技术债务评估报告  
**目标**: 解决 P0/P1 问题，提升项目质量  

---

## 📋 任务总览

### 优先级分布

| 优先级 | 任务数 | 总工时 | 完成期限 |
|--------|--------|--------|---------|
| P0 (紧急) | 2 | 3小时 | 今天 |
| P1 (重要) | 3 | 9小时 | 本周 |
| P2 (一般) | 2 | 8小时 | 本月 |
| **总计** | **7** | **20小时** | **1个月** |

### 任务状态

```
[ ] P0-1: 修复 Settings 配置验证问题 (2h)
[ ] P0-2: 修复硬编码的后端 URL (1h)
[ ] P1-1: 合并 PR #5 并执行样式统一 (6.5h)
[ ] P1-2: 合并 PR #3 (0.5h)
[ ] P1-3: 审查并合并 PR #6 (2h)
[ ] P2-1: 重构被跳过的测试 (6h)
[ ] P2-2: 完善配置文档 (2h)
```

---

## 🔥 P0 任务 - 今天必须完成

### P0-1: 修复 Settings 配置验证问题

**问题描述**:
- `.env` 文件中有 33 个配置项未在 Settings 类中定义
- Pydantic v2 默认不允许额外字段
- 导致测试无法运行

**影响范围**:
- ❌ 所有测试无法运行
- ❌ 可能影响生产环境配置加载
- ❌ 阻塞后续开发

**解决方案**:

#### 方案 A: 允许额外字段 (推荐)

```python
# backend-service/app/config.py
from pydantic import ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(extra='allow')  # 允许额外字段
    
    # 现有字段保持不变
    APP_NAME: str = "AI医疗助手后端服务"
    # ...
```

**优点**:
- ✅ 快速修复（5分钟）
- ✅ 不影响现有功能
- ✅ 向后兼容

**缺点**:
- ⚠️ 无法验证额外字段的类型
- ⚠️ 可能隐藏配置错误

#### 方案 B: 添加所有字段定义 (更严格)

```python
class Settings(BaseSettings):
    # 现有字段
    APP_NAME: str = "AI医疗助手后端服务"
    
    # 新增字段
    APP_ENV: str = "development"
    CLAUDE_API_KEY: str = ""
    CLAUDE_API_BASE: str = "https://api.anthropic.com"
    CLAUDE_MODEL: str = "claude-3-opus-20240229"
    
    # OCR 配置
    TESSERACT_LANG: str = "chi_sim+eng"
    TESSERACT_CONFIG: str = "--psm 6"
    IMAGE_MAX_SIZE: str = "1920x1080"
    IMAGE_QUALITY: int = 80
    
    # 语音配置
    WHISPER_MODEL: str = "whisper-large-v3"
    WHISPER_LANGUAGE: str = "zh"
    TTS_VOICE: str = "zh-CN-XiaoxiaoNeural"
    TTS_RATE: float = 1.0
    TTS_PITCH: float = 1.0
    
    # 医疗系统集成
    RIS_ENDPOINT: str = "http://localhost:8080"
    RIS_API_KEY: str = ""
    HIS_ENDPOINT: str = "http://localhost:8081"
    HIS_API_KEY: str = ""
    
    # 限流配置
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60
    
    # 熔断配置
    CIRCUIT_BREAKER_ENABLED: bool = True
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 5
    CIRCUIT_BREAKER_RECOVERY_TIMEOUT: int = 60
    
    # 并发配置
    MAX_CONCURRENT_REQUESTS: int = 100
    
    # 对象存储
    STORAGE_TYPE: str = "local"
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "medical-ai"
    
    # 监控配置
    PROMETHEUS_ENABLED: bool = True
    PROMETHEUS_PORT: int = 9090
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "development"
```

**优点**:
- ✅ 类型安全
- ✅ 配置验证
- ✅ IDE 自动补全

**缺点**:
- ⚠️ 工作量大（2小时）
- ⚠️ 需要测试所有配置

**推荐**: 先使用方案 A 快速修复，后续逐步迁移到方案 B

**实施步骤**:
1. [ ] 修改 `backend-service/app/config.py`
2. [ ] 运行测试验证: `pytest tests/ -v`
3. [ ] 检查后端启动: `./run.sh`
4. [ ] 提交代码: `git commit -m "fix: 允许 Settings 额外字段以修复测试"`

**验收标准**:
- ✅ 测试可以正常运行
- ✅ 后端服务正常启动
- ✅ 所有配置项正确加载

**预计工时**: 2小时（包括测试）

---

### P0-2: 修复硬编码的后端 URL

**问题描述**:
- `src/services/api-client.ts` 硬编码了 `API_BASE_URL = 'http://127.0.0.1:8010/api'`
- 无法动态配置后端地址
- 影响部署灵活性

**影响范围**:
- ⚠️ 无法支持多环境部署
- ⚠️ 开发/生产环境切换困难
- ⚠️ 可维护性差

**解决方案**:

```typescript
// src/services/api-client.ts

// 从环境变量或配置获取 API 基础 URL
const getAPIBaseURL = (): string => {
  // 优先级1: 环境变量（Vite）
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 优先级2: Electron 配置（如果在 Electron 环境）
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      // 注意：这是异步的，需要在初始化时调用
      // 这里只是示例，实际需要在 APIClient 构造函数中处理
      const config = window.electronAPI.config.get('medical');
      if (config?.apiUrl) {
        return config.apiUrl;
      }
    } catch (error) {
      console.warn('Failed to get API URL from Electron config:', error);
    }
  }
  
  // 优先级3: 默认值
  return 'http://127.0.0.1:8010/api';
};

const API_BASE_URL = getAPIBaseURL();

// 或者更好的方式：在 APIClient 类中动态获取
class APIClient {
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || this.getDefaultBaseURL();
  }

  private getDefaultBaseURL(): string {
    // 同上逻辑
    return import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8010/api';
  }

  // 允许运行时更新 URL
  setBaseURL(url: string) {
    this.baseURL = url;
  }

  // ... 其他方法
}
```

**环境变量配置**:

```bash
# .env.development
VITE_API_BASE_URL=http://127.0.0.1:8010/api

# .env.production
VITE_API_BASE_URL=https://api.production.com/api
```

**实施步骤**:
1. [ ] 修改 `src/services/api-client.ts`
2. [ ] 创建 `.env.development` 和 `.env.production`
3. [ ] 更新 `vite.config.ts` 确保环境变量加载
4. [ ] 测试不同环境下的 URL 获取
5. [ ] 提交代码

**验收标准**:
- ✅ 支持环境变量配置
- ✅ 支持 Electron 配置
- ✅ 有合理的默认值
- ✅ 向后兼容

**预计工时**: 1小时

---

## ⭐ P1 任务 - 本周完成

### P1-1: 合并 PR #5 并执行样式统一

**任务描述**:
- 合并 PR #5（前端样式一致性分析）
- 执行 P0 样式统一任务
- 修复样式不一致问题

**子任务**:

#### 1. 合并 PR #5 (10分钟)
```bash
cd desktop-ai-assistant
git checkout main
git pull origin main
git merge --no-ff cursor/analyze-frontend-style-consistency-and-resolve-issues-958e
git push origin main
```

#### 2. 统一 CSS 变量定义 (2小时)

**问题**: 2套CSS变量定义
- `src/renderer/styles/variables.css`
- `src/renderer/styles/theme.css`

**解决方案**:
1. 合并到 `theme.css`
2. 删除 `variables.css`
3. 更新所有引用

#### 3. 修复 glass-dark 类 (30分钟)

**问题**: 3个不同的 glass-dark 实现

**解决方案**:
1. 统一到 `tailwind.config.js`
2. 删除重复定义
3. 更新组件使用

#### 4. 完成 P1 样式任务 (4小时)

根据 PR #5 的分析报告执行其他 P1 任务。

**预计工时**: 6.5小时

---

### P1-2: 合并 PR #3 (30分钟)

**任务描述**:
- 合并 PR #3（API 文档生成）
- 验证文档完整性

**实施步骤**:
```bash
git checkout main
git merge --no-ff cursor/generate-comprehensive-api-documentation-958e
git push origin main
```

**验收标准**:
- ✅ 文档完整
- ✅ 格式正确
- ✅ 链接有效

---

### P1-3: 审查并合并 PR #6 (2小时)

**任务描述**:
- 审查 PR #6（Phase 4 智能体服务集成）
- 验证功能完整性
- 合并到主分支

**审查清单**:
- [ ] 代码质量
- [ ] 测试覆盖率 (目标: 75%+)
- [ ] 文档完整性
- [ ] 功能验证
- [ ] 无安全问题
- [ ] 无性能问题

**实施步骤**:
1. [ ] 切换到 PR 分支
2. [ ] 运行所有测试
3. [ ] 手动功能测试
4. [ ] 代码审查
5. [ ] 合并到 main

---

## 📅 P2 任务 - 本月完成

### P2-1: 重构被跳过的测试 (6小时)

**任务描述**:
- 重构 22 个被跳过的测试
- 适配新架构
- 提升测试覆盖率

**详细计划**:

#### 1. AI Manager 测试 (8个) - 2小时

**文件**: `tests/services/ai/test_manager.py`

**当前状态**: 整个测试类被跳过

**重构策略**:
1. 分析新 AI Manager 实现
2. 更新测试断言
3. 修复 Mock 配置
4. 验证测试通过

#### 2. OpenAI Provider 测试 (6个) - 2小时

**文件**: `tests/services/ai/test_openai_provider.py`

**当前状态**: 整个测试类被跳过

**重构策略**:
1. 分析新 Provider 实现
2. 更新测试用例
3. 修复 Mock 配置
4. 验证测试通过

#### 3. AI API 测试 (8个) - 2小时

**文件**: `tests/api/v1/test_ai.py`

**当前状态**: 8个测试被跳过

**重构策略**:
1. 更新测试断言
2. 修复 Mock 配置
3. 验证测试通过

**目标**:
- ✅ 测试通过率: 90%+
- ✅ 代码覆盖率: 80%+
- ✅ 无编造测试结果

---

### P2-2: 完善配置文档 (2小时)

**任务描述**:
- 创建前后端配置映射文档
- 编写配置项说明文档
- 整理配置最佳实践

**输出文档**:

#### 1. 配置映射文档

**文件**: `docs/CONFIGURATION_MAPPING.md`

**内容**:
- 前端配置项 → 后端配置项映射
- 配置获取流程图
- 配置更新流程

#### 2. 配置说明文档

**文件**: `docs/CONFIGURATION_GUIDE.md`

**内容**:
- 所有配置项说明
- 默认值
- 示例值
- 注意事项

#### 3. 配置最佳实践

**文件**: `docs/CONFIGURATION_BEST_PRACTICES.md`

**内容**:
- 敏感信息管理
- 环境变量使用
- 配置验证
- 错误处理

---

## 📊 进度跟踪

### 每日检查清单

**Day 1 (今天)**:
- [ ] 完成 P0-1: Settings 配置修复
- [ ] 完成 P0-2: 硬编码 URL 修复
- [ ] 运行所有测试验证
- [ ] 更新进度报告

**Day 2-3**:
- [ ] 合并 PR #5
- [ ] 执行样式统一 P0 任务
- [ ] 更新进度报告

**Day 4**:
- [ ] 合并 PR #3
- [ ] 审查 PR #6
- [ ] 更新进度报告

**Day 5**:
- [ ] 合并 PR #6
- [ ] 整体验证
- [ ] 周总结报告

**Week 2-3**:
- [ ] 重构被跳过的测试
- [ ] 完善配置文档
- [ ] 月总结报告

### 成功指标

| 指标 | 当前值 | 目标值 | 完成期限 |
|------|--------|--------|---------|
| 测试通过率 | 100% (57/57) | 90% (80/89) | Week 3 |
| 代码覆盖率 | 46.35% | 60%+ | Week 3 |
| P0 任务完成 | 0/2 | 2/2 | Day 1 |
| P1 任务完成 | 0/3 | 3/3 | Week 1 |
| P2 任务完成 | 0/2 | 2/2 | Week 3 |

---

## 🚨 风险管理

### 风险识别

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| Settings 修改破坏功能 | 中 | 高 | 充分测试，保留回滚 |
| 样式统一工作量超预期 | 高 | 中 | 分批处理，优先 P0 |
| 测试重构困难 | 中 | 中 | 寻求帮助，调整计划 |

### 应急预案

**如果 P0 任务延期**:
1. 立即上报
2. 调整资源
3. 延后 P1 任务

**如果测试重构困难**:
1. 降低覆盖率目标
2. 优先核心功能
3. 寻求技术支持

---

## 📞 联系和支持

**问题反馈**:
- 技术问题: 提交 GitHub Issue
- 进度更新: 更新本文档
- 紧急情况: 直接沟通

**资源需求**:
- 开发时间: 20小时
- 测试环境: 已有
- 文档工具: Markdown

---

**创建时间**: 2025-10-11  
**最后更新**: 2025-10-11  
**下次更新**: 完成 P0 任务后  
**状态**: ✅ 计划完成，待执行

