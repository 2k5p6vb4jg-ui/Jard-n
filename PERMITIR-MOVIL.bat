@echo off
rem Abre el cortafuegos de Windows para que el movil y la tablet puedan entrar en la app.
rem Pedira permiso de administrador (pulse Si).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\permitir-movil.ps1"
