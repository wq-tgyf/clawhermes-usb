@echo off
chcp 65001 >nul
call "%~dp03-Stop-ClawHermes.bat" %*
exit /b %ERRORLEVEL%
