@echo off
chcp 65001 >nul
setlocal
call "%~dp0_clawhermes.bat" start
if errorlevel 1 (
  echo 启动失败，请查看上方输出。
  pause
  exit /b 1
)
set "ROOT=%~dp0..\.."
set "NODE_BIN=%ROOT%\runtimes\windows\node\node.exe"
if exist "%NODE_BIN%" goto portal
set "NODE_BIN=node"
:portal
set "PORTAL_URL="
for /f "usebackq delims=" %%u in (`"%NODE_BIN%" "%~dp0portal-url.mjs"`) do set "PORTAL_URL=%%u"
if not defined PORTAL_URL set "PORTAL_URL=http://127.0.0.1:17000/"
start "" "%PORTAL_URL%"
echo 已打开本地门户：%PORTAL_URL%
exit /b 0
