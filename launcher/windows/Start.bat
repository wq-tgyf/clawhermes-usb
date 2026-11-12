@echo off
chcp 65001 >nul
call "%~dp02-Start-ClawHermes.bat" %*
exit /b %ERRORLEVEL%
