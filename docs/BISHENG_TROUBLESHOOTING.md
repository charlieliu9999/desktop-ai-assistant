# Bisheng 智能体故障排除指南

## 常见问题及解决方案

### 问题 1: 智能体标签页显示为灰色/禁用

#### 症状
- "智能体"标签页无法点击
- 标签页显示为灰色
- 状态栏没有"智能体"指示器

#### 原因
智能体功能默认是禁用的,需要在设置中启用。

#### 解决方案

**方法 1: 通过设置界面启用(推荐)**

1. 打开应用
2. 点击右下角的"设置"图标
3. 在左侧菜单找到"智能体设置"
4. 勾选"启用智能体服务"
5. 填写 Bisheng 服务器地址、用户名、密码
6. 点击"测试连接"验证配置
7. 点击"保存并刷新"按钮
8. 等待界面刷新,标签页应该已启用

**方法 2: 修改默认配置(开发环境)**

编辑 `src/renderer/stores/configStore.ts`:
```typescript
bisheng: {
  enabled: true,  // 改为 true
  // ...
}
```

重启应用。

#### 验证
- ✅ 标签页可以点击
- ✅ 状态栏显示"智能体"
- ✅ 点击后可以看到界面

---

### 问题 2: 保存配置后标签页仍然是灰色

#### 症状
- 已勾选"启用智能体服务"
- 已保存配置
- 但标签页仍然无法点击

#### 原因
配置更新后需要刷新界面才能生效。

#### 解决方案

1. 在智能体设置页面,点击"保存并刷新"按钮(而不是普通的保存按钮)
2. 或者手动刷新: 按 `Cmd/Ctrl + R`
3. 或者重启应用

---

### 问题 3: 测试连接失败

#### 症状
点击"测试连接"后显示错误消息。

#### 可能原因及解决方案

**原因 1: Bisheng 服务未运行**

检查:
```bash
# 检查 Bisheng 后端
curl http://localhost:7860/health

# 检查 Bisheng 前端
curl http://localhost:3001
```

解决: 启动 Bisheng 服务

**原因 2: 服务器地址错误**

检查配置中的地址是否正确:
- 后端默认: `http://localhost:7860`
- 前端默认: `http://localhost:3001`

**原因 3: 用户名或密码错误**

- 确认用户名和密码正确
- 尝试在 Bisheng 网页端登录验证

**原因 4: 网络问题**

- 检查防火墙设置
- 检查网络连接
- 尝试 ping 服务器地址

**原因 5: 跨域问题**

- 确保 Bisheng 服务允许跨域请求
- 检查 Bisheng 的 CORS 配置

---

### 问题 4: 后端数据库连接错误

#### 症状
后端启动时显示:
```
ERROR: 数据库初始化失败: connection to server at "localhost" failed
```

#### 原因
PostgreSQL 数据库未运行或配置错误。

#### 解决方案

**方案 1: 忽略错误(推荐)**

Bisheng 功能不依赖数据库,可以安全忽略此错误。后端已配置为在数据库不可用时继续运行。

日志会显示:
```
WARNING: 数据库初始化失败(非必需)
INFO: 应用将继续运行,但依赖数据库的功能将不可用
```

**方案 2: 启动数据库**

如果需要使用依赖数据库的功能:

```bash
# 启动 PostgreSQL
brew services start postgresql@14

# 或使用 Docker
docker run -d \
  --name postgres \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=medical_ai \
  -p 5432:5432 \
  postgres:14
```

**方案 3: 修改数据库配置**

编辑 `backend-service/app/config.py`:
```python
DATABASE_URL: str = "postgresql://your_user:your_password@localhost:5432/your_db"
```

或使用环境变量:
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/medical_ai"
```

---

### 问题 5: 智能体列表为空

#### 症状
- 标签页已启用
- 但看不到任何智能体

#### 原因及解决方案

**原因 1: 未登录**

解决: 在设置中配置用户名密码,点击"测试连接"

**原因 2: Token 过期**

解决: 重新点击"测试连接"获取新 Token

**原因 3: 账号下没有工作流**

解决: 
1. 登录 Bisheng 网页端
2. 创建并发布至少一个工作流
3. 刷新应用

**原因 4: API 请求失败**

检查浏览器控制台错误:
```javascript
// 打开开发者工具
Cmd/Ctrl + Shift + I

