@echo off
chcp 65001 >nul
setlocal
echo 修复/更新会重新执行只读诊断，可能需要网络访问。
call "%~dp0_clawhermes.bat" setup
echo.
call "%~dp0_clawhermes.bat" payloads
echo.
pause
exit /b 0
