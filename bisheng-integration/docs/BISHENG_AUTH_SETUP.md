# Bisheng 认证配置指南

## 问题描述

Bisheng 服务返回 401 认证错误，提示缺少 `access_token_cookie`。

## 解决方案

### 方法一：获取访问令牌

1. **通过浏览器获取 Cookie**
   - 打开浏览器访问 Bisheng Web 界面
   - 登录到 Bisheng 平台
   - 打开开发者工具 (F12)
   - 在 Network 标签页中找到任意一个 API 请求
   - 复制 `access_token_cookie` 的值

2. **通过 API 登录获取令牌**
   ```bash
   # 登录获取令牌
   curl -X POST "http://localhost:7860/api/v1/login" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "your_username",
       "password": "your_password"
     }'
   ```

### 方法二：配置认证头

在测试页面中添加认证配置：

```javascript
// 在请求头中添加认证信息
const headers = {
  'accept': 'application/json',
  'Content-Type': 'application/json',
  'Cookie': 'access_token_cookie=YOUR_TOKEN_HERE'
};
```

### 方法三：修改 Bisheng 配置

如果是在开发环境，可以临时禁用认证：

1. 找到 Bisheng 配置文件
2. 设置 `auth.enabled: false`
3. 重启 Bisheng 服务

## 更新测试页面

### 1. 修改 BishengAgentTest.tsx

在 API 请求中添加认证头：

```typescript
const response = await fetch('http://localhost:7860/api/v1/workflow/list?page_size=10&page_num=1', {
  method: 'GET',
  headers: {
    'accept': 'application/json',
    'Cookie': 'access_token_cookie=YOUR_TOKEN_HERE', // 添加这行
  },
});
```

### 2. 修改独立测试页面

在 `bisheng-test.html` 中添加认证配置：

```javascript
// 在页面顶部添加配置
const BISHENG_CONFIG = {
  baseUrl: 'http://localhost:7860',
  authToken: 'YOUR_TOKEN_HERE' // 在这里设置你的令牌
};

// 在请求中使用
const response = await fetch(`${BISHENG_CONFIG.baseUrl}/api/v1/workflow/list?page_size=10&page_num=1`, {
  method: 'GET',
  headers: {
    'accept': 'application/json',
    'Cookie': `access_token_cookie=${BISHENG_CONFIG.authToken}`,
  },
});
```

## 环境变量配置

### 1. 创建环境配置文件

创建 `.env.local` 文件：

```env
VITE_BISHENG_BASE_URL=http://localhost:7860
VITE_BISHENG_AUTH_TOKEN=your_token_here
```

### 2. 在代码中使用环境变量

```typescript
const BISHENG_BASE_URL = import.meta.env.VITE_BISHENG_BASE_URL || 'http://localhost:7860';
const AUTH_TOKEN = import.meta.env.VITE_BISHENG_AUTH_TOKEN;

const headers = {
  'accept': 'application/json',
  'Content-Type': 'application/json',
  ...(AUTH_TOKEN && { 'Cookie': `access_token_cookie=${AUTH_TOKEN}` })
};
```

## 安全注意事项

1. **不要将令牌提交到版本控制**
   - 将 `.env.local` 添加到 `.gitignore`
   - 使用环境变量而不是硬编码

2. **令牌过期处理**
   - 实现令牌刷新机制
   - 添加错误处理和重试逻辑

3. **生产环境配置**
   - 使用更安全的认证方式
   - 配置适当的 CORS 策略

## 故障排除

### 常见问题

1. **令牌无效**
   - 检查令牌是否正确复制
   - 确认令牌是否过期
   - 重新登录获取新令牌

2. **CORS 错误**
   - 检查 Bisheng 服务的 CORS 配置
   - 确认请求域名是否被允许

3. **网络连接问题**
   - 确认 Bisheng 服务正在运行
   - 检查防火墙设置
   - 验证端口是否正确

### 调试技巧

1. **使用浏览器开发者工具**
   - 查看 Network 标签页的请求详情
   - 检查请求头和响应头

2. **使用 curl 测试**
   ```bash
   curl -X GET "http://localhost:7860/api/v1/workflow/list?page_size=10&page_num=1" \
     -H "accept: application/json" \
     -H "Cookie: access_token_cookie=YOUR_TOKEN"
   ```

3. **查看 Bisheng 日志**
   - 检查 Bisheng 服务的日志输出
   - 查找认证相关的错误信息

## 下一步

1. 获取有效的访问令牌
2. 更新测试页面配置
3. 测试 API 连接
4. 开始使用智能体交互功能
