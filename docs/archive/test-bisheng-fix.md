# Bisheng 集成修复验证指南

## 修复内容

### 问题诊断
1. **根本原因**: `src/main/preload.ts` 是实际使用的 preload 文件,但缺少 `bisheng` API 定义
2. **错误表现**: 
   - `Cannot read properties of undefined (reading 'login')`
   - `Cannot read properties of undefined (reading 'runConnectionTests')`

### 修复措施

#### 1. 添加 Bisheng API 类型定义 (src/main/preload.ts)
```typescript
// Bisheng 智能体服务API
bisheng: {
  login(username: string, password: string): Promise<{ token: string; expiry: number }>;
  getWorkflows(pageSize?: number, pageNum?: number): Promise<any[]>;
  invokeWorkflow(...): Promise<ReadableStream>;
  getConfig(): Promise<any>;
  updateConfig(config: any): Promise<boolean>;
  isAuthenticated(): Promise<boolean>;
  getProxyStatus(): Promise<{ running: boolean; port: number }>;
  testWorkflowList(): Promise<any>;
  testWorkflowInvoke(workflowId: string): Promise<any>;
  runConnectionTests(): Promise<any>;
};
```

#### 2. 添加 Bisheng API 实现 (src/main/preload.ts)
```typescript
bisheng: {
  login: (username: string, password: string) => 
    ipcRenderer.invoke('bisheng-login', username, password),
  getWorkflows: (pageSize?: number, pageNum?: number) => 
    ipcRenderer.invoke('bisheng-get-workflows', pageSize, pageNum),
  // ... 其他方法
  runConnectionTests: () => 
    ipcRenderer.invoke('bisheng-run-connection-tests')
}
```

#### 3. 改进配置更新逻辑 (src/main/main.ts)
```typescript
if (updates.bisheng) {
  // 如果 Bisheng 服务尚未初始化但现在启用了，则初始化它
  if (!this.bishengService && updates.bisheng.enabled) {
    this.bishengService = new BishengService(next.bisheng as BishengConfig, this.logger);
    await this.bishengService.initialize();
    this.logger.info('Bisheng service initialized');
  } else if (this.bishengService) {
    // 如果已经初始化，则更新配置
    this.bishengService.updateConfig(updates.bisheng);
    this.logger.info('Bisheng service config updated');
  }
}
```

## 验证步骤

### 1. 重新构建应用
```bash
cd desktop-ai-assistant
npm run build
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 测试 Bisheng 连接

#### 3.1 打开设置面板
- 点击应用右上角的设置图标
- 找到 "Bisheng 智能体服务" 部分

#### 3.2 填写配置信息
- **服务地址**: `http://localhost:7860`
- **前端地址**: `http://localhost:3001`
- **用户名**: `lzhy9999@163.com`
- **密码**: `Moto@9999`

#### 3.3 测试登录
1. 点击 "测试登录" 按钮
2. 应该看到成功提示: "连接成功! Token 已获取"
3. 检查浏览器控制台,不应该有错误

#### 3.4 完整测试
1. 点击 "完整测试" 按钮
2. 应该看到测试结果:
   - ✓ 登录测试通过
   - ✓ 工作流列表测试通过 (显示工作流数量)
   - ✓ 工作流调用测试通过

### 4. 验证智能体功能激活

#### 4.1 保存配置
1. 确保 "启用 Bisheng 服务" 已勾选
2. 点击 "保存配置" 按钮

#### 4.2 检查智能体页面
1. 导航到 "智能体服务" 页面
2. 智能体功能应该可用(不再是灰色)
3. 应该能看到工作流列表

#### 4.3 测试对话功能
1. 选择一个工作流
2. 在聊天框中输入测试消息
3. 应该能收到 AI 回复

## 预期结果

### ✅ 成功标志
1. 设置面板中的测试按钮都能正常工作
2. 没有 "Cannot read properties of undefined" 错误
3. 能成功登录并获取 token
4. 能获取工作流列表
5. 智能体功能不再显示为灰色
6. 能与智能体进行对话

