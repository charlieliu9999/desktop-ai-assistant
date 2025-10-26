# Backend API Live Test Report
Generated: 2025-10-14T16:17:49Z

## Matrix
- AI Chat: openai, deepseek, dashscope, local
- Vision: DashScope qwen-vl-plus (scene=screen_recognition_aliyun, strict JSON)
- STT: Whisper base (scene=voice_stt)
\n### /v1/ai/providers
{
  "success": true,
  "data": {
    "providers": [
      "local",
      "deepseek",
      "openai",
      "dashscope"
    ]
  },
  "error": null,
  "meta": {
    "timestamp": "2025-10-15T00:17:49.626859"
  }
}
\n### /v1/ai/chat (provider=openai, model=gpt-4o-mini, scene=ai_chat)
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "Hello! How can I assist you today?",
      "name": null
    },
    "usage": {
      "prompt_tokens": 63,
      "completion_tokens": 9,
      "total_tokens": 72
    },
    "model": "gpt-4o-mini-2024-07-18",
    "finish_reason": "stop",
    "provider": "openai"
  },
  "error": null,
  "meta": {
    "request_id": "c47fd8b4-9dfa-4ebf-a5d9-ac684ca56ad4",
    "timestamp": "2025-10-15T00:17:51.772727",
    "processing_time_ms": 2132.9060000000004,
    "version": "1.1.0"
  }
}
\n### /v1/ai/chat (provider=deepseek, model=deepseek-chat, scene=ai_chat)
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "您好！我是您的医疗AI助手，很高兴为您提供帮助。  \n\n如果您有健康方面的疑问或需要了解医疗相关信息，请告诉我具体内容，我会尽力",
      "name": null
    },
    "usage": {
      "prompt_tokens": 40,
      "completion_tokens": 32,
      "total_tokens": 72
    },
    "model": "deepseek-chat",
    "finish_reason": "length",
    "provider": "deepseek"
  },
  "error": null,
  "meta": {
    "request_id": "3753f1c4-c745-4bce-bae3-36f94554e780",
    "timestamp": "2025-10-15T00:17:53.898360",
    "processing_time_ms": 2105.3,
    "version": "1.1.0"
  }
}
\n### /v1/ai/chat (provider=dashscope, model=qwen3-max, scene=ai_chat_aliyun)
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "你好！请问有什么健康或医疗相关的问题我可以帮您解答吗？如果您有任何疑问或需要帮助，请随时告诉我。",
      "name": null
    },
    "usage": {
      "prompt_tokens": 51,
      "completion_tokens": 25,
      "total_tokens": 76
    },
    "model": "qwen3-max",
    "finish_reason": "stop",
    "provider": "dashscope"
  },
  "error": null,
  "meta": {
    "request_id": "7e44fdb6-5514-4b43-a926-32dd04b3df63",
    "timestamp": "2025-10-15T00:17:55.068033",
    "processing_time_ms": 1152.818,
    "version": "1.1.0"
  }
}
\n### /v1/ai/chat (provider=local, model=qwen2.5:32b, scene=ai_chat)
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "Hello! How can I assist you today? If you have any questions about health or wellness, feel free to ask, and I'll do my best to provide",
      "name": null
    },
    "usage": {
      "prompt_tokens": 33,
      "completion_tokens": 33,
      "total_tokens": 66
    },
    "model": "qwen2.5:32b",
    "finish_reason": "stop",
    "provider": "local"
  },
  "error": null,
  "meta": {
    "request_id": "ef2d9f25-7da4-4d7a-8e11-aa1cdc00578c",
    "timestamp": "2025-10-15T00:18:00.225482",
    "processing_time_ms": 5140.1,
    "version": "1.1.0"
  }
}
\n## Vision (DashScope qwen-vl-plus, scene=screen_recognition_aliyun)
\n### Image: tests/images/截屏2025-10-02 19.40.57.png
{
  "detail": "strict_json_parse_failed"
}
\n### Image: tests/images/截屏2025-10-02 19.49.44.png
{
  "success": true,
  "result": {
    "description": "```json\n{\n  \"患者信息\": {\n    \"姓名\": \"张明\",\n    \"性别\": \"男\",\n    \"年龄\": \"45岁\",\n    \"病历号\": \"13391478\",\n    \"主诉\": \"突发胸痛伴呼吸困难2小时\",\n    \"诊断\": {\n      \"主诊断\": \"急性前壁心肌梗死（发病2小时）\",\n      \"次要诊断\": \"\"\n    },\n    \"现病史\": \"患者2小时前因诱因出现剧烈胸痛，疼痛位于胸骨后，伴有大汗、恶心、心悸，症状持续不缓解，急就诊就医。\",\n    \"既往史\": {\n      \"手术\": \"无\",\n      \"输血\": \"无\",\n      \"过敏\": \"无\",\n      \"传染病\": \"已完成新冠疫苗接种\"\n    },\n    \"confidence\": 0.95\n  }\n}\n```",
    "confidence": 0.8,
    "details": {
      "model": "qwen-vl-plus",
      "usage": {
        "prompt_tokens": 1303,
        "completion_tokens": 196,
        "total_tokens": 1499,
        "prompt_tokens_details": {
          "cached_tokens": 0
        }
      }
    },
    "structured": {
      "手术": "无",
      "输血": "无",
      "过敏": "无",
      "传染病": "已完成新冠疫苗接种",
      "patient_name": "",
      "gender": "",
      "age": "",
      "medical_record_number": "",
      "chief_complaint": "",
      "diagnosis": "",
      "confidence": 0.0
    }
  },
  "error": null,
  "model_used": "qwen-vl-plus",
  "processing_time_ms": 3308.8130950927734
}
\n### Image: tests/images/截屏2025-10-03 12.38.10.png
{
  "detail": "strict_json_parse_failed"
}
\n### Image: tests/images/截屏2025-10-03 12.38.32.png
{
  "success": true,
  "result": {
    "description": "```json\n{\n  \"patient_info\": {\n    \"name\": \"张男\",\n    \"gender\": \"男\",\n    \"age\": \"45岁\",\n    \"medical_record_number\": \"13391478\",\n    \"chief_complaint\": \"车祸致左侧肢体疼痛、活动受限15分钟\",\n    \"diagnosis\": \"多发性骨折（需进一步确认）\",\n    \"confidence\": {\n      \"name\": 1.0,\n      \"gender\": 1.0,\n      \"age\": 1.0,\n      \"medical_record_number\": 1.0,\n      \"chief_complaint\": 1.0,\n      \"diagnosis\": 0.8\n    }\n  },\n  \"patient_history\": {\n    \"present_illness_history\": \"患者15分钟前驾驶电动自行车与机动车相撞，致左侧肢体疼痛，活动受限。现场击者称短暂意识丧失。\",\n    \"past_medical_history\": {\n      \"surgery\": \"无\",\n      \"allergy\": \"无\",\n      \"immunization\": \"已完成新冠疫苗接种\"\n    },\n    \"physical_examination\": \"T 36.7℃, P 92次/分, R 22次/分, BP 145/85mmHg。神志清楚，左额见3cm裂伤，左肩、左髋部压痛明显，左下肢活动受限，足背动脉搏动存在。\",\n    \"confidence\": {\n      \"present_illness_history\": 1.0,\n      \"surgery\": 1.0,\n      \"allergy\": 1.0,\n      \"immunization\": 1.0,\n      \"physical_examination\": 1.0\n    }\n  },\n  \"treatment_plan\": [\n    {\n      \"description\": \"立即建立静脉通路\",\n      \"confidence\": 1.0\n    },\n    {\n      \"description\": \"ace：曲美布汀100mg静滴\",\n      \"confidence\": 0.9\n    },\n    {\n      \"description\": \"患肢固定\",\n      \"confidence\": 0.8\n    }\n  ]\n}\n```",
    "confidence": 0.8,
    "details": {
      "model": "qwen-vl-plus",
      "usage": {
        "prompt_tokens": 1308,
        "completion_tokens": 466,
        "total_tokens": 1774,
        "prompt_tokens_details": {
          "cached_tokens": 0
        }
      }
    },
    "structured": {
      "description": "ace：曲美布汀100mg静滴",
      "confidence": 0.9,
      "patient_name": "",
      "gender": "",
      "age": "",
      "medical_record_number": "",
      "chief_complaint": "",
      "diagnosis": ""
    }
  },
  "error": null,
  "model_used": "qwen-vl-plus",
  "processing_time_ms": 5056.705951690674
}
\n## STT (Whisper base, scene=voice_stt)
\n### Audio: en_vosk_test.wav
{
  "success": true,
  "result": {
    "text": "1000019021001803",
    "confidence": 0.0,
    "language": "zh",
    "segments": [
      {
        "start": 0.0,
        "end": 2.6,
        "text": "100001",
        "confidence": 0.0
      },
      {
        "start": 3.6,
        "end": 5.1000000000000005,
        "text": "90210",
        "confidence": 0.0
      },
      {
        "start": 6.1000000000000005,
        "end": 8.1,
        "text": "01803",
        "confidence": 0.0
      }
    ]
  },
  "error": null,
  "model_used": "base",
  "processing_time_ms": 366.52493476867676
}
\n### Audio: 今天是什么天气.wav
{
  "success": true,
  "result": {
    "text": "今天是什麼天氣",
    "confidence": 0.0,
    "language": "zh",
    "segments": [
      {
        "start": 0.0,
        "end": 4.0,
        "text": "今天是什麼天氣",
        "confidence": 0.0
      }
    ]
  },
  "error": null,
  "model_used": "base",
  "processing_time_ms": 315.9358501434326
}
\n### Audio: 今天有什么新闻.wav
{
  "success": true,
  "result": {
    "text": "今天有什麼新聞今天有什麼新聞",
    "confidence": 0.0,
    "language": "zh",
    "segments": [
      {
        "start": 0.0,
        "end": 3.0,
        "text": "今天有什麼新聞",
        "confidence": 0.0
      },
      {
        "start": 3.0,
        "end": 5.0,
        "text": "今天有什麼新聞",
        "confidence": 0.0
      }
    ]
  },
  "error": null,
  "model_used": "base",
  "processing_time_ms": 359.15184020996094
}
