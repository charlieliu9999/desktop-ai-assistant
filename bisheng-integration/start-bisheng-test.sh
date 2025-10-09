#!/bin/bash

###############################################################################
# Bisheng 测试环境启动脚本
#
# 功能：一键启动所有必需的服务
#   - 测试页面服务器 (port 8888)
#   - iframe 代理服务器 (port 3002)
#   - 自动打开浏览器
###############################################################################

cd "$(dirname "$0")"

echo "🚀 启动 Bisheng 测试环境..."
echo "=========================================="

# 检查端口占用
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "⚠️  端口 $1 已被占用"
        return 1
    fi
    return 0
}

# 启动测试页面服务器
if check_port 8888; then
    echo "📄 启动测试页面服务器 (port 8888)..."
    python3 -m http.server 8888 > /dev/null 2>&1 &
    HTTP_PID=$!
    echo "   PID: $HTTP_PID"
else
    echo "   已有服务运行在 8888 端口"
fi

# 等待一秒
sleep 1

# 启动 iframe 代理服务器
if check_port 3002; then
    echo "🖼️  启动 iframe 代理服务器 (port 3002)..."
    node iframe-proxy.js > /dev/null 2>&1 &
    PROXY_PID=$!
    echo "   PID: $PROXY_PID"
else
    echo "   已有服务运行在 3002 端口"
fi

# 等待服务启动
sleep 2

echo "=========================================="
echo ""
echo "✅ 服务启动完成！"
echo ""
echo "📍 访问地址："
echo "   测试页面: http://localhost:8888/bisheng-test.html"
echo "   iframe 代理: http://localhost:3002"
echo ""
echo "💡 使用说明："
echo "   1. 点击'🔐 登录并加载工作流'"
echo "   2. 选择显示模式（自定义 或 iframe）"
echo "   3. 选择工作流并开始对话"
echo ""
echo "🛑 停止服务："
echo "   按 Ctrl+C 或运行: killall python3 node"
echo ""

# 打开浏览器
open http://localhost:8888/bisheng-test.html

# 保持脚本运行
wait

