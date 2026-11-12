@echo off
chcp 65001 >nul
setlocal
call "%~dp0_clawhermes.bat" status
echo.
pause
exit /b 0
