# Bisheng 智能体集成

完整的 Bisheng 智能体平台集成解决方案，提供两种交互模式：自定义聊天界面和 iframe 嵌入原生界面。

## 📁 文件结构

```
bisheng-integration/
├── bisheng-test.html              # ⭐ 主测试页面（完整的工作流交互界面）
├── iframe-proxy.js                # ⭐ iframe 代理服务器（解决 X-Frame-Options 限制）
├── proxy-server.js                # API 代理服务器（解决 CORS 问题）
├── test-bisheng-api.js            # API 测试脚本
├── test-continue-workflow.js      # 工作流测试脚本
├── README.md                      # 本文档
└── PROXY_SOLUTION.md              # iframe 代理解决方案详细文档
```

## 🚀 快速开始

### 前提条件

1. Bisheng 服务运行中：
   - 后端：`localhost:7860`
   - 前端：`localhost:3001`

2. 安装依赖：
   ```bash
   cd /Users/charlieliu/git_project_vscode/09_medical/demo-web/desktop-ai-assistant
   npm install http-proxy --save-dev
   ```

### 启动服务

```bash
cd bisheng-integration

# 1. 启动测试页面服务器
python3 -m http.server 8888 &

# 2. 启动 iframe 代理服务器（必需，用于 iframe 模式）
node iframe-proxy.js &

# 3. 打开浏览器
open http://localhost:8888/bisheng-test.html
```

### 使用流程

1. **登录**
   - 用户名：`lzhy9999@163.com`
   - 密码：`Moto@9999`
   - 点击"🔐 登录并加载工作流"

2. **选择显示模式**
   - **自定义聊天界面**（推荐）：流式输出 + Markdown 渲染
   - **iframe 嵌入原生界面**：完整的 Bisheng 原生体验

3. **选择工作流并开始对话**

## 🎯 两种显示模式

### 模式 1: 自定义聊天界面 ✅ 推荐

**特点**：
- ✅ 实时流式输出（边接收边显示）
- ✅ Markdown 渲染（美观格式）
- ✅ 代码高亮
- ✅ 完全可控的 UI
- ✅ 详细的调试日志

**技术实现**：
- 使用 Bisheng API 直接调用
- ReadableStream 实时处理响应
- marked.js + highlight.js 渲染

### 模式 2: iframe 嵌入原生界面

**特点**：
- ✅ 完整的 Bisheng 原生功能
- ✅ 无需维护聊天逻辑
- ✅ 自动更新跟随 Bisheng

**技术实现**：
- 通过代理服务器 (port 3002) 绕过 X-Frame-Options
- iframe 嵌入 Bisheng 前端页面
- 支持 WebSocket 连接

## 🔧 核心组件

### 1. bisheng-test.html

主测试页面，包含：
- 工作流列表展示
- 双模式切换
- 自定义聊天界面
- iframe 嵌入容器
- 账号密码登录
- 流式响应处理
- Markdown 渲染

### 2. iframe-proxy.js

iframe 代理服务器，用于：
- 监听端口 3002
- 转发请求到 Bisheng 前端 (3001)
- 移除 `X-Frame-Options` 响应头
- 添加 `Content-Security-Policy` 允许嵌入
- 支持 WebSocket

**为什么需要代理？**
Bisheng 前端设置了 `X-Frame-Options: SAMEORIGIN`，阻止跨端口 iframe 嵌入。代理服务器可以移除这个限制。

### 3. proxy-server.js

API 代理服务器（可选），用于：
- 解决 CORS 跨域问题
- 转发 API 请求
- 适用于远程服务器访问

## 📖 API 工作流程

### 启动工作流

```javascript
POST /api/v2/workflow/invoke
{
  "workflow_id": "xxx",
  "stream": false
}
```

**响应事件类型**：
- `guide_word`: 引导词
- `input`: 等待用户输入
- `stream_msg`: 流式消息
- `output_msg`: 普通消息
- `close`: 关闭事件
- `end`: 结束事件

### 继续工作流

```javascript
POST /api/v2/workflow/invoke
{
  "workflow_id": "xxx",
  "stream": true,
  "input": {
    "node_id": {
      "user_input": "用户消息"
    }
  },
  "message_id": "xxx",
  "session_id": "xxx"
}
```

## 🎨 功能特性

### ✅ 认证
- 用户名/密码登录
- JWT Token 管理
- Authorization Bearer 认证

