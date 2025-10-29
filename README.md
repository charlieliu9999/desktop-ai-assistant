# 桌面AI助手 (Desktop AI Assistant)

<div align="center">

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)

**一款功能强大的桌面AI助手，集成语音识别、OCR文字识别、医疗影像分析等功能**

[快速开始](#-快速开始) • [功能特性](#-功能特性) • [架构说明](#-架构说明) • [开发指南](#-开发指南)

</div>

---

## 📋 目录

- [项目简介](#-项目简介)
- [功能特性](#-功能特性)
- [技术栈](#️-技术栈)
- [系统要求](#-系统要求)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [配置说明](#️-配置说明)
- [开发指南](#-开发指南)
- [API文档](#-api文档)
- [快捷键](#️-快捷键)
- [常见问题](#-常见问题)
 - [代码规范](#-代码规范)

---

## 🎯 项目简介

桌面AI助手是一款基于Electron + FastAPI架构的智能桌面应用，旨在为医疗专业人员提供AI驱动的辅助工具。

### 核心能力

- 🤖 **AI对话**: 支持多种AI模型（OpenAI、Deepseek、Ollama）
- 🎤 **语音交互**: 实时语音识别和语音合成
- 👁️ **视觉识别**: OCR文字识别、图像理解、医疗影像分析
- 🏥 **医疗集成**: 与RIS/PACS/HIS系统集成
- 🤝 **智能体平台**: 集成Bisheng等智能体平台
- 🖥️ **桌面识别**: 自动识别屏幕内容并提取信息

---

## ✨ 功能特性

### 1. AI对话服务
- ✅ 多AI提供商支持（OpenAI、Deepseek、Ollama）
- ✅ 自动故障转移机制
- ✅ 流式响应（SSE）
- ✅ 内容分析和JSON提取

### 2. 视觉服务
- ✅ OCR文字识别（Tesseract）
- ✅ 图像理解和分析
- ✅ 医疗影像分析
- ✅ 多语言支持

### 3. 语音服务
- ✅ 语音转文字（Whisper）
- ✅ 文字转语音（TTS）
- ✅ 连续语音识别
- ✅ 热词唤醒（"小助手"）

### 4. 智能体集成
- ✅ Bisheng平台集成
- ✅ 工作流管理
- ✅ 智能体调用和停止
- ✅ 健康检查

### 5. 桌面功能
- ✅ 主窗口 + 浮动窗口
- ✅ 系统托盘
- ✅ 全局快捷键
- ✅ 屏幕截图和识别

---

## 🛠️ 技术栈

### 后端
- **FastAPI** - Python Web框架
- **Python 3.11+** - 编程语言
- **Pydantic** - 数据验证
- **AsyncOpenAI** - AI客户端
- **Tesseract** - OCR引擎
- **Whisper** - 语音识别

### 前端
- **Electron 28** - 桌面应用框架
- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Zustand** - 状态管理

### AI服务
- **OpenAI API** - GPT模型
- **Deepseek API** - 国产大模型
- **Ollama** - 本地AI模型
- **Bisheng** - 智能体平台

---

## 💻 系统要求

### 必需
- **Node.js** 18.0.0 或更高版本
- **Python** 3.11 或更高版本
- **npm** 或 **pnpm**
- **macOS** 10.15+ / **Windows** 10+ / **Linux**

### 可选
- **Tesseract OCR** - 用于文字识别
- **Ollama** - 用于本地AI模型
- **Bisheng** - 用于智能体功能

---

## 🚀 快速开始

### 方法1: 使用启动脚本（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd desktop-ai-assistant

# 2. 安装依赖
npm install
cd backend-service && pip install -r requirements.txt && cd ..

# 3. 配置环境变量
cp backend-service/.env.example backend-service/.env
# 编辑 .env 文件，填入API密钥

# 4. 启动应用（一键启动所有服务）
chmod +x start-app.sh
./start-app.sh
```

### 方法2: 手动启动

#### 步骤1: 启动后端服务

```bash
cd backend-service

# 使用虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python -m app.main
```

---

## 🧰 代码规范

为保证代码一致性和可维护性，请遵循项目级规范：

- 结构/命名/模块边界/风格/提交规范：`openspec/specs/code-standards/spec.md`
- 关键约定（摘要）：
  - TS 文件 `camelCase.ts(x)`；React 组件/类型 `PascalCase`；CSS `kebab-case.css`
  - 适配器优先：新集成放在 `src/services/adapters/*`，禁止扩展 `legacy/*`
  - 后端 v2 API 使用统一 `{success,data?,error?,meta}` 封装；严禁硬编码/回退
  - 前端仅经 preload / IPC 使用 Electron API
  - 提交使用 Conventional Commits；PR 包含变更说明与验证步骤

后端服务将运行在 `http://localhost:8010`

#### 步骤2: 启动前端应用

```bash
# 在项目根目录
npm install

# 启动开发服务器
npm run dev:renderer

# 在另一个终端启动Electron
npm run dev
```

## 📁 项目结构

```
desktop-ai-assistant/
├── src/                           # 源代码
│   ├── main/                     # Electron 主进程
│   │   ├── main.ts              # 主进程入口
│   │   ├── window-manager.ts    # 窗口管理
│   │   └── preload.ts           # Preload 脚本
│   ├── renderer/                 # 渲染进程（React）
│   │   ├── pages/               # 页面组件
│   │   ├── components/          # UI 组件
│   │   ├── stores/              # 状态管理
│   │   └── index.tsx            # 渲染进程入口
│   ├── services/                 # 服务层
│   │   ├── voice.ts             # 语音服务
│   │   ├── ocr.ts               # OCR 服务
│   │   └── medical.ts           # 医疗服务
│   └── shared/                   # 共享代码
│       └── types.ts             # 类型定义
├── bisheng-integration/          # Bisheng 智能体集成
│   ├── components/              # UI 组件
│   ├── services/                # 服务层
│   ├── store/                   # 状态管理
│   └── docs/                    # 文档
├── backend-service/              # FastAPI 后端服务
│   ├── app/                     # 应用代码
│   ├── run.sh                   # 启动脚本
│   └── README.md                # 后端文档
├── docs/                         # 项目文档
│   ├── README.md                # 文档索引
│   ├── architecture.md          # 架构设计
│   ├── requirements.md          # 需求文档
│   └── archive/                 # 归档文档
├── config/                       # 配置文件
├── assets/                       # 静态资源
├── tests/                        # 测试文件
├── scripts/                      # 脚本文件
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts               # Vite 配置
├── tailwind.config.js           # Tailwind CSS 配置
├── .env.example                 # 环境变量示例
└── start-app.sh                 # 启动脚本
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- Python >= 3.9 (用于后端服务)
- macOS / Windows / Linux

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖（可选）
cd backend-service
pip install -r requirements.txt
```

### 开发模式

```bash
# 启动开发服务器
npm run dev

# 启动后端服务（可选）
cd backend-service
./run.sh
```

### 环境变量配置

复制 `.env.example` 为 `.env` 并根据需要修改：

```bash
cp .env.example .env
```

**重要配置**:
- `AUTO_OPEN_DEVTOOLS=false` - 是否自动打开开发者工具（默认关闭）

### 构建

```bash
# 构建应用
npm run build

# 打包分发
npm run dist
```

## 🎨 主题系统

项目使用玻璃拟态（Glassmorphism）主题设计，支持深色/浅色模式。

### 玻璃效果类

在 `tailwind.config.js` 中定义：

```css
.glass {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.glass-dark {
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}
```

### 使用示例

```tsx
<div className="glass dark:glass-dark">
  玻璃效果容器
</div>
```

## 🤖 Bisheng 智能体集成

项目集成了 Bisheng 智能体平台，支持两种模式：

### API 模式
- 自定义聊天界面
- 完全控制 UI 和交互
- 支持流式响应

### iframe 模式
- 嵌入 Bisheng 原生 Web UI
- 快速集成
- 保持原生体验

详细文档请查看 `bisheng-integration/docs/`

## 📚 文档

- **架构设计**: `docs/architecture.md`
- **需求文档**: `docs/requirements.md`
- **Bisheng 集成**: `bisheng-integration/docs/`
- **后端服务**: `backend-service/README.md`
- **语音识别**: `docs/VOICE_RECOGNITION_SETUP.md`
- **Web 搜索**: `docs/WEB_SEARCH_SETUP.md`

## 🛠️ 开发指南

### 快捷键

开发模式下可用的快捷键：

- `Ctrl+Shift+I` / `F12` - 打开开发者工具
- `Ctrl+R` - 重新加载窗口
- `Ctrl+,` - 打开设置

### 调试

1. **主进程调试**: 查看终端输出
2. **渲染进程调试**: 使用开发者工具（Ctrl+Shift+I）
3. **日志文件**: `logs/` 目录

### 代码规范

- TypeScript 严格模式
- ESLint + Prettier
- 使用 Tailwind CSS 进行样式开发
- 组件使用 PascalCase 命名
- 文件使用 camelCase 命名

## 🧪 测试

```bash
# 运行测试
npm test

# 运行测试（带 UI）
npm run test:ui

# 测试覆盖率
npm run test:coverage
```

## 📦 打包分发

```bash
# macOS
npm run dist:mac

# Windows
npm run dist:win

# Linux
npm run dist:linux
```

## 🔧 故障排查

### 常见问题

1. **开发者工具自动打开**
   - 设置环境变量 `AUTO_OPEN_DEVTOOLS=false`
   - 或手动使用 `Ctrl+Shift+I` 打开

2. **语音识别不工作**
   - 检查麦克风权限
   - 查看 `docs/VOICE_RECOGNITION_SETUP.md`

3. **Bisheng 连接失败**
   - 检查 Bisheng 服务是否运行
   - 验证配置中的 baseUrl
   - 查看 `bisheng-integration/docs/`

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 📚 文档索引

### 核心文档
- **[README.md](README.md)** - 项目主文档（本文件）
- **[QUICK_START.md](QUICK_START.md)** - 快速开始指南
- **[README_API.md](README_API.md)** - API文档
- **[AGENTS.md](AGENTS.md)** - AI Agent开发指南

### 详细文档
- **[docs/](docs/)** - 详细技术文档目录
  - [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) - 设计系统规范
  - [GLASS_STYLE_GUIDE.md](docs/GLASS_STYLE_GUIDE.md) - 玻璃效果样式指南
  - [PROJECT_STARTUP_GUIDE.md](docs/PROJECT_STARTUP_GUIDE.md) - 项目启动指南
  - 更多文档请查看 [docs/](docs/) 目录

### OpenSpec变更提案
- **[openspec/](openspec/)** - 项目变更提案和规范
  - [openspec/AGENTS.md](openspec/AGENTS.md) - OpenSpec工作流程说明
  - [openspec/changes/](openspec/changes/) - 所有变更提案

### 归档文档
- **[docs/archive/](docs/archive/)** - 历史文档归档
  - [2025-01归档](docs/archive/2025-01/) - 2025年1月之前的分析和改进文档

## 🔗 相关链接

- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Bisheng 平台](https://github.com/dataelement/bisheng)

---

**版本**: 3.0.0
**最后更新**: 2025-10-26
