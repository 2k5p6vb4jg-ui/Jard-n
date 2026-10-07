# Jardón Ortopedia · Arranque automático en Windows
#
# Crea una tarea programada que inicia la app al iniciar sesión en este ordenador
# (sin ventana) y abre el puerto 3000 en el cortafuegos SOLO para redes privadas.
#
# Uso: clic derecho sobre este archivo > "Ejecutar con PowerShell" (se pedirá permiso de administrador).

$ErrorActionPreference = "Stop"
$TaskName = "Jardon Ortopedia"
$Port = 3000

# Relanzar como administrador si hace falta (la regla del cortafuegos lo requiere)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

$AppDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $AppDir
Write-Host "Carpeta de la aplicación: $AppDir"

$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npm) { throw "No se encuentra Node.js/npm. Instálelo desde https://nodejs.org (versión LTS) y vuelva a ejecutar este script." }

if (-not (Test-Path ".next\BUILD_ID")) {
  Write-Host "Compilando la aplicación (solo la primera vez)..."
  & $npm run build
  if ($LASTEXITCODE -ne 0) { throw "Falló la compilación." }
}

New-Item -ItemType Directory -Force -Path (Join-Path $AppDir "logs") | Out-Null
$cmd = "cd /d `"$AppDir`" && `"$npm`" start >> `"$AppDir\logs\servidor.log`" 2>&1"

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c $cmd" -WorkingDirectory $AppDir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -Hidden
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
  -Description "Inicia Jardón Ortopedia (gestión clínica y de taller) en el puerto $Port" | Out-Null

# Cortafuegos: solo red privada (la Wi-Fi de la tienda debe estar marcada como "Privada" en Windows)
# Las reglas que BLOQUEAN node.exe (creadas si se pulsó «Cancelar» en el aviso del Firewall) ganan a cualquier permiso
Get-NetFirewallApplicationFilter -ErrorAction SilentlyContinue | Where-Object { $_.Program -like "*node.exe" } |
  Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object { $_.Direction -eq "Inbound" -and $_.Action -eq "Block" } | Remove-NetFirewallRule
Get-NetFirewallRule -DisplayName "Jardon Ortopedia ($Port)" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName "Jardon Ortopedia ($Port)" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private | Out-Null

Start-ScheduledTask -TaskName $TaskName
Write-Host ""
Write-Host "Listo. La aplicación se iniciará sola cada vez que inicie sesión en este ordenador." -ForegroundColor Green
Write-Host "Ábrala en http://localhost:$Port (y desde la tablet con la IP de este equipo)."
Write-Host "Registro de funcionamiento: $AppDir\logs\servidor.log"
Read-Host "Pulse Intro para cerrar"
