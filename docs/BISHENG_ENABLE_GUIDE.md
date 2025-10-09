# 如何启用智能体功能

## 问题

应用启动后,"智能体"标签页显示为灰色/禁用状态。

## 原因

智能体功能默认是禁用的,需要手动启用。

## 解决方案

### 方案 1: 通过设置界面启用(推荐)

这是**生产环境推荐**的方式:

1. 启动应用
2. 点击右下角的"设置"图标
3. 在左侧菜单中找到"智能体设置"
4. 在"基础配置"部分,勾选"启用智能体服务"
5. 填写其他必要配置(服务器地址、用户名、密码等)
6. 点击"保存配置"
7. 返回主界面,"智能体"标签页应该已经可用

### 方案 2: 修改默认配置(开发环境)

这是**开发测试**时的便捷方式:

#### 前端配置

编辑 `src/renderer/stores/configStore.ts`:

```typescript
bisheng: {
  enabled: true,  // 改为 true
  baseUrl: 'http://localhost:7860',
  frontendUrl: 'http://localhost:3001',
  // ... 其他配置
}
```

#### 后端配置

编辑 `backend-service/app/config.py`:

```python
BISHENG_ENABLED: bool = True  # 改为 True
```

#### 重启应用

```bash
# 如果应用正在运行,先停止
# 然后重新启动
npm run dev
```

### 方案 3: 通过环境变量启用

创建或编辑 `.env` 文件:

```bash
# 在项目根目录
echo "BISHENG_ENABLED=true" >> .env

# 在 backend-service 目录
cd backend-service
echo "BISHENG_ENABLED=true" >> .env
```

## 验证

启用后,你应该看到:

1. ✅ "智能体"标签页可以点击(不再是灰色)
2. ✅ 状态栏显示"智能体"指示器
3. ✅ 点击标签页后可以看到智能体界面

## 完整配置示例

### 最小配置

```typescript
{
  enabled: true,
  baseUrl: 'http://localhost:7860',
  frontendUrl: 'http://localhost:3001',
  username: 'your_username',
  password: 'your_password',
  mode: 'api'
}
```

### 完整配置

```typescript
{
  enabled: true,
  baseUrl: 'http://localhost:7860',
  frontendUrl: 'http://localhost:3001',
  iframeProxyPort: 3002,
  username: 'your_username',
  password: 'your_password',
  mode: 'api',  // 或 'iframe'
  autoLogin: true,
  savePassword: true,
  timeout: 120000,
  retryAttempts: 3
}
```

## 常见问题

### Q1: 启用后标签页还是灰色?

**A:** 检查以下几点:
1. 确认配置已保存
2. 重启应用
3. 检查浏览器控制台是否有错误
4. 查看 `config.bisheng.enabled` 的值

### Q2: 如何检查当前配置?

**A:** 打开浏览器开发者工具,在控制台输入:

```javascript
// 检查配置
window.electronAPI.config.getAll().then(config => {
  console.log('Bisheng配置:', config.bisheng);
});
```

### Q3: 启用后无法连接 Bisheng?

**A:** 确保:
1. Bisheng 服务正在运行
2. 服务器地址正确
3. 网络连接正常
4. 防火墙没有阻止连接

### Q4: 如何临时禁用智能体功能?

**A:** 在设置中取消勾选"启用智能体服务"即可。

## 开发提示

### 开发环境建议

开发时建议默认启用,这样可以:
- 快速测试功能
- 避免每次都要手动启用
- 方便调试

### 生产环境建议

生产环境建议默认禁用,让用户:
- 根据需要启用
- 配置自己的服务器地址
- 控制功能可见性

## 相关文档

- [快速开始指南](./BISHENG_QUICKSTART.md)
- [完整集成指南](./BISHENG_AGENT_INTEGRATION.md)
- [测试清单](./BISHENG_TEST_CHECKLIST.md)

## 技术说明

智能体功能的启用状态由以下配置控制:

1. **前端**: `config.bisheng.enabled`
2. **后端**: `settings.BISHENG_ENABLED`
3. **UI**: `MainWindow.tsx` 中的 `enabled: config.bisheng?.enabled || false`

当 `enabled` 为 `false` 时:
- 标签页显示为禁用状态(灰色)
- 无法点击切换
- 不会初始化 Bisheng 服务
- 不会显示在状态栏

当 `enabled` 为 `true` 时:
- 标签页正常显示
- 可以点击切换
- 自动初始化 Bisheng 服务(如果配置了自动登录)
- 状态栏显示指示器
