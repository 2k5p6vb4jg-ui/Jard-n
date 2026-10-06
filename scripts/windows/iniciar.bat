@echo off
rem Jardón Ortopedia: arranque manual (doble clic). Deja esta ventana abierta mientras se usa la app.
chcp 65001 >nul
cd /d "%~dp0..\.."
if not exist ".next\BUILD_ID" (
  echo Preparando la aplicacion por primera vez...
  call npm run build || goto :error
)
call npm start
goto :eof
:error
echo.
echo No se pudo preparar la aplicacion. Revise los mensajes anteriores.
pause
