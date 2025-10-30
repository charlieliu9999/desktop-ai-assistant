# 模型与提供商配置指南

本文介绍如何在后端添加/修改 Provider（提供商）与 Model（模型），以及如何设置默认场景模型并持久化配置。

## 一、通过注册中心文件添加 Provider / Model（推荐）

- 配置文件：`backend-service/config/registry.json`
- 数据模型：`app/registry/models.py`
- 读写：`app/registry/store.py`

示例（新增一个 OpenAI 兼容的 DashScope 提供商与模型）：

```
{
  "providers": [
    {
      "id": "dashscope",
      "name": "Ali DashScope",
      "kind": "openai",
      "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "enabled": true,
      "capabilities": ["llm"],
      "auth": { "type": "env", "env_key": "DASHSCOPE_API_KEY" }
    }
  ],
  "models": [
    {
      "id": "qwen-max",
      "name": "qwen-max",
      "provider_id": "dashscope",
      "modality": "llm",
      "enabled": true
    }
  ]
}
```

- 将密钥写入 `backend-service/.env`（不写在 `registry.json` 中）：

```
DASHSCOPE_API_KEY=sk-***
DASHSCOPE_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
```

- 重启后端后，查看：
  - `GET /v2/registry/providers` 与 `GET /v2/registry/models`（只读总览）
  - `GET /v2/ai/providers` 与 `GET /v2/ai/health`（运行期视图）

注意：当前支持自动实例化的 kind 有 `openai`（含兼容网关，如 dashscope、deepseek）与 `ollama`。其他类型需走方式二（扩展 Provider 类）。

## 二、扩展 Provider 类（非 OpenAI 兼容）

- 位置：`app/services/ai/providers/<your_provider>.py`
- 基类：`AIProviderBase`
- 需实现：`chat`、`chat_stream`、（可选）`analyze`、`health_check`
- 运行期注册：在 `app/main.py` 中根据配置构造 `ProviderConfig`，调用

```
ai_manager.register_provider("<id>", YourProvider(cfg), is_default=False)
```

- 也可在“从注册中心引导 Provider”的逻辑里扩展对新 `kind` 的实例化，仍通过 `registry.json` 驱动。

## 三、设置默认 Provider/Model（场景化）并持久化

- 配置文件：`backend-service/app/models.json`
- 数据模型与持久化：`app/config_models.py`（`load_config/save_config/apply_to_settings`）
- API：
  - 读取：`GET /v1/config/models`
  - 更新：`PUT /v1/config/models`（提交完整结构）

示例（切换对话默认到 dashscope/qwen-max）：

```
{
  "provider_bases": { "dashscope": "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  "ai_chat": {
    "selected_provider": "dashscope",
    "selected_model": "qwen-max",
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1"
  }
}
```

- `provider_bases` 会覆盖对应 provider 的 `base_url` 于运行期 settings；
- 场景（`ai_chat`/`screen_recognition` 等）的 `selected_provider/selected_model` 会作为前端/后端默认生效；
- 如需让 Provider 的 `base_url` 改动在运行期完全生效，建议重启后端（现有 Provider 实例不会热替换）。

## 四、验证与排错

- 查看注册表：`GET /v2/registry/providers`、`GET /v2/registry/models`
- 健康检查：`GET /v2/ai/health`
- 实测调用：`POST /v2/ai/chat`（可传 `provider` 与 `options.model` 显式验证）
- 集成测试（可选）：触发 GitHub Actions 工作流 `Integration Live Tests (Optional)` 并在仓库 Secrets 注入密钥

## 五、前端 UI 管理的计划（可选）

当前后端提供：
- 场景默认配置的读写（`/v1/config/models`）
- 注册中心（providers/models）的只读视图（`/v2/registry/*`）

如需在前端 UI 新增/编辑 Provider/Model，需新增安全写入端点：
- `POST/PUT/DELETE /v2/registry/providers`、`/v2/registry/models`，服务端验证与落盘 `save_registry()`
- 前端设置面板新增“提供商/模型管理”页，表单项：id/name/kind/base_url/auth.env_key/capabilities 与模型列表
- 阶段性上线：先支持只读 + 场景选择（已有），再上线“新增/编辑”与“校验（健康检查）”

建议逐步推进，确保安全与审核日志（必要时）。

