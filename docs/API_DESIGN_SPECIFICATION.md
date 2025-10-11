# API设计规范文档

## 文档信息
- **版本**: v1.0
- **日期**: 2025-10-10
- **状态**: 设计中

---

## 一、API设计原则

### 1.1 RESTful规范
- 使用HTTP方法语义（GET/POST/PUT/DELETE）
- 资源导向的URL设计
- 使用HTTP状态码
- 支持版本控制（/api/v1/）

### 1.2 统一响应格式
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "request_id": "uuid",
    "timestamp": "2025-10-10T12:00:00Z",
    "version": "v1"
  }
}
```

### 1.3 错误处理
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "AI_SERVICE_ERROR",
    "message": "AI服务暂时不可用",
    "details": { ... }
  },
  "meta": { ... }
}
```

---

## 二、AI服务API

### 2.1 AI对话 - 标准模式

#### 请求
```http
POST /api/v1/ai/chat
Content-Type: application/json
Authorization: Bearer {token}

{
  "messages": [
    {
      "role": "system",
      "content": "你是一个医疗助手"
    },
    {
      "role": "user",
      "content": "患者头痛需要做什么检查？"
    }
  ],
  "options": {
    "model": "gpt-4",           // 可选，默认使用配置的模型
    "temperature": 0.7,         // 可选
    "max_tokens": 2000,         // 可选
    "stream": false             // 是否流式响应
  }
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "根据患者的头痛症状，建议进行以下检查：\n1. 头颅CT或MRI\n2. 血压监测\n3. 血常规检查"
    },
    "usage": {
      "prompt_tokens": 50,
      "completion_tokens": 100,
      "total_tokens": 150
    },
    "model": "gpt-4",
    "finish_reason": "stop"
  },
  "meta": {
    "request_id": "req_123456",
    "timestamp": "2025-10-10T12:00:00Z",
    "processing_time_ms": 1500
  }
}
```

### 2.2 AI对话 - 流式模式

#### 请求
```http
POST /api/v1/ai/chat/stream
Content-Type: application/json
Authorization: Bearer {token}

{
  "messages": [ ... ],
  "options": {
    "stream": true
  }
}
```

#### 响应 (Server-Sent Events)
```
data: {"type":"start","request_id":"req_123456"}

data: {"type":"chunk","content":"根据"}

data: {"type":"chunk","content":"患者的"}

data: {"type":"chunk","content":"头痛症状"}

data: {"type":"done","usage":{"total_tokens":150}}
```

### 2.3 AI内容分析

#### 请求
```http
POST /api/v1/ai/analyze
Content-Type: application/json

{
  "content": "患者信息：张三，男，45岁，主诉：头痛3天",
  "analysis_type": "patient_info",  // patient_info | medical_record | diagnosis
  "options": {
    "extract_fields": ["name", "age", "gender", "chief_complaint"]
  }
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "analysis_type": "patient_info",
    "extracted_data": {
      "name": "张三",
      "age": 45,
      "gender": "男",
      "chief_complaint": "头痛3天"
    },
    "confidence": 0.95
  }
}
```

---

## 三、OCR服务API

### 3.1 图像文字识别

#### 请求
```http
POST /api/v1/ocr/recognize
Content-Type: application/json

{
  "image_data": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "options": {
    "language": "chi_sim+eng",  // 语言
    "mode": "accurate",         // fast | accurate
    "enhance": true             // 图像增强
  }
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "text": "患者姓名：张三\n年龄：45岁\n性别：男",
    "confidence": 0.92,
    "words": [
      {
        "text": "患者姓名",
        "confidence": 0.95,
        "bbox": [10, 20, 100, 40]
      }
    ],
    "lines": [
      {
        "text": "患者姓名：张三",
        "confidence": 0.94,
        "bbox": [10, 20, 200, 40]
      }
    ]
  },
  "meta": {
    "processing_time_ms": 800
  }
}
```

### 3.2 桌面内容识别

