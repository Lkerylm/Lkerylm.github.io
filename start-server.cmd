@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Firefly 服务器 (关闭此窗口即停止)

echo.
echo   🦋 Firefly 服务器启动中...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   ❌ 没有找到 Node.js，请先安装 https://nodejs.org/ ^(选 LTS 版本^)
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo   首次运行：正在打包网站，大约 1~2 分钟...
  call pnpm build || call npm run build
)

node server\server.mjs

echo.
echo   服务器已停止。
pause
