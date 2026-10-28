@echo off
rem Actualiza Jardon Ortopedia a la ultima version SIN tocar sus datos (antes hace una copia de seguridad).
rem El script se copia a una carpeta temporal porque la actualizacion reemplaza los archivos de esta carpeta.
copy /y "%~dp0scripts\windows\actualizar.ps1" "%TEMP%\jardon-actualizar.ps1" >nul & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%TEMP%\jardon-actualizar.ps1" -App "%~dp0." & exit /b
