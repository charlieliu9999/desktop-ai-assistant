#!/bin/bash

# 桌面AI助手 - 一键启动脚本
# 用途: 同时启动后端服务和前端应用

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend-service"
LOGS_DIR="$PROJECT_ROOT/logs"

# 创建日志目录
mkdir -p "$LOGS_DIR"

# 清理函数
cleanup() {
    log_info "正在清理进程..."
    
    # 杀死后端进程
    if [ -f "$LOGS_DIR/backend.pid" ]; then
        BACKEND_PID=$(cat "$LOGS_DIR/backend.pid")
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            log_info "停止后端服务 (PID: $BACKEND_PID)"
            kill $BACKEND_PID 2>/dev/null || true
        fi
        rm -f "$LOGS_DIR/backend.pid"
    fi
    
    # 杀死前端进程
    if [ -f "$LOGS_DIR/frontend.pid" ]; then
        FRONTEND_PID=$(cat "$LOGS_DIR/frontend.pid")
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            log_info "停止前端服务 (PID: $FRONTEND_PID)"
            kill $FRONTEND_PID 2>/dev/null || true
        fi
        rm -f "$LOGS_DIR/frontend.pid"
    fi
    
    log_success "清理完成"
}

# 注册退出时的清理函数
trap cleanup EXIT INT TERM

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装,请先安装 Node.js >= 18.0.0"
        exit 1
    fi
    log_success "Node.js: $(node --version)"
    
    # 检查Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 未安装,请先安装 Python >= 3.9"
        exit 1
    fi
    log_success "Python: $(python3 --version)"
    
    # 检查后端虚拟环境
    if [ ! -d "$BACKEND_DIR/venv" ]; then
        log_warning "后端虚拟环境不存在,正在创建..."
        cd "$BACKEND_DIR"
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        cd "$PROJECT_ROOT"
        log_success "虚拟环境创建完成"
    fi
    
    # 检查前端依赖
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        log_warning "前端依赖未安装,正在安装..."
        cd "$PROJECT_ROOT"
        npm install
        log_success "前端依赖安装完成"
    fi
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务..."
    
    cd "$BACKEND_DIR"
    
    # 检查端口是否被占用
    if lsof -Pi :8010 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口 8010 已被占用,尝试停止旧进程..."
        lsof -ti:8010 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    # 激活虚拟环境并启动服务
    source venv/bin/activate
    nohup python -m uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload \
        > "$LOGS_DIR/backend.log" 2>&1 &
    
    BACKEND_PID=$!
    echo $BACKEND_PID > "$LOGS_DIR/backend.pid"
    
    log_info "后端服务启动中 (PID: $BACKEND_PID)..."
    
    # 等待后端启动
    for i in {1..30}; do
        if curl -s http://127.0.0.1:8010/health > /dev/null 2>&1; then
            log_success "后端服务启动成功! (http://127.0.0.1:8010)"
            log_info "API文档: http://127.0.0.1:8010/docs"
            return 0
        fi
        sleep 1
    done
    
    log_error "后端服务启动超时,请检查日志: $LOGS_DIR/backend.log"
    tail -20 "$LOGS_DIR/backend.log"
    exit 1
}

# 启动前端服务
start_frontend() {
    log_info "启动前端开发服务器..."
    
    cd "$PROJECT_ROOT"
    
    # 检查端口是否被占用
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口 5173 已被占用,尝试停止旧进程..."
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    # 启动Vite开发服务器
    nohup npm run dev > "$LOGS_DIR/frontend.log" 2>&1 &
    
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$LOGS_DIR/frontend.pid"
    
    log_info "前端服务启动中 (PID: $FRONTEND_PID)..."
    
    # 等待前端启动 (注意:端口是5928,不是5173)
    for i in {1..30}; do
        if curl -s http://localhost:5928 > /dev/null 2>&1; then
            log_success "前端服务启动成功! (http://localhost:5928)"
            return 0
        fi
        sleep 1
    done

    log_warning "前端服务启动超时,但可能仍在启动中..."
    log_info "请检查日志: $LOGS_DIR/frontend.log"
}

# 显示状态
show_status() {
    echo ""
    echo "=========================================="
    echo "  桌面AI助手 - 服务状态"
    echo "=========================================="
    echo ""
    
    # 后端状态
    if curl -s http://127.0.0.1:8010/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 后端服务${NC}: http://127.0.0.1:8010"
        echo -e "   API文档: http://127.0.0.1:8010/docs"
    else
        echo -e "${RED}❌ 后端服务${NC}: 未运行"
    fi
    
    # 前端状态
    if curl -s http://localhost:5928 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 前端服务${NC}: http://localhost:5928"
    else
        echo -e "${YELLOW}⏳ 前端服务${NC}: 启动中..."
    fi
    
    echo ""
    echo "=========================================="
    echo "  日志文件"
    echo "=========================================="
    echo "  后端日志: $LOGS_DIR/backend.log"
    echo "  前端日志: $LOGS_DIR/frontend.log"
    echo ""
    echo "=========================================="
    echo "  快捷命令"
    echo "=========================================="
    echo "  查看后端日志: tail -f $LOGS_DIR/backend.log"
    echo "  查看前端日志: tail -f $LOGS_DIR/frontend.log"
    echo "  停止服务: Ctrl+C"
    echo "=========================================="
    echo ""
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  桌面AI助手 - 启动脚本"
    echo "=========================================="
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 启动后端
    start_backend
    
    # 启动前端
    start_frontend
    
    # 显示状态
    show_status
    
    # 提示用户
    log_info "所有服务已启动!"
    log_info "按 Ctrl+C 停止所有服务"
    echo ""
    
    # 保持脚本运行
    while true; do
        sleep 1
    done
}

# 运行主函数
main