// 查看 Console 标签
```

---

### 问题 6: 对话无响应

#### 症状
- 发送消息后没有回复
- 或者一直显示"加载中"

#### 原因及解决方案

**原因 1: 工作流未发布**

解决: 在 Bisheng 中确保工作流已发布

**原因 2: 网络超时**

解决: 在设置中增加超时时间(默认 120 秒)

**原因 3: 工作流执行错误**

检查:
1. Bisheng 后端日志
2. 浏览器控制台错误
3. 网络请求状态

**原因 4: 输入格式错误**

确保输入符合工作流的要求

---

### 问题 7: iframe 模式显示空白

#### 症状
- 选择 iframe 模式
- 弹窗显示空白页面

#### 原因及解决方案

**原因 1: 代理服务器未启动**

检查:
```javascript
// 在控制台执行
window.electronAPI.bisheng.getProxyStatus()
```

解决: 重启应用,代理会自动启动

**原因 2: 前端地址错误**

检查设置中的"前端地址"是否正确(默认 `http://localhost:3001`)

**原因 3: 端口冲突**

默认代理端口 3002 可能被占用,尝试修改为其他端口

**原因 4: 浏览器安全限制**

查看浏览器控制台是否有安全错误

---

### 问题 8: 流式响应中断

#### 症状
- 对话开始正常
- 但中途突然停止

#### 原因及解决方案

**原因 1: 网络不稳定**

解决: 检查网络连接,增加重试次数

**原因 2: 服务器超时**

解决: 增加超时时间设置

**原因 3: Bisheng 服务重启**

解决: 等待服务恢复,重新发送消息

---

## 调试技巧

### 1. 查看配置

```javascript
// 在浏览器控制台
window.electronAPI.config.getAll().then(config => {
  console.log('Bisheng 配置:', config.bisheng);
});
```

### 2. 查看认证状态

```javascript
// 检查是否已认证
window.electronAPI.bisheng.isAuthenticated().then(result => {
  console.log('认证状态:', result);
});
```

### 3. 查看代理状态

```javascript
// 检查代理服务器
window.electronAPI.bisheng.getProxyStatus().then(status => {
  console.log('代理状态:', status);
});
```

### 4. 手动测试 API

```bash
# 测试登录
curl -X POST http://localhost:7860/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# 测试工作流列表
curl http://localhost:7860/api/v2/workflows \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. 查看日志

**Electron 日志**:
```
logs/electron.log
```

**后端日志**:
```
backend-service/logs/app.log
```

**Bisheng 日志**:
查看 Bisheng 服务的日志输出

---

## 性能优化

### 1. 减少首字延迟

- 使用 API 模式而不是 iframe 模式
- 确保网络连接稳定
- 选择响应速度快的工作流

### 2. 提升加载速度

- 减少工作流列表大小
- 启用配置缓存
- 使用本地 Bisheng 服务

### 3. 降低内存占用

- 关闭不使用的标签页
- 定期重启应用
- 限制对话历史长度

---

## 获取帮助

### 1. 查看文档

- [快速开始指南](./BISHENG_QUICKSTART.md)
- [完整集成指南](./BISHENG_AGENT_INTEGRATION.md)
- [启用指南](./BISHENG_ENABLE_GUIDE.md)

### 2. 检查日志

查看详细的错误信息和堆栈跟踪

### 3. 提交 Issue

如果问题仍未解决,请提交 Issue 并包含:
- 问题描述
- 复现步骤
- 错误日志
- 系统信息
- 配置信息(隐藏敏感信息)

---

## 常用命令

### 重启服务

```bash
# 重启后端
cd backend-service
python -m uvicorn app.main:app --reload --port 8010

# 重启 Electron
npm run dev
```

### 清除缓存

```bash
# 清除 Electron 缓存
rm -rf ~/Library/Application\ Support/desktop-ai-assistant

# 清除 npm 缓存
npm cache clean --force
```

### 重新安装依赖

```bash
# 前端
rm -rf node_modules package-lock.json
npm install

# 后端
cd backend-service
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 预防措施

### 1. 定期备份配置

导出配置文件,避免配置丢失

### 2. 保持服务更新

定期更新 Bisheng 和应用版本

### 3. 监控服务状态

定期检查 Bisheng 服务是否正常运行

### 4. 测试连接

配置修改后及时测试连接

---

**最后更新**: 2025-10-08