### ✅ 流式响应
- Server-Sent Events (SSE) 支持
- ReadableStream 实时处理
- 逐字显示效果

### ✅ Markdown 渲染
- GitHub 风格 Markdown
- 代码语法高亮
- 支持表格、列表、引用等

### ✅ 错误处理
- 超时处理（120秒）
- 详细的调试日志
- 用户友好的错误提示
- 自动重试机制

## 🐛 故障排查

### 问题 1: iframe 显示 "Refused to display"

**原因**: iframe 代理服务器未启动

**解决**:
```bash
cd bisheng-integration
node iframe-proxy.js &
```

### 问题 2: 自定义模式无响应

**原因**: Bisheng 服务未运行

**解决**:
```bash
# 检查服务状态
curl http://localhost:7860/health
curl http://localhost:3001/

# 启动 Bisheng
cd /path/to/bisheng/docker
docker-compose up -d
```

### 问题 3: 登录失败

**原因**: 账号密码错误或服务地址不正确

**解决**:
- 确认服务地址：`http://localhost:7860`
- 确认账号密码正确
- 检查后端服务是否运行

## 📊 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| Bisheng 后端 | 7860 | API 服务 |
| Bisheng 前端 | 3001 | 原生界面 |
| **iframe 代理** | 3002 | iframe 嵌入代理 ⭐ |
| 测试页面 | 8888 | HTTP 服务器 |

## 🔒 安全注意事项

### 开发环境
- 当前配置适用于本地开发
- 账号密码硬编码在代码中（仅供测试）

### 生产环境建议
- 移除硬编码的账号密码
- 使用环境变量或配置文件
- 实现 Token 刷新机制
- 限制 iframe 嵌入的具体域名

## 📝 配置说明

### 修改服务地址

编辑 `bisheng-test.html`，找到：
```javascript
const baseUrl = 'http://localhost:7860';  // 后端地址
const frontendPort = '3002';               // iframe 代理端口
```

### 修改账号密码

编辑 `bisheng-test.html`，找到：
```html
<input value="lzhy9999@163.com" />  <!-- 用户名 -->
<input value="Moto@9999" />          <!-- 密码 -->
```

### 修改代理端口

编辑 `iframe-proxy.js`，找到：
```javascript
const PROXY_PORT = 3002;      // 代理监听端口
const TARGET_PORT = 3001;     // Bisheng 前端端口
```

## 🎉 完整功能列表

- ✅ 工作流列表自动加载
- ✅ 账号密码登录
- ✅ 双显示模式切换
- ✅ 实时流式输出
- ✅ Markdown 渲染
- ✅ 代码语法高亮
- ✅ iframe 原生界面嵌入
- ✅ WebSocket 支持
- ✅ 错误处理和重试
- ✅ 会话管理
- ✅ 详细调试日志

## 📚 相关文档

- **PROXY_SOLUTION.md** - iframe 代理解决方案详细说明
- **Bisheng 官方文档** - http://localhost:7860/docs

## 🔄 日常使用

创建启动脚本 `start-bisheng-test.sh`：

```bash
#!/bin/bash
cd bisheng-integration

# 启动测试页面服务器
python3 -m http.server 8888 > /dev/null 2>&1 &
echo "✅ 测试页面: http://localhost:8888/bisheng-test.html"

# 启动 iframe 代理
node iframe-proxy.js > /dev/null 2>&1 &
echo "✅ iframe 代理: http://localhost:3002"

# 打开浏览器
open http://localhost:8888/bisheng-test.html

echo ""
echo "🎉 服务已启动！"
echo "按 Ctrl+C 停止所有服务"
```

使用：
```bash
chmod +x start-bisheng-test.sh
./start-bisheng-test.sh
```

## 💡 最佳实践

1. **开发调试** - 使用自定义模式，查看详细日志
2. **功能测试** - 使用 iframe 模式，验证原生功能
3. **性能测试** - 观察流式输出延迟
4. **错误处理** - 测试网络中断、超时等场景

## 🎊 项目成果

✅ 完全独立的集成目录  
✅ 零侵入 Bisheng 系统  
✅ 完整的工作流交互功能  
✅ 双模式灵活切换  
✅ 流式响应实时显示  
✅ Markdown 美观渲染  
✅ iframe 原生界面嵌入  
✅ 完善的错误处理  
✅ 详细的调试日志  
✅ 完整的文档说明

---

**版本**: v2.0  
**最后更新**: 2025-10-08  
**状态**: ✅ 生产就绪
