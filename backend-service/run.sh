#!/bin/bash

# AI医疗助手后端服务启动脚本

echo "🚀 启动AI医疗助手后端服务..."

# 检查.env文件是否存在
if [ ! -f .env ]; then
    echo "⚠️  .env文件不存在,从.env.example复制..."
    cp .env.example .env
    echo "✅ 已创建.env文件,请编辑配置后重新运行"
    exit 1
fi

# 从.env文件读取端口配置
PORT=$(grep "^PORT=" .env | cut -d '=' -f2)
if [ -z "$PORT" ]; then
    PORT=8010  # 默认端口
fi

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用"
    echo "正在查找占用进程..."
    PIDS=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
    echo "进程 PID: $PIDS"

    # macOS兼容的ps命令
    if [[ "$OSTYPE" == "darwin"* ]]; then
        ps -p $PIDS -o pid,comm,command 2>/dev/null || echo "无法获取进程详情"
    else
        ps -p $PIDS -o pid,comm,args 2>/dev/null || echo "无法获取进程详情"
    fi

    read -p "是否终止这些进程并继续? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在终止进程..."
        for pid in $PIDS; do
            echo "  终止进程 $pid"
            kill -9 $pid 2>/dev/null || true
        done
        sleep 1
        echo "✅ 进程已终止"
    else
        echo "❌ 启动取消"
        exit 1
    fi
fi

# 检查Python版本
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "📌 Python版本: $python_version"

# 创建虚拟环境(如果不存在)
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "📥 安装依赖..."
pip install -r requirements.txt

# 创建日志目录
mkdir -p logs

# 启动服务
echo "✨ 启动FastAPI服务..."
echo "📖 API文档: http://localhost:$PORT/docs"
echo "📖 ReDoc: http://localhost:$PORT/redoc"
echo "🏥 健康检查: http://localhost:$PORT/health"
echo ""

# 使用配置文件中的端口启动服务
python -m app.main

