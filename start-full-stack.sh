#!/bin/bash

###############################################################################
# 桌面AI助手 - 全栈启动脚本 v4.0
#
# 功能：
# 1. 智能端口管理（检查、清理）
# 2. 完整的环境检查（Python、Node.js、依赖、服务）
# 3. 后端服务启动与健康检查
# 4. 前端 Electron 应用启动
# 5. 优雅的错误处理和日志
# 6. 命令行参数支持
#
# 用法：
#   ./start-full-stack.sh [选项]
#
# 选项：
#   --skip-checks       跳过环境检查
#   --backend-only      仅启动后端服务
#   --frontend-only     仅启动前端应用
#   --clean             启动前清理所有相关进程
#   --auto-kill         自动清理占用端口的进程
#   --help              显示帮助信息
###############################################################################

set -o pipefail  # 管道命令中任何一个失败都会导致整个管道失败

# ============================================================================
# 颜色和样式定义
# ============================================================================
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly RED='\033[0;31m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# ============================================================================
# 配置常量
# ============================================================================
readonly BACKEND_PORT=8010
readonly FRONTEND_PORT=5928
readonly MAX_RETRIES=30
readonly RETRY_DELAY=1
readonly BACKEND_DIR="backend-service"
readonly LOG_DIR="/tmp/desktop-ai-assistant"
readonly PID_DIR="$LOG_DIR/pids"

# 服务依赖配置
readonly OLLAMA_ENDPOINT="http://localhost:11434"
readonly BISHENG_ENDPOINT="http://localhost:7860"
readonly POSTGRES_HOST="localhost"
readonly POSTGRES_PORT=5432

# 日志文件
readonly BACKEND_LOG="$LOG_DIR/backend.log"
readonly FRONTEND_LOG="$LOG_DIR/frontend.log"
readonly STARTUP_LOG="$LOG_DIR/startup.log"

# PID 文件
readonly BACKEND_PID_FILE="$PID_DIR/backend.pid"
readonly FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# ============================================================================
# 全局变量
# ============================================================================
SKIP_CHECKS=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
AUTO_KILL=false
CLEAN_MODE=false

BACKEND_PID=""
FRONTEND_PID=""
ROUTING_MODE=""

# ============================================================================
# 工具函数
# ============================================================================

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

print_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

print_error() {
    echo -e "${RED}✗${NC}  $1"
}

print_step() {
    echo -e "\n${CYAN}${BOLD}[$1] $2${NC}"
}

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}${BOLD}       🚀 桌面AI助手 - 全栈启动脚本 v4.0 🚀${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 记录日志到文件
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$STARTUP_LOG"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" &> /dev/null
}

# 检查端口是否被占用
is_port_in_use() {
    lsof -i ":$1" &> /dev/null
}

# 获取占用端口的进程信息
get_port_process() {
    lsof -i ":$1" -t 2>/dev/null | head -1
}

# 检查 URL 是否可访问
check_url() {
    curl -s -f -o /dev/null "$1" 2>/dev/null
}

# 等待 URL 可访问
wait_for_url() {
    local url=$1
    local max_retries=${2:-$MAX_RETRIES}
    local retries=0
    
    while [ $retries -lt $max_retries ]; do
        if check_url "$url"; then
            return 0
        fi
        retries=$((retries + 1))
        sleep $RETRY_DELAY
    done
    
    return 1
}

# 清理函数
cleanup() {
    echo ""
    print_warning "正在清理进程..."
    
    # 停止后端服务
    if [ -n "$BACKEND_PID" ] && ps -p "$BACKEND_PID" > /dev/null 2>&1; then
        kill "$BACKEND_PID" 2>/dev/null || true
        print_success "后端服务已停止 (PID: $BACKEND_PID)"
    fi
    
    # 停止前端应用
    if [ -n "$FRONTEND_PID" ] && ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        print_success "前端应用已停止 (PID: $FRONTEND_PID)"
    fi
    
    # 清理 PID 文件
    rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE"
    
    print_success "清理完成"
    exit 0
}

# 错误退出
error_exit() {
    print_error "$1"
    log "ERROR: $1"
    cleanup
    exit 1
}

