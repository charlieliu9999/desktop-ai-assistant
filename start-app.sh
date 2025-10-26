#!/bin/bash

###############################################################################
# 桌面AI助手完整启动脚本
#
# 功能：
# 1. 启动后端服务 (FastAPI on port 8010)
# 2. 启动前端开发服务器 (Vite on port 5928)
# 3. 启动Electron应用
# 4. 健康检查和错误诊断
###############################################################################

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
BACKEND_PORT=8010
VITE_PORT=5928
MAX_RETRIES=30
RETRY_DELAY=1
BACKEND_DIR="backend-service"
LOG_DIR="/tmp/desktop-ai-assistant"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 日志文件
BACKEND_LOG="$LOG_DIR/backend.log"
VITE_LOG="$LOG_DIR/vite.log"
ELECTRON_LOG="$LOG_DIR/electron.log"

# 清理旧日志
> "$BACKEND_LOG"
> "$VITE_LOG"
> "$ELECTRON_LOG"

# 解析可选参数（仅支持 --routing frontend|backend）
ROUTING_MODE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --routing)
      if [[ -n "$2" ]]; then
        ROUTING_MODE="$2"
        shift 2
      else
        echo -e "${YELLOW}⚠ 缺少 --routing 的取值（frontend|backend），已忽略${NC}"
        shift 1
      fi
      ;;
    *)
      # 其他参数忽略
      shift 1
      ;;
  esac
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       🚀 桌面AI助手完整启动器 v3.0 🚀${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
if [[ -n "$ROUTING_MODE" ]]; then
  echo -e "${CYAN}AI 调用路由: ${ROUTING_MODE}${NC}"
fi

# ============================================================================
# 1. 环境检查
# ============================================================================
echo -e "${CYAN}📋 步骤 1/4: 环境检查${NC}"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 Node.js${NC}"
    echo -e "${YELLOW}请安装 Node.js 18+ 版本${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# 检查Python
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 Python${NC}"
    echo -e "${YELLOW}请安装 Python 3.11+ 版本${NC}"
    exit 1
fi
PYTHON_CMD=$(command -v python3 || command -v python)
echo -e "${GREEN}✅ Python: $($PYTHON_CMD --version)${NC}"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 npm${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm: $(npm --version)${NC}"

echo ""

# ============================================================================
# 2. 停止已有进程
# ============================================================================
echo -e "${CYAN}📋 步骤 2/4: 清理已有进程${NC}"

echo -e "${YELLOW}🔍 检查并停止已运行的进程...${NC}"
pkill -f "python.*app.main" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "electron" 2>/dev/null || true
sleep 2

# 检查并释放端口
for port in $BACKEND_PORT $VITE_PORT; do
    if lsof -i :$port &> /dev/null; then
        echo -e "${YELLOW}释放端口 $port...${NC}"
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
done

echo -e "${GREEN}✅ 进程清理完成${NC}"
echo ""

# ============================================================================
# 3. 启动后端服务
# ============================================================================
echo -e "${CYAN}📋 步骤 3/4: 启动服务${NC}"

echo -e "${BLUE}🔧 启动后端服务 (FastAPI)...${NC}"
cd "$BACKEND_DIR"

# 检查Python环境
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}首次运行: 创建虚拟环境 venv${NC}"
    $PYTHON_CMD -m venv venv
fi

if [ -d "venv" ]; then
    echo -e "${YELLOW}使用虚拟环境: venv${NC}"
    # shellcheck disable=SC1091
    source venv/bin/activate
    PYTHON_CMD="$(command -v python)"
    pip install --quiet --disable-pip-version-check -r requirements.txt
elif [ -f "/opt/anaconda3/envs/deer-flow-env/bin/python" ]; then
    echo -e "${YELLOW}使用Conda环境: deer-flow-env${NC}"
    PYTHON_CMD="/opt/anaconda3/envs/deer-flow-env/bin/python"
else
    PYTHON_CMD="${PYTHON_CMD:-$(command -v python3 || command -v python)}"
fi

# 启动后端
$PYTHON_CMD -m app.main > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ 后端进程已启动 (PID: $BACKEND_PID)${NC}"

# 等待后端就绪
echo -e "${YELLOW}⏳ 等待后端服务就绪...${NC}"
RETRIES=0
while [ $RETRIES -lt $MAX_RETRIES ]; do
    if curl -s http://127.0.0.1:$BACKEND_PORT/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 后端服务已就绪！${NC}"
        break
    fi

    if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${RED}❌ 后端进程意外退出${NC}"
        echo -e "${YELLOW}📋 查看日志: $BACKEND_LOG${NC}"
        tail -50 "$BACKEND_LOG"
        exit 1
    fi

    RETRIES=$((RETRIES + 1))
    sleep $RETRY_DELAY
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ 后端服务启动超时${NC}"
    echo -e "${YELLOW}📋 查看日志: $BACKEND_LOG${NC}"
    tail -50 "$BACKEND_LOG"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

cd ..

# 启动前端开发服务器
echo -e "${BLUE}📦 启动前端开发服务器 (Vite)...${NC}"
APP_ROUTING_MODE="$ROUTING_MODE" npm run dev:renderer > "$VITE_LOG" 2>&1 &
VITE_PID=$!
echo -e "${GREEN}✅ Vite进程已启动 (PID: $VITE_PID)${NC}"

# 等待Vite就绪
echo -e "${YELLOW}⏳ 等待Vite服务器就绪...${NC}"
RETRIES=0
while [ $RETRIES -lt $MAX_RETRIES ]; do
    if curl -s http://127.0.0.1:$VITE_PORT > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Vite服务器已就绪！${NC}"
        break
    fi

    if ! ps -p $VITE_PID > /dev/null 2>&1; then
        echo -e "${RED}❌ Vite进程意外退出${NC}"
        echo -e "${YELLOW}📋 查看日志: $VITE_LOG${NC}"
        tail -50 "$VITE_LOG"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi

    RETRIES=$((RETRIES + 1))
    sleep $RETRY_DELAY
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Vite服务器启动超时${NC}"
    echo -e "${YELLOW}📋 查看日志: $VITE_LOG${NC}"
    tail -50 "$VITE_LOG"
    kill $BACKEND_PID $VITE_PID 2>/dev/null || true
    exit 1
fi

echo ""

# ============================================================================
# 4. 启动Electron应用
# ============================================================================
echo -e "${CYAN}📋 步骤 4/4: 启动Electron应用${NC}"

sleep 1  # 确保服务器稳定

echo -e "${BLUE}🖥️  启动Electron应用...${NC}"
APP_ROUTING_MODE="$ROUTING_MODE" npm run dev > "$ELECTRON_LOG" 2>&1 &
ELECTRON_PID=$!
echo -e "${GREEN}✅ Electron已启动 (PID: $ELECTRON_PID)${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ 应用启动成功！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 运行信息:${NC}"
echo -e "   后端服务: http://127.0.0.1:$BACKEND_PORT"
echo -e "   API文档: http://127.0.0.1:$BACKEND_PORT/docs"
echo -e "   Vite服务器: http://127.0.0.1:$VITE_PORT"
echo -e "   后端 PID: $BACKEND_PID"
echo -e "   Vite PID: $VITE_PID"
echo -e "   Electron PID: $ELECTRON_PID"
echo ""
echo -e "${BLUE}📋 日志文件:${NC}"
echo -e "   后端: $BACKEND_LOG"
echo -e "   Vite: $VITE_LOG"
echo -e "   Electron: $ELECTRON_LOG"
echo ""
echo -e "${YELLOW}💡 提示:${NC}"
echo -e "   - 主窗口和浮动窗口应该已显示"
echo -e "   - 快捷键: Cmd+Shift+A (主窗口), Cmd+Shift+F (浮动窗口)"
echo -e "   - 按 Ctrl+C 停止所有服务"
echo ""

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 清理进程...${NC}"
    kill $BACKEND_PID $VITE_PID $ELECTRON_PID 2>/dev/null || true
    echo -e "${GREEN}✅ 所有服务已停止${NC}"
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM

# 等待Electron退出
wait $ELECTRON_PID 2>/dev/null

# 自动清理
cleanup
