# Bisheng 智能体集成指南

## 概述

本文档描述了如何在 AI 助手客户端中使用 Bisheng 智能体服务平台的集成功能。

## 功能特性

### 1. 双模式支持

- **API 模式**: 通过 Bisheng API 直接调用智能体,保持 Electron 应用风格
- **iframe 模式**: 嵌入 Bisheng 原生 UI,通过代理服务器绕过跨域限制

### 2. 核心功能

- ✅ 智能体列表展示
- ✅ 智能体选择和对话
- ✅ 流式响应支持
- ✅ Markdown 渲染
- ✅ 会话管理
- ✅ 认证管理
- ✅ 配置管理
- ✅ iframe 代理服务器

## 架构设计

### 前端组件

```
src/renderer/
├── components/
│   ├── AgentList.tsx          # 智能体列表（可折叠侧边栏）
│   ├── AgentChat.tsx          # API 模式对话组件
│   └── AgentIframe.tsx        # iframe 模式嵌入组件
└── pages/
    └── AgentService.tsx       # 智能体服务主页面
```

### 后端服务

```
backend-service/app/api/
└── bisheng.py                 # Bisheng API 代理
```

### 主进程服务

```
src/services/
└── bisheng.ts                 # Bisheng 服务（API + iframe 代理）
```

## 配置说明

### 1. Electron 配置

在设置页面的"智能体设置"中配置:

```typescript
{
  enabled: boolean,              // 是否启用
  baseUrl: string,              // Bisheng 后端地址 (默认: http://localhost:7860)
  frontendUrl: string,          // Bisheng 前端地址 (默认: http://localhost:3001)
  iframeProxyPort: number,      // iframe 代理端口 (默认: 3002)
  username: string,             // 用户名
  password: string,             // 密码
  mode: 'api' | 'iframe',       // 交互模式
  autoLogin: boolean,           // 自动登录
  savePassword: boolean,        // 保存密码
  timeout: number,              // 超时时间 (ms)
  retryAttempts: number         // 重试次数
}
```

### 2. 后端配置

在 `backend-service/app/config.py` 中配置:

```python
BISHENG_ENABLED = False
BISHENG_BASE_URL = "http://localhost:7860"
BISHENG_FRONTEND_URL = "http://localhost:3001"
BISHENG_IFRAME_PROXY_PORT = 3002
BISHENG_USERNAME = ""
BISHENG_PASSWORD = ""
BISHENG_ACCESS_TOKEN = ""
BISHENG_TOKEN_EXPIRY = 86400
BISHENG_DEFAULT_MODE = "api"
```

## 使用流程

### 1. 启用 Bisheng 服务

1. 打开设置页面
2. 找到"智能体设置"部分
3. 配置 Bisheng 服务器地址和认证信息
4. 选择交互模式 (API 或 iframe)
5. 启用服务

### 2. API 模式使用

1. 点击"智能体"标签页
2. 在左侧列表中选择一个智能体
3. 在右侧对话框中输入问题
4. 查看流式响应结果
5. 可以折叠左侧列表以最大化对话区域

### 3. iframe 模式使用

1. 点击"智能体"标签页
2. 系统会打开一个可调整大小的弹窗
3. 弹窗中嵌入 Bisheng 原生 UI
4. 直接在原生 UI 中操作

## API 接口

### 主进程 IPC 接口

```typescript
// 登录
window.electronAPI.bisheng.login(username, password)
  -> Promise<{ token: string, expiry: number }>

// 获取工作流列表
window.electronAPI.bisheng.getWorkflows(pageSize?, pageNum?)
  -> Promise<BishengWorkflow[]>

// 调用工作流
window.electronAPI.bisheng.invokeWorkflow(
  workflowId, input, stream?, sessionId?, messageId?
) -> Promise<ReadableStream>

// 获取配置
window.electronAPI.bisheng.getConfig()
  -> Promise<BishengConfig>

// 更新配置
window.electronAPI.bisheng.updateConfig(config)
  -> Promise<boolean>

// 检查认证状态
window.electronAPI.bisheng.isAuthenticated()
  -> Promise<boolean>

// 获取代理状态
window.electronAPI.bisheng.getProxyStatus()
  -> Promise<{ running: boolean, port: number }>
```

### 后端 API 接口

```
POST   /api/bisheng/login              # 登录
GET    /api/bisheng/workflows          # 获取工作流列表
POST   /api/bisheng/workflow/invoke    # 调用工作流
GET    /api/bisheng/config             # 获取配置
POST   /api/bisheng/config             # 更新配置
GET    /api/bisheng/status             # 获取服务状态
```

## 数据流

### API 模式数据流

```
用户输入
  ↓
AgentChat 组件
  ↓
window.electronAPI.bisheng.invokeWorkflow()
  ↓
主进程 IPC Handler
  ↓
BishengService.invokeWorkflow()
  ↓
Bisheng API (/api/v2/workflow/invoke)
  ↓
流式响应 (SSE)
  ↓
AgentChat 组件渲染
```

### iframe 模式数据流