# ============================================================================
# 初始化
# ============================================================================
initialize() {
    # 创建必要的目录
    mkdir -p "$LOG_DIR" "$PID_DIR"
    
    # 清理旧日志
    > "$BACKEND_LOG"
    > "$FRONTEND_LOG"
    > "$STARTUP_LOG"
    
    log "启动脚本开始执行"
    log "参数: $*"
}

# ============================================================================
# 命令行参数解析
# ============================================================================
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-checks)
                SKIP_CHECKS=true
                shift
                ;;
            --backend-only)
                BACKEND_ONLY=true
                shift
                ;;
            --frontend-only)
                FRONTEND_ONLY=true
                shift
                ;;
            --auto-kill)
                AUTO_KILL=true
                shift
                ;;
            --clean)
                CLEAN_MODE=true
                shift
                ;;
            --routing)
                if [[ -n "$2" ]]; then
                    ROUTING_MODE="$2"
                    shift 2
                else
                    print_error "--routing 需要参数: frontend|backend"
                    exit 1
                fi
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                print_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 显示帮助信息
show_help() {
    cat << EOF
用法: $0 [选项]

选项:
  --skip-checks       跳过环境检查
  --backend-only      仅启动后端服务
  --frontend-only     仅启动前端应用（假设后端已运行）
  --routing <mode>    AI调用路由(frontend|backend)，传递给前端
  --auto-kill         自动清理占用端口的进程
  --clean             启动前清理所有相关进程和缓存
  --help              显示此帮助信息

示例:
  $0                  # 启动完整应用栈
  $0 --backend-only   # 仅启动后端
  $0 --routing backend# 前端走后端AI
  $0 --auto-kill      # 自动清理端口并启动
  $0 --clean          # 清理模式启动

EOF
}

# ============================================================================
# 步骤 1: 端口管理
# ============================================================================
check_and_manage_ports() {
    print_step "1/6" "检查端口占用"

    local ports_to_check=()

    if [ "$FRONTEND_ONLY" = false ]; then
        ports_to_check+=($BACKEND_PORT)
    fi

    if [ "$BACKEND_ONLY" = false ]; then
        ports_to_check+=($FRONTEND_PORT)
    fi

    local ports_in_use=()

    for port in "${ports_to_check[@]}"; do
        if is_port_in_use "$port"; then
            ports_in_use+=($port)
            local pid=$(get_port_process "$port")
            print_warning "端口 $port 被占用 (PID: $pid)"
        else
            print_success "端口 $port 可用"
        fi
    done

    if [ ${#ports_in_use[@]} -gt 0 ]; then
        if [ "$AUTO_KILL" = true ]; then
            print_info "自动清理占用端口的进程..."
            for port in "${ports_in_use[@]}"; do
                local pid=$(get_port_process "$port")
                if [ -n "$pid" ]; then
                    kill -9 "$pid" 2>/dev/null || true
                    print_success "已清理端口 $port (PID: $pid)"
                fi
            done
            sleep 2
        else
            echo ""
            print_warning "发现端口占用，请选择操作："
            echo "  1) 自动清理（kill 占用进程）"
            echo "  2) 手动处理（显示进程信息）"
            echo "  3) 退出脚本"
            echo -n "请选择 [1-3]: "
            read -r choice

            case $choice in
                1)
                    for port in "${ports_in_use[@]}"; do
                        local pid=$(get_port_process "$port")
                        if [ -n "$pid" ]; then
                            kill -9 "$pid" 2>/dev/null || true
                            print_success "已清理端口 $port (PID: $pid)"
                        fi
                    done
                    sleep 2
                    ;;
                2)
                    for port in "${ports_in_use[@]}"; do
                        echo ""
                        print_info "端口 $port 的进程信息:"
                        lsof -i ":$port"
                    done
                    echo ""
                    print_error "请手动处理后重新运行脚本"
                    exit 1
                    ;;
                3)
                    print_info "退出脚本"
                    exit 0
                    ;;
                *)
                    print_error "无效选择"
                    exit 1
                    ;;
            esac
        fi
    fi

    log "端口检查完成"
}

