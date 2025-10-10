# 服务架构重构实施任务清单

## 文档信息
- **版本**: v1.0
- **日期**: 2025-10-10
- **状态**: 待执行

---

## 阶段0: 准备工作 (1周)

### 0.1 项目结构优化
- [ ] 创建新的后端服务目录结构
  ```
  backend-service/
  ├── app/
  │   ├── api/
  │   │   ├── v1/
  │   │   │   ├── __init__.py
  │   │   │   ├── ai.py          # AI服务路由
  │   │   │   ├── ocr.py         # OCR服务路由
  │   │   │   ├── voice.py       # 语音服务路由
  │   │   │   ├── patient.py     # 患者服务路由
  │   │   │   ├── bisheng.py     # Bisheng路由
  │   │   │   ├── medical.py     # 医疗集成路由
  │   │   │   └── config.py      # 配置管理路由
  │   ├── services/
  │   │   ├── ai/
  │   │   │   ├── __init__.py
  │   │   │   ├── chat_service.py
  │   │   │   ├── analysis_service.py
  │   │   │   └── model_manager.py
  │   │   ├── ocr/
  │   │   │   ├── __init__.py
  │   │   │   ├── tesseract_service.py
  │   │   │   └── image_processor.py
  │   │   ├── voice/
  │   │   │   ├── __init__.py
  │   │   │   ├── recognition_service.py
  │   │   │   └── synthesis_service.py
  │   │   └── ...
  │   ├── core/
  │   │   ├── __init__.py
  │   │   ├── auth.py            # 认证
  │   │   ├── rate_limiter.py    # 限流
  │   │   ├── circuit_breaker.py # 熔断
  │   │   └── middleware.py      # 中间件
  │   ├── models/
  │   ├── schemas/
  │   └── utils/
  ```
- [ ] 更新requirements.txt，添加新依赖
  - tesseract-ocr
  - whisper
  - celery
  - redis
  - circuit-breaker
- [ ] 配置开发环境
  - Docker Compose配置更新
  - 环境变量模板(.env.example)
  - 开发工具配置(pre-commit, black, mypy)

### 0.2 API文档和规范
- [ ] 使用OpenAPI 3.0规范
- [ ] 配置Swagger UI主题
- [ ] 添加API示例和说明
- [ ] 创建Postman Collection

### 0.3 测试环境搭建
- [ ] 配置pytest测试框架
- [ ] 创建测试数据库
- [ ] Mock外部服务（OpenAI, Ollama等）
- [ ] 配置CI/CD流水线

### 0.4 代码规范和文档
- [ ] 制定Python代码规范
- [ ] 制定TypeScript代码规范
- [ ] 创建贡献指南
- [ ] 更新README文档

---

## 阶段1: 核心AI服务迁移 (2周)

### 1.1 AI对话服务后端实现
- [ ] 创建AI服务基础架构
  - [ ] `app/services/ai/chat_service.py` - 对话服务
  - [ ] `app/services/ai/model_manager.py` - 模型管理
  - [ ] `app/services/ai/provider_factory.py` - 提供商工厂
- [ ] 实现多提供商支持
  - [ ] OpenAI提供商
  - [ ] Claude提供商
  - [ ] Ollama提供商
  - [ ] Deepseek提供商
- [ ] 实现对话API
  - [ ] POST /api/v1/ai/chat - 标准对话
  - [ ] POST /api/v1/ai/chat/stream - 流式对话
  - [ ] POST /api/v1/ai/analyze - 内容分析
- [ ] 实现流式响应（SSE）
- [ ] 添加对话历史管理
- [ ] 实现Token计数和限制
- [ ] 编写单元测试（覆盖率>80%）

### 1.2 患者信息提取服务增强
- [ ] 增强现有患者提取API
  - [ ] 支持多种输入源（图像、文本、OCR）
  - [ ] 优化提取算法
  - [ ] 添加置信度评分
- [ ] 实现AI辅助提取
  - [ ] 集成视觉模型（Qwen2.5VL）
  - [ ] 优化提示词模板
  - [ ] 添加字段验证
- [ ] 编写测试用例

### 1.3 智能推荐服务优化
- [ ] 重构推荐生成逻辑
  - [ ] 分离检查推荐、用药推荐、诊断建议
  - [ ] 优化提示词工程
  - [ ] 添加推荐理由生成
- [ ] 实现推荐缓存
- [ ] 添加推荐反馈机制
- [ ] 编写测试用例

### 1.4 前端适配器开发
- [ ] 创建统一API客户端
  - [ ] `src/services/api-client.ts` - HTTP客户端
  - [ ] 请求拦截器（添加认证）
  - [ ] 响应拦截器（错误处理）
  - [ ] 重试机制
- [ ] 创建AI服务适配器
  - [ ] `src/services/adapters/ai-adapter.ts`
  - [ ] 支持新旧实现切换
  - [ ] 配置开关控制
- [ ] 更新IPC处理器
  - [ ] 主进程调用后端API
  - [ ] 保持IPC接口不变
