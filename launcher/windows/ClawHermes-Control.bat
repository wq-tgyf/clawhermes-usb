@echo off
chcp 65001 >nul
setlocal
call "%~dp02-Start-ClawHermes.bat"
exit /b %ERRORLEVEL%
