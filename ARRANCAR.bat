@echo off
setlocal
title Jardon Ortopedia
cd /d "%~dp0"

if not exist "node_modules" (
  echo  La aplicacion aun no esta instalada. Ejecute primero INSTALAR.bat
  pause
  exit /b 1
)
if not exist ".next\BUILD_ID" (
  echo  Preparando la aplicacion...
  call npm run build
  if errorlevel 1 goto :error
)

echo.
echo  ----------------------------------------------------------
echo   JARDON ORTOPEDIA en marcha.
echo   NO CIERRE ESTA VENTANA mientras use la aplicacion.
echo   Para abrirla desde el movil, use la direccion "Desde la Wi-Fi".
echo  ----------------------------------------------------------
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000"
call npm start
goto :fin

:error
echo.
echo  [X] Algo ha fallado. Haga una foto de esta ventana y enviela.

:fin
echo.
pause
endlocal
