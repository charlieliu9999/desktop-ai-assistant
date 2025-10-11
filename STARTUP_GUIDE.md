# 桌面AI助手 - 启动指南

## 📋 目录

- [系统要求](#系统要求)
- [快速启动](#快速启动)
- [详细启动步骤](#详细启动步骤)
- [配置说明](#配置说明)
- [常见问题](#常见问题)
- [服务说明](#服务说明)

---

## 💻 系统要求

### 必需软件
- **Node.js** 18.0.0+ ([下载](https://nodejs.org/))
- **Python** 3.11+ ([下载](https://www.python.org/downloads/))
- **npm** 或 **pnpm**

### 可选软件
- **Tesseract OCR** - 用于文字识别 ([安装指南](https://github.com/tesseract-ocr/tesseract))
- **Ollama** - 用于本地AI模型 ([下载](https://ollama.ai/))
- **Bisheng** - 用于智能体功能

---

## 🚀 快速启动

### 一键启动（推荐）

```bash
# 1. 进入项目目录
cd desktop-ai-assistant

# 2. 首次运行：安装依赖
npm install
cd backend-service && pip install -r requirements.txt && cd ..

# 3. 配置环境变量（首次运行）
cp backend-service/.env.example backend-service/.env
# 编辑 backend-service/.env 文件，填入必要的API密钥

# 4. 启动应用
chmod +x start-app.sh
./start-app.sh
```

启动脚本会自动：
- ✅ 启动后端服务 (FastAPI on port 8010)
- ✅ 启动前端开发服务器 (Vite on port 5928)
- ✅ 启动Electron应用
- ✅ 进行健康检查
- ✅ 显示运行状态

---

## 📝 详细启动步骤

### 方法1: 使用启动脚本（推荐）

启动脚本 `start-app.sh` 会自动完成所有启动步骤。

**日志文件位置**:
- 后端日志: `/tmp/desktop-ai-assistant/backend.log`
- Vite日志: `/tmp/desktop-ai-assistant/vite.log`
- Electron日志: `/tmp/desktop-ai-assistant/electron.log`

**停止应用**:
- 按 `Ctrl+C` 停止所有服务

### 方法2: 手动启动

如果需要分别启动各个服务进行调试：

#### 步骤1: 启动后端服务

```bash
cd backend-service

# 方式A: 使用虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.main

# 方式B: 使用Conda环境
conda activate deer-flow-env
pip install -r requirements.txt
python -m app.main

# 方式C: 直接使用系统Python
pip install -r requirements.txt
python -m app.main
```

**验证后端服务**:
```bash
# 健康检查
curl http://localhost:8010/health

# 查看API文档
open http://localhost:8010/docs
```

#### 步骤2: 启动前端开发服务器

```bash
# 在项目根目录（新终端）
cd desktop-ai-assistant

# 安装依赖（首次运行）
npm install

# 启动Vite开发服务器
npm run dev:renderer
```

**验证Vite服务器**:
```bash
curl http://localhost:5928
```

#### 步骤3: 启动Electron应用

```bash
# 在项目根目录（新终端）
cd desktop-ai-assistant

# 启动Electron
npm run dev
```

---

## ⚙️ 配置说明

### 后端配置文件: `backend-service/.env`

```bash
# ============================================================================
# AI服务配置
# ============================================================================

# OpenAI配置
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# Deepseek配置（国产大模型）
DEEPSEEK_API_KEY=your-deepseek-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# Ollama配置（本地AI模型）
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# ============================================================================
# 智能体平台配置
# ============================================================================

# Bisheng配置
BISHENG_ENABLED=true
BISHENG_BASE_URL=http://localhost:7860
BISHENG_USERNAME=your_username
BISHENG_PASSWORD=your_password
BISHENG_DEFAULT_MODE=api  # api 或 iframe

# ============================================================================
# 服务配置
# ============================================================================

# 后端服务端口
PORT=8010

# 日志级别
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR

# CORS配置
CORS_ORIGINS=["http://localhost:5928", "http://127.0.0.1:5928"]
```

### 前端配置: `src/services/adapters/feature-flags.ts`

```typescript
export const FEATURE_FLAGS = {
  // 是否使用后端API（false则使用legacy实现）
  USE_BACKEND_AI: false,      // AI对话服务
  USE_BACKEND_OCR: false,     // OCR文字识别
  USE_BACKEND_VISION: false,  // 图像理解
  USE_BACKEND_STT: false,     // 语音转文字
  USE_BACKEND_TTS: false,     // 文字转语音
  USE_BACKEND_AGENT: false,   // 智能体服务
} as const;
```

**注意**: 
- 设置为 `true` 时使用后端API
- 设置为 `false` 时使用前端legacy实现
- 建议逐步启用，先测试后再切换

---

## 🔍 服务说明

### 后端服务 (FastAPI)

**端口**: 8010  
**URL**: http://localhost:8010

**主要端点**:
- `GET /health` - 健康检查
- `GET /docs` - Swagger API文档
- `GET /redoc` - ReDoc API文档

**AI服务**:
- `POST /v1/ai/chat` - AI对话
- `POST /v1/ai/chat/stream` - 流式对话
- `POST /v1/ai/analyze` - 内容分析
- `GET /v1/ai/providers` - 获取提供商列表

**视觉服务**:
- `POST /v1/vision/ocr` - OCR文字识别
- `POST /v1/vision/understand` - 图像理解
- `POST /v1/vision/analyze-medical` - 医疗影像分析

**语音服务**:
- `POST /v1/voice/stt` - 语音转文字
- `POST /v1/voice/tts` - 文字转语音

**智能体服务**:
- `POST /v1/agent/login` - 登录
- `GET /v1/agent/workflows` - 获取工作流
- `POST /v1/agent/invoke` - 调用智能体
- `POST /v1/agent/stop` - 停止智能体

### 前端服务 (Vite)

**端口**: 5928  
**URL**: http://localhost:5928

**功能**:
- React组件热更新
- TypeScript编译
- Tailwind CSS处理
- 静态资源服务

### Electron应用

**窗口**:
- 主窗口 - 主要交互界面
- 浮动窗口 - 快速访问界面

**快捷键**:
- `Cmd+Shift+A` (Mac) / `Ctrl+Shift+A` (Win) - 显示/隐藏主窗口
- `Cmd+Shift+F` (Mac) / `Ctrl+Shift+F` (Win) - 显示/隐藏浮动窗口
- `Cmd+Shift+Space` - 语音识别
- `Cmd+Shift+D` - 桌面内容识别
- `Cmd+Shift+S` - 截图
- `Cmd+Shift+Q` - 退出应用

---

## ❓ 常见问题

### 1. 启动失败怎么办？

**查看日志**:
```bash
# 后端日志
tail -f /tmp/desktop-ai-assistant/backend.log

# Vite日志
tail -f /tmp/desktop-ai-assistant/vite.log

# Electron日志
tail -f /tmp/desktop-ai-assistant/electron.log
```

### 2. 端口被占用

```bash
# 查看占用端口的进程
lsof -i :8010  # 后端端口
lsof -i :5928  # Vite端口

# 杀死进程
kill -9 <PID>

# 或使用启动脚本自动清理
./start-app.sh  # 会自动清理端口
```

### 3. Python依赖安装失败

```bash
# 使用国内镜像
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 或使用清华镜像
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
```

### 4. Electron窗口不显示

- 检查终端是否有错误信息
- 尝试使用快捷键: `Cmd+Shift+A` 或 `Cmd+Shift+F`
- 查看Electron日志: `tail -f /tmp/desktop-ai-assistant/electron.log`
- 重启应用

### 5. 后端服务启动失败

**常见原因**:
- Python版本不兼容（需要3.11+）
- 缺少依赖包
- 端口被占用
- 环境变量未配置

**解决方法**:
```bash
# 检查Python版本
python --version

# 重新安装依赖
cd backend-service
pip install -r requirements.txt --force-reinstall

# 检查环境变量
cat .env

# 手动启动查看错误
python -m app.main
```

### 6. 前端编译错误

```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm install

# 清理Vite缓存
rm -rf .vite

# 重新启动
npm run dev:renderer
```

---

## 🎯 验证启动成功

### 检查清单

- [ ] 后端服务运行在 http://localhost:8010
- [ ] 后端健康检查通过: `curl http://localhost:8010/health`
- [ ] Vite服务器运行在 http://localhost:5928
- [ ] Electron主窗口已显示
- [ ] Electron浮动窗口已显示
- [ ] 系统托盘图标已显示
- [ ] 快捷键可以正常使用

### 测试功能

```bash
# 测试AI服务
curl -X POST http://localhost:8010/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'

# 测试健康检查
curl http://localhost:8010/v1/ai/health
curl http://localhost:8010/v1/vision/health
curl http://localhost:8010/v1/voice/health
curl http://localhost:8010/v1/agent/health
```

---

## 📞 获取帮助

如果遇到问题：

1. 查看日志文件
2. 查看 [常见问题](#常见问题)
3. 查看 [API文档](http://localhost:8010/docs)
4. 提交 [GitHub Issue](https://github.com/your-repo/issues)

---

**祝您使用愉快！** 🎉

