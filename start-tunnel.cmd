@echo off
chcp 65001 >nul
title Firefly 公网隧道（关闭此窗口即断开）
setlocal
set "PORT=8787"

where npx >nul 2>nul
if errorlevel 1 (
  echo [错误] 没有找到 npx，请先安装 Node.js：https://nodejs.org/
  pause
  exit /b 1
)

echo ============================================================
echo  给外网朋友用的临时公网地址（本机 8787 端口转发出去）
echo    - 地址形如 https://lkerylm-firefly.loca.lt
echo    - 先把 start-server.cmd 跑起来，再跑这个
echo    - 关掉本窗口 = 立即断开；断线会自动重连
echo    - 只想自己/同一个 Wi-Fi 用，可以不开这个
echo ============================================================
echo.

:loop
call npx -y localtunnel --port %PORT% --subdomain lkerylm-firefly
echo.
echo 隧道断开了，5 秒后重连（Ctrl+C 可停止）...
timeout /t 5 >nul
goto loop
