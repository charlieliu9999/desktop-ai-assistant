#!/bin/bash

# API测试脚本

BASE_URL="http://localhost:8010"

echo "🧪 开始测试API..."
echo ""

# 测试健康检查
echo "1️⃣ 测试健康检查..."
curl -s "$BASE_URL/health" | jq '.'
echo ""

# 创建患者
echo "2️⃣ 创建测试患者..."
curl -s -X POST "$BASE_URL/api/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "TEST001",
    "name": "测试患者",
    "gender": "男",
    "age": 45,
    "phone": "13800138000"
  }' | jq '.'
echo ""

# 获取患者信息
echo "3️⃣ 获取患者信息..."
curl -s "$BASE_URL/api/patients/TEST001" | jq '.'
echo ""

# 生成推荐 (需要配置Deepseek API Key)
echo "4️⃣ 生成检查项目推荐..."
echo "⚠️  注意: 需要在.env中配置DEEPSEEK_API_KEY"
curl -s -X POST "$BASE_URL/api/recommendations/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "TEST001",
    "chief_complaint": "持续性头痛3天,伴有恶心呕吐",
    "medical_history": "高血压病史5年,规律服药控制"
  }' | jq '.'
echo ""

# AI问答 (需要配置Deepseek API Key)
echo "5️⃣ 测试AI问答..."
curl -s -X POST "$BASE_URL/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "头痛需要做什么检查?",
    "history": []
  }' | jq '.'
echo ""

echo "✅ 测试完成!"