```
用户操作
  ↓
AgentIframe 组件
  ↓
iframe 加载 Bisheng 前端
  ↓
iframe 代理服务器 (绕过 X-Frame-Options)
  ↓
Bisheng 前端 (http://localhost:3001)
  ↓
Bisheng 后端 (http://localhost:7860)
```

## iframe 代理服务器

### 功能

- 绕过 `X-Frame-Options` 限制
- 代理 HTTP 请求
- 代理 WebSocket 连接
- 自动启动/停止

### 实现

代理服务器集成在 `src/services/bisheng.ts` 中:

```typescript
class BishengService {
  private proxyServer: http.Server | null = null;
  
  async startIframeProxy(): Promise<boolean> {
    // 启动代理服务器
  }
  
  async stopIframeProxy(): Promise<void> {
    // 停止代理服务器
  }
}
```

## 认证机制

### 1. 用户名/密码登录

```typescript
const result = await window.electronAPI.bisheng.login(username, password);
// result: { token: string, expiry: number }
```

### 2. Token 管理

- Token 存储在配置中
- 自动附加到 API 请求头
- 过期后需要重新登录

### 3. 自动登录

如果启用了 `autoLogin` 和 `savePassword`:
- 应用启动时自动登录
- Token 过期时自动重新登录

## 错误处理

### 常见错误

1. **连接失败**
   - 检查 Bisheng 服务是否运行
   - 检查网络连接
   - 检查防火墙设置

2. **认证失败 (401)**
   - 检查用户名/密码
   - Token 可能已过期,重新登录

3. **工作流调用失败**
   - 检查工作流 ID 是否正确
   - 检查输入参数格式
   - 查看后端日志

4. **iframe 加载失败**
   - 检查代理服务器是否启动
   - 检查前端 URL 是否正确
   - 查看浏览器控制台

## 测试

### 1. 测试 API 模式

```bash
# 启动后端服务
cd backend-service
python -m uvicorn app.main:app --reload

# 启动 Electron 应用
npm run dev

# 在设置中配置 Bisheng
# 切换到"智能体"标签页
# 选择一个智能体并测试对话
```

### 2. 测试 iframe 模式

```bash
# 确保 Bisheng 前端服务运行在 http://localhost:3001

# 在设置中选择 iframe 模式
# 切换到"智能体"标签页
# 应该看到嵌入的 Bisheng UI
```

### 3. 测试后端 API

```bash
# 测试登录
curl -X POST http://localhost:8010/api/bisheng/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# 测试获取工作流
curl http://localhost:8010/api/bisheng/workflows?page_size=10 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 测试调用工作流
curl -X POST http://localhost:8010/api/bisheng/workflow/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "workflow_id": "your_workflow_id",
    "input": {"question": "你好"},
    "stream": true
  }'
```

## 性能优化

### 1. 流式响应

- API 模式默认使用流式响应
- 减少首字延迟
- 提升用户体验

### 2. 连接复用

- 使用 HTTP Keep-Alive
- 减少连接建立开销

### 3. 缓存策略

- 工作流列表缓存
- Token 缓存
- 配置缓存

## 安全考虑

### 1. 密码存储

- 如果启用 `savePassword`,密码会加密存储
- 建议使用环境变量或密钥管理服务

### 2. Token 安全

- Token 存储在 Electron Store 中
- 自动过期管理
- 不在日志中记录敏感信息

### 3. 代理安全

- iframe 代理仅监听本地端口
- 不对外暴露
- 自动清理响应头中的安全限制

## 故障排查

### 问题: 智能体标签页不显示

**解决方案:**
1. 检查配置中 `bisheng.enabled` 是否为 `true`
2. 重启应用
3. 查看控制台错误

### 问题: 登录失败

**解决方案:**
1. 检查用户名/密码
2. 检查 Bisheng 服务是否运行
3. 查看网络请求日志
4. 确认 Bisheng API 地址正确

### 问题: 工作流列表为空

**解决方案:**
1. 确认已登录
2. 检查 Token 是否有效
3. 确认账户有可用的工作流
4. 查看后端日志

### 问题: iframe 显示空白

**解决方案:**
1. 检查代理服务器是否启动
2. 查看浏览器控制台错误
3. 确认前端 URL 正确
4. 尝试直接访问前端 URL

## 未来优化

- [ ] 添加工作流搜索功能
- [ ] 支持工作流收藏
- [ ] 添加对话历史记录
- [ ] 支持多会话管理
- [ ] 添加工作流编辑功能
- [ ] 支持自定义主题
- [ ] 添加性能监控
- [ ] 支持离线模式

## 参考资料

- [Bisheng 官方文档](https://github.com/dataelement/bisheng)
- [Bisheng API 文档](http://localhost:7860/docs)
- [Electron IPC 通信](https://www.electronjs.org/docs/latest/api/ipc-main)
- [FastAPI 文档](https://fastapi.tiangolo.com/)

## 联系支持

如有问题,请查看:
- 项目 README
- 相关文档目录
- GitHub Issues
