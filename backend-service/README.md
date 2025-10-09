# AI医疗助手后端服务

基于FastAPI的智能医疗推荐系统后端服务。

## 功能特性

- ✅ 患者信息管理
- ✅ 智能检查项目推荐 (基于Deepseek AI)
- ✅ AI问答功能
- ✅ 用户反馈收集
- ✅ RESTful API设计
- ✅ 自动生成API文档
- ✅ Docker容器化部署

## 技术栈

- **框架**: FastAPI 0.109.0
- **数据库**: PostgreSQL 15
- **缓存**: Redis 7
- **AI服务**: Deepseek API
- **ORM**: SQLAlchemy 2.0
- **日志**: Loguru

## 快速开始

### 1. 环境准备

确保已安装:
- Python 3.11+
- Docker & Docker Compose (可选)
- PostgreSQL 15+ (如果不使用Docker)

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件,配置必要的参数:
- `DEEPSEEK_API_KEY`: Deepseek API密钥
- `DATABASE_URL`: 数据库连接字符串
- `SECRET_KEY`: JWT密钥

### 3. 使用Docker Compose启动 (推荐)

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f api

# 停止服务
docker-compose down
```

### 4. 本地开发模式

```bash
# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
python -m app.main

# 或使用uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API文档

启动服务后,访问以下地址查看API文档:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API端点

### 患者管理

```
POST   /api/patients          # 创建患者
GET    /api/patients/{id}     # 获取患者信息
GET    /api/patients          # 获取患者列表
PUT    /api/patients/{id}     # 更新患者信息
DELETE /api/patients/{id}     # 删除患者
```

### 智能推荐

```
POST   /api/recommendations/generate    # 生成推荐
GET    /api/recommendations/{id}        # 获取推荐详情
POST   /api/recommendations/feedback    # 提交反馈
```

### AI问答

```
POST   /api/ai/chat                     # AI对话
```

## 使用示例

### 1. 创建患者

```bash
curl -X POST "http://localhost:8000/api/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P001",
    "name": "张三",
    "gender": "男",
    "age": 45
  }'
```

### 2. 生成推荐

```bash
curl -X POST "http://localhost:8000/api/recommendations/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P001",
    "chief_complaint": "持续性头痛3天,伴有恶心呕吐",
    "medical_history": "高血压病史5年"
  }'
```

### 3. AI问答

```bash
curl -X POST "http://localhost:8000/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "头痛需要做什么检查?",
    "history": []
  }'
```

## 数据库迁移

使用Alembic进行数据库迁移:

```bash
# 初始化迁移
alembic init alembic

# 创建迁移
alembic revision --autogenerate -m "Initial migration"

# 执行迁移
alembic upgrade head
```

## 测试

```bash
# 运行测试
pytest

# 运行测试并生成覆盖率报告
pytest --cov=app tests/
```

## 项目结构

```
backend-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # 应用入口
│   ├── config.py            # 配置
│   ├── database.py          # 数据库连接
│   ├── models/              # 数据模型
│   ├── schemas/             # Pydantic schemas
│   ├── api/                 # API路由
│   ├── services/            # 业务逻辑
│   └── utils/               # 工具函数
├── tests/                   # 测试
├── logs/                    # 日志文件
├── requirements.txt         # Python依赖
├── Dockerfile              # Docker配置
├── docker-compose.yml      # Docker Compose配置
└── README.md               # 项目说明
```

## 部署

### 生产环境部署

1. 修改 `.env` 文件中的配置
2. 设置 `DEBUG=False`
3. 使用强密码和密钥
4. 配置HTTPS
5. 使用Nginx反向代理

```bash
# 构建生产镜像
docker-compose -f docker-compose.prod.yml build

# 启动生产服务
docker-compose -f docker-compose.prod.yml up -d
```

## 监控和日志

- 日志文件位置: `logs/app.log`
- 日志级别可通过 `LOG_LEVEL` 环境变量配置
- 支持日志轮转 (500MB)

## 常见问题

### 1. 数据库连接失败

检查 `DATABASE_URL` 配置是否正确,确保PostgreSQL服务已启动。

### 2. AI API调用失败

检查 `DEEPSEEK_API_KEY` 是否正确配置,确保网络可以访问Deepseek API。

### 3. CORS错误

在 `.env` 中配置 `CORS_ORIGINS`,添加前端应用的URL。

## 贡献

欢迎提交Issue和Pull Request!

## 许可证

MIT License

