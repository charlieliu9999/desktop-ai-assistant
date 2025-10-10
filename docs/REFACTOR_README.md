# 桌面AI助手服务架构重构 - 总览文档

## 📋 文档导航

本次重构涉及多个方面的设计和实施,相关文档如下:

### 核心文档
1. **[架构重构方案](./ARCHITECTURE_REFACTOR_PLAN.md)** - 整体架构设计和重构方案
2. **[API设计规范](./API_DESIGN_SPECIFICATION.md)** - 详细的API接口设计
3. **[实施任务清单](./IMPLEMENTATION_TASKS.md)** - 分阶段的实施计划
4. **[服务配置设计](./SERVICE_CONFIGURATION_DESIGN.md)** - 配置管理和服务接入设计

---

## 🎯 重构目标

### 核心目标
将当前分散在前端(Electron)的各种服务统一封装为后端API服务,实现真正的前后端分离架构。

### 具体目标
1. ✅ **前后端分离**: 业务逻辑从前端迁移到后端
2. ✅ **服务统一**: 建立统一的API服务层
3. ✅ **安全增强**: API密钥和敏感数据后端管理
4. ✅ **性能优化**: 利用服务器资源处理计算密集任务
5. ✅ **可扩展性**: 支持动态配置和服务扩展
6. ✅ **灵活配置**: 支持多模型、多平台的灵活配置
7. ✅ **并发管理**: 合理的并发控制和资源管理
8. ✅ **用户管理**: 支持多用户和权限管理

---

## 📊 当前架构分析

### 前端服务 (需要迁移)
| 服务 | 文件 | 优先级 | 迁移难度 |
|------|------|--------|---------|
| AI对话服务 | ai.ts | 高 | 中 |
| 患者信息提取 | patient-info-extractor.ts | 高 | 低(已部分迁移) |
| OCR识别 | desktop-recognition.ts | 高 | 中 |
| 语音识别 | voice-recognition.ts | 中 | 高 |
| 语音合成 | voice.ts | 中 | 中 |
| Bisheng集成 | bisheng.ts | 中 | 低(已实现) |
| 医疗系统集成 | medical-integration.ts | 中 | 中 |
| 网络搜索 | web-search.ts | 低 | 低 |

### 后端服务 (已有基础)
| 服务 | 状态 | 完成度 |
|------|------|--------|
| 患者管理 | ✅ 已实现 | 100% |
| 智能推荐 | ✅ 已实现 | 100% |
| AI问答 | ✅ 已实现 | 80% |
| 本地AI | ✅ 已实现 | 100% |
| 患者提取 | ✅ 已实现 | 100% |
| Bisheng集成 | ✅ 已实现 | 90% |
| OCR服务 | ❌ 未实现 | 0% |
| 语音服务 | ❌ 未实现 | 0% |
| 配置管理 | ⚠️ 部分实现 | 50% |

---

## 🏗️ 目标架构

```
┌─────────────────────────────────────────────────────────────┐
│                  Electron Desktop App                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  前端职责 (保留)                                      │  │
│  │  - UI渲染和交互                                       │  │
│  │  - 窗口管理                                           │  │
│  │  - 系统集成(截图、快捷键)                             │  │
│  │  - 本地数据缓存                                       │  │
│  │  - WebSocket连接管理                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                │
└───────────────────────────┼────────────────────────────────┘
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API Service (FastAPI)                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Gateway Layer                                    │  │
│  │  - 认证/授权  - 限流  - 熔断  - 日志  - 监控         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────┬───────────┬───────────┬──────────────┐    │
│  │ AI Service │OCR Service│Voice Svc  │Medical Svc   │    │
│  │            │           │           │              │    │
│  │ - 对话     │ - 文字识别│ - 语音识别│ - RIS/PACS   │    │
│  │ - 分析     │ - 桌面识别│ - 语音合成│ - HIS集成    │    │
│  │ - 推荐     │ - 图像处理│ - 实时流  │ - 患者管理   │    │
│  └────────────┴───────────┴───────────┴──────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Infrastructure Layer                                 │  │
│  │  - 配置管理  - 缓存(Redis)  - 队列(Celery)           │  │
│  │  - 数据库(PostgreSQL)  - 对象存储(MinIO)             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 实施计划

### 时间线 (10周)

```
Week 1: 准备工作
├── 项目结构优化
├── API文档规范
├── 测试环境搭建
└── 代码规范制定

Week 2-3: 核心AI服务迁移
├── AI对话API实现
├── 流式响应实现
├── 患者提取增强
├── 智能推荐优化
└── 前端适配器开发

Week 4-5: OCR和图像服务
├── Tesseract集成
├── 图像处理服务
├── 桌面识别API
└── 前端适配

Week 6-7: 语音服务
├── Whisper集成
├── TTS服务
├── WebSocket实时通信
└── 前端适配

Week 8: 智能体和集成服务
├── Bisheng优化
├── 医疗系统集成
├── 网络搜索服务
└── 前端适配

Week 9: 配置和管理服务
├── 配置管理API
├── 聊天历史API
├── 健康检查增强
└── 前端适配

