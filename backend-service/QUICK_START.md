# 快速启动指南

## 🚀 5分钟快速启动

### 前置条件

确保已安装：
- Python 3.11+
- Ollama (本地AI服务)

### 步骤1: 配置环境

```bash
cd desktop-ai-assistant/backend-service

# 复制配置文件
cp .env.example .env

# 编辑配置（可选，使用默认配置也可以）
# vim .env
```

### 步骤2: 启动服务

```bash
# 一键启动
./run.sh
```

脚本会自动：
- ✅ 检查并创建虚拟环境
- ✅ 安装依赖
- ✅ 检查端口占用
- ✅ 启动服务
- ✅ 执行服务自检

### 步骤3: 验证服务

```bash
# 方式1: 使用测试脚本
./test_services.sh

# 方式2: 手动测试
curl http://localhost:8010/health

# 方式3: 访问API文档
open http://localhost:8010/docs
```

---

## 📋 启动日志示例

成功启动后，你应该看到类似的日志：

```
🚀 启动AI医疗助手后端服务...
📌 Python版本: 3.11.x
🔧 激活虚拟环境...
📥 安装依赖...
✨ 启动FastAPI服务...
📖 API文档: http://localhost:8010/docs
📖 ReDoc: http://localhost:8010/redoc
🏥 健康检查: http://localhost:8010/health

============================================================
启动 AI医疗助手后端服务 v1.0.0
调试模式: True
监听地址: 0.0.0.0:8010
============================================================
✓ 数据库初始化成功
------------------------------------------------------------
开始服务自检...
------------------------------------------------------------
✓ 本地AI服务 (Ollama) 连接成功
  端点: http://localhost:11434
  可用模型数: 21
  模型示例: qwen2.5:32b, llama3.2-vision, ...
✓ Bisheng 服务连接成功
  后端: http://localhost:7860
  前端: http://localhost:3001
  认证: 已配置
✓ Deepseek AI 已配置
  模型: deepseek-chat
------------------------------------------------------------
服务自检完成
============================================================
API 文档: http://0.0.0.0:8010/docs
健康检查: http://0.0.0.0:8010/health
详细健康检查: http://0.0.0.0:8010/health/detailed
============================================================
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8010 (Press CTRL+C to quit)
```

---

## 🔧 常见问题

### Q1: 端口被占用怎么办？

**错误**: `ERROR: [Errno 48] Address already in use`

**解决**:
```bash
# 方式1: 启动脚本会自动提示，选择 y 终止占用进程
./run.sh
# ⚠️  端口 8010 已被占用
# 是否终止该进程并继续? (y/n) y

# 方式2: 手动查找并终止
lsof -i :8010
kill -9 <PID>

# 方式3: 修改端口
vim .env
# PORT=8888
```

### Q2: Ollama服务不可用？

**错误**: `⚠ 本地AI服务不可用`

**解决**:
```bash
# 检查Ollama是否运行
curl http://localhost:11434/api/tags

# 如果未运行，启动Ollama
ollama serve

# 拉取模型（如果需要）
ollama pull qwen2.5:32b
ollama pull llama3.2-vision
```

### Q3: 数据库连接失败？

**错误**: `database: unhealthy`

**解决**:
```bash
# 数据库是可选的，不影响核心功能
# 如果需要数据库功能：

# 方式1: 使用Docker
docker-compose up -d postgres

# 方式2: 使用系统PostgreSQL
# 修改 .env 中的 DATABASE_URL
```

### Q4: 测试脚本报错？

**错误**: `head: illegal line count -- -1`

**解决**:
已修复，重新拉取最新代码即可。

---

## 📚 API端点速查

### 健康检查
```bash
# 基础健康检查
GET /health

# 详细健康检查（包含所有依赖服务状态）
GET /health/detailed
```

### 本地AI服务
```bash
# 健康检查
GET /api/local-ai/health

# 获取模型列表
GET /api/local-ai/models

# 从图像提取患者信息
POST /api/local-ai/extract-patient-info-from-image
```

### 模型配置
```bash
# 获取所有场景
GET /api/model-config/scenarios

# 获取所有配置
GET /api/model-config/configs

# 获取指定场景配置
GET /api/model-config/configs/{scenario}

# 测试模型连接
POST /api/model-config/test
```

### Bisheng服务
```bash
# 获取配置
GET /api/bisheng/config

# 获取状态
GET /api/bisheng/status

# 登录
POST /api/bisheng/login

# 获取工作流列表
GET /api/bisheng/workflows

# 调用工作流
POST /api/bisheng/workflow/invoke
```

### 患者管理
```bash
# 创建患者
POST /api/patients

# 获取患者信息
GET /api/patients/{patient_id}

# 获取患者列表
GET /api/patients
```

### 智能推荐
```bash
# 生成推荐
POST /api/recommendations/generate

# 提交反馈
POST /api/recommendations/feedback
```

---

## 🎯 下一步

### 开发环境
1. 访问 API 文档: http://localhost:8010/docs
2. 测试 API 端点
3. 查看日志: `tail -f logs/app.log`

### 生产环境
1. 修改 `.env` 中的配置
   - 设置 `DEBUG=False`
   - 配置生产数据库
   - 设置强密码
2. 使用 Docker 部署: `docker-compose up -d`
3. 配置 Nginx 反向代理
4. 启用 HTTPS

---

## 📖 更多文档

- [配置指南](CONFIGURATION_GUIDE.md) - 详细的配置说明
- [问题修复总结](BUGFIX_SUMMARY.md) - 常见问题和解决方案
- [清理总结](CLEANUP_SUMMARY.md) - 代码清理和优化
- [改进总结](../BACKEND_SERVICE_IMPROVEMENTS.md) - 功能改进说明

---

## 💡 提示

### 开发技巧
```bash
# 实时查看日志
tail -f logs/app.log | grep "✓\|✗\|⚠"

# 重启服务
pkill -f "python -m app.main"
./run.sh

# 清理日志
> logs/app.log
```

### 性能优化
- 使用 Redis 缓存（可选）
- 启用数据库连接池
- 配置合适的超时时间

### 安全建议
- 不要提交 `.env` 文件
- 定期更新依赖
- 使用强密码
- 启用 HTTPS

---

## 🆘 获取帮助

### 查看日志
```bash
# 查看最近的错误
grep ERROR logs/app.log | tail -20

# 查看启动日志
grep "启动\|✓\|✗" logs/app.log
```

### 调试模式
```bash
# 修改 .env
DEBUG=True
LOG_LEVEL=DEBUG

# 重启服务
./run.sh
```

### 联系支持
- 查看文档: `docs/`
- 提交Issue: GitHub Issues
- 查看日志: `logs/app.log`

---

## ✅ 检查清单

启动前检查：
- [ ] Python 3.11+ 已安装
- [ ] Ollama 已安装并运行
- [ ] `.env` 文件已配置
- [ ] 端口 8010 未被占用

启动后验证：
- [ ] 服务启动成功（无错误日志）
- [ ] 健康检查通过
- [ ] API 文档可访问
- [ ] 测试脚本通过

---

**祝你使用愉快！** 🎉

