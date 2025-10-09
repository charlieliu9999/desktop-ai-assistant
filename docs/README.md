# Desktop AI Assistant

## 项目概述

Desktop AI Assistant 是一款基于"不打扰、隐身、谁叫谁出"设计理念的智能桌面助手。该项目旨在创建一个能够识别桌面内容并做出智能反应的AI助手，与医疗集成系统(medical-integration-system)深度集成，为医疗工作者提供无缝的智能辅助体验。

## 核心设计理念

### 🔇 不打扰 (Non-intrusive)
- 默认隐身运行，不占用屏幕空间
- 智能判断用户工作状态，避免不必要的打扰
- 渐进式信息展示，避免信息过载

### 👻 隐身 (Invisible)
- 系统托盘运行，界面最小化
- 浮动窗口透明度可调
- 快速隐藏/显示机制

### 📢 谁叫谁出 (On-demand)
- 语音唤醒："Hey Assistant"
- 快捷键激活：可自定义组合键
- 上下文感知：智能识别当前工作场景

### 🧠 智能 (Intelligent)
- 桌面内容识别(OCR + 可访问性API)
- 上下文理解和记忆
- 个性化学习和适应

### 💬 对话式任务完成 (Conversational Task Completion)
- 自然语言交互
- 多轮对话支持
- 任务执行和反馈

## 核心功能特性

### 🎯 桌面内容识别
- **OCR文字识别**：识别屏幕上的文字内容
- **窗口信息获取**：获取当前活动窗口、URL、应用信息
- **可访问性API**：深度集成系统可访问性接口
- **剪贴板监控**：智能分析复制内容

### 🎤 语音交互
- **语音唤醒**：本地语音激活检测
- **语音识别**：支持多语言语音转文字
- **语音合成**：自然的语音反馈
- **意图理解**：智能解析用户指令

### 🔗 医疗系统集成
- **RIS系统集成**：放射信息系统数据获取
- **PACS图像处理**：医学影像智能分析
- **报告生成辅助**：智能报告模板和建议
- **患者信息查询**：快速患者数据检索

### 🤖 Bisheng 智能体集成 (NEW!)
- **双模式支持**：API 模式和 iframe 模式自由切换
- **智能体对话**：与 Bisheng 平台的智能体进行流式对话
- **工作流管理**：浏览和选择可用的智能体工作流
- **统一认证**：用户名/密码登录,自动 Token 管理
- **无缝集成**：保持应用统一风格和用户体验

### 🛡️ 隐私与安全
- **本地优先处理**：敏感数据本地处理
- **数据脱敏**：云端LLM调用时数据匿名化
- **权限管理**：细粒度权限控制
- **审计日志**：完整的操作记录

## 技术栈

### 前端技术
- **Electron**: 跨平台桌面应用框架
- **React 18**: 用户界面构建
- **TypeScript**: 类型安全的JavaScript
- **Tailwind CSS**: 实用优先的CSS框架

### 后端集成
- **Node.js**: 服务端运行时
- **WebSocket**: 实时通信
- **REST API**: HTTP接口调用

### AI/ML技术
- **Tesseract.js**: OCR文字识别
- **Web Speech API**: 语音识别和合成
- **OpenAI API**: 大语言模型集成
- **本地Whisper**: 离线语音处理

### 系统集成
- **macOS Accessibility API**: 系统可访问性接口
- **RobotJS**: 系统自动化操作
- **Electron Store**: 本地数据存储

## 项目结构

```
desktop-ai-assistant/
├── src/                    # 源代码目录
│   ├── main/              # Electron主进程
│   ├── renderer/          # 渲染进程(React UI)
│   ├── services/          # 核心服务模块
│   ├── utils/             # 工具函数
│   └── types/             # TypeScript类型定义
├── docs/                  # 项目文档
├── tests/                 # 测试文件
├── config/                # 配置文件
├── scripts/               # 构建脚本
├── assets/                # 静态资源
└── dist/                  # 构建输出
```

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 8.0.0 或 pnpm >= 7.0.0
- macOS 10.15+ (当前版本)

### 安装依赖
```bash
cd desktop-ai-assistant
npm install
# 或
pnpm install
```

### 开发模式
```bash
npm run dev
```

### 构建应用
```bash
# 构建所有平台
npm run build

# 构建特定平台
npm run build:mac
npm run build:win
npm run build:linux
```

### 运行测试
```bash
npm test
npm run test:watch
```

## 开发状态

当前项目处于**功能完善阶段**，主要进展：

- ✅ 项目结构搭建
- ✅ 核心功能原型开发
- ✅ UI设计稿制作
- ✅ 技术可行性验证
- ✅ Bisheng 智能体集成 (v1.0.0)
- 🔄 性能优化和测试
- ⏳ 生产环境部署

## Bisheng 智能体功能

### 快速开始

1. **配置 Bisheng 服务**
   - 打开应用设置
   - 找到"智能体设置"
   - 填写 Bisheng 服务器地址和认证信息
   - 选择交互模式 (API 或 iframe)

2. **使用智能体**
   - 点击"智能体"标签页
   - 选择一个智能体
   - 开始对话

### 详细文档

- [完整集成指南](./BISHENG_AGENT_INTEGRATION.md)
- [快速开始指南](./BISHENG_QUICKSTART.md)
- [测试清单](./BISHENG_TEST_CHECKLIST.md)
- [实施报告](../BISHENG_IMPLEMENTATION_REPORT.md)

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目维护者：Desktop AI Assistant Team
- 问题反馈：[GitHub Issues](https://github.com/your-org/desktop-ai-assistant/issues)

---

**注意**: 本项目仍在积极开发中，API和功能可能会发生变化。建议在生产环境使用前进行充分测试。