#### 请求
```http
POST /api/v1/ocr/desktop-analyze
Content-Type: application/json

{
  "screenshot_data": "data:image/png;base64,...",
  "analysis_prompt": "识别屏幕上的患者信息",
  "options": {
    "ocr_enabled": true,
    "ai_analysis": true
  }
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "ocr_result": {
      "text": "...",
      "confidence": 0.9
    },
    "ai_analysis": {
      "summary": "屏幕显示患者信息表单",
      "extracted_info": { ... },
      "suggestions": ["可以点击保存按钮"]
    }
  }
}
```

---

## 四、语音服务API

### 4.1 语音识别

#### 请求
```http
POST /api/v1/voice/recognize
Content-Type: multipart/form-data

audio_file: <binary>
language: zh-CN
model: whisper-large-v3
```

#### 响应
```json
{
  "success": true,
  "data": {
    "text": "患者主诉头痛三天",
    "confidence": 0.95,
    "language": "zh-CN",
    "duration_seconds": 3.5,
    "segments": [
      {
        "text": "患者主诉",
        "start": 0.0,
        "end": 1.2,
        "confidence": 0.96
      }
    ]
  }
}
```

### 4.2 语音合成

#### 请求
```http
POST /api/v1/voice/synthesize
Content-Type: application/json

{
  "text": "您好，请问有什么可以帮助您的？",
  "options": {
    "voice": "zh-CN-XiaoxiaoNeural",
    "rate": 1.0,
    "pitch": 1.0,
    "format": "mp3"
  }
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "audio_url": "https://cdn.example.com/audio/abc123.mp3",
    "audio_data": "data:audio/mp3;base64,...",  // 可选
    "duration_seconds": 2.5,
    "format": "mp3"
  }
}
```

### 4.3 实时语音流 (WebSocket)

#### 连接
```
WS /api/v1/ws/voice/stream
```

#### 客户端发送
```json
{
  "type": "audio_chunk",
  "data": "base64_encoded_audio",
  "sequence": 1
}
```

#### 服务端响应
```json
{
  "type": "transcript",
  "text": "患者",
  "is_final": false,
  "confidence": 0.8
}
```

---

## 五、患者信息服务API

### 5.1 患者信息提取

#### 请求
```http
POST /api/v1/patient/extract
Content-Type: application/json

{
  "source_type": "image",  // image | text | ocr
  "source_data": "data:image/png;base64,...",
  "options": {
    "use_ai": true,
    "min_confidence": 0.7
  }
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "patient_info": {
      "name": "张三",
      "age": 45,
      "gender": "男",
      "patient_id": "P001234",
      "department": "神经内科",
      "chief_complaint": "头痛3天",
      "diagnosis": "偏头痛",
      "medical_history": "高血压5年"
    },
    "confidence": 0.92,
    "extraction_method": "ai_vision"
  }
}
```

### 5.2 智能推荐生成

#### 请求
```http
POST /api/v1/recommendations/generate
Content-Type: application/json

{
  "patient_info": {
    "name": "张三",
    "age": 45,
    "gender": "男",
    "chief_complaint": "头痛3天，伴恶心呕吐",
    "medical_history": "高血压5年"
  },
  "recommendation_types": ["exam", "medication", "diagnosis"],
  "options": {
    "max_items": 5,
    "include_reasoning": true
  }
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "recommendations": {
      "exam": [
        {
          "name": "头颅CT",
          "code": "CT001",
          "reason": "排除颅内占位性病变",
          "priority": "high",
          "estimated_cost": 300
        },
        {
          "name": "血压监测",
          "code": "BP001",
          "reason": "患者有高血压病史",
          "priority": "medium"
        }
      ],
      "medication": [
        {
          "name": "布洛芬缓释胶囊",
          "dosage": "0.3g",
          "frequency": "每日2次",
          "duration": "3天",
          "reason": "缓解头痛症状"
        }
      ],
      "diagnosis": [
        {
          "name": "偏头痛",
          "icd_code": "G43.9",
          "confidence": 0.75,
          "reasoning": "基于症状和病史分析"
        }
      ]
    },
    "generated_at": "2025-10-10T12:00:00Z",
    "model_used": "qwen2.5:32b"
  }
}
```

