@echo off
rem Abre Jardon Ortopedia en su propia ventana (Microsoft Edge en modo aplicacion, sin barra de direcciones).
rem Uso: abrir-app.bat [direccion] [segundos de espera]
setlocal
set "URL=%~1"
if "%URL%"=="" set "URL=http://localhost:3000"
if not "%~2"=="" timeout /t %~2 /nobreak >nul
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" --app=%URL%
) else (
  start "" %URL%
)
endlocal