### ❌ 如果仍有问题

#### 检查 1: Bisheng 服务是否运行
```bash
# 检查 Bisheng 后端
curl http://localhost:7860/api/v1/health

# 检查 Bisheng 前端
curl http://localhost:3001
```

#### 检查 2: 查看控制台日志
打开开发者工具 (F12),查看:
- Console 标签页: 查看 JavaScript 错误
- Network 标签页: 查看 API 请求是否成功

#### 检查 3: 查看主进程日志
```bash
# 查看 Electron 主进程日志
tail -f desktop-ai-assistant/logs/electron.log
```

#### 检查 4: 验证 preload 文件
确认 `vite.config.ts` 使用的是正确的 preload 文件:
```typescript
entry: 'src/main/preload.ts'  // ✓ 正确
```

## 对比测试代码

### 工作的测试代码 (bisheng-test.html)
```javascript
// 登录
const response = await fetch(`${baseUrl}/api/v1/user/login`, {
  method: 'POST',
  headers: {
    'accept': 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    user_name: username,
    password: password
  })
});

// 提取 token
let token = null;
if (data.data && data.data.access_token) {
  token = data.data.access_token;
} else if (data.access_token) {
  token = data.access_token;
} else if (data.token) {
  token = data.token;
}
```

### 桌面应用实现 (src/services/bisheng.ts)
```typescript
async login(username: string, password: string): Promise<{ token: string; expiry: number }> {
  const response = await fetch(`${this.config.baseUrl}/api/v1/user/login`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_name: username,
      password: password,
    }),
  });
  
  // 相同的 token 提取逻辑
  let token = null;
  if (data.data && data.data.access_token) {
    token = data.data.access_token;
  } else if (data.access_token) {
    token = data.access_token;
  } else if (data.token) {
    token = data.token;
  }
  
  return { token, expiry: Date.now() + 86400000 };
}
```

## 技术细节

### IPC 通信流程
```
SettingsPanel.tsx (渲染进程)
  ↓ window.electronAPI.bisheng.login()
src/main/preload.ts
  ↓ ipcRenderer.invoke('bisheng-login', ...)
src/main/main.ts (主进程)
  ↓ ipcMain.handle('bisheng-login', ...)
src/services/bisheng.ts
  ↓ BishengService.login()
Bisheng API (http://localhost:7860)
```

### 关键文件
1. **src/main/preload.ts** - Preload 脚本,暴露 API 给渲染进程
2. **src/main/main.ts** - 主进程,注册 IPC 处理器
3. **src/services/bisheng.ts** - Bisheng 服务实现
4. **src/renderer/components/SettingsPanel.tsx** - 设置面板 UI

## 常见问题

### Q: 为什么有多个 preload 文件?
A: 项目中有三个 preload 文件:
- `src/main/preload.ts` - **实际使用的** (由 vite.config.ts 指定)
- `src/renderer/preload.ts` - 旧版本,未使用
- `src/preload/preload.ts` - 另一个版本,未使用

### Q: 如何确认使用的是哪个 preload 文件?
A: 查看 `vite.config.ts` 中的配置:
```typescript
{
  entry: 'src/main/preload.ts',  // 这是实际使用的
  ...
}
```

### Q: 为什么之前能看到 bisheng 对象但方法是 undefined?
A: 因为其他 preload 文件定义了 bisheng 对象,但实际使用的 `src/main/preload.ts` 没有定义,导致运行时 `window.electronAPI.bisheng` 是 undefined。

## 后续建议

1. **清理冗余文件**: 删除未使用的 preload 文件,避免混淆
2. **添加类型检查**: 确保所有 API 都有正确的 TypeScript 类型
3. **完善错误处理**: 添加更详细的错误信息和用户提示
4. **添加单元测试**: 为 Bisheng 服务添加自动化测试

