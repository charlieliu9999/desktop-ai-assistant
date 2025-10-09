#!/bin/bash
set -euo pipefail

# macOS 一键启动：仅悬浮窗（开发模式）
# 使用本地 Vite 开发服务器 + Electron 主进程（APP_MODE=floating）

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_DIR/.logs"
START_PORT="${VITE_PORT:-5928}"
PORT="$START_PORT"
RENDERER_URL="http://127.0.0.1:${PORT}/"

echo "[INFO] Project directory: $PROJECT_DIR"
echo "[INFO] Logs directory: $LOG_DIR"
echo "[INFO] Target dev server: $RENDERER_URL"

mkdir -p "$LOG_DIR"

# 依赖检查
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js 未安装，请先安装 Node.js (>=18) 后重试。"; exit 1;
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm 未安装，请先安装 npm 后重试。"; exit 1;
fi

# 安装依赖（首次或缺失时）
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
  echo "[INFO] 安装项目依赖..."
  (cd "$PROJECT_DIR" && npm install)
fi

find_free_port() {
  local p
  for p in $(seq 5928 5999); do
    if ! lsof -i tcp:"$p" >/dev/null 2>&1; then
      echo "$p"; return 0
    fi
  done
  return 1
}

# 启动 Vite 开发服务器（后台，严格端口）
echo "[INFO] 启动 Vite 开发服务器 (strict port, preferred=$PORT) ..."
if lsof -i tcp:"$PORT" >/dev/null 2>&1; then
  echo "[WARN] 端口 $PORT 已被占用，尝试查找可用端口..."
  FREE_PORT=$(find_free_port) || { echo "[ERROR] 没有找到可用端口(5928-5999)。"; exit 1; }
  PORT="$FREE_PORT"
  RENDERER_URL="http://127.0.0.1:${PORT}/"
  echo "[INFO] 使用可用端口: $PORT"
fi

(cd "$PROJECT_DIR" && nohup npx vite --port "$PORT" --strictPort > "$LOG_DIR/vite-dev.log" 2>&1 &)
echo "[INFO] Vite 已在后台启动，日志: $LOG_DIR/vite-dev.log"

# 等待开发服务器就绪
echo "[INFO] 等待开发服务器就绪..."
for i in {1..30}; do
  if curl -sSf "${RENDERER_URL}index.html" >/dev/null 2>&1; then
    echo "[INFO] 开发服务器已就绪。"; break;
  fi
  sleep 1
done

if ! curl -sSf "${RENDERER_URL}index.html" >/dev/null 2>&1; then
  echo "[ERROR] 未检测到开发服务器运行在 ${RENDERER_URL}，请检查 Vite 是否成功启动。"
  echo "[HINT] 检查日志: $LOG_DIR/vite-dev.log"
  exit 1
fi

# 启动 Electron 应用（仅悬浮窗）
echo "[INFO] 启动 Electron 应用（仅悬浮窗）..."
cd "$PROJECT_DIR"
ELECTRON_RENDERER_URL="${RENDERER_URL}" APP_MODE="floating" npx electron .