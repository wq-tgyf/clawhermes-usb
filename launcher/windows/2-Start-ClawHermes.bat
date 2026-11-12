@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0..\.."
if not exist "%ROOT%\data\logs" mkdir "%ROOT%\data\logs"
call "%~dp0_clawhermes.bat" start > "%ROOT%\data\logs\launcher.log" 2>&1
set "CODE=%ERRORLEVEL%"
type "%ROOT%\data\logs\launcher.log"
if not "%CODE%"=="0" (
  echo 启动失败。日志：%ROOT%\data\logs\launcher.log
  pause
  exit /b 1
)
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
