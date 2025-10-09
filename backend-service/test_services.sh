#!/bin/bash

# 服务测试脚本
# 用于测试后端服务及其依赖服务的连接状态

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 从.env文件读取端口
if [ -f .env ]; then
    PORT=$(grep "^PORT=" .env | cut -d '=' -f2)
    if [ -z "$PORT" ]; then
        PORT=8010
    fi
else
    PORT=8010
fi

BASE_URL="http://localhost:$PORT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   后端服务测试${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}服务地址: $BASE_URL${NC}"
echo ""

# 测试函数
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}

    echo -n "测试 $name ... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>/dev/null)
    fi

    # macOS兼容的方式获取最后一行和除最后一行外的内容
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ 成功${NC}"
        return 0
    else
        echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
        return 1
    fi
}

# 1. 基础健康检查
echo -e "${YELLOW}1. 基础健康检查${NC}"
echo "-----------------------------------"
test_endpoint "健康检查" "$BASE_URL/health"
echo ""

# 2. 详细健康检查
echo -e "${YELLOW}2. 详细健康检查${NC}"
echo "-----------------------------------"
if test_endpoint "详细健康检查" "$BASE_URL/health/detailed"; then
    echo "获取详细信息..."
    curl -s "$BASE_URL/health/detailed" | jq '.' 2>/dev/null || curl -s "$BASE_URL/health/detailed"
fi
echo ""

# 3. API文档
echo -e "${YELLOW}3. API文档${NC}"
echo "-----------------------------------"
test_endpoint "Swagger文档" "$BASE_URL/docs"
test_endpoint "ReDoc文档" "$BASE_URL/redoc"
echo ""

# 4. Bisheng服务
echo -e "${YELLOW}4. Bisheng服务${NC}"
echo "-----------------------------------"
test_endpoint "Bisheng配置" "$BASE_URL/api/bisheng/config"
test_endpoint "Bisheng状态" "$BASE_URL/api/bisheng/status"
echo ""

# 5. 本地AI服务
echo -e "${YELLOW}5. 本地AI服务${NC}"
echo "-----------------------------------"
test_endpoint "本地AI健康检查" "$BASE_URL/api/local-ai/health"
test_endpoint "本地AI模型列表" "$BASE_URL/api/local-ai/models"
echo ""

# 6. 模型配置
echo -e "${YELLOW}6. 模型配置${NC}"
echo "-----------------------------------"
test_endpoint "获取所有场景" "$BASE_URL/api/model-config/scenarios"
test_endpoint "获取所有配置" "$BASE_URL/api/model-config/configs"
test_endpoint "AI对话模型配置" "$BASE_URL/api/model-config/configs/ai_chat"
echo ""

# 7. 患者信息提取
echo -e "${YELLOW}7. 患者信息提取${NC}"
echo "-----------------------------------"
echo "测试患者信息提取 ... "
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/patient-extraction/extract" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "患者张三，男，45岁，主诉头痛3天"
  }' 2>/dev/null)

http_code=$(echo "$response" | tail -1)
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ 成功${NC}"
    echo "提取结果:"
    echo "$response" | sed '$d' | jq '.' 2>/dev/null || echo "$response" | sed '$d'
else
    echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
fi
echo ""

# 8. 依赖服务检查
echo -e "${YELLOW}8. 依赖服务检查${NC}"
echo "-----------------------------------"

# 检查Ollama
echo -n "Ollama服务 ... "
if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo -e "${GREEN}✓ 运行中${NC}"
    model_count=$(curl -s http://localhost:11434/api/tags | jq '.models | length' 2>/dev/null)
    if [ ! -z "$model_count" ]; then
        echo "  可用模型数: $model_count"
    fi
else
    echo -e "${RED}✗ 未运行${NC}"
fi

# 检查Bisheng
echo -n "Bisheng服务 ... "
if curl -s http://localhost:7860/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ 运行中${NC}"
else
    echo -e "${RED}✗ 未运行${NC}"
fi

# 检查PostgreSQL
echo -n "PostgreSQL ... "
if nc -z localhost 5433 2>/dev/null; then
    echo -e "${GREEN}✓ 运行中${NC}"
else
    echo -e "${YELLOW}○ 未运行 (可选)${NC}"
fi

# 检查Redis
echo -n "Redis ... "
if nc -z localhost 6380 2>/dev/null; then
    echo -e "${GREEN}✓ 运行中${NC}"
else
    echo -e "${YELLOW}○ 未运行 (可选)${NC}"
fi

echo ""

# 总结
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   测试完成${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}提示:${NC}"
echo "  - 查看详细日志: tail -f logs/app.log"
echo "  - API文档: $BASE_URL/docs"
echo "  - 健康检查: $BASE_URL/health/detailed"
echo ""

