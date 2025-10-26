## Why
- 截图完成后仍出现确认对话框，导致结果不即时滚动显示，影响医生使用效率。
- 患者识别出现从左侧列表或中部表格“串场”的错误（例如识别为“张三/男/45”），未能严格限定在“右侧详情面板”。
- 需强制 VL 多模态严格 JSON 输出；禁止任何 OCR+LLM 或文本解析回退；禁止前端硬编码兜底（如生成临时 patient_id 之类）。

## What Changes
- UI 流程：在自动模式下（autoAnalyze=true），截图→立即识别→马上显示患者信息和推荐流式内容，不出现预览/确认框。
- 识别调用：统一走后端场景 `/v1/vision/understand?scene=screen_recognition(_aliyun)`，开启 `strict_json=true`、`allow_fallback=false`、`schemaName=patient_info_v1`，仅 VL 模型。
- 严格要求：严格 JSON 解析失败返回 `strict_json_parse_failed`，前端只提示重试，不得回退 OCR+LLM，也不得编造或硬编码字段。
- 提示词约束：保证仅从右/中部“患者信息/基本信息/诊断信息/医嘱录入/病历详情”区域取值，忽略左侧列表与中部患者列表/卡片/表格行；姓名只取“姓名/患者姓名/name”；年龄只取“年龄”数值，不从生日推算。
- 即时渲染：流式推荐消息订阅当前会话消息列表，渲染不依赖页面切换。

## Impact
- 前端：PatientInfoCapture、OneClickDesktopChat 的工作流与识别调用方式；设置页测试读取场景版本一致。
- 后端：严格 JSON 的错误分支与场景/提示词的一致性（已具备，需验证）。
- 测试：增加严格 JSON 失败用例、图片识别基准用例（如 tests/images/截屏2025-10-24 00.59.08.png）。

## Acceptance
- 截图完成后不再出现确认对话框；患者信息与推荐内容即时显示并滚动更新。
- 对 `tests/images/截屏2025-10-24 00.59.08.png`，识别应为“赵华/女/45/13391483/急诊科/…”。
- 严格 JSON 失败时返回 `strict_json_parse_failed`，前端只显示错误提示，不进行任何 OCR+LLM/文本回退，不生成临时字段。

