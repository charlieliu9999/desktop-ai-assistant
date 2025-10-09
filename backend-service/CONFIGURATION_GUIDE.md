# 后端服务配置指南

## 快速开始

### 1. 环境准备

```bash
cd desktop-ai-assistant/backend-service

# 复制环境配置文件
cp .env.example .env

# 编辑配置文件
vim .env  # 或使用其他编辑器
```

### 2. 配置说明

#### 必需配置

```bash
# 应用配置
PORT=8010                    # 服务端口，默认8010
HOST=0.0.0.0                # 监听地址

# 本地AI配置 (Ollama)
LOCAL_AI_ENDPOINT=http://localhost:11434
LOCAL_AI_MODEL=qwen2.5vl:latest
```

#### 可选配置

```bash
# 数据库配置 (可选，用于患者数据持久化)
DATABASE_URL=postgresql://medical_user:medical_pass@localhost:5433/medical_ai
DATABASE_REQUIRED=False      # 设置为False表示数据库非必需

# Deepseek AI配置 (可选，用于云端AI服务)
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_MODEL=deepseek-chat

# Bisheng配置 (可选，用于智能体平台集成)
BISHENG_ENABLED=True
BISHENG_BASE_URL=http://localhost:7860
BISHENG_FRONTEND_URL=http://localhost:3001
```

### 3. 启动服务

#### 方式一：使用启动脚本（推荐）

```bash
./run.sh
```

脚本会自动：
- 检查并创建虚拟环境
- 安装依赖
- 从 `.env` 读取配置
- 启动服务

#### 方式二：手动启动

```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python -m app.main
```

#### 方式三：使用Docker

```bash
# 启动所有服务（包括数据库和Redis）
docker-compose up -d

# 查看日志
docker-compose logs -f api

# 停止服务
docker-compose down
```

### 4. 验证服务

#### 健康检查

```bash
# 基础健康检查
curl http://localhost:8010/health

# 详细健康检查（包含所有依赖服务状态）
curl http://localhost:8010/health/detailed
```

#### 使用测试脚本

```bash
./test_services.sh
```

测试脚本会检查：
- 基础健康检查
- 详细健康检查
- API文档可用性
- Bisheng服务状态
- 本地AI服务状态
- 模型配置
- 患者信息提取功能
- 依赖服务连接状态

#### 访问API文档

- Swagger UI: http://localhost:8010/docs
- ReDoc: http://localhost:8010/redoc

## 端口配置

### 默认端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 后端API | 8010 | FastAPI服务 |
| PostgreSQL | 5433 | 数据库（避免与系统PostgreSQL冲突） |
| Redis | 6380 | 缓存（避免与系统Redis冲突） |
| Ollama | 11434 | 本地AI服务 |
| Bisheng后端 | 7860 | Bisheng智能体平台 |
| Bisheng前端 | 3001 | Bisheng Web界面 |

### 修改端口

1. 编辑 `.env` 文件中的 `PORT` 配置
2. 重启服务

```bash
# .env
PORT=8888  # 修改为你想要的端口

# 重启服务
./run.sh
```

## 服务依赖

### 必需服务

- **Ollama**: 本地AI服务，用于模型推理
  - 安装: https://ollama.ai
  - 启动: `ollama serve`
  - 验证: `curl http://localhost:11434/api/tags`

### 可选服务

- **PostgreSQL**: 数据库，用于患者数据持久化
  - 使用Docker: `docker-compose up -d postgres`
  - 或使用系统PostgreSQL

- **Redis**: 缓存服务，用于提升性能
  - 使用Docker: `docker-compose up -d redis`
  - 或使用系统Redis

- **Bisheng**: 智能体平台，用于高级AI功能
  - 启动: 参考Bisheng文档
  - 配置: 在 `.env` 中设置 `BISHENG_ENABLED=True`

## 服务启动自检

服务启动时会自动检查以下内容：

1. **数据库连接** (如果配置)
   - 连接成功: ✓ 数据库初始化成功
   - 连接失败但非必需: ⚠ 数据库初始化失败(非必需)
   - 连接失败且必需: ✗ 数据库初始化失败 (服务退出)

2. **本地AI服务** (Ollama)
   - 连接成功: ✓ 本地AI服务连接成功
   - 连接失败: ⚠ 本地AI服务不可用

3. **Bisheng服务** (如果启用)
   - 连接成功: ✓ Bisheng服务连接成功
   - 连接失败: ⚠ Bisheng服务不可用
   - 已禁用: ○ Bisheng服务已禁用

4. **Deepseek API** (如果配置)
   - 已配置: ✓ Deepseek AI已配置
   - 未配置: ○ Deepseek AI未配置(可选)

## 日志管理

### 日志位置

- 应用日志: `logs/app.log`
- Docker日志: `docker-compose logs -f api`

### 日志级别

在 `.env` 中配置：

```bash
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR
```

### 查看日志

```bash
# 实时查看
tail -f logs/app.log

# 查看最近100行
tail -n 100 logs/app.log

# 搜索错误
grep ERROR logs/app.log
```

## 故障排查

### 服务无法启动

1. 检查端口是否被占用
   ```bash
   lsof -i :8010
   ```

2. 检查配置文件
   ```bash
   cat .env
   ```

3. 查看日志
   ```bash
   tail -f logs/app.log
   ```

### 依赖服务不可用

1. 检查Ollama
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. 检查Bisheng
   ```bash
   curl http://localhost:7860/health
   ```

3. 检查数据库
   ```bash
   nc -z localhost 5433
   ```

### API调用失败

1. 检查健康状态
   ```bash
   curl http://localhost:8010/health/detailed
   ```

2. 查看API文档
   - 访问 http://localhost:8010/docs
   - 检查请求格式和参数

3. 查看日志
   ```bash
   tail -f logs/app.log
   ```

## 性能优化

### 数据库连接池

已配置，默认设置：
- 最大连接数: 20
- 连接超时: 30秒

### 异步处理

所有API路由都使用异步处理，提升并发性能。

### 缓存

Redis缓存已配置但未启用，可以根据需要启用。

## 安全建议

1. **修改默认密码**
   - 数据库密码
   - Redis密码（如果启用）

2. **保护敏感信息**
   - 不要提交 `.env` 文件到版本控制
   - 使用环境变量管理API密钥

3. **启用HTTPS**
   - 生产环境建议使用Nginx反向代理
   - 配置SSL证书

4. **API认证**
   - 考虑添加JWT认证
   - 限制API访问来源

## 更新日志

### 2025-10-08
- ✅ 统一端口配置为8010
- ✅ 添加详细健康检查接口
- ✅ 添加服务启动自检
- ✅ 创建服务测试脚本
- ✅ 更新Docker配置
- ✅ 完善文档