Week 10: 优化和上线
├── 性能优化
├── 安全加固
├── 文档完善
└── 生产部署
```

---

## 🔑 关键技术决策

### 1. 为什么选择FastAPI?
- ✅ 高性能(基于Starlette和Pydantic)
- ✅ 原生异步支持
- ✅ 自动生成API文档
- ✅ 类型安全
- ✅ 已有基础设施

### 2. 为什么采用渐进式迁移?
- ✅ 降低风险
- ✅ 保证业务连续性
- ✅ 便于回滚
- ✅ 团队学习曲线平滑

### 3. 为什么使用适配器模式?
- ✅ 新旧实现隔离
- ✅ 支持配置切换
- ✅ 便于A/B测试
- ✅ 降低耦合

### 4. 为什么需要配置管理系统?
- ✅ 灵活的模型配置
- ✅ 支持多平台接入
- ✅ 用户级配置隔离
- ✅ 配置热更新

---

## 🎨 核心特性

### 1. 灵活的AI模型配置
```python
# 支持多场景、多模型配置
scenarios = {
    "chat": {
        "primary": "gpt-4",
        "fallback": ["qwen2.5:32b"]
    },
    "vision": {
        "primary": "qwen2.5vl:latest"
    },
    "medical": {
        "primary": "deepseek-chat"
    }
}
```

### 2. 智能体平台集成
```python
# 支持多个智能体平台
platforms = {
    "bisheng": BishengConfig(...),
    "langflow": LangflowConfig(...),
    "dify": DifyConfig(...)
}
```

### 3. 服务动态注册
```python
# 新服务快速接入
service_registry.register_service(
    ServiceConfig(
        name="custom_ocr",
        type="ocr",
        endpoint="http://custom-ocr:8080"
    )
)
```

### 4. 用户级配置
```python
# 每个用户独立配置
user_config = {
    "preferred_model": "gpt-4",
    "voice_language": "zh-CN",
    "features": {
        "ai_chat": True,
        "voice": True
    }
}
```

---

## 📈 性能目标

### API性能
- 响应时间: < 500ms (P95)
- 并发支持: > 1000 QPS
- 错误率: < 0.1%

### 资源使用
- CPU使用率: < 70%
- 内存使用: < 4GB per instance
- 数据库连接: < 100

### 可用性
- 服务可用性: > 99.9%
- 平均故障恢复时间: < 5分钟

---

## 🔒 安全措施

### 1. 认证和授权
- JWT Token认证
- 基于角色的权限控制(RBAC)
- API Key管理

### 2. 数据安全
- API密钥后端存储
- 敏感数据加密
- 审计日志

### 3. API安全
- 输入验证
- SQL注入防护
- XSS防护
- CSRF防护

### 4. 限流和熔断
- 用户级限流
- 服务级熔断
- 降级策略

---

## 📚 开发指南

### 后端开发
```bash
cd desktop-ai-assistant/backend-service

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
python -m app.main

# 运行测试
pytest

# 代码格式化
black app/
```

### 前端开发
```bash
cd desktop-ai-assistant

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 代码格式化
npm run lint:fix
```

---

## 🧪 测试策略

### 单元测试
- 后端服务覆盖率 > 80%
- 前端适配器覆盖率 > 70%

### 集成测试
- API端到端测试
- 前后端集成测试

### 性能测试
- 压力测试(1000并发)
- 响应时间测试
- 资源使用测试

### 安全测试
- API安全扫描
- 渗透测试
- 依赖漏洞扫描

---

## 📊 监控和运维

### 监控指标
- API请求量、响应时间、错误率
- 服务健康状态
- 资源使用情况
- 业务指标(对话次数、识别次数等)

### 日志管理
- 结构化日志
- 日志聚合(ELK Stack)
- 日志分析和告警

### 告警策略
- 错误率告警
- 响应时间告警
- 资源使用告警
- 服务不可用告警

---

## 🚀 部署方案

### Docker部署
```bash
# 构建镜像
docker build -t medical-ai-backend:latest .

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### Kubernetes部署
```bash
# 部署应用
kubectl apply -f k8s/

# 查看状态
kubectl get pods

# 扩容
kubectl scale deployment backend --replicas=5
```

---

## 📝 文档资源

### API文档
- Swagger UI: http://localhost:8010/docs
- ReDoc: http://localhost:8010/redoc

### 开发文档
- [架构设计](./ARCHITECTURE_REFACTOR_PLAN.md)
- [API规范](./API_DESIGN_SPECIFICATION.md)
- [配置管理](./SERVICE_CONFIGURATION_DESIGN.md)

### 运维文档
- [部署指南](./DEPLOYMENT_GUIDE.md) (待创建)
- [故障排查](./TROUBLESHOOTING.md) (待创建)
- [性能调优](./PERFORMANCE_TUNING.md) (待创建)

---

## 🤝 贡献指南

### 开发流程
1. Fork项目
2. 创建特性分支
3. 提交代码
4. 编写测试
5. 提交Pull Request

### 代码规范
- Python: PEP 8, Black格式化
- TypeScript: ESLint, Prettier格式化
- 提交信息: Conventional Commits

---

## 📞 联系方式

### 技术支持
- Issue: https://github.com/your-repo/issues
- Email: support@example.com

### 团队
- 架构师: [Name]
- 后端负责人: [Name]
- 前端负责人: [Name]

---

## 📄 许可证

MIT License

---

## 🎉 下一步行动

1. **审核方案**: 团队审核本重构方案
2. **确认计划**: 确认实施时间线和资源分配
3. **启动开发**: 开始阶段0的准备工作
4. **定期同步**: 每周进度同步会议

---

**最后更新**: 2025-10-10
**文档版本**: v1.0
**状态**: 待审核

