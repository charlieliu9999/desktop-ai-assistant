#!/bin/bash
#
# 启动后端服务并运行前端E2E烟测
#
# 用法:
#   ./start-with-test.sh          # 启动后端并运行测试
#   ./start-with-test.sh --no-test # 只启动后端,不运行测试
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  桌面AI助手 - 启动与测试${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查参数
RUN_TEST=true
if [ "$1" = "--no-test" ]; then
  RUN_TEST=false
fi

# 1. 检查后端服务是否已运行
echo -e "${YELLOW}[1/4] 检查后端服务状态...${NC}"
BACKEND_PORT=${BACKEND_PORT:-8010}
BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}"

if curl -s "${BACKEND_URL}/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 后端服务已运行 (${BACKEND_URL})${NC}"
  BACKEND_RUNNING=true
else
  echo -e "${YELLOW}✗ 后端服务未运行,准备启动...${NC}"
  BACKEND_RUNNING=false
fi

# 2. 启动后端服务 (如果未运行)
if [ "$BACKEND_RUNNING" = false ]; then
  echo -e "${YELLOW}[2/4] 启动后端服务...${NC}"
  
  cd backend-service
  
  # 检查虚拟环境
  if [ ! -d "venv" ]; then
    echo -e "${YELLOW}创建Python虚拟环境...${NC}"
    python3 -m venv venv
  fi
  
  # 激活虚拟环境
  source venv/bin/activate
  
  # 安装依赖
  echo -e "${YELLOW}检查Python依赖...${NC}"
  pip install -q -r requirements.txt
  
  # 启动后端 (后台运行)
  echo -e "${YELLOW}启动FastAPI服务...${NC}"
  nohup ./run.sh > ../logs/backend.log 2>&1 &
  BACKEND_PID=$!
  echo $BACKEND_PID > ../logs/backend.pid
  
  cd ..
  
  # 等待后端启动
  echo -e "${YELLOW}等待后端服务启动...${NC}"
  for i in {1..30}; do
    if curl -s "${BACKEND_URL}/health" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ 后端服务启动成功 (PID: $BACKEND_PID)${NC}"
      break
    fi
    sleep 1
    echo -n "."
  done
  echo ""
  
  if ! curl -s "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ 后端服务启动失败${NC}"
    echo -e "${YELLOW}查看日志: tail -f logs/backend.log${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}[2/4] 跳过后端启动 (已运行)${NC}"
fi

# 3. 运行前端E2E测试
if [ "$RUN_TEST" = true ]; then
  echo -e "${YELLOW}[3/4] 运行前端E2E烟测...${NC}"
  echo ""
  
  export BACKEND_URL="${BACKEND_URL}"
  
  if npm run smoke:frontend; then
    echo ""
    echo -e "${GREEN}✓ 前端E2E测试通过${NC}"
    TEST_PASSED=true
  else
    echo ""
    echo -e "${RED}✗ 前端E2E测试失败${NC}"
    TEST_PASSED=false
  fi
  
  # 显示报告位置
  echo ""
  echo -e "${YELLOW}测试报告: docs/FRONTEND_E2E_REPORT.md${NC}"
  echo ""
else
  echo -e "${YELLOW}[3/4] 跳过E2E测试 (--no-test)${NC}"
  TEST_PASSED=true
fi

# 4. 总结
echo -e "${YELLOW}[4/4] 启动完成${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  服务状态${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "后端服务: ${GREEN}运行中${NC} (${BACKEND_URL})"
echo -e "健康检查: ${BACKEND_URL}/health"
echo -e "API文档:  ${BACKEND_URL}/docs"
echo ""

if [ "$RUN_TEST" = true ]; then
  if [ "$TEST_PASSED" = true ]; then
    echo -e "E2E测试:  ${GREEN}通过${NC}"
  else
    echo -e "E2E测试:  ${RED}失败${NC}"
  fi
  echo ""
fi

echo -e "${YELLOW}提示:${NC}"
echo -e "  - 查看后端日志: tail -f logs/backend.log"
echo -e "  - 停止后端服务: kill \$(cat logs/backend.pid)"
echo -e "  - 重新运行测试: npm run smoke:frontend"
echo ""

if [ "$TEST_PASSED" = false ]; then
  exit 1
fi

