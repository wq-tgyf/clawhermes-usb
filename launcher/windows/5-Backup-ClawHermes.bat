@echo off
chcp 65001 >nul
setlocal
call "%~dp0_clawhermes.bat" backup
echo.
echo 备份归档位于 data\backups\。
pause
exit /b 0
