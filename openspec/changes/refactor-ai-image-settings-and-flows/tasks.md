> Merge plan: 与 v2 Vision/Medical Intake 任务重叠（严格 JSON、无回退/无硬编码、场景与模型对齐），合并入 `refactor-api-v2-business`（Vision）。本文件在合并完成后归档。

## 1. Settings (AI 图片)
- [x] 1.1 从 `/v1/vision/models` 加载 VL 模型列表；错误时显示可重试文案。
- [x] 1.2 解析场景绑定的 `prompt_version` 并优先展示；若缺失再回退到 `active_version`；确保测试按钮与展示版本一致。
- [x] 1.3 测试按钮：`strict_json=true`、`schemaName=patient_info_v1`、`allow_fallback=false`，失败展示 `strict_json_parse_failed` 专用文案（提示截取右侧详情面板）。

## 2. Medical Intake 流程
- [x] 2.1 自动模式跳过预览/确认：截图→立即识别→结果页→流式推荐；
- [x] 2.2 错误处理：严格 JSON 失败返回专用提示，停留在可重新截图入口，不回退 OCR+LLM；
- [x] 2.3 状态与会话持久化：识别成功后保存患者信息；流式推荐过程中增量保存最终结果。

## 3. 桌面识别（一键开始）
- [x] 3.1 统一调用后端 VL 场景（`strict_json=true`, `schemaName=patient_info_v1`, `allow_fallback=false`），移除 OCR+LLM 与硬编码兜底；
- [x] 3.2 消息订阅驱动 UI 即时渲染；流式过程中无需切页；
- [x] 3.3 成功后写入患者记录（含截图/Markdown/原始结构）。

## 4. Tests
- [ ] 4.1 严格 JSON 失败：模拟后端返回非 JSON，期望 `strict_json_parse_failed`；
- [ ] 4.2 设置页测试：场景版本解析优先级与测试按钮参数断言；
- [ ] 4.3 E2E/集成：`tests/images/截屏2025-10-24 00.59.08.png` 识别字段与原图一致（“赵华/女/45/13391483/急诊科/…”）；
- [x] 4.4 一键开始：截图后不出现确认框，患者信息即时显示、推荐流式即时渲染。
