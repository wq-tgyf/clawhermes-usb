@echo off
chcp 65001 >nul
setlocal
echo 该操作会移除当前 Windows 宿主机上的受管 WSL 发行版。
echo 默认只输出计划，不会修改宿主机。
call "%~dp0_clawhermes.bat" wsl-unregister-plan
echo.
echo 确认已备份后，如需真正执行，请手动运行：
echo   node core\node\dist\clawhermes.js wsl-unregister --confirm-unregister
pause
exit /b 0
