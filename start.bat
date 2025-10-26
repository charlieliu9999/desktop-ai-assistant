@echo off
REM 桌面AI助手 - Windows启动脚本
REM 用途: 同时启动后端服务和前端应用

setlocal enabledelayedexpansion

REM 设置颜色
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "NC=[0m"

REM 项目目录
set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%backend-service"
set "LOGS_DIR=%PROJECT_ROOT%logs"

REM 创建日志目录
if not exist "%LOGS_DIR%" mkdir "%LOGS_DIR%"

echo.
echo ==========================================
echo   桌面AI助手 - 启动脚本
echo ==========================================
echo.

REM 检查Node.js
echo %BLUE%[INFO]%NC% 检查依赖...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR]%NC% Node.js 未安装,请先安装 Node.js ^>= 18.0.0
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo %GREEN%[SUCCESS]%NC% Node.js: %NODE_VERSION%

REM 检查Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR]%NC% Python 未安装,请先安装 Python ^>= 3.9
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo %GREEN%[SUCCESS]%NC% Python: %PYTHON_VERSION%

REM 检查后端虚拟环境
if not exist "%BACKEND_DIR%\venv" (
    echo %YELLOW%[WARNING]%NC% 后端虚拟环境不存在,正在创建...
    cd /d "%BACKEND_DIR%"
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    cd /d "%PROJECT_ROOT%"
    echo %GREEN%[SUCCESS]%NC% 虚拟环境创建完成
)

REM 检查前端依赖
if not exist "%PROJECT_ROOT%node_modules" (
    echo %YELLOW%[WARNING]%NC% 前端依赖未安装,正在安装...
    cd /d "%PROJECT_ROOT%"
    call npm install
    echo %GREEN%[SUCCESS]%NC% 前端依赖安装完成
)

REM 启动后端服务
echo.
echo %BLUE%[INFO]%NC% 启动后端服务...

REM 检查端口8010是否被占用
netstat -ano | findstr :8010 | findstr LISTENING >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %YELLOW%[WARNING]%NC% 端口 8010 已被占用,尝试停止旧进程...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8010 ^| findstr LISTENING') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

REM 启动后端
cd /d "%BACKEND_DIR%"
start /B cmd /c "call venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload > ..\logs\backend.log 2>&1"

echo %BLUE%[INFO]%NC% 后端服务启动中...

REM 等待后端启动
set /a count=0
:wait_backend
set /a count+=1
if %count% gtr 30 (
    echo %RED%[ERROR]%NC% 后端服务启动超时,请检查日志: %LOGS_DIR%\backend.log
    pause
    exit /b 1
)
curl -s http://127.0.0.1:8010/health >nul 2>&1
if %ERRORLEVEL% neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait_backend
)

echo %GREEN%[SUCCESS]%NC% 后端服务启动成功! (http://127.0.0.1:8010)
echo %BLUE%[INFO]%NC% API文档: http://127.0.0.1:8010/docs

REM 启动前端服务
echo.
echo %BLUE%[INFO]%NC% 启动前端开发服务器...

REM 检查端口5928是否被占用
netstat -ano | findstr :5928 | findstr LISTENING >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %YELLOW%[WARNING]%NC% 端口 5928 已被占用,尝试停止旧进程...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5928 ^| findstr LISTENING') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

REM 启动前端
cd /d "%PROJECT_ROOT%"
start /B cmd /c "npm run dev > logs\frontend.log 2>&1"

echo %BLUE%[INFO]%NC% 前端服务启动中...

REM 等待前端启动
set /a count=0
:wait_frontend
set /a count+=1
if %count% gtr 30 (
    echo %YELLOW%[WARNING]%NC% 前端服务启动超时,但可能仍在启动中...
    echo %BLUE%[INFO]%NC% 请检查日志: %LOGS_DIR%\frontend.log
    goto show_status
)
curl -s http://localhost:5928 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait_frontend
)

echo %GREEN%[SUCCESS]%NC% 前端服务启动成功! (http://localhost:5928)

:show_status
REM 显示状态
echo.
echo ==========================================
echo   桌面AI助手 - 服务状态
echo ==========================================
echo.

REM 后端状态
curl -s http://127.0.0.1:8010/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %GREEN%✅ 后端服务%NC%: http://127.0.0.1:8010
    echo    API文档: http://127.0.0.1:8010/docs
) else (
    echo %RED%❌ 后端服务%NC%: 未运行
)

REM 前端状态
curl -s http://localhost:5928 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %GREEN%✅ 前端服务%NC%: http://localhost:5928
) else (
    echo %YELLOW%⏳ 前端服务%NC%: 启动中...
)

echo.
echo ==========================================
echo   日志文件
echo ==========================================
echo   后端日志: %LOGS_DIR%\backend.log
echo   前端日志: %LOGS_DIR%\frontend.log
echo.
echo ==========================================
echo   快捷命令
echo ==========================================
echo   查看后端日志: type %LOGS_DIR%\backend.log
echo   查看前端日志: type %LOGS_DIR%\frontend.log
echo   停止服务: 关闭此窗口或按 Ctrl+C
echo ==========================================
echo.

echo %GREEN%[SUCCESS]%NC% 所有服务已启动!
echo %BLUE%[INFO]%NC% 按任意键退出 (服务将继续在后台运行)
echo.

pause

