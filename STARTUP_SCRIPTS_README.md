# 桌面AI助手 - 启动脚本使用指南

本文档介绍如何使用全栈启动和停止脚本来管理桌面AI助手应用。

---

## 📋 目录

- [脚本概述](#脚本概述)
- [快速开始](#快速开始)
- [启动脚本详解](#启动脚本详解)
- [停止脚本详解](#停止脚本详解)
- [常见使用场景](#常见使用场景)
- [故障排除](#故障排除)

---

## 脚本概述

### 可用脚本

| 脚本 | 功能 | 版本 |
|------|------|------|
| `start-full-stack.sh` | 一键启动完整应用栈（后端 + 前端） | v4.0 |
| `stop-full-stack.sh` | 停止所有服务 | v4.0 |
| `start-app.sh` | 旧版启动脚本（保留兼容） | v3.0 |

### 主要特性

✅ **智能端口管理** - 自动检测和清理端口占用  
✅ **完整环境检查** - 验证 Python、Node.js、依赖等  
✅ **服务依赖检查** - 检查 Ollama、Bisheng、PostgreSQL  
✅ **健康检查** - 等待服务完全就绪后再继续  
✅ **优雅错误处理** - 详细的错误信息和解决建议  
✅ **灵活的命令行参数** - 支持多种启动模式  
✅ **彩色日志输出** - 清晰的状态指示  

---

## 快速开始

### 1. 启动完整应用

```bash
./start-full-stack.sh
```

这将：
1. 检查端口占用（8010, 5928）
2. 验证环境（Python, Node.js, 依赖）
3. 检查服务依赖（Ollama, Bisheng, PostgreSQL）
4. 启动后端服务（FastAPI on port 8010）
5. 启动前端应用（Electron）
6. 显示启动信息和日志位置

### 2. 停止所有服务

```bash
./stop-full-stack.sh
```

或者按 `Ctrl+C` 在启动脚本中优雅退出。

---

## 启动脚本详解

### 基本用法

```bash
./start-full-stack.sh [选项]
```

### 命令行选项

| 选项 | 说明 | 使用场景 |
|------|------|----------|
| `--skip-checks` | 跳过环境检查 | 环境已验证，快速启动 |
| `--backend-only` | 仅启动后端服务 | 前端开发调试 |
| `--frontend-only` | 仅启动前端应用 | 后端已运行，只需前端 |
| `--auto-kill` | 自动清理占用端口的进程 | 端口被占用时自动处理 |
| `--clean` | 启动前清理所有相关进程 | 完全重启 |
| `--help` | 显示帮助信息 | 查看所有选项 |

### 启动流程

```
[1/6] 检查端口占用
  ✓ 端口 8010 可用
  ✓ 端口 5928 可用

[2/6] 检查环境
  ✓ Python: 3.11.5
  ✓ Node.js: v18.17.0
  ✓ .env 配置文件存在
  ✓ API Keys 已配置
  ✓ node_modules 已存在

[3/6] 检查服务依赖
  ✓ Ollama 服务运行中 (21 个模型可用)
  ⚠ Bisheng 服务未运行 (可选)
  ⚠ PostgreSQL 未运行 (非必需)

[4/6] 启动后端服务
  ✓ 后端进程已启动 (PID: 12345)
  ✓ 后端服务已就绪！
  ✓ 后端版本: 2.0.0
  ✓ AI 提供商: ["openai","deepseek"]

[5/6] 启动前端应用
  ✓ 前端进程已启动 (PID: 12346)
  ✓ 前端应用已启动

[6/6] 启动完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ 应用启动成功！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 服务状态:
  ● 后端 API: http://localhost:8010
  ● API 文档: http://localhost:8010/docs
  ● 健康检查: http://localhost:8010/health
  ● 后端 PID: 12345
  ● 前端应用: Electron 窗口已打开
  ● 前端 PID: 12346

📋 日志文件:
  ● 后端: /tmp/desktop-ai-assistant/backend.log
  ● 前端: /tmp/desktop-ai-assistant/frontend.log
  ● 启动: /tmp/desktop-ai-assistant/startup.log

💡 提示:
  ● 按 Ctrl+C 停止所有服务
  ● 查看后端日志: tail -f /tmp/desktop-ai-assistant/backend.log
  ● 快捷键: Cmd+Shift+A (主窗口), Cmd+Shift+F (浮动窗口)
```

### 端口占用处理

如果端口被占用，脚本会提示：

```
⚠  端口 8010 被占用 (PID: 12345)

发现端口占用，请选择操作：
  1) 自动清理（kill 占用进程）
  2) 手动处理（显示进程信息）
  3) 退出脚本
请选择 [1-3]:
```

或使用 `--auto-kill` 参数自动清理：

```bash
./start-full-stack.sh --auto-kill
```

---

## 停止脚本详解

### 基本用法

```bash
./stop-full-stack.sh [选项]
```

### 命令行选项

| 选项 | 说明 |
|------|------|
| `--backend-only` | 仅停止后端服务 |
| `--frontend-only` | 仅停止前端应用 |
| `--clean-logs` | 同时清理日志文件 |
| `--force` | 强制停止（使用 kill -9） |
| `--help` | 显示帮助信息 |

### 停止流程

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       🛑 桌面AI助手 - 全栈停止脚本 v4.0 🛑
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ  停止后端服务 (PID: 12345)...
✓  后端服务已停止
ℹ  停止前端应用 (PID: 12346)...
✓  前端应用已停止

✓  所有服务已停止
```

---

## 常见使用场景

### 场景 1: 完整开发环境启动

```bash
# 启动完整应用栈
./start-full-stack.sh

# 开发完成后停止
./stop-full-stack.sh
```

### 场景 2: 仅开发后端

```bash
# 启动后端服务
./start-full-stack.sh --backend-only

# 测试 API
curl http://localhost:8010/health

# 停止后端
./stop-full-stack.sh --backend-only
```

### 场景 3: 前端开发（后端已运行）

```bash
# 假设后端已在其他终端运行
./start-full-stack.sh --frontend-only

# 停止前端
./stop-full-stack.sh --frontend-only
```

### 场景 4: 快速重启

```bash
# 停止所有服务
./stop-full-stack.sh

# 清理模式重新启动
./start-full-stack.sh --clean --auto-kill
```

### 场景 5: 跳过检查快速启动

```bash
# 环境已验证，快速启动
./start-full-stack.sh --skip-checks --auto-kill
```

---

## 故障排除

### 问题 1: 端口被占用

**症状**:
```
⚠  端口 8010 被占用 (PID: 12345)
```

**解决方案**:
```bash
# 方案 1: 使用自动清理
./start-full-stack.sh --auto-kill

# 方案 2: 手动清理
lsof -i :8010
kill -9 <PID>

# 方案 3: 使用停止脚本
./stop-full-stack.sh --force
```

### 问题 2: Python 环境未找到

**症状**:
```
✗  未找到 Python。请安装 Python 3.11+
```

**解决方案**:
```bash
# 检查 Python 安装
python3 --version

# 或使用 Conda 环境
conda activate deer-flow-env

# 或创建虚拟环境
cd backend-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 问题 3: node_modules 不存在

**症状**:
```
⚠  node_modules 不存在
ℹ  正在安装依赖...
```

**解决方案**:
脚本会自动安装依赖。如果失败，手动安装：

```bash
# 使用 npm
npm install

# 或使用 pnpm
pnpm install
```

### 问题 4: 后端服务启动失败

**症状**:
```
✗  后端进程意外退出
ℹ  查看日志: tail -50 /tmp/desktop-ai-assistant/backend.log
```

**解决方案**:
```bash
# 查看详细日志
tail -100 /tmp/desktop-ai-assistant/backend.log

# 检查 .env 配置
cat backend-service/.env

# 检查 API Keys
grep "API_KEY" backend-service/.env

# 手动启动后端调试
cd backend-service
python -m app.main
```

### 问题 5: Ollama 服务未运行

**症状**:
```
⚠  Ollama 服务未运行 (可选，但推荐启动)
```

**解决方案**:
```bash
# 启动 Ollama
ollama serve

# 验证 Ollama
curl http://localhost:11434/api/tags
```

### 问题 6: 前端应用无法连接后端

**症状**:
前端应用启动但无法调用后端 API

**解决方案**:
```bash
# 检查后端健康状态
curl http://localhost:8010/health

# 检查后端日志
tail -f /tmp/desktop-ai-assistant/backend.log

# 检查前端日志
tail -f /tmp/desktop-ai-assistant/frontend.log

# 重启后端
./stop-full-stack.sh --backend-only
./start-full-stack.sh --backend-only
```

---

## 日志文件位置

所有日志文件存储在 `/tmp/desktop-ai-assistant/`:

| 文件 | 内容 |
|------|------|
| `backend.log` | 后端服务日志 |
| `frontend.log` | 前端应用日志 |
| `startup.log` | 启动脚本日志 |
| `pids/backend.pid` | 后端进程 PID |
| `pids/frontend.pid` | 前端进程 PID |

### 查看实时日志

```bash
# 后端日志
tail -f /tmp/desktop-ai-assistant/backend.log

# 前端日志
tail -f /tmp/desktop-ai-assistant/frontend.log

# 启动日志
tail -f /tmp/desktop-ai-assistant/startup.log
```

---

## 最佳实践

1. **首次启动**: 不使用任何参数，让脚本完整检查环境
   ```bash
   ./start-full-stack.sh
   ```

2. **日常开发**: 使用 `--auto-kill` 避免端口冲突
   ```bash
   ./start-full-stack.sh --auto-kill
   ```

3. **调试后端**: 仅启动后端，查看详细日志
   ```bash
   ./start-full-stack.sh --backend-only
   tail -f /tmp/desktop-ai-assistant/backend.log
   ```

4. **完全重启**: 使用 `--clean` 清理所有进程
   ```bash
   ./stop-full-stack.sh --force --clean-logs
   ./start-full-stack.sh --clean --auto-kill
   ```

5. **生产部署**: 跳过检查，快速启动
   ```bash
   ./start-full-stack.sh --skip-checks --auto-kill
   ```

---

## 与旧版脚本对比

| 特性 | start-app.sh (v3.0) | start-full-stack.sh (v4.0) |
|------|---------------------|----------------------------|
| 端口检查 | ✅ | ✅ 更智能 |
| 环境检查 | ✅ 基础 | ✅ 完整 |
| 服务依赖检查 | ❌ | ✅ |
| 命令行参数 | ❌ | ✅ 6个选项 |
| 错误处理 | ✅ 基础 | ✅ 详细 |
| 日志管理 | ✅ | ✅ 更完善 |
| 停止脚本 | ❌ | ✅ |
| PID 管理 | ❌ | ✅ |

---

**创建日期**: 2025-10-11  
**版本**: 4.0  
**维护者**: AI Assistant