- [ ] 编写前端测试

### 1.5 集成测试
- [ ] 端到端测试
  - [ ] AI对话流程测试
  - [ ] 患者提取流程测试
  - [ ] 推荐生成流程测试
- [ ] 性能测试
  - [ ] 响应时间测试
  - [ ] 并发测试
- [ ] 兼容性测试
  - [ ] 新旧实现对比测试

---

## 阶段2: OCR和图像服务 (1.5周)

### 2.1 OCR服务后端实现
- [ ] 集成Tesseract OCR
  - [ ] `app/services/ocr/tesseract_service.py`
  - [ ] 支持中英文识别
  - [ ] 图像预处理（去噪、二值化）
- [ ] 实现OCR API
  - [ ] POST /api/v1/ocr/recognize - 文字识别
  - [ ] POST /api/v1/ocr/desktop-analyze - 桌面分析
- [ ] 优化识别准确率
  - [ ] 图像增强
  - [ ] 多语言支持
  - [ ] 置信度过滤
- [ ] 添加缓存机制
- [ ] 编写测试用例

### 2.2 图像处理服务
- [ ] 实现图像预处理
  - [ ] `app/services/ocr/image_processor.py`
  - [ ] 压缩、裁剪、旋转
  - [ ] 格式转换
- [ ] 实现图像存储
  - [ ] 本地存储
  - [ ] 对象存储（MinIO/S3）
- [ ] 编写测试用例

### 2.3 桌面识别服务
- [ ] 整合OCR和AI分析
  - [ ] 屏幕内容识别
  - [ ] 智能元素检测
  - [ ] 操作建议生成
- [ ] 实现API
  - [ ] POST /api/v1/desktop/analyze
- [ ] 编写测试用例

### 2.4 前端适配
- [ ] 创建OCR服务适配器
  - [ ] `src/services/adapters/ocr-adapter.ts`
- [ ] 更新桌面识别服务
  - [ ] 调用后端API
  - [ ] 保持接口兼容
- [ ] 编写测试

### 2.5 集成测试
- [ ] OCR识别准确率测试
- [ ] 桌面分析功能测试
- [ ] 性能测试

---

## 阶段3: 语音服务 (2周)

### 3.1 语音识别服务后端实现
- [ ] 集成Whisper模型
  - [ ] `app/services/voice/recognition_service.py`
  - [ ] 支持多语言
  - [ ] 实时流式识别
- [ ] 实现语音识别API
  - [ ] POST /api/v1/voice/recognize - 文件识别
  - [ ] WS /api/v1/ws/voice/stream - 实时识别
- [ ] 优化识别性能
  - [ ] GPU加速
  - [ ] 批处理
  - [ ] 异步处理
- [ ] 编写测试用例

### 3.2 语音合成服务
- [ ] 集成TTS引擎
  - [ ] `app/services/voice/synthesis_service.py`
  - [ ] 支持多种音色
  - [ ] 调节语速、音调
- [ ] 实现语音合成API
  - [ ] POST /api/v1/voice/synthesize
- [ ] 音频文件管理
  - [ ] 缓存生成的音频
  - [ ] CDN分发
- [ ] 编写测试用例

### 3.3 WebSocket实时通信
- [ ] 实现WebSocket服务
  - [ ] `app/api/v1/websocket.py`
  - [ ] 连接管理
  - [ ] 心跳检测
- [ ] 实现实时语音流
  - [ ] 音频流接收
  - [ ] 实时转写
  - [ ] 结果推送
- [ ] 编写测试用例

### 3.4 前端适配
- [ ] 创建语音服务适配器
  - [ ] `src/services/adapters/voice-adapter.ts`
- [ ] 实现WebSocket客户端
  - [ ] 连接管理
  - [ ] 断线重连
  - [ ] 音频流发送
- [ ] 更新语音服务
  - [ ] 调用后端API
  - [ ] 保持接口兼容
- [ ] 编写测试

### 3.5 集成测试
- [ ] 语音识别准确率测试
- [ ] 语音合成质量测试
- [ ] 实时通信稳定性测试
- [ ] 性能测试

---

## 阶段4: 智能体和集成服务 (1.5周)

### 4.1 Bisheng集成服务优化
- [ ] 优化现有Bisheng API
  - [ ] 改进认证机制
  - [ ] 优化工作流调用
  - [ ] 添加会话管理
- [ ] 实现代理服务
  - [ ] iframe代理优化
  - [ ] CORS处理
- [ ] 编写测试用例

### 4.2 医疗系统集成服务
- [ ] 实现RIS/PACS集成
  - [ ] `app/services/medical/ris_service.py`
  - [ ] `app/services/medical/pacs_service.py`
  - [ ] DICOM支持
- [ ] 实现HIS集成
  - [ ] `app/services/medical/his_service.py`
  - [ ] HL7协议支持
- [ ] 实现医疗API
  - [ ] GET /api/v1/medical/patients/search
  - [ ] GET /api/v1/medical/patients/{id}
  - [ ] GET /api/v1/medical/studies/{id}
