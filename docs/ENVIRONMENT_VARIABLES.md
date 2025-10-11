# 环境变量配置说明

## 概述

本项目使用环境变量来管理不同环境下的配置，包括后端 API 地址等。

## 环境变量文件

### 文件优先级

Vite 会按以下优先级加载环境变量文件：

1. `.env.{mode}.local` - 本地覆盖（不提交到 Git）
2. `.env.{mode}` - 环境特定配置（提交到 Git）
3. `.env.local` - 本地覆盖（不提交到 Git）
4. `.env` - 基础配置（不提交到 Git）

其中 `{mode}` 可以是：
- `development` - 开发环境
- `production` - 生产环境
- `test` - 测试环境

### 文件说明

| 文件 | 用途 | 是否提交 |
|------|------|---------|
| `.env` | 基础配置（包含敏感信息） | ❌ 不提交 |
| `.env.local` | 本地覆盖 | ❌ 不提交 |
| `.env.development` | 开发环境配置模板 | ✅ 提交 |
| `.env.development.local` | 开发环境本地覆盖 | ❌ 不提交 |
| `.env.production` | 生产环境配置模板 | ✅ 提交 |
| `.env.production.local` | 生产环境本地覆盖 | ❌ 不提交 |

## 可用的环境变量

### 前端环境变量

所有前端环境变量必须以 `VITE_` 开头才能被 Vite 暴露给客户端代码。

#### VITE_API_BASE_URL

**说明**: 后端 API 的基础 URL

**默认值**: `http://127.0.0.1:8010/api`

**示例**:
```bash
# 开发环境
VITE_API_BASE_URL=http://127.0.0.1:8010/api

# 生产环境
VITE_API_BASE_URL=https://api.production.com/api

# 本地测试其他端口
VITE_API_BASE_URL=http://localhost:8080/api
```

## 使用方法

### 1. 开发环境

开发时，Vite 会自动加载 `.env.development` 文件。

如果需要本地覆盖配置，创建 `.env.development.local` 文件：

```bash
# .env.development.local
VITE_API_BASE_URL=http://localhost:8080/api
```

### 2. 生产环境

构建生产版本时，Vite 会加载 `.env.production` 文件。

```bash
npm run build
```

### 3. 在代码中使用

```typescript
// 获取环境变量
const apiBaseURL = import.meta.env.VITE_API_BASE_URL;

// 检查是否在开发模式
const isDev = import.meta.env.DEV;

// 检查是否在生产模式
const isProd = import.meta.env.PROD;

// 获取当前模式
const mode = import.meta.env.MODE; // 'development' | 'production'
```

## 最佳实践

### 1. 敏感信息管理

❌ **不要**在 `.env.development` 或 `.env.production` 中存储敏感信息（如 API 密钥）

✅ **应该**使用 `.env.local` 或 `.env.{mode}.local` 存储敏感信息

```bash
# ❌ 错误：不要在提交的文件中存储密钥
# .env.development
VITE_API_KEY=sk-1234567890abcdef

# ✅ 正确：在本地文件中存储密钥
# .env.development.local
VITE_API_KEY=sk-1234567890abcdef
```

### 2. 配置模板

`.env.development` 和 `.env.production` 应该只包含：
- 非敏感的配置
- 配置示例
- 默认值

```bash
# .env.development
# 后端 API 地址
VITE_API_BASE_URL=http://127.0.0.1:8010/api

# API 密钥（请在 .env.development.local 中设置实际值）
# VITE_API_KEY=your-api-key-here
```

### 3. 团队协作

1. **提交配置模板**：`.env.development` 和 `.env.production` 提交到 Git
2. **本地覆盖**：每个开发者创建自己的 `.env.development.local`
3. **文档说明**：在 README 中说明需要配置的环境变量

### 4. 部署

生产环境部署时：

1. **不要**依赖 `.env` 文件
2. **应该**使用部署平台的环境变量功能（如 Vercel、Netlify）
3. **或者**在 CI/CD 中注入环境变量

## 故障排查

### 环境变量未生效

1. **检查变量名**：必须以 `VITE_` 开头
2. **重启开发服务器**：修改环境变量后需要重启
3. **检查文件名**：确保文件名正确（如 `.env.development`）
4. **检查优先级**：`.env.local` 会覆盖 `.env.development`

### 构建后环境变量错误

环境变量在构建时被静态替换，不能在运行时动态修改。

```typescript
// ❌ 错误：这不会工作
const apiUrl = import.meta.env['VITE_API_' + 'BASE_URL'];

// ✅ 正确：直接引用
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## 参考资料

- [Vite 环境变量文档](https://vitejs.dev/guide/env-and-mode.html)
- [Vite 环境变量和模式](https://cn.vitejs.dev/guide/env-and-mode.html)

---

**创建时间**: 2025-10-11  
**最后更新**: 2025-10-11  
**维护者**: 开发团队

