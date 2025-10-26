# 项目启动指南

**项目**: 桌面AI助手 (Desktop AI Assistant)  
**更新日期**: 2025-10-15

---

## 快速启动 (推荐)

### 一键启动脚本

```bash
# 进入项目目录
cd desktop-ai-assistant

# 启动后端和前端
npm run start:all
```

---

## 详细启动步骤

### 前置要求

#### 1. 系统要求
- **操作系统**: macOS / Linux / Windows
- **Node.js**: >= 18.0.0
- **Python**: >= 3.9
- **内存**: >= 8GB
- **磁盘空间**: >= 5GB

#### 2. 必需软件
- [x] Node.js 和 npm/pnpm
- [x] Python 3.9+
- [x] Git

#### 3. 可选软件
- [ ] Ollama (用于本地AI模型)
- [ ] PostgreSQL (用于数据持久化)

---

## 第一步: 环境准备

### 1.1 克隆项目

```bash
git clone https://github.com/charlieliu/medical-integration-platform.git
cd medical-integration-platform/desktop-ai-assistant
```

### 1.2 安装依赖

#### 前端依赖
```bash
# 使用npm
npm install

# 或使用pnpm (推荐)
pnpm install
```

#### 后端依赖
```bash
cd backend-service

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt

cd ..
```

### 1.3 配置环境变量

#### 后端配置
```bash
cd backend-service

# 复制环境变量模板
cp .env.example .env

# 编辑.env文件,配置API密钥
nano .env  # 或使用其他编辑器
```

**必需配置**:
```bash
# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key

# Deepseek API
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_API_BASE=https://api.deepseek.com/v1

# Dashscope (阿里云) API
DASHSCOPE_API_KEY=sk-your-dashscope-api-key

# 本地Ollama (可选)
LOCAL_AI_ENDPOINT=http://localhost:11434

# 数据库 (可选)
DATABASE_URL=postgresql://user:password@localhost:5432/medical_ai
```

#### 前端配置 (可选)
```bash
cd ..

# 创建前端环境变量文件
echo "VITE_API_BASE_URL=http://127.0.0.1:8010/api" > .env.local
```

---

## 第二步: 启动后端服务

### 方式1: 使用启动脚本 (推荐)

```bash
cd backend-service
./run.sh
```

### 方式2: 手动启动

```bash
cd backend-service

# 激活虚拟环境
source venv/bin/activate

# 启动服务
python -m uvicorn app.main:app --host 0.0.0.1 --port 8010 --reload
```

### 验证后端启动

```bash
# 检查健康状态
curl http://127.0.0.1:8010/health

# 预期输出:
# {"status":"healthy","version":"2.0.0"}
```

**后端服务地址**: http://127.0.0.1:8010

**API文档**: http://127.0.0.1:8010/docs

---

## 第三步: 启动前端应用

### 方式1: 开发模式 (推荐)

#### 启动Vite开发服务器
```bash
cd desktop-ai-assistant

# 启动前端开发服务器
npm run dev
# 或
pnpm dev
```

**前端开发服务器**: http://localhost:5173

#### 启动Electron应用
```bash
# 在另一个终端窗口
cd desktop-ai-assistant

# 启动Electron
npm run dev:main
```

### 方式2: 生产模式

```bash
# 构建前端
npm run build

# 启动Electron
npm run dist
```

---

## 第四步: 验证功能

### 4.1 测试后端API

```bash
cd desktop-ai-assistant

# 运行后端API测试
node scripts/test-ui-api-calls.js
```

**预期结果**: 所有测试通过 ✅

### 4.2 测试前端集成

```bash
# 运行前端集成测试
node scripts/test-frontend-integration.js
```

**预期结果**: 所有测试通过 ✅

### 4.3 手动测试

1. **打开应用**: Electron窗口应该自动打开
2. **测试AI对话**: 在对话框输入"你好",查看AI回复
3. **测试截图**: 点击"一键截图"按钮,截取屏幕
4. **测试识别**: 截图后点击"识别",查看识别结果

---

## 常见问题和解决方案

### 问题1: 后端启动失败

**症状**: `ModuleNotFoundError` 或 `ImportError`

**解决方案**:
```bash
cd backend-service
source venv/bin/activate
pip install -r requirements.txt
```

### 问题2: 前端无法连接后端

**症状**: `fetch failed` 或 `Network Error`

**解决方案**:
1. 检查后端是否运行: `curl http://127.0.0.1:8010/health`
2. 检查防火墙设置
3. 检查环境变量配置

### 问题3: API密钥错误

