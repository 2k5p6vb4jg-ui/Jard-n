@echo off
setlocal
title Jardon Ortopedia - Instalacion
cd /d "%~dp0"

echo.
echo  ==========================================================
echo     JARDON ORTOPEDIA - Instalacion (solo la primera vez)
echo  ==========================================================
echo.

rem --- 1. Comprobar que estamos en la carpeta correcta ---------------------
if not exist "package.json" (
  echo  [!] Este archivo no esta en la carpeta de la aplicacion.
  echo      Abra la carpeta que contiene "package.json", "src" y "prisma"
  echo      y haga doble clic en INSTALAR.bat desde ahi.
  echo      Si el ZIP tiene una carpeta dentro de otra, use la de dentro.
  goto :fin
)

rem --- 2. Comprobar Node.js ------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo  [!] No se encuentra Node.js.
  echo      1. Instalelo desde la pagina que se va a abrir: boton "LTS".
  echo      2. REINICIE el ordenador.
  echo      3. Vuelva a hacer doble clic en INSTALAR.bat
  start "" https://nodejs.org/es
  goto :fin
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"
if errorlevel 1 (
  echo  [!] La version de Node.js es antigua. Instale la version LTS desde
  echo      https://nodejs.org/es , reinicie y vuelva a ejecutar INSTALAR.bat
  start "" https://nodejs.org/es
  goto :fin
)
for /f "delims=" %%v in ('node -v') do echo  [ok] Node.js %%v encontrado.

rem --- 3. Descargar lo necesario (necesita internet) ------------------------
echo.
echo  [1/4] Descargando componentes. Puede tardar varios minutos...
echo        (los avisos amarillos "warn" son normales)
call npm install
if errorlevel 1 goto :error

rem --- 4. Configuracion -----------------------------------------------------
if not exist ".env" copy ".env.example" ".env" >nul
echo  [ok] Configuracion creada.

rem --- 5. Base de datos -----------------------------------------------------
echo.
if exist "prisma\dev.db" (
  echo  [2/4] Ya existe una base de datos: se conserva tal cual.
  call npx prisma migrate deploy
  if errorlevel 1 goto :error
) else (
  echo  [2/4] Base de datos nueva.
  choice /c SN /m "        Cargar DATOS DE PRUEBA ficticios para probar la app"
  if errorlevel 2 (
    call npx prisma migrate deploy
  ) else (
    call npm run demo
  )
  if errorlevel 1 goto :error
)

rem --- 6. Preparar la aplicacion -------------------------------------------
echo.
echo  [3/4] Preparando la aplicacion (1-2 minutos)...
call npm run build
if errorlevel 1 goto :error

rem --- 7. Arrancar ----------------------------------------------------------
echo.
echo  [4/4] Arrancando. Se abrira el navegador en unos segundos.
echo.
echo  ----------------------------------------------------------
echo   NO CIERRE ESTA VENTANA mientras use la aplicacion.
echo   Para abrirla desde el movil, use la direccion "Desde la Wi-Fi".
echo   Otro dia, para arrancarla: doble clic en ARRANCAR.bat
echo  ----------------------------------------------------------
echo.
start "" cmd /c "timeout /t 10 /nobreak >nul & start http://localhost:3000"
call npm start
goto :fin

:error
echo.
echo  [X] Algo ha fallado. Haga una foto de esta ventana y enviela
echo      para que se pueda revisar.

:fin
echo.
pause
endlocal
