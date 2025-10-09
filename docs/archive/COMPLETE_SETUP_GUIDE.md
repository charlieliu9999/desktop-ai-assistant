# 桌面 AI 助手完整设置指南

## 问题修复总结

### ✅ 已修复的问题

1. **Bisheng 服务未初始化错误**
   - 修改了服务初始化逻辑,现在即使未启用也会创建服务实例
   - 更新了配置更新逻辑,支持动态启用/禁用服务

2. **连接状态显示**
   - 添加了 `BishengStatusIndicator` 组件
   - 在设置面板中显示实时连接状态
   - 支持自动刷新和手动刷新

3. **服务启动脚本**
   - 创建了 `start-all-services.sh` 一键启动脚本
   - 创建了 `stop-all-services.sh` 停止服务脚本
   - 支持端口检测和自动处理

4. **端口冲突处理**
   - 脚本自动检测端口占用
   - 提供交互式选项杀死占用进程
   - 支持优雅的服务重启

## 快速开始

### 步骤 1: 启动所有服务

```bash
cd desktop-ai-assistant

# 给脚本添加执行权限
chmod +x start-all-services.sh stop-all-services.sh

# 启动所有服务
./start-all-services.sh
```

脚本会自动:
- ✅ 检查并启动 Bisheng 服务 (Docker)
- ✅ 检查并启动桌面助手后端服务
- ✅ 检测端口冲突并提供解决方案
- ✅ 显示所有服务的状态

### 步骤 2: 启动桌面应用

在新终端中运行:

```bash
cd desktop-ai-assistant
npm run dev
```

### 步骤 3: 配置 Bisheng 服务

1. 打开桌面助手应用
2. 点击右上角的设置图标 ⚙️
3. 选择 "智能体设置"
4. 查看顶部的**连接状态指示器**
5. 填写配置信息:

```
✓ 启用智能体服务: [勾选]
API 地址: http://localhost:7860
前端地址: http://localhost:3001
用户名: lzhy9999@163.com
密码: Moto@9999
```

6. 点击 "测试登录" 验证连接
7. 点击 "完整测试" 运行所有测试
8. 点击 "保存配置"

### 步骤 4: 使用智能体功能

1. 导航到 "智能体服务" 页面
2. 查看工作流列表
3. 选择一个工作流
4. 开始与 AI 对话

## 详细说明

### 服务架构

```
┌─────────────────────────────────────────┐
│         桌面 AI 助手应用                 │
│         (Electron + React)              │
│         http://localhost:9527           │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Bisheng │  │ Bisheng │  │ 桌面助手 │
│  后端   │  │  前端   │  │  后端   │
│  :7860  │  │  :3001  │  │  :8000  │
└─────────┘  └─────────┘  └─────────┘
```

### 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| Bisheng 后端 | 7860 | API 服务 |
| Bisheng 前端 | 3001 | Web 界面 |
| 桌面助手后端 | 8000 | FastAPI 服务 |
| 桌面助手前端 | 9527 | Vite 开发服务器 |

### 连接状态指示器

状态指示器显示在设置面板的 Bisheng 部分顶部:

- 🟢 **绿色**: 已连接并认证
- 🟡 **黄色**: 已连接但未认证
- 🔵 **蓝色**: 正在检查
- 🔴 **红色**: 连接失败
- ⚪ **灰色**: 服务未启用

点击刷新按钮可以手动更新状态。

## 故障排查

### 问题 1: Bisheng 服务未初始化

**错误信息**:
```
Error: Bisheng service not initialized
```

**解决方案**:
1. 确保已重新构建应用: `npm run build`
2. 重启应用: `npm run dev`
3. 检查配置文件中 `bisheng.enabled` 是否正确

### 问题 2: 端口 8000 被占用

**错误信息**:
```
ERROR: [Errno 48] Address already in use
```

**解决方案 A - 使用脚本自动处理**:
```bash
./start-all-services.sh
# 脚本会提示是否杀死占用进程
```

**解决方案 B - 手动处理**:
```bash
# 查找占用进程
lsof -i :8000

# 杀死进程 (替换 PID)
kill -9 <PID>

# 重新启动服务
cd backend-service
source venv/bin/activate
python -m app.main
```

