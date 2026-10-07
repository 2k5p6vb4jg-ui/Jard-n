# Jardón Ortopedia · Permitir que móviles y tablets de la Wi-Fi abran la app.
#  1. Quita las reglas del cortafuegos que BLOQUEAN Node.js (se crean si se pulsó
#     «Cancelar» en el aviso del Firewall; un bloqueo gana a cualquier permiso).
#  2. Marca la red a la que está conectado este equipo como «Privada».
#  3. Permite el puerto 3000 solo en redes privadas.
#  4. Muestra la dirección que hay que escribir en el móvil.
$ErrorActionPreference = "Continue"
$Port = 3000

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

Write-Host ""
Write-Host "  Jardón Ortopedia · Acceso desde el móvil" -ForegroundColor Cyan
Write-Host ""

# 1. Reglas de bloqueo de Node.js
$blocked = @(Get-NetFirewallApplicationFilter -ErrorAction SilentlyContinue |
  Where-Object { $_.Program -like "*node.exe" } |
  Get-NetFirewallRule -ErrorAction SilentlyContinue |
  Where-Object { $_.Direction -eq "Inbound" -and $_.Action -eq "Block" })
if ($blocked.Count -gt 0) {
  $blocked | Remove-NetFirewallRule
  Write-Host "  [ok] Eliminadas $($blocked.Count) reglas que bloqueaban la app." -ForegroundColor Green
} else {
  Write-Host "  [ok] No había reglas de bloqueo."
}

# 2. Red privada (solo la conexión que tiene acceso a la red local / internet)
$profiles = @(Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object { $_.IPv4Connectivity -ne "Disconnected" })
foreach ($p in $profiles) {
  if ($p.NetworkCategory -eq "Public") {
    Set-NetConnectionProfile -InterfaceIndex $p.InterfaceIndex -NetworkCategory Private -ErrorAction SilentlyContinue
    Write-Host "  [ok] La red «$($p.Name)» ($($p.InterfaceAlias)) pasa de Pública a Privada." -ForegroundColor Green
  } else {
    Write-Host "  [ok] La red «$($p.Name)» ($($p.InterfaceAlias)) ya es $($p.NetworkCategory)."
  }
}

# 3. Permitir el puerto en redes privadas
Get-NetFirewallRule -DisplayName "Jardon Ortopedia ($Port)" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName "Jardon Ortopedia ($Port)" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private,Domain | Out-Null
Write-Host "  [ok] Puerto $Port permitido en redes privadas." -ForegroundColor Green

# 4. Dirección para el móvil (adaptadores reales, no virtuales)
$virtual = "vEthernet|VirtualBox|VMware|Hyper-V|WSL|Loopback|Bluetooth|Tailscale|ZeroTier|VPN|TAP|Hamachi|rea local\*|Local Area Connection\*"
$ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notmatch $virtual })
Write-Host ""
if ($ips.Count -eq 0) {
  Write-Host "  [!] Este equipo no parece conectado a la Wi-Fi o al router." -ForegroundColor Yellow
} else {
  Write-Host "  EN EL MÓVIL (misma Wi-Fi) ESCRIBA:" -ForegroundColor Cyan
  foreach ($ip in $ips) { Write-Host "     http://$($ip.IPAddress):$Port     ($($ip.InterfaceAlias))" -ForegroundColor White }
}
Write-Host ""
Write-Host "  Ahora vuelva a abrir la app con ARRANCAR.bat y pruebe en el móvil."
Write-Host "  Si sigue sin abrir:"
Write-Host "   - Compruebe que el móvil NO está en una red de invitados ni con datos móviles."
Write-Host "   - Si tiene un antivirus con cortafuegos propio (Norton, McAfee, Avast, ESET...),"
Write-Host "     permita en él el programa «Node.js» o el puerto $Port."
Write-Host ""
Read-Host "  Pulse Intro para cerrar"