---

## 六、Bisheng智能体API

### 6.1 登录认证

#### 请求
```http
POST /api/v1/bisheng/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "user_id": "user_123"
  }
}
```

### 6.2 获取工作流列表

#### 请求
```http
GET /api/v1/bisheng/workflows?page=1&page_size=20
Authorization: Bearer {token}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "workflow_001",
        "name": "医疗问诊助手",
        "description": "智能问诊和推荐",
        "status": "active",
        "created_at": "2025-10-01T00:00:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20
  }
}
```

### 6.3 调用工作流

#### 请求
```http
POST /api/v1/bisheng/workflows/{workflow_id}/invoke
Content-Type: application/json

{
  "input": {
    "user_input": "患者头痛需要做什么检查？"
  },
  "stream": false,
  "session_id": "session_123",  // 可选，用于继续对话
  "message_id": 1               // 可选
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "output": {
      "answer": "建议进行头颅CT检查...",
      "recommendations": [ ... ]
    },
    "session_id": "session_123",
    "message_id": 2
  }
}
```

---

## 七、医疗系统集成API

### 7.1 患者搜索

#### 请求
```http
GET /api/v1/medical/patients/search?q=张三&limit=10
Authorization: Bearer {token}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "patients": [
      {
        "id": "P001234",
        "name": "张三",
        "age": 45,
        "gender": "男",
        "mrn": "MRN001234",
        "last_visit": "2025-10-01"
      }
    ],
    "total": 1
  }
}
```

### 7.2 获取患者详情

#### 请求
```http
GET /api/v1/medical/patients/{patient_id}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "P001234",
      "name": "张三",
      "age": 45,
      "gender": "男",
      "contact": {
        "phone": "138****1234",
        "email": "zhang@example.com"
      },
      "medical_history": [ ... ],
      "visits": [ ... ]
    }
  }
}
```

---

## 八、配置管理API

### 8.1 获取配置

#### 请求
```http
GET /api/v1/config/{key}
Authorization: Bearer {token}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "key": "ai.model",
    "value": "gpt-4",
    "type": "string",
    "updated_at": "2025-10-10T12:00:00Z"
  }
}
```

### 8.2 更新配置

#### 请求
```http
PUT /api/v1/config/{key}
Content-Type: application/json

{
  "value": "gpt-4-turbo"
}
```

### 8.3 获取所有配置

#### 请求
```http
GET /api/v1/config
```

#### 响应
```json
{
  "success": true,
  "data": {
    "ai": {
      "model": "gpt-4",
      "temperature": 0.7
    },
    "voice": {
      "enabled": true,
      "model": "whisper-large-v3"
    }
  }
}
```

---

## 九、健康检查API

### 9.1 简单健康检查

#### 请求
```http
GET /api/v1/health
```

#### 响应
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2025-10-10T12:00:00Z"
}
```

### 9.2 详细健康检查

#### 请求
```http
GET /api/v1/health/detailed
```

#### 响应
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "latency_ms": 5
    },
    "redis": {
      "status": "healthy",
      "latency_ms": 2
    },
    "ollama": {
      "status": "healthy",
      "models_count": 5
    },
    "bisheng": {
      "status": "healthy",
      "authenticated": true
    }
  }
}
```

---

## 十、认证和授权

### 10.1 认证方式
- Bearer Token认证
- API Key认证（用于服务间调用）

### 10.2 权限级别
- `user`: 普通用户
- `admin`: 管理员
- `service`: 服务账号

---

## 十一、限流和配额

### 11.1 限流规则
- 普通用户: 100请求/分钟
- 管理员: 1000请求/分钟
- 服务账号: 无限制

### 11.2 响应头
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1633046400
```

---

## 十二、版本控制

### 12.1 URL版本
```
/api/v1/...  # 当前版本
/api/v2/...  # 未来版本
```

### 12.2 向后兼容
- v1版本至少维护6个月
- 废弃API提前3个月通知

---

**下一步**: 基于此API规范开始实现后端服务