**症状**: `401 Unauthorized` 或 `Invalid API Key`

**解决方案**:
1. 检查`.env`文件中的API密钥是否正确
2. 确保API密钥有效且未过期
3. 重启后端服务使配置生效

### 问题4: Ollama本地模型不可用

**症状**: `404 Not Found` 或 `Connection refused`

**解决方案**:
```bash
# 启动Ollama服务
ollama serve

# 拉取模型
ollama pull qwen2.5:32b

# 验证模型
ollama list
```

### 问题5: 端口被占用

**症状**: `Address already in use`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -ti:8010  # 后端端口
lsof -ti:5173  # 前端端口

# 杀死进程
kill -9 <PID>

# 或修改端口
# 后端: 编辑 backend-service/.env 中的 PORT
# 前端: 编辑 vite.config.ts 中的 server.port
```

---

## 开发模式启动流程

### 完整开发环境

#### 终端1: 后端服务
```bash
cd desktop-ai-assistant/backend-service
source venv/bin/activate
./run.sh
```

#### 终端2: 前端开发服务器
```bash
cd desktop-ai-assistant
npm run dev
```

#### 终端3: Electron应用
```bash
cd desktop-ai-assistant
npm run dev:main
```

### 推荐的开发工具

1. **VS Code**: 代码编辑器
2. **Postman**: API测试
3. **Chrome DevTools**: 前端调试
4. **Electron DevTools**: Electron调试

---

## 生产模式部署

### 1. 构建应用

```bash
cd desktop-ai-assistant

# 构建前端和主进程
npm run build

# 打包Electron应用
npm run dist

# 或针对特定平台
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist:linux  # Linux
```

### 2. 部署后端

```bash
cd backend-service

# 使用生产级WSGI服务器
pip install gunicorn

# 启动服务
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8010
```

### 3. 配置反向代理 (可选)

**Nginx配置示例**:
```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 性能优化建议

### 后端优化

1. **使用缓存**: Redis缓存AI响应
2. **连接池**: 数据库连接池
3. **异步处理**: 使用Celery处理长时间任务
4. **负载均衡**: 多实例部署

### 前端优化

1. **代码分割**: 按需加载组件
2. **资源压缩**: 压缩图片和静态资源
3. **CDN加速**: 使用CDN加载第三方库
4. **缓存策略**: 合理设置缓存

---

## 监控和日志

### 后端日志

**日志位置**: `desktop-ai-assistant/logs/backend.log`

**查看日志**:
```bash
tail -f logs/backend.log
```

### 前端日志

**开发模式**: Chrome DevTools Console

**生产模式**: Electron日志
- macOS: `~/Library/Logs/desktop-ai-assistant/`
- Windows: `%APPDATA%\desktop-ai-assistant\logs\`
- Linux: `~/.config/desktop-ai-assistant/logs/`

---

## 测试和验证

### 自动化测试

```bash
# 后端API测试
cd desktop-ai-assistant
node scripts/test-ui-api-calls.js

# 前端集成测试
node scripts/test-frontend-integration.js

# E2E烟测
npm run smoke:frontend
```

### 手动测试清单

- [ ] 后端健康检查通过
- [ ] AI对话功能正常
- [ ] 视觉识别功能正常
- [ ] 语音识别功能正常
- [ ] 患者信息提取正常
- [ ] AI推荐功能正常
- [ ] 智能体平台连接正常
- [ ] 截图功能正常
- [ ] 设置保存正常

---

## 更新和维护

### 更新依赖

```bash
# 前端依赖
npm update

# 后端依赖
cd backend-service
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

### 数据库迁移

```bash
cd backend-service
source venv/bin/activate

# 创建迁移
alembic revision --autogenerate -m "description"

# 执行迁移
alembic upgrade head
```

---

## 相关文档

- [架构设计](./ARCHITECTURE_REFACTOR_PLAN.md)
- [API文档](http://127.0.0.1:8010/docs)
- [前端测试报告](./FRONTEND_TEST_FINAL_SUMMARY.md)
- [UI功能检查](./UI_FUNCTIONALITY_CHECK_SUMMARY.md)
- [E2E测试报告](./E2E_FINAL_VERIFICATION_REPORT.md)

---

## 技术支持

### 问题反馈
- GitHub Issues: https://github.com/charlieliu/medical-integration-platform/issues
- Email: lzhy9999@163.com

### 开发团队
- 项目负责人: Charlie Liu
- AI助手: Augment Agent

---

**最后更新**: 2025-10-15  
**版本**: 2.0.0

