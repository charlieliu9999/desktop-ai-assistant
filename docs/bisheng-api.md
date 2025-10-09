# Bisheng 工作流 API 接口文档

## 基本信息

- **基础URL**: `http://localhost:7860` (后端API)
- **前端URL**: `http://localhost:3001` (前端界面)
- **认证方式**: Bearer Token (通过登录接口获取)

## 1. 用户登录接口

### 请求

```
POST /api/v1/user/login
Content-Type: application/json
```

**请求体**:
```json
{
  "user_name": "lzhy9999@163.com",
  "password": "Moto@9999"
}
```

### 响应

**成功响应** (200):
```json
{
  "status_code": 200,
  "status_message": "SUCCESS",
  "data": {
    "user_name": "lzhy9999@163.com",
    "email": null,
    "phone_number": null,
    "user_id": 1,
    "role": "admin",
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "web_menu": [],
    "admin_groups": null
  }
}
```

**响应头**:
```
Set-Cookie: access_token_cookie=<JWT_TOKEN>; HttpOnly; Path=/
Set-Cookie: refresh_token_cookie=<REFRESH_TOKEN>; HttpOnly; Path=/
```

## 2. 工作流执行接口

### 请求

```
POST /api/v2/workflow/invoke
Content-Type: application/json
Authorization: Bearer <access_token>
Accept: text/event-stream
```

**请求体**:
```json
{
  "workflow_id": "d5e79601de8245768a38ee756a14a067",
  "stream": true,
  "input": {
    "user_input": "你好，这是一个测试消息"
  },
  "session_id": "可选，用于保持会话上下文",
  "message_id": "可选，消息ID"
}
```

**重要说明**:
- `stream`: 设为 `true` 启用流式返回（推荐），`false` 为非流式
- `input`: 平铺字典结构，直接包含输入字段，**不要**嵌套 `workflow_id` 作为 key
- `session_id`: 首次调用可不传，后续请求必须使用接口返回的 `session_id`
- `message_id`: 用于标识消息，后续交互时需要传递

### 响应 (流式 SSE)

**事件格式**:
```
data: <JSON对象>

data: <JSON对象>
```

每个 `data:` 行后跟一个 JSON 对象，表示一个事件。

## 3. 事件类型详解

### 3.1 开场白事件 (guide_word)

```json
{
  "event": "guide_word",
  "node_id": "start_xxx",
  "node_execution_id": "xxxxxxxx",
  "output_schema": {
    "message": "本工作流可以解决xxxx等问题"
  }
}
```

**处理**: 展示 `output_schema.message` 给用户

### 3.2 引导问题事件 (guide_question)

```json
{
  "event": "guide_question",
  "node_id": "start_xxx",
  "node_execution_id": "xxxxxxxx",
  "output_schema": {
    "message": ["引导问题1", "引导问题2"]
  }
}
```

**处理**: 展示引导问题列表，用户点击后作为输入继续调用

### 3.3 等待输入事件 (input)

#### 对话框形式 (dialog_input)

```json
{
  "event": "input",
  "message_id": "410",
  "node_id": "input_xxxx",
  "node_execution_id": "xxxxx",
  "input_schema": {
    "input_type": "dialog_input",
    "value": [
      {
        "key": "user_input",
        "type": "text",
        "value": "",
        "label": null,
        "multiple": false,
        "required": true
      },
      {
        "key": "dialog_files_content",
        "type": "dialog_file",
        "value": [],
        "label": "上传文件内容"
      },
      {
        "key": "dialog_file_accept",
        "type": "dialog_file_accept",
        "value": "all",
        "label": "上传文件类型"
      }
    ]
  }
}
```

**后续请求**:
```json
{
  "workflow_id": "xxx",
  "session_id": "<从响应中获取>",
  "message_id": "410",
  "input": {
    "user_input": "用户输入的内容",
    "dialog_files_content": ["minio://127.0.0.1:9000/xxxx"]
  }
}
```

**注意**: `input` 是平铺字典，直接包含 `user_input` 等字段，**不要**嵌套 `node_id`

#### 表单形式 (form_input)

