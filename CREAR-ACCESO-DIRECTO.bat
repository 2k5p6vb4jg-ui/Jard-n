@echo off
rem Crea en el escritorio un icono que abre Jardon Ortopedia en su propia ventana (sin la barra de Edge).
rem Sirve en el ordenador de la tienda y en cualquier otro PC de la misma Wi-Fi.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\crear-acceso.ps1"
