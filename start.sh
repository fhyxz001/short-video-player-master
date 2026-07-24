#!/bin/bash

# 竖屏视频播放器启动脚本 (Linux)
# 该脚本将自动安装依赖，构建前端，并启动后端服务。

echo "=========================================="
echo "      竖屏视频播放器 (Linux版)"
echo "=========================================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未检测到 Node.js。"
    echo "请先安装 Node.js (建议 v18+)。"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "错误: 未检测到 npm。"
    echo "请先安装 npm (通常随 Node.js 一起安装)。"
    echo "尝试运行: sudo apt install npm  或  sudo yum install npm"
    exit 1
fi

# 1. 前端配置与构建 (先构建，再启动后端)
echo ""
echo "[1/3] 配置前端..."
cd frontend || exit
if [ ! -d "node_modules" ]; then
    echo "正在安装前端依赖..."
    if ! npm install; then
        echo "错误: 前端依赖安装失败。"
        exit 1
    fi
fi

echo "正在构建前端页面..."
if ! npm run build; then
    echo "错误: 前端构建失败。"
    exit 1
fi

echo "正在部署前端资源到后端..."
# 确保目标目录存在
mkdir -p ../backend/public
# 清空目标目录
rm -rf ../backend/public/*
# 复制文件
if [ -d "dist" ]; then
    cp -r dist/* ../backend/public/
    echo "前端已部署到后端静态目录。"
else
    echo "错误: 未找到构建产物 (dist 目录)。"
    exit 1
fi

cd ..

# 2. 后端配置与启动
echo ""
echo "[2/3] 配置后端..."
cd backend || exit
if [ ! -d "node_modules" ]; then
    echo "正在安装后端依赖..."
    if ! npm install; then
        echo "错误: 后端依赖安装失败。"
        exit 1
    fi
fi

echo "=========================================="
echo "[3/3] 准备启动!"
echo "服务将运行在: http://<服务器IP>:7978"
echo "提示: 关闭此窗口或按 Ctrl+C 可停止服务。"
echo "=========================================="

echo "正在启动服务..."
# 检查是否安装了 PM2，如果安装了先停止旧进程，避免冲突
if command -v pm2 &> /dev/null; then
    pm2 delete video-player-backend 2>/dev/null
fi

# 检查并杀掉占用端口 7978 的进程
PORT=7978
if command -v lsof &> /dev/null; then
    PIDS=$(lsof -t -i:$PORT)
    if [ -n "$PIDS" ]; then
        echo "正在终止占用端口 $PORT 的进程 (PID: $PIDS)..."
        kill -9 $PIDS
    fi
elif command -v fuser &> /dev/null; then
    fuser -k -9 $PORT/tcp >/dev/null 2>&1
fi

# 确保所有相关的 node app.js 进程都被清理 (可选，防止僵尸进程)
# pkill -f "node app.js" 2>/dev/null

# 在前台运行
npm start
