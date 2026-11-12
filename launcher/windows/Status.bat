@echo off
chcp 65001 >nul
call "%~dp04-Status-ClawHermes.bat" %*
exit /b %ERRORLEVEL%
