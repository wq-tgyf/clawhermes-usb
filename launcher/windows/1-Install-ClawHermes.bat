@echo off
chcp 65001 >nul
setlocal
echo [1/1] 运行只读安装诊断与编排计划...
call "%~dp0_clawhermes.bat" setup
echo.
echo 诊断完成。需要写盘的操作会要求显式确认参数，请按输出提示执行。
pause
exit /b 0