# ============================================================================
# 步骤 2: 环境检查
# ============================================================================
check_environment() {
    if [ "$SKIP_CHECKS" = true ]; then
        print_warning "跳过环境检查 (--skip-checks)"
        return 0
    fi

    print_step "2/6" "检查环境"

    # 检查 Python
    if [ "$FRONTEND_ONLY" = false ]; then
        if ! command_exists python && ! command_exists python3; then
            error_exit "未找到 Python。请安装 Python 3.11+"
        fi

        local python_cmd=$(command -v python3 || command -v python)
        local python_version=$($python_cmd --version 2>&1 | awk '{print $2}')
        print_success "Python: $python_version ($python_cmd)"

        # 检查 .env 文件
        if [ ! -f "$BACKEND_DIR/.env" ]; then
            error_exit "未找到 $BACKEND_DIR/.env 配置文件"
        fi
        print_success ".env 配置文件存在"

        # 检查关键配置项
        if ! grep -q "OPENAI_API_KEY" "$BACKEND_DIR/.env" || \
           ! grep -q "DEEPSEEK_API_KEY" "$BACKEND_DIR/.env"; then
            print_warning "API Keys 可能未配置，请检查 .env 文件"
        else
            print_success "API Keys 已配置"
        fi

        # 检查 requirements.txt
        if [ ! -f "$BACKEND_DIR/requirements.txt" ]; then
            print_warning "未找到 requirements.txt"
        else
            print_success "requirements.txt 存在"
        fi
    fi

    # 检查 Node.js
    if [ "$BACKEND_ONLY" = false ]; then
        if ! command_exists node; then
            error_exit "未找到 Node.js。请安装 Node.js 18+"
        fi

        local node_version=$(node --version)
        print_success "Node.js: $node_version"

        # 检查 npm/pnpm
        if command_exists pnpm; then
            local npm_version=$(pnpm --version)
            print_success "pnpm: $npm_version"
        elif command_exists npm; then
            local npm_version=$(npm --version)
            print_success "npm: $npm_version"
        else
            error_exit "未找到 npm 或 pnpm"
        fi

        # 检查 node_modules
        if [ ! -d "node_modules" ]; then
            print_warning "node_modules 不存在"
            print_info "正在安装依赖..."
            if command_exists pnpm; then
                pnpm install || error_exit "依赖安装失败"
            else
                npm install || error_exit "依赖安装失败"
            fi
            print_success "依赖安装完成"
        else
            print_success "node_modules 已存在"
        fi
    fi

    log "环境检查完成"
}

# ============================================================================
# 步骤 3: 服务依赖检查
# ============================================================================
check_service_dependencies() {
    if [ "$SKIP_CHECKS" = true ] || [ "$FRONTEND_ONLY" = true ]; then
        return 0
    fi

    print_step "3/6" "检查服务依赖"

    # 检查 Ollama
    if check_url "$OLLAMA_ENDPOINT/api/tags"; then
        local model_count=$(curl -s "$OLLAMA_ENDPOINT/api/tags" | grep -o '"name"' | wc -l | tr -d ' ')
        print_success "Ollama 服务运行中 ($model_count 个模型可用)"
    else
        print_warning "Ollama 服务未运行 (可选，但推荐启动)"
        print_info "启动命令: ollama serve"
    fi

    # 检查 Bisheng (可选)
    if check_url "$BISHENG_ENDPOINT"; then
        print_success "Bisheng 服务运行中"
    else
        print_warning "Bisheng 服务未运行 (可选)"
    fi

    # 检查 PostgreSQL (可选)
    if command_exists pg_isready; then
        if pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" &> /dev/null; then
            print_success "PostgreSQL 运行中"
        else
            print_warning "PostgreSQL 未运行 (非必需，DATABASE_REQUIRED=false)"
        fi
    else
        print_warning "未安装 pg_isready，跳过 PostgreSQL 检查"
    fi

    log "服务依赖检查完成"
}