**解决方案 C - 使用其他端口**:
修改 `backend-service/app/main.py`:
```python
uvicorn.run(app, host="0.0.0.0", port=8001)  # 改为 8001
```

### 问题 3: Bisheng Docker 未运行

**错误信息**:
```
Docker 未运行,请先启动 Docker Desktop
```

**解决方案**:
1. 启动 Docker Desktop
2. 等待 Docker 完全启动
3. 重新运行启动脚本

### 问题 4: 连接状态显示错误

**症状**: 状态指示器一直显示 "检查中" 或 "错误"

**解决方案**:
1. 检查 Bisheng 服务是否运行:
   ```bash
   curl http://localhost:7860/api/v1/health
   ```

2. 检查网络连接

3. 查看浏览器控制台错误信息

4. 手动刷新状态

### 问题 5: 测试登录失败

**可能原因**:
- 用户名或密码错误
- Bisheng 服务未运行
- 网络连接问题

**解决方案**:
1. 验证用户名和密码
2. 在浏览器中访问 http://localhost:3001 测试登录
3. 检查 Bisheng 服务日志:
   ```bash
   docker-compose logs -f
   ```

## 服务管理

### 启动所有服务
```bash
./start-all-services.sh
```

### 停止所有服务
```bash
./stop-all-services.sh
```

### 查看服务状态
```bash
# Bisheng 后端
curl http://localhost:7860/api/v1/health

# Bisheng 前端
curl http://localhost:3001

# 桌面助手后端
curl http://localhost:8000/health

# 查看端口占用
lsof -i :7860
lsof -i :3001
lsof -i :8000
```

### 查看日志
```bash
# 桌面助手后端日志
tail -f logs/backend.log

# Bisheng Docker 日志
cd ../bisheng
docker-compose logs -f
```

## 开发建议

### 1. 开发流程

```bash
# 终端 1: 启动所有后端服务
./start-all-services.sh

# 终端 2: 启动桌面应用
npm run dev

# 终端 3: 查看日志
tail -f logs/backend.log
```

### 2. 调试技巧

- 使用浏览器开发者工具 (F12) 查看网络请求
- 查看主进程日志: `logs/electron.log`
- 查看后端日志: `logs/backend.log`
- 使用 `console.log` 在渲染进程中调试

### 3. 配置管理

配置文件位置:
- 开发环境: `config/config.json`
- 生产环境: `~/Library/Application Support/desktop-ai-assistant/config.json` (macOS)

### 4. 重置配置

如果配置出现问题,可以重置:
1. 在设置面板中点击 "重置配置"
2. 或删除配置文件手动重置

## 测试清单

使用此清单验证所有功能:

- [ ] 所有服务成功启动
- [ ] 桌面应用正常打开
- [ ] 设置面板中显示连接状态指示器
- [ ] 状态指示器显示正确的连接状态
- [ ] "测试登录" 按钮工作正常
- [ ] "完整测试" 按钮工作正常
- [ ] 能成功获取 token
- [ ] 能获取工作流列表
- [ ] 智能体功能可用(不是灰色)
- [ ] 能与智能体进行对话
- [ ] 配置保存和加载正常
- [ ] 服务重启后配置保持

## 下一步

完成设置后,你可以:

1. **探索智能体功能**
   - 创建自定义工作流
   - 测试不同的 AI 模型
   - 集成到医疗工作流中

2. **优化配置**
   - 调整超时时间
   - 配置自动登录
   - 选择合适的模式 (API/iframe)

3. **扩展功能**
   - 添加更多智能体
   - 自定义工作流
   - 集成其他服务

## 相关文档

- `BISHENG_FIX_SUMMARY.md` - 修复详情
- `QUICK_TEST_GUIDE.md` - 快速测试指南
- `docs/BISHENG_AGENT_INTEGRATION.md` - 集成文档
- `bisheng-test.html` - 独立测试页面

## 获取帮助

如果遇到问题:

1. 查看本文档的故障排查部分
2. 检查日志文件
3. 查看浏览器控制台
4. 参考相关文档

祝使用愉快! 🎉

