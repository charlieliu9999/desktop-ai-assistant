# Desktop AI Assistant

一个基于 Electron 的桌面 AI 医疗助手，集成语音识别、桌面内容识别、医疗系统集成和 Bisheng 智能体平台。

## ✨ 主要功能

- 🎤 **语音交互** - 支持语音唤醒、实时语音识别和语音合成
- 🖥️ **桌面识别** - OCR 文字识别和桌面内容理解
- 🏥 **医疗集成** - 集成 RIS/PACS/HIS 系统，支持患者信息提取
- 🤖 **Bisheng 智能体** - 集成 Bisheng 智能体平台，支持 API 和 iframe 两种模式
- 🎨 **玻璃拟态主题** - 现代化的玻璃拟态 UI 设计
- 🌓 **深色模式** - 完整的深色/浅色主题支持

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

## 🔗 相关链接

- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Bisheng 平台](https://github.com/dataelement/bisheng)

---

**版本**: 1.0.0  
**最后更新**: 2024-01-08

