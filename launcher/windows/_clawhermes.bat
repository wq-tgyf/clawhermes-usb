@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0..\.."
pushd "%ROOT%" >nul
set "NODE_BIN=%ROOT%\runtimes\windows\node\node.exe"
if exist "%NODE_BIN%" goto run
set "NODE_BIN=node"
:run
if not exist "%ROOT%\core\node\dist\clawhermes.js" (
  echo 未找到 core\node\dist\clawhermes.js，请先在开发机执行 npm run build。
  popd >nul
  exit /b 1
)
"%NODE_BIN%" "%ROOT%\core\node\dist\clawhermes.js" %*
set "CODE=%ERRORLEVEL%"
popd >nul
exit /b %CODE%
