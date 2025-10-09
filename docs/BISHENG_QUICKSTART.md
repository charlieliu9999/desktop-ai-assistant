# Bisheng 智能体快速开始

## 5 分钟快速上手

### 前提条件

1. Bisheng 服务已启动
   - 后端: `http://localhost:7860`
   - 前端: `http://localhost:3001`
2. 有可用的 Bisheng 账号
3. 账号下至少有一个已发布的工作流

### 步骤 1: 启动应用

```bash
# 启动后端服务
cd backend-service
source venv/bin/activate  # Windows: venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8010

# 启动 Electron 应用
cd ..
npm run dev
```

### 步骤 2: 配置 Bisheng

1. 打开应用后,点击右下角的"设置"图标
2. 在左侧菜单中找到"智能体设置"
3. 填写以下信息:

```
平台地址: http://localhost:7860
前端地址: http://localhost:3001
用户名: your_username
密码: your_password
交互模式: API 模式
```

4. 点击"保存配置"

### 步骤 3: 登录认证

配置保存后,系统会自动尝试登录。如果登录成功:
- 状态栏会显示绿色的"智能体"指示器
- "智能体"标签页会变为可用状态

### 步骤 4: 选择智能体

1. 点击顶部的"智能体"标签页 (或按 `Cmd/Ctrl + 4`)
2. 左侧会显示可用的智能体列表
3. 点击任意一个智能体

### 步骤 5: 开始对话

1. 在右侧的输入框中输入问题
2. 按 `Enter` 或点击发送按钮
3. 查看流式响应结果

## API 模式 vs iframe 模式

### API 模式 (推荐)

**优点:**
- 保持应用统一风格
- 更好的性能
- 支持自定义 UI
- 流式响应体验好

**适用场景:**
- 日常使用
- 需要快速响应
- 希望保持应用风格一致

**使用方法:**
1. 在设置中选择"API 模式"
2. 保存配置
3. 在"智能体"标签页中使用

### iframe 模式

**优点:**
- 完整的 Bisheng 原生功能
- 无需适配新功能
- 可视化工作流编辑

**适用场景:**
- 需要使用高级功能
- 需要编辑工作流
- 需要完整的原生体验

**使用方法:**
1. 在设置中选择"iframe 模式"
2. 保存配置
3. 在"智能体"标签页中会打开一个弹窗
4. 弹窗中显示 Bisheng 原生 UI

## 常见问题

### Q: 登录失败怎么办?

**A:** 检查以下几点:
1. Bisheng 服务是否正常运行
2. 用户名和密码是否正确
3. 网络连接是否正常
4. 查看控制台错误信息

### Q: 看不到智能体列表?

**A:** 可能的原因:
1. 还未登录 - 检查认证状态
2. 账号下没有工作流 - 在 Bisheng 中创建工作流
3. Token 过期 - 重新登录

### Q: 对话没有响应?

**A:** 检查:
1. 工作流是否已发布
2. 输入格式是否正确
3. 查看后端日志
4. 检查网络请求

### Q: iframe 显示空白?

**A:** 尝试:
1. 检查代理服务器状态
2. 确认前端 URL 正确
3. 查看浏览器控制台
4. 切换到 API 模式测试

## 高级配置

### 自动登录

```typescript
// 在设置中启用
autoLogin: true
savePassword: true
```

启用后,应用启动时会自动登录。

### 超时设置

```typescript
// 调整超时时间 (毫秒)
timeout: 120000  // 2 分钟
```

如果工作流执行时间较长,可以增加超时时间。

### 重试设置

```typescript
// 设置重试次数
retryAttempts: 3
```

网络不稳定时,可以增加重试次数。

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + 4` | 切换到智能体标签页 |
| `Cmd/Ctrl + ,` | 打开设置 |
| `Enter` | 发送消息 |
| `Shift + Enter` | 换行 |
| `Esc` | 取消输入 |

## 下一步

- 阅读 [完整集成指南](./BISHENG_AGENT_INTEGRATION.md)
- 了解 [API 接口文档](./BISHENG_AGENT_INTEGRATION.md#api-接口)
- 查看 [故障排查指南](./BISHENG_AGENT_INTEGRATION.md#故障排查)

## 获取帮助

如果遇到问题:
1. 查看应用日志: `logs/electron.log`
2. 查看后端日志: `backend-service/logs/app.log`
3. 查看 Bisheng 日志
4. 提交 Issue 到项目仓库
