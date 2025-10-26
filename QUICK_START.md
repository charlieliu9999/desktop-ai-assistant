# 快速启动指南

**5分钟快速启动桌面AI助手**

---

## 🚀 一键启动 (推荐)

### macOS / Linux

```bash
cd desktop-ai-assistant
./start.sh
```

### Windows

```cmd
cd desktop-ai-assistant
start.bat
```

### 使用npm

```bash
cd desktop-ai-assistant
npm run start
```

---

## ✅ 启动成功标志

启动成功后,您会看到:

```
==========================================
  桌面AI助手 - 服务状态
==========================================

✅ 后端服务: http://127.0.0.1:8010
   API文档: http://127.0.0.1:8010/docs
✅ 前端服务: http://localhost:5928

==========================================
```

---

## 🔧 首次启动配置

### 1. 配置API密钥

编辑 `backend-service/.env` 文件:

```bash
# OpenAI API (必需)
OPENAI_API_KEY=sk-your-openai-api-key

# Deepseek API (可选)
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# Dashscope API (可选)
DASHSCOPE_API_KEY=sk-your-dashscope-api-key
```

### 2. 重启服务

配置完成后,按 `Ctrl+C` 停止服务,然后重新运行启动脚本。

---

## 📱 访问应用

### 方式1: Web浏览器
打开浏览器访问: http://localhost:5928

**注意**: 前端端口是5928,不是默认的5173!

### 方式2: Electron桌面应用

```bash
# 在新终端窗口
cd desktop-ai-assistant
npm run dev:main
```

---

## 🧪 验证功能

### 快速测试

```bash
# 测试后端API
curl http://127.0.0.1:8010/health

# 运行自动化测试
npm run test:api
```

### 手动测试

1. **AI对话**: 在对话框输入 "你好",查看AI回复
2. **截图识别**: 点击"一键截图",截取屏幕并识别
3. **患者信息**: 截取医疗系统界面,提取患者信息

---

## 🛑 停止服务

### 方式1: 使用Ctrl+C
在启动脚本的终端窗口按 `Ctrl+C`

### 方式2: 手动停止

```bash
# 停止后端
lsof -ti:8010 | xargs kill -9

# 停止前端
lsof -ti:5928 | xargs kill -9
```

---

## ❓ 常见问题

### 问题1: 端口被占用

**解决方案**:
```bash
# 查找并杀死占用端口的进程
lsof -ti:8010 | xargs kill -9  # 后端
lsof -ti:5173 | xargs kill -9  # 前端
```

### 问题2: 后端启动失败

**解决方案**:
```bash
cd backend-service
source venv/bin/activate
pip install -r requirements.txt
```

### 问题3: 前端依赖缺失

**解决方案**:
```bash
cd desktop-ai-assistant
npm install
```

### 问题4: API密钥错误

**解决方案**:
1. 检查 `backend-service/.env` 文件
2. 确保API密钥正确且有效
3. 重启后端服务

---

## 📚 更多文档

- [完整启动指南](./docs/PROJECT_STARTUP_GUIDE.md)
- [API文档](http://127.0.0.1:8010/docs)
- [功能测试报告](./docs/UI_FUNCTIONALITY_CHECK_SUMMARY.md)

---

## 🆘 获取帮助

- **GitHub Issues**: https://github.com/charlieliu/medical-integration-platform/issues
- **Email**: lzhy9999@163.com

---

**祝您使用愉快! 🎉**