```json
{
  "event": "input",
  "message_id": "xxx",
  "node_id": "input_xxxx",
  "input_schema": {
    "input_type": "form_input",
    "value": [
      {
        "key": "text_input",
        "type": "text",
        "value": "默认值",
        "label": "文本输入",
        "required": true
      },
      {
        "key": "category",
        "type": "select",
        "label": "下拉框",
        "multiple": false,
        "options": [
          {"id": "0b8a2fe9", "text": "选项1"},
          {"id": "eb5f4ade", "text": "选项2"}
        ]
      }
    ]
  }
}
```

### 3.4 输出事件 (output_msg)

```json
{
  "event": "output_msg",
  "node_id": "output_xxx",
  "node_execution_id": "xxxxxxxxx",
  "output_schema": {
    "message": "输出内容",
    "output_key": "output",
    "files": [
      {
        "path": "http://minio:9000/xxx.png",
        "name": "测试图片.png"
      }
    ],
    "source_url": ""
  }
}
```

**处理**: 展示 `output_schema.message` 和文件列表

### 3.5 流式输出事件 (stream_msg)

#### 输出中 (status="stream")

```json
{
  "event": "stream_msg",
  "node_id": "llm_xxx",
  "node_execution_id": "xxxxxx",
  "status": "stream",
  "output_schema": {
    "message": "你",
    "reasoning_content": "",
    "output_key": "output_1"
  }
}
```

**处理**: 根据 `node_execution_id` + `output_key` 定位消息，累加 `message` 内容

#### 输出结束 (status="end")

```json
{
  "event": "stream_msg",
  "node_id": "llm_xxx",
  "node_execution_id": "xxxxxx",
  "status": "end",
  "output_schema": {
    "message": "完整的最终答案",
    "reasoning_content": "",
    "output_key": "output_1",
    "source_url": ""
  }
}
```

**处理**: 用 `message` 覆盖之前的流式内容，显示最终答案

### 3.6 结束事件 (close)

```json
{
  "event": "close",
  "unique_id": "xxxxxx",
  "status": "end",
  "output_schema": {
    "message": {
      "code": "500",
      "message": "报错内容"
    }
  }
}
```

**处理**:
- `message` 为空: 工作流正常结束
- `message` 不为空: 工作流执行失败，展示错误信息

**常见错误码**:
- `500`: 服务端异常
- `10527`: 等待用户输入超时
- `10528`: 节点执行超过最大次数
- `10531`: 节点功能已升级，需删除后重新拖入
- `10532`: 工作流版本已升级，请联系创建者重新编排
- `10540`: 服务器线程数已满，请稍候再试

## 4. 工作流停止接口

```
POST /api/v2/workflow/stop
Content-Type: application/json
Authorization: Bearer <access_token>
```

**请求体**:
```json
{
  "workflow_id": "xxx",
  "session_id": "xxx"
}
```

## 5. 完整调用流程示例

### 步骤1: 登录获取 Token

```bash
curl -X POST http://localhost:7860/api/v1/user/login \
  -H 'Content-Type: application/json' \
  -d '{"user_name":"lzhy9999@163.com","password":"Moto@9999"}'
```

### 步骤2: 首次调用工作流

```bash
curl -N -X POST http://localhost:7860/api/v2/workflow/invoke \
  -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' \
  -d '{
    "workflow_id": "d5e79601de8245768a38ee756a14a067",
    "stream": true,
    "input": {"user_input": "你好"}
  }'
```

### 步骤3: 解析返回的事件

从 SSE 流中提取 `session_id` 和 `message_id`

### 步骤4: 继续对话

```bash
curl -N -X POST http://localhost:7860/api/v2/workflow/invoke \
  -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' \
  -d '{
    "workflow_id": "d5e79601de8245768a38ee756a14a067",
    "stream": true,
    "input": {"user_input": "继续对话"},
    "session_id": "<从步骤3获取>",
    "message_id": "<从步骤3获取>"
  }'
```

## 6. 关键注意事项

1. **input 结构**: 必须是平铺字典 `{"user_input": "..."}`, 不要嵌套 workflow_id
2. **session_id**: 首次可不传，后续必须传递以保持上下文
3. **message_id**: 从事件中提取并在后续请求中传递
4. **流式处理**: 推荐使用 `stream: true` 以获得更好的用户体验
5. **事件解析**: 按行读取 SSE，每行以 `data:` 开头，后跟 JSON
6. **node_execution_id**: 用于区分同一节点的多次执行，流式输出时必须用它来定位消息

