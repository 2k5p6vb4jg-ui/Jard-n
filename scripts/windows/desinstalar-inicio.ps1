# Jardón Ortopedia · Quita el arranque automático y la regla del cortafuegos (los datos NO se tocan).
$ErrorActionPreference = "Stop"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}
Stop-ScheduledTask -TaskName "Jardon Ortopedia" -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "Jardon Ortopedia" -Confirm:$false -ErrorAction SilentlyContinue
Get-NetFirewallRule -DisplayName "Jardon Ortopedia (3000)" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
# La tarea lanza cmd.exe > npm > node: se detiene el proceso que escucha en el puerto 3000
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Write-Host "Arranque automático eliminado. Los datos de pacientes no se han modificado." -ForegroundColor Green
Read-Host "Pulse Intro para cerrar"
