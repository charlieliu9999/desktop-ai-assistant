## 1. Frontend
- [x] 1.1 PatientInfoCapture：自动模式去预览/确认对话框，截图后直接识别并进入结果页，显示患者信息并滚动显示推荐内容。
- [x] 1.2 OneClickDesktopChat：统一调用后端 VL 场景 (`strictJson=true`, `allowFallback=false`, `schemaName=patient_info_v1`)，移除本地 OCR/文本解析及硬编码兜底（如临时 patient_id）。
- [x] 1.3 SettingsWindow：测试用例优先采用场景绑定的 `prompt_version` 展示与调用；严格 JSON 失败时显示专用文案。
- [x] 1.4 消息流：订阅当前会话消息并即时渲染，确保不依赖切页触发刷新。

## 2. Backend
- [x] 2.1 确认 `/v1/vision/understand` 在 strict_json=true 时，解析失败返回 `strict_json_parse_failed`，且不启用 OCR+LLM 回退（仅当 allow_fallback=true 才可能回退）。
- [x] 2.2 验证 `screen_recognition(_aliyun)` 使用 `screen_recognition_cn` 提示词版本 `20251023T10081`，包含“右侧详情面板/姓名年龄规则”。
- [x] 2.3 提供可查询视觉模型与场景接口（已存在），供前端填充下拉与读取版本。

## 3. Tests
- [x] 3.1 严格 JSON 失败返回错误：模拟 DashScope 返回非 JSON，期望 400/500 + `strict_json_parse_failed`。
- [x] 3.2 桌面识别自动流程：截图后不出现确认框，结果即时流式显示。
- [ ] 3.3 基准图像：`tests/images/截屏2025-10-24 00.59.08.png` 识别应为“赵华/女/45/13391483/急诊科/…”。

## 4. Rollout
- [ ] 4.1 在 `FEATURE_FLAGS.USE_BACKEND_VISION=true` 的默认下发布；保留场景/模型可配置。
- [ ] 4.2 文案与异常信息本地化校对；记录操作日志以便回溯。
