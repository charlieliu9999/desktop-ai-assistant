# 前端E2E测试指南

## 概述

本文档说明如何运行前端E2E烟测,验证所有后端服务的可用性。

## 测试覆盖

### 1. 健康检查
- **端点**: `GET /health`
- **验证**: 服务是否正常运行

### 2. AI对话服务
- **端点**: `POST /v1/ai/chat`
- **测试provider**:
  - OpenAI (gpt-4o-mini)
  - Deepseek (deepseek-chat)
  - Dashscope/通义千问 (qwen3-max)
  - Local Ollama (qwen2.5:32b)
- **验证**: 
  - 响应成功
  - 返回有效的对话内容
  - 处理时间合理

### 3. 视觉理解服务
- **端点**: `POST /v1/vision/understand`
- **测试场景**:
  - 屏幕截图识别 (Dashscope)
  - 患者信息提取 (OpenAI)
- **验证**:
  - 图片上传成功
  - OCR文本提取
  - 结构化数据提取

### 4. 语音识别服务
- **端点**: `POST /v1/voice/stt`
- **Provider**: OpenAI Whisper API (默认)
- **验证**:
  - 音频上传成功
  - 语音转文字准确
  - 支持多种音频格式

### 5. 智能体服务
- **端点**: `GET /v1/agent/list`
- **验证**:
  - 获取智能体列表
  - 支持无Authorization fallback

## 快速开始

### 方式1: 一键启动并测试

```bash
cd desktop-ai-assistant
./start-with-test.sh
```

这个脚本会:
1. 检查后端服务状态
2. 如果未运行,自动启动后端
3. 运行完整的E2E测试
4. 生成测试报告

### 方式2: 手动运行测试

```bash
# 1. 确保后端服务已启动
cd desktop-ai-assistant/backend-service
./run.sh

# 2. 在另一个终端运行测试
cd desktop-ai-assistant
npm run smoke:frontend
```

### 方式3: 只启动后端,不运行测试

```bash
cd desktop-ai-assistant
./start-with-test.sh --no-test
```

## 测试报告

测试完成后,会生成详细报告:

**位置**: `desktop-ai-assistant/docs/FRONTEND_E2E_REPORT.md`

报告包含:
- 每个接口的响应时间
- 成功/失败状态
- 完整的响应数据
- 测试摘要

## 环境变量

可以通过环境变量自定义测试:

```bash
# 自定义后端URL
export BACKEND_URL=http://localhost:8010

# 运行测试
npm run smoke:frontend
```

## 语音识别配置

### 默认配置 (推荐)

使用OpenAI Whisper API,无需本地依赖:

```python
# backend-service/app/main.py
stt_service = STTService(provider="openai", model_name="whisper-1")
```

**优点**:
- 无需安装ffmpeg
- 无需下载模型
- 识别准确度高
- 支持多种音频格式

**要求**:
- 设置环境变量 `OPENAI_API_KEY`

### 本地Whisper (可选)

如果需要完全本地化:

```python
# 方式1: 使用openai-whisper
stt_service = STTService(provider="local", model_name="base")

# 方式2: 使用faster-whisper (更快)
stt_service = STTService(provider="faster-whisper", model_name="base")
```

**要求**:
1. 安装ffmpeg: `brew install ffmpeg` (macOS)
2. 安装whisper:
   ```bash
   pip install openai-whisper
   # 或
   pip install faster-whisper
   ```

## 添加测试用例

### 添加AI Provider测试

编辑 `scripts/frontend-e2e-test.js`:

```javascript
const AI_PROVIDERS = [
  // ... 现有配置
  { 
    provider: 'new-provider', 
    model: 'model-name', 
    scene: 'ai_chat' 
  }
];
```

### 添加视觉测试图片

1. 将图片放到 `tests/images/` 目录
2. 更新测试配置:

```javascript
const VISION_TESTS = [
  // ... 现有配置
  {
    name: 'new-image.png',
    scene: 'screen_recognition',
    provider: 'openai'
  }
];
```

### 添加语音测试音频

1. 将音频文件放到 `tests/audio/` 目录
2. 支持格式: WAV, MP3, M4A, WebM, OGG
3. 测试脚本会自动使用 `test.wav`

## 故障排查

### 后端服务启动失败

```bash
# 查看日志
tail -f logs/backend.log

# 检查端口占用
lsof -i :8010

# 手动启动
cd backend-service
./run.sh
```

### 语音识别失败

**错误**: "No module named 'whisper'"

**解决**:
1. 使用OpenAI API (推荐):
   ```bash
   export OPENAI_API_KEY=your-key
   ```

2. 或安装本地whisper:
   ```bash
   cd backend-service
   source venv/bin/activate
   pip install openai-whisper
   # 或
   pip install faster-whisper
   ```

### 视觉识别失败

**错误**: "Image not found"

**解决**:
- 确保图片在 `tests/images/` 目录
- 检查文件名是否正确
- 支持的格式: PNG, JPEG

### AI对话超时

**原因**: 模型响应慢或网络问题

**解决**:
- 检查API密钥是否正确
- 检查网络连接
- 尝试其他provider

## 持续集成

可以将E2E测试集成到CI/CD流程:

```yaml
# .github/workflows/e2e-test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Run E2E Tests
        run: |
          cd desktop-ai-assistant
          ./start-with-test.sh
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
```

## 最佳实践

1. **定期运行测试**: 每次代码变更后运行
2. **检查报告**: 关注响应时间和成功率
3. **更新测试用例**: 添加新功能时同步更新测试
4. **保持环境一致**: 使用相同的API密钥和配置
5. **监控日志**: 出现问题时查看详细日志

## 相关文档

- [后端API文档](http://localhost:8010/docs)
- [配置指南](./CONFIGURATION_GUIDE.md)
- [快速开始](./QUICK_START.md)