# ============================================================================
# 步骤 4: 启动后端服务
# ============================================================================
start_backend() {
    if [ "$FRONTEND_ONLY" = true ]; then
        print_step "4/6" "跳过后端启动 (--frontend-only)"

        # 检查后端是否已运行
        if ! check_url "http://localhost:$BACKEND_PORT/health"; then
            error_exit "后端服务未运行，请先启动后端或移除 --frontend-only 参数"
        fi
        print_success "后端服务已在运行"
        return 0
    fi

    print_step "4/6" "启动后端服务"

    cd "$BACKEND_DIR" || error_exit "无法进入 $BACKEND_DIR 目录"

    # 确定 Python 命令
    local python_cmd=""
    if [ -d "venv" ]; then
        print_info "使用虚拟环境: venv"
        source venv/bin/activate
        python_cmd="python"
    elif [ -f "/opt/anaconda3/envs/deer-flow-env/bin/python" ]; then
        print_info "使用 Conda 环境: deer-flow-env"
        python_cmd="/opt/anaconda3/envs/deer-flow-env/bin/python"
    else
        python_cmd=$(command -v python3 || command -v python)
        print_info "使用系统 Python: $python_cmd"
    fi

    # 启动后端服务
    print_info "启动后端服务..."
    $python_cmd -m app.main > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > "$BACKEND_PID_FILE"

    print_success "后端进程已启动 (PID: $BACKEND_PID)"
    log "后端服务启动，PID: $BACKEND_PID"

    # 等待后端就绪
    print_info "等待后端服务就绪..."
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        # 检查进程是否还在运行
        if ! ps -p "$BACKEND_PID" > /dev/null 2>&1; then
            print_error "后端进程意外退出"
            print_info "查看日志: tail -50 $BACKEND_LOG"
            echo ""
            tail -50 "$BACKEND_LOG"
            error_exit "后端服务启动失败"
        fi

        # 检查健康检查接口
        if check_url "http://localhost:$BACKEND_PORT/health"; then
            print_success "后端服务已就绪！"

            # 获取服务信息
            local health_info=$(curl -s "http://localhost:$BACKEND_PORT/health")
            local version=$(echo "$health_info" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
            if [ -n "$version" ]; then
                print_info "后端版本: $version"
            fi

            # 检查 AI 提供商
            sleep 1
            local providers=$(curl -s "http://localhost:$BACKEND_PORT/v1/ai/providers" 2>/dev/null)
            if [ -n "$providers" ]; then
                print_success "AI 提供商: $providers"
            fi

            break
        fi

        retries=$((retries + 1))
        sleep $RETRY_DELAY
    done

    if [ $retries -eq $MAX_RETRIES ]; then
        print_error "后端服务启动超时"
        print_info "查看日志: tail -50 $BACKEND_LOG"
        echo ""
        tail -50 "$BACKEND_LOG"
        error_exit "后端服务启动超时"
    fi

    cd - > /dev/null || true
    log "后端服务启动完成"
}

# ============================================================================
# 步骤 5: 启动前端应用
# ============================================================================
start_frontend() {
    if [ "$BACKEND_ONLY" = true ]; then
        print_step "5/6" "跳过前端启动 (--backend-only)"
        return 0
    fi

    print_step "5/6" "启动前端应用"

    # 确保后端服务可用
    if ! check_url "http://localhost:$BACKEND_PORT/health"; then
        error_exit "后端服务不可用，无法启动前端"
    fi

    print_info "启动 Electron 应用..."

    # 使用 npm run dev 启动完整的 Electron 应用
    if command_exists pnpm; then
        APP_ROUTING_MODE="$ROUTING_MODE" pnpm run dev > "$FRONTEND_LOG" 2>&1 &
    else
        APP_ROUTING_MODE="$ROUTING_MODE" npm run dev > "$FRONTEND_LOG" 2>&1 &
    fi

    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"

    print_success "前端进程已启动 (PID: $FRONTEND_PID)"
    log "前端应用启动，PID: $FRONTEND_PID"

    # 等待前端就绪（检查进程是否还在运行）
    print_info "等待前端应用就绪..."
    sleep 3

    if ! ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
        print_error "前端进程意外退出"
        print_info "查看日志: tail -50 $FRONTEND_LOG"
        echo ""
        tail -50 "$FRONTEND_LOG"
        error_exit "前端应用启动失败"
    fi

    print_success "前端应用已启动"
    log "前端应用启动完成"
}

# ============================================================================
# 步骤 6: 显示启动信息
# ============================================================================
show_startup_info() {
    print_step "6/6" "启动完成"

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}${BOLD}✨ 应用启动成功！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    echo -e "${BLUE}${BOLD}📊 服务状态:${NC}"

    if [ "$FRONTEND_ONLY" = false ]; then
        echo -e "  ${GREEN}●${NC} 后端 API: ${CYAN}http://localhost:$BACKEND_PORT${NC}"
        echo -e "  ${GREEN}●${NC} API 文档: ${CYAN}http://localhost:$BACKEND_PORT/docs${NC}"
        echo -e "  ${GREEN}●${NC} 健康检查: ${CYAN}http://localhost:$BACKEND_PORT/health${NC}"
        echo -e "  ${GREEN}●${NC} 后端 PID: ${YELLOW}$BACKEND_PID${NC}"
    fi

    if [ "$BACKEND_ONLY" = false ]; then
        echo -e "  ${GREEN}●${NC} 前端应用: ${CYAN}Electron 窗口已打开${NC}"
        echo -e "  ${GREEN}●${NC} 前端 PID: ${YELLOW}$FRONTEND_PID${NC}"
    fi

    echo ""
    echo -e "${BLUE}${BOLD}📋 日志文件:${NC}"
    if [ "$FRONTEND_ONLY" = false ]; then
        echo -e "  ${CYAN}●${NC} 后端: ${YELLOW}$BACKEND_LOG${NC}"
    fi
    if [ "$BACKEND_ONLY" = false ]; then
        echo -e "  ${CYAN}●${NC} 前端: ${YELLOW}$FRONTEND_LOG${NC}"
    fi
    echo -e "  ${CYAN}●${NC} 启动: ${YELLOW}$STARTUP_LOG${NC}"

    echo ""
    echo -e "${BLUE}${BOLD}💡 提示:${NC}"
    echo -e "  ${CYAN}●${NC} 按 ${YELLOW}Ctrl+C${NC} 停止所有服务"
    if [ "$FRONTEND_ONLY" = false ]; then
        echo -e "  ${CYAN}●${NC} 查看后端日志: ${YELLOW}tail -f $BACKEND_LOG${NC}"
    fi
    if [ "$BACKEND_ONLY" = false ]; then
        echo -e "  ${CYAN}●${NC} 快捷键: ${YELLOW}Cmd+Shift+A${NC} (主窗口), ${YELLOW}Cmd+Shift+F${NC} (浮动窗口)"
    fi
    echo ""

    log "应用启动完成"
}

# ============================================================================
# 主函数
# ============================================================================
main() {
    # 捕获退出信号
    trap cleanup SIGINT SIGTERM

    # 初始化
    initialize "$@"

    # 解析命令行参数
    parse_arguments "$@"

    # 打印标题
    print_header
    echo ""

    # 清理模式
    if [ "$CLEAN_MODE" = true ]; then
        print_info "清理模式：停止所有相关进程..."
        pkill -f "python.*app.main" 2>/dev/null || true
        pkill -f "electron" 2>/dev/null || true
        pkill -f "vite" 2>/dev/null || true
        sleep 2
        print_success "清理完成"
        echo ""
    fi

    # 执行启动步骤
    check_and_manage_ports
    check_environment
    check_service_dependencies
    start_backend
    start_frontend
    show_startup_info

    # 等待前端退出（如果启动了前端）
    if [ "$BACKEND_ONLY" = false ] && [ -n "$FRONTEND_PID" ]; then
        wait "$FRONTEND_PID" 2>/dev/null || true
    else
        # 如果只启动后端，保持脚本运行
        print_info "按 Ctrl+C 停止服务"
        while true; do
            sleep 1
        done
    fi

    # 自动清理
    cleanup
}

# 运行主函数
main "$@"
