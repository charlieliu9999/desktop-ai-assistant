## 前端适配冒烟测试（/v1 场景化）

本说明用于验证前端已完成的新版 API 适配是否工作正常，覆盖 AI 文本、视觉、语音、智能体四类能力。

### 预置条件
- 后端运行于 `http://localhost:8010`，接口 `/v1/*` 可用。
- 建议使用脚本快速自检：`bash scripts/smoke-check.sh`。
- Electron 前端采用“后端转发”模式：设置 → AI 设置 中选择“后端转发（scene）”。

### 启动方式
- 一键脚本：`./start-full-stack.sh --routing backend`
- 仅后端：`(cd backend-service && ./run.sh)`
- 仅前端：`./start-app.sh`

### AI 文本
- 打开主窗口 → “AI助手对话”，输入“测试连通”。
- 期望：正常流式输出；网络面板出现 `POST /v1/ai/chat/stream?scene=ai_chat`（或 `ai_chat_aliyun`）。

### 视觉理解（患者信息提取）
- 在“AI助手对话”点击“一键完成”（自动截图-识别-建议）。
- 若 设置 → 视觉模型 中路由为“后端转发”，应调用 `POST /v1/vision/understand?scene=screen_recognition(_aliyun)`。
- 期望：在日志中可见 `structured.patient_info_v1` 字段并生成建议 Markdown。

### 语音识别（STT）
- 打开“语音助手”窗口，开始录音 → 停止。
- 设置 → 语音设置 → 后端语音模型 中可选择 STT 模型（可留空使用后端默认）。
- 期望：发起 `POST /v1/voice/stt`，识别文本显示在窗口，错误降级提示清晰。

### 智能体（Bisheng）
- 进入“智能体服务”，登录后拉取工作流列表。
- 进入任意工作流开始对话。
- 期望：SSE 事件 `bisheng-stream-*` 按序到达，背后由主进程代理至 `/v1/agent/invoke`（失败自动回退旧直连）。

### 故障排查
- 前端：打开 DevTools → Console + Network，观察 `v1` 调用与报错。
- 主进程：查看终端日志，确认已切换到 AgentServiceAdapter。
- 后端：查看 8010 日志，定位具体服务错误（AI/Voice/Vision/Agent）。

### 通过标准
- 四类能力均可调用成功；若某项失败，有明确错误信息与回退策略，不影响其他能力使用。

