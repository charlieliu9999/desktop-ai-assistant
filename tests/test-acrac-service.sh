#!/bin/bash

# ACRAC服务测试脚本
# 用于验证ACRAC服务是否正常运行

echo "========================================="
echo "ACRAC服务测试脚本"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ACRAC服务地址
ACRAC_URL="http://localhost:5173"

# 测试1: 检查服务状态
echo "测试1: 检查ACRAC服务状态..."
STATUS_RESPONSE=$(curl -s "${ACRAC_URL}/api/v1/acrac/rag-llm/rag-llm-status")

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ACRAC服务正在运行${NC}"
    echo "响应: $STATUS_RESPONSE"
else
    echo -e "${RED}✗ ACRAC服务未运行或无法访问${NC}"
    echo "请确保ACRAC服务已启动在 ${ACRAC_URL}"
    exit 1
fi

echo ""
echo "========================================="
echo ""

# 测试2: 测试智能推荐接口
echo "测试2: 测试智能推荐接口..."
echo "查询: 持续性头痛3天,伴恶心呕吐。患者:45岁女性"

RECOMMENDATION_RESPONSE=$(curl -s -X POST "${ACRAC_URL}/api/v1/acrac/rag-llm/intelligent-recommendation" \
  -H "Content-Type: application/json" \
  -d '{
    "clinical_query": "持续性头痛3天,伴恶心呕吐。患者:45岁女性",
    "show_reasoning": true,
    "top_scenarios": 3,
    "top_recommendations_per_scenario": 5,
    "similarity_threshold": 0.3,
    "include_raw_data": false,
    "debug_mode": false
  }')

if [ $? -eq 0 ] && [ -n "$RECOMMENDATION_RESPONSE" ]; then
    # 检查响应是否包含success字段
    SUCCESS=$(echo "$RECOMMENDATION_RESPONSE" | grep -o '"success"[[:space:]]*:[[:space:]]*true')

    if [ -n "$SUCCESS" ]; then
        echo -e "${GREEN}✓ 智能推荐接口调用成功${NC}"

        # 调试:显示响应长度
        RESPONSE_LENGTH=${#RECOMMENDATION_RESPONSE}
        echo "响应数据长度: $RESPONSE_LENGTH 字节"

        # 如果安装了jq,显示详细信息
        if command -v jq &> /dev/null; then
            echo ""
            echo "推荐数量:"
            RECS_COUNT=$(echo "$RECOMMENDATION_RESPONSE" | jq '.llm_recommendations.recommendations | length' 2>/dev/null)
            echo "  - LLM推荐: $RECS_COUNT 个"

            echo ""
            echo "处理时间:"
            PROCESSING_TIME=$(echo "$RECOMMENDATION_RESPONSE" | jq '.processing_time_ms' 2>/dev/null)
            echo "  - ${PROCESSING_TIME}ms"

            echo ""
            echo "使用的模型:"
            MODEL=$(echo "$RECOMMENDATION_RESPONSE" | jq -r '.model_used' 2>/dev/null)
            echo "  - LLM: $MODEL"
            EMBEDDING_MODEL=$(echo "$RECOMMENDATION_RESPONSE" | jq -r '.embedding_model_used' 2>/dev/null)
            echo "  - Embedding: $EMBEDDING_MODEL"

            echo ""
            echo "推荐列表:"
            echo "$RECOMMENDATION_RESPONSE" | jq -r '.llm_recommendations.recommendations[] | "  - \(.procedure_name) (\(.modality)) - 评分:\(.appropriateness_rating)"' 2>/dev/null
        else
            # 如果没有jq,使用python解析
            echo ""
            echo "推荐数量:"
            RECS_COUNT=$(echo "$RECOMMENDATION_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('llm_recommendations', {}).get('recommendations', [])))" 2>/dev/null)
            echo "  - LLM推荐: $RECS_COUNT 个"

            echo ""
            echo "处理时间:"
            PROCESSING_TIME=$(echo "$RECOMMENDATION_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('processing_time_ms', 'N/A'))" 2>/dev/null)
            echo "  - ${PROCESSING_TIME}ms"

            echo ""
            echo "使用的模型:"
            MODEL=$(echo "$RECOMMENDATION_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('model_used', 'N/A'))" 2>/dev/null)
            echo "  - LLM: $MODEL"
            EMBEDDING_MODEL=$(echo "$RECOMMENDATION_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('embedding_model_used', 'N/A'))" 2>/dev/null)
            echo "  - Embedding: $EMBEDDING_MODEL"

            echo ""
            echo "推荐列表:"
            echo "$RECOMMENDATION_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
recs = data.get('llm_recommendations', {}).get('recommendations', [])
for rec in recs:
    print(f\"  - {rec.get('procedure_name', 'N/A')} ({rec.get('modality', 'N/A')}) - 评分:{rec.get('appropriateness_rating', 'N/A')}\")
" 2>/dev/null
        fi
    else
        echo -e "${RED}✗ 智能推荐接口返回失败${NC}"
        echo "响应: $RECOMMENDATION_RESPONSE"
        exit 1
    fi
else
    echo -e "${RED}✗ 智能推荐接口调用失败${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo ""

# 测试3: 测试简化接口
echo "测试3: 测试简化推荐接口..."
SIMPLE_RESPONSE=$(curl -s "${ACRAC_URL}/api/v1/acrac/rag-llm/intelligent-recommendation-simple?query=头痛&show_reasoning=true&top_scenarios=2")

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 简化推荐接口调用成功${NC}"
    echo "响应: $(echo "$SIMPLE_RESPONSE" | python3 -m json.tool 2>/dev/null | head -20)"
else
    echo -e "${YELLOW}⚠ 简化推荐接口调用失败(非关键)${NC}"
fi

echo ""
echo "========================================="
echo ""

# 测试4: 测试数据浏览接口
echo "测试4: 测试数据浏览接口..."
PANELS_RESPONSE=$(curl -s "${ACRAC_URL}/api/v1/acrac/data/panels")

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 数据浏览接口调用成功${NC}"
    
    if command -v jq &> /dev/null; then
        PANELS_COUNT=$(echo "$PANELS_RESPONSE" | jq 'length' 2>/dev/null)
        echo "科室数量: $PANELS_COUNT"
        echo "科室列表:"
        echo "$PANELS_RESPONSE" | jq -r '.[] | "  - \(.name_zh)"' 2>/dev/null | head -10
    fi
else
    echo -e "${YELLOW}⚠ 数据浏览接口调用失败(非关键)${NC}"
fi

echo ""
echo "========================================="
echo ""

# 总结
echo -e "${GREEN}✓ ACRAC服务测试完成!${NC}"
echo ""
echo "服务地址: ${ACRAC_URL}"
echo "API文档: ${ACRAC_URL}/docs"
echo ""
echo "下一步:"
echo "1. 访问 ${ACRAC_URL}/docs 查看完整API文档"
echo "2. 启动桌面AI助手: cd glass-test-app && npm start"
echo "3. 测试推荐功能"
echo ""
echo "========================================="

