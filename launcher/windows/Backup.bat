@echo off
chcp 65001 >nul
call "%~dp05-Backup-ClawHermes.bat" %*
exit /b %ERRORLEVEL%
