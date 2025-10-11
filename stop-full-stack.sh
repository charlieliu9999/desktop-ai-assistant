#!/bin/bash

###############################################################################
# 桌面AI助手 - 全栈停止脚本 v4.0
#
# 功能：
# 1. 停止后端服务
# 2. 停止前端应用
# 3. 清理 PID 文件
# 4. 可选：清理日志文件
#
# 用法：
#   ./stop-full-stack.sh [选项]
#
# 选项：
#   --backend-only      仅停止后端服务
#   --frontend-only     仅停止前端应用
#   --clean-logs        同时清理日志文件
#   --force             强制停止（使用 kill -9）
#   --help              显示帮助信息
###############################################################################

set -o pipefail

# ============================================================================
# 颜色定义
# ============================================================================
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly RED='\033[0;31m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# ============================================================================
# 配置常量
# ============================================================================
readonly LOG_DIR="/tmp/desktop-ai-assistant"
readonly PID_DIR="$LOG_DIR/pids"
readonly BACKEND_PID_FILE="$PID_DIR/backend.pid"
readonly FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# ============================================================================
# 全局变量
# ============================================================================
BACKEND_ONLY=false
FRONTEND_ONLY=false
CLEAN_LOGS=false
FORCE_KILL=false

# ============================================================================
# 工具函数
# ============================================================================
print_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

print_error() {
    echo -e "${RED}✗${NC}  $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}${BOLD}       🛑 桌面AI助手 - 全栈停止脚本 v4.0 🛑${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ============================================================================
# 命令行参数解析
# ============================================================================
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend-only)
                BACKEND_ONLY=true
                shift
                ;;
            --frontend-only)
                FRONTEND_ONLY=true
                shift
                ;;
            --clean-logs)
                CLEAN_LOGS=true
                shift
                ;;
            --force)
                FORCE_KILL=true
                shift
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
  --backend-only      仅停止后端服务
  --frontend-only     仅停止前端应用
  --clean-logs        同时清理日志文件
  --force             强制停止（使用 kill -9）
  --help              显示此帮助信息

示例:
  $0                  # 停止所有服务
  $0 --backend-only   # 仅停止后端
  $0 --force          # 强制停止所有服务
  $0 --clean-logs     # 停止服务并清理日志

EOF
}

# ============================================================================
# 停止服务
# ============================================================================
stop_service() {
    local service_name=$1
    local pid_file=$2
    local process_pattern=$3
    
    local stopped=false
    
    # 从 PID 文件读取
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            print_info "停止 $service_name (PID: $pid)..."
            if [ "$FORCE_KILL" = true ]; then
                kill -9 "$pid" 2>/dev/null || true
            else
                kill "$pid" 2>/dev/null || true
                sleep 2
                # 如果还在运行，强制停止
                if ps -p "$pid" > /dev/null 2>&1; then
                    kill -9 "$pid" 2>/dev/null || true
                fi
            fi
            print_success "$service_name 已停止"
            stopped=true
        fi
        rm -f "$pid_file"
    fi
    
    # 通过进程名查找并停止
    if [ -n "$process_pattern" ]; then
        local pids=$(pgrep -f "$process_pattern" 2>/dev/null)
        if [ -n "$pids" ]; then
            print_info "发现 $service_name 进程: $pids"
            if [ "$FORCE_KILL" = true ]; then
                pkill -9 -f "$process_pattern" 2>/dev/null || true
            else
                pkill -f "$process_pattern" 2>/dev/null || true
            fi
            print_success "$service_name 已停止"
            stopped=true
        fi
    fi
    
    if [ "$stopped" = false ]; then
        print_warning "$service_name 未运行"
    fi
}

# ============================================================================
# 主函数
# ============================================================================
main() {
    parse_arguments "$@"
    
    print_header
    echo ""
    
    # 停止后端服务
    if [ "$FRONTEND_ONLY" = false ]; then
        stop_service "后端服务" "$BACKEND_PID_FILE" "python.*app.main"
    fi
    
    # 停止前端应用
    if [ "$BACKEND_ONLY" = false ]; then
        stop_service "前端应用" "$FRONTEND_PID_FILE" "electron"
        # 同时停止可能的 Vite 进程
        pkill -f "vite" 2>/dev/null || true
    fi
    
    # 清理日志
    if [ "$CLEAN_LOGS" = true ]; then
        print_info "清理日志文件..."
        rm -rf "$LOG_DIR"/*.log
        print_success "日志文件已清理"
    fi
    
    echo ""
    print_success "所有服务已停止"
    echo ""
}

main "$@"