- [ ] 编写测试用例

### 4.3 网络搜索服务
- [ ] 实现搜索服务
  - [ ] `app/services/search/web_search_service.py`
  - [ ] 支持多个搜索引擎
  - [ ] 结果聚合
- [ ] 实现搜索API
  - [ ] POST /api/v1/search/web
- [ ] 添加缓存
- [ ] 编写测试用例

### 4.4 前端适配
- [ ] 创建集成服务适配器
  - [ ] `src/services/adapters/bisheng-adapter.ts`
  - [ ] `src/services/adapters/medical-adapter.ts`
  - [ ] `src/services/adapters/search-adapter.ts`
- [ ] 更新服务调用
- [ ] 编写测试

### 4.5 集成测试
- [ ] Bisheng工作流测试
- [ ] 医疗系统对接测试
- [ ] 搜索功能测试

---

## 阶段5: 配置和管理服务 (1周)

### 5.1 配置管理服务
- [ ] 实现配置服务
  - [ ] `app/services/config/config_service.py`
  - [ ] 数据库存储
  - [ ] 缓存机制
- [ ] 实现配置API
  - [ ] GET /api/v1/config
  - [ ] GET /api/v1/config/{key}
  - [ ] PUT /api/v1/config/{key}
- [ ] 配置验证
- [ ] 编写测试用例

### 5.2 聊天历史服务
- [ ] 实现历史服务
  - [ ] `app/services/chat/history_service.py`
  - [ ] 数据库存储
  - [ ] 分页查询
- [ ] 实现历史API
  - [ ] GET /api/v1/chat/history
  - [ ] POST /api/v1/chat/history
  - [ ] DELETE /api/v1/chat/history/{id}
- [ ] 编写测试用例

### 5.3 健康检查服务
- [ ] 增强健康检查
  - [ ] 数据库检查
  - [ ] Redis检查
  - [ ] 外部服务检查
  - [ ] 资源使用检查
- [ ] 实现健康检查API
  - [ ] GET /api/v1/health
  - [ ] GET /api/v1/health/detailed
- [ ] 编写测试用例

### 5.4 前端适配
- [ ] 创建配置服务适配器
- [ ] 创建历史服务适配器
- [ ] 更新健康检查
- [ ] 编写测试

### 5.5 集成测试
- [ ] 配置管理测试
- [ ] 历史记录测试
- [ ] 健康检查测试

---

## 阶段6: 优化和上线 (1周)

### 6.1 性能优化
- [ ] 数据库查询优化
  - [ ] 添加索引
  - [ ] 查询优化
- [ ] 缓存优化
  - [ ] Redis缓存策略
  - [ ] 缓存预热
- [ ] API响应优化
  - [ ] 压缩响应
  - [ ] CDN加速
- [ ] 异步处理优化
  - [ ] Celery任务队列
  - [ ] 批处理

### 6.2 安全加固
- [ ] 认证和授权
  - [ ] JWT实现
  - [ ] 权限控制
- [ ] API安全
  - [ ] 输入验证
  - [ ] SQL注入防护
  - [ ] XSS防护
- [ ] 密钥管理
  - [ ] 环境变量
  - [ ] 密钥轮换
- [ ] 安全审计
  - [ ] 代码扫描
  - [ ] 渗透测试

### 6.3 监控和日志
- [ ] 日志系统
  - [ ] 结构化日志
  - [ ] 日志聚合
- [ ] 监控系统
  - [ ] Prometheus指标
  - [ ] Grafana仪表板
- [ ] 告警系统
  - [ ] 错误告警
  - [ ] 性能告警

### 6.4 文档完善
- [ ] API文档
  - [ ] Swagger文档
  - [ ] 使用示例
- [ ] 部署文档
  - [ ] Docker部署
  - [ ] Kubernetes部署
- [ ] 运维文档
  - [ ] 故障排查
  - [ ] 性能调优

### 6.5 生产部署
- [ ] 环境准备
  - [ ] 生产服务器
  - [ ] 数据库
  - [ ] Redis
- [ ] 部署流程
  - [ ] Docker镜像构建
  - [ ] 容器编排
  - [ ] 负载均衡
- [ ] 灰度发布
  - [ ] 10%流量
  - [ ] 50%流量
  - [ ] 100%流量
- [ ] 监控验证
  - [ ] 性能监控
  - [ ] 错误监控
  - [ ] 用户反馈

---

## 验收标准

### 功能验收
- [ ] 所有API按规范实现
- [ ] 前端功能正常
- [ ] 新旧实现可切换

### 性能验收
- [ ] API响应时间 < 500ms (P95)
- [ ] 并发支持 > 1000
- [ ] 错误率 < 0.1%

### 质量验收
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过率 100%
- [ ] 代码审查通过

### 文档验收
- [ ] API文档完整
- [ ] 部署文档完整
- [ ] 用户文档完整

---

**总计**: 约10周，60个工作日

**下一步**: 开始阶段0的准备工作

