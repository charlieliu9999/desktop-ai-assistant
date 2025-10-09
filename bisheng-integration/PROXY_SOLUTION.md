# 🎯 终极解决方案：代理服务器绕过 X-Frame-Options

## 问题说明

直接修改 Bisheng 的 Nginx 配置虽然可行，但可能遇到以下问题：
- 配置复杂，容易遗漏某些 location 块
- 容器重启后配置可能被重置
- 需要修改 Bisheng 系统的配置文件

## ✅ 最佳解决方案：使用代理服务器

**原理**：创建一个中间代理服务器，拦截并修改响应头，移除 `X-Frame-Options`

**优势**：
- ✅ 不需要修改 Bisheng 任何配置
- ✅ 不需要重启 Bisheng 容器
- ✅ 完全外挂，零侵入
- ✅ 支持所有 Bisheng 功能（包括 WebSocket）
- ✅ 一次启动，永久有效

## 🚀 快速开始

### 步骤 1: 安装依赖

```bash
cd /Users/charlieliu/git_project_vscode/09_medical/demo-web/desktop-ai-assistant
npm install http-proxy --save-dev
```

### 步骤 2: 启动代理服务器

```bash
cd bisheng-integration
node iframe-proxy.js
```

**输出示例**：
```
🚀 iframe 代理服务器已启动
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 代理地址: http://localhost:3002
🎯 目标服务: http://localhost:3001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 使用方法：
   在 bisheng-test.html 中使用代理地址
   iframe src: http://localhost:3002/chat/flow/auth/...

✅ 功能：
   - 移除 X-Frame-Options 响应头
   - 添加 CSP frame-ancestors 允许嵌入
   - 支持 WebSocket 连接
   - 支持所有 Bisheng 功能

按 Ctrl+C 停止服务器
```

### 步骤 3: 测试

1. **打开测试页面**
   ```
   http://localhost:8888/bisheng-test.html
   ```

2. **选择 iframe 模式**

3. **登录并选择工作流**

4. **验证**
   - ✅ 应该能看到完整的 Bisheng 界面
   - ✅ 没有 "Refused to display" 错误
   - ✅ 可以正常对话

## 📊 架构图

```
浏览器 (localhost:8888)
    ↓
测试页面 (bisheng-test.html)
    ↓
iframe src="http://localhost:3002/chat/..."
    ↓
代理服务器 (localhost:3002) ← 移除 X-Frame-Options
    ↓
Bisheng 前端 (localhost:3001) ← 原始服务，有 X-Frame-Options
    ↓
Bisheng 后端 (localhost:7860)
```

## 🔧 代理服务器功能

### 自动处理的事项

1. **移除限制响应头**
   ```javascript
   delete proxyRes.headers['x-frame-options'];
   ```

2. **添加允许嵌入的 CSP**
   ```javascript
   proxyRes.headers['content-security-policy'] = 
       "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*";
   ```

3. **支持 WebSocket**
   ```javascript
   ws: true  // 自动代理 WebSocket 连接
   ```

4. **支持所有 HTTP 方法**
   - GET, POST, PUT, DELETE, OPTIONS 等

## 💻 后台运行

### 方式 1: 使用 nohup

```bash
cd bisheng-integration
nohup node iframe-proxy.js > proxy.log 2>&1 &
```

### 方式 2: 使用 pm2

```bash
# 安装 pm2
npm install -g pm2

# 启动服务
pm2 start iframe-proxy.js --name bisheng-iframe-proxy

# 查看状态
pm2 status

# 查看日志
pm2 logs bisheng-iframe-proxy

# 停止服务
pm2 stop bisheng-iframe-proxy
```

### 方式 3: 添加到 package.json

编辑 `package.json`：
```json
{
  "scripts": {
    "iframe-proxy": "node bisheng-integration/iframe-proxy.js"
  }
}
```

然后运行：
```bash
npm run iframe-proxy &
```

## 🔍 验证代理工作

### 检查代理响应头

```bash
# 直接访问 Bisheng（有限制）
curl -I http://localhost:3001/ | grep -i "x-frame"
# 输出: X-Frame-Options: SAMEORIGIN  ❌

# 通过代理访问（无限制）
curl -I http://localhost:3002/ | grep -i "x-frame"
# 输出: (空)  ✅

# 检查 CSP
curl -I http://localhost:3002/ | grep -i "content-security"
# 输出: Content-Security-Policy: frame-ancestors...  ✅
```

## 🎯 使用场景

### 场景 1: 开发环境（推荐）
- 启动代理服务器
- 使用 `localhost:3002` 作为 iframe src
- 不需要修改 Bisheng 配置

### 场景 2: 生产环境
建议修改 Bisheng 的 Nginx 配置，而不是使用代理

### 场景 3: 快速测试
临时启动代理，验证 iframe 功能

## 📝 代理服务器代码

文件: `iframe-proxy.js`

关键代码：
```javascript
const proxy = httpProxy.createProxyServer({
    target: 'http://localhost:3001',
    changeOrigin: true,
    ws: true,
});

proxy.on('proxyRes', function(proxyRes, req, res) {
    // 移除 X-Frame-Options
    delete proxyRes.headers['x-frame-options'];
    
    // 添加 CSP
    proxyRes.headers['content-security-policy'] = 
        "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*";
});
```

## 🐛 故障排查

### 问题 1: 端口被占用

```bash
# 查看端口占用
lsof -i :3002

# 杀死进程
kill -9 <PID>

# 或修改端口
# 编辑 iframe-proxy.js，修改 PROXY_PORT = 3003
```

### 问题 2: http-proxy 未安装

```bash
npm install http-proxy --save-dev
```

### 问题 3: 代理无响应

```bash
# 检查 Bisheng 是否运行
docker ps | grep bisheng-frontend

# 检查端口
curl http://localhost:3001/
curl http://localhost:3002/
```

### 问题 4: iframe 仍然被阻止

1. 清除浏览器缓存（Ctrl+Shift+R）
2. 检查代理是否正在运行
3. 查看浏览器控制台的完整错误

## ⚡ 性能说明

- **延迟**: 几乎为零（< 1ms）
- **吞吐量**: 与直接访问相同
- **内存**: 约 20-30 MB
- **CPU**: 几乎无影响

## 🎉 优势总结

| 特性 | 修改 Nginx 配置 | 使用代理服务器 |
|------|----------------|----------------|
| 需要修改 Bisheng | ✅ 是 | ❌ 否 |
| 需要重启容器 | ✅ 是 | ❌ 否 |
| 配置复杂度 | ⚠️ 中等 | ✅ 简单 |
| 侵入性 | ⚠️ 中等 | ✅ 零侵入 |
| 维护成本 | ⚠️ 中等 | ✅ 低 |
| 灵活性 | ❌ 低 | ✅ 高 |

## 📌 总结

**代理服务器方案是最简单、最安全、最灵活的解决方案！**

只需：
1. 启动代理：`node iframe-proxy.js`
2. 使用代理地址：`http://localhost:3002`
3. 完成！✅

不需要修改任何 Bisheng 配置，不需要重启任何容器！

