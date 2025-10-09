#!/bin/bash

###############################################################################
# 桌面AI助手启动脚本 - 改进版
# 
# 此脚本确保：
# 1. Vite开发服务器先启动并稳定运行
# 2. 等待服务器就绪后再启动Electron
# 3. 如果出错，提供详细的诊断信息
###############################################################################

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
VITE_PORT=5928
MAX_RETRIES=30
RETRY_DELAY=1

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       🚀 桌面AI助手启动器 v2.0 🚀${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 Node.js${NC}"
    exit 1
fi

# 停止已有进程
echo -e "${YELLOW}🔍 检查并停止已运行的进程...${NC}"
pkill -f "vite|electron" 2>/dev/null || true
sleep 2

# 检查端口
echo -e "${YELLOW}🔍 检查端口 ${VITE_PORT}...${NC}"
if lsof -i :${VITE_PORT} &> /dev/null; then
    echo -e "${RED}❌ 端口 ${VITE_PORT} 已被占用${NC}"
    echo -e "${YELLOW}正在尝试释放端口...${NC}"
    lsof -ti :${VITE_PORT} | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# 启动Vite开发服务器
echo -e "${BLUE}📦 启动Vite开发服务器...${NC}"
npm run dev:renderer > /tmp/vite-dev.log 2>&1 &
VITE_PID=$!
echo -e "${GREEN}✅ Vite进程已启动 (PID: $VITE_PID)${NC}"

# 等待Vite服务器就绪
echo -e "${YELLOW}⏳ 等待Vite服务器就绪...${NC}"
RETRIES=0
while [ $RETRIES -lt $MAX_RETRIES ]; do
    if curl -s http://127.0.0.1:${VITE_PORT} > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Vite服务器已就绪！${NC}"
        break
    fi
    
    # 检查进程是否还在运行
    if ! ps -p $VITE_PID > /dev/null 2>&1; then
        echo -e "${RED}❌ Vite进程意外退出${NC}"
        echo -e "${YELLOW}📋 查看日志:${NC}"
        cat /tmp/vite-dev.log
        exit 1
    fi
    
    RETRIES=$((RETRIES + 1))
    echo -e "   尝试 $RETRIES/$MAX_RETRIES..."
    sleep $RETRY_DELAY
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Vite服务器启动超时${NC}"
    echo -e "${YELLOW}📋 查看日志:${NC}"
    cat /tmp/vite-dev.log
    kill $VITE_PID 2>/dev/null || true
    exit 1
fi

# 等待一秒确保服务器稳定
sleep 1

# 启动Electron
echo -e "${BLUE}🖥️  启动Electron应用...${NC}"
electron-builder install-app-deps > /dev/null 2>&1
electron . &
ELECTRON_PID=$!
echo -e "${GREEN}✅ Electron已启动 (PID: $ELECTRON_PID)${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ 应用启动成功！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 运行信息:${NC}"
echo -e "   Vite服务器: http://127.0.0.1:${VITE_PORT}"
echo -e "   Vite PID: $VITE_PID"
echo -e "   Electron PID: $ELECTRON_PID"
echo ""
echo -e "${YELLOW}💡 提示:${NC}"
echo -e "   - 窗口应该显示玻璃透明效果"
echo -e "   - 如无显示，请查看终端错误信息"
echo -e "   - 按 Ctrl+C 停止应用"
echo -e "   - Vite日志: /tmp/vite-dev.log"
echo ""

# 等待进程退出
wait $ELECTRON_PID 2>/dev/null

# 清理
echo ""
echo -e "${YELLOW}🧹 清理进程...${NC}"
kill $VITE_PID 2>/dev/null || true
echo -e "${GREEN}✅ 已停止${NC}"

