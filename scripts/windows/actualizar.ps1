# Actualiza Jardón Ortopedia a la última versión sin tocar los datos:
#   1. cierra la app   2. copia de seguridad   3. descarga la versión nueva
#   4. sustituye el programa (no la base de datos, fotos ni copias)   5. instala y compila   6. arranca
# Si algo falla al instalar, vuelve a la versión anterior.
param([Parameter(Mandatory = $true)][string]$App)

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Jardón Ortopedia · actualización"
$App = (Resolve-Path $App).Path
Set-Location $App

$Branch = "claude/ortopedia-arquitectura-inicial"
$ZipUrl = "https://github.com/2k5p6vb4jg-ui/Jard-n/archive/refs/heads/$Branch.zip"
$TaskName = "Jardon Ortopedia"

function Step($n, $t) { Write-Host ""; Write-Host "  [$n/6] $t" -ForegroundColor Cyan }
function Done($t) { Write-Host "        $t" -ForegroundColor Green }
function Fail($t) {
  Write-Host ""
  Write-Host "  [X] $t" -ForegroundColor Red
  Write-Host "      Haga una foto de esta ventana y enviela." -ForegroundColor Red
  Read-Host "  Pulse Intro para cerrar"
  exit 1
}
function Run($what) {
  # Ejecuta un comando (npm, npx, node) mostrando su salida y devuelve solo si ha ido bien
  & cmd /c "$what 2>&1" | Out-Host
  return ($LASTEXITCODE -eq 0)
}

Write-Host ""
Write-Host "  ==========================================================" -ForegroundColor Green
Write-Host "     JARDON ORTOPEDIA - Actualizar a la ultima version" -ForegroundColor Green
Write-Host "  ==========================================================" -ForegroundColor Green
Write-Host "  Sus datos (clientes, fotos, copias) NO se tocan."

if (-not (Test-Path (Join-Path $App "package.json"))) { Fail "Esta no es la carpeta de la aplicacion: $App" }
$old = (Get-Content (Join-Path $App "package.json") -Raw | ConvertFrom-Json).version

# ── 1. Cerrar la app ─────────────────────────────────────────────────────────
Step 1 "Cerrando la aplicacion"
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) { Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue }
$pids = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
Done "Cerrada (si tenia la ventana negra abierta, ya puede cerrarla)."

# ── 2. Copia de seguridad ────────────────────────────────────────────────────
Step 2 "Copia de seguridad de sus datos"
if (-not (Run "node scripts\copia.mjs antes-de-actualizar")) { Fail "No se ha podido hacer la copia de seguridad. No se ha cambiado nada." }

# ── 3. Descargar la version nueva ────────────────────────────────────────────
Step 3 "Descargando la version nueva"
$tmp = Join-Path $env:TEMP "jardon-actualizacion"
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tmp | Out-Null
$zip = Join-Path $tmp "nueva.zip"
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri $ZipUrl -OutFile $zip -UseBasicParsing
} catch {
  # Sin acceso directo (repositorio privado, sin internet…): se usa el ZIP mas reciente de Descargas
  $dl = Get-ChildItem (Join-Path $env:USERPROFILE "Downloads") -Filter "Jard*.zip" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $dl) { Fail "No se ha podido descargar. Descargue el ZIP desde GitHub (Code > Download ZIP) a la carpeta Descargas y vuelva a ejecutar ACTUALIZAR.bat" }
  Write-Host "        No se pudo descargar directamente; se usa $($dl.Name) de Descargas ($($dl.LastWriteTime))."
  Copy-Item $dl.FullName $zip
}
Expand-Archive -Path $zip -DestinationPath (Join-Path $tmp "x") -Force
$src = Get-ChildItem (Join-Path $tmp "x") -Directory | Where-Object { Test-Path (Join-Path $_.FullName "package.json") } | Select-Object -First 1
if (-not $src) { Fail "El ZIP no contiene la aplicacion." }
$new = (Get-Content (Join-Path $src.FullName "package.json") -Raw | ConvertFrom-Json).version
Done "Version instalada: $old  ->  version nueva: $new"

# ── 4. Sustituir el programa (guardando el anterior para poder volver) ───────
Step 4 "Sustituyendo el programa (sus datos no se tocan)"
$stamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$prev = Join-Path $App "backups\programa-anterior-$stamp"
$codeDirs = @("src", "public", "prisma\migrations")
New-Item -ItemType Directory -Path $prev -Force | Out-Null
robocopy $App $prev /E /XD node_modules .next uploads backups logs .backup-tmp /XF .env *.db *.db-journal *.db-wal *.db-shm /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { Fail "No se ha podido guardar el programa anterior. No se ha cambiado nada." }
foreach ($d in $codeDirs) { Remove-Item (Join-Path $App $d) -Recurse -Force -ErrorAction SilentlyContinue }
robocopy $src.FullName $App /E /XD node_modules .next uploads backups logs .backup-tmp /XF .env *.db *.db-journal *.db-wal *.db-shm /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { Fail "No se han podido copiar los archivos nuevos. El programa anterior esta en $prev" }
Done "Programa sustituido. El anterior queda en backups\programa-anterior-$stamp"

# ── 5. Instalar y compilar ───────────────────────────────────────────────────
Step 5 "Instalando y preparando la version nueva (unos minutos)..."
$ok = (Run "npm install --no-audit --no-fund") -and (Run "npx prisma generate") -and (Run "npx prisma migrate deploy") -and (Run "npm run build")
if (-not $ok) {
  Write-Host ""
  Write-Host "  [!] La version nueva no se ha podido instalar. Volviendo a la anterior..." -ForegroundColor Yellow
  foreach ($d in $codeDirs) { Remove-Item (Join-Path $App $d) -Recurse -Force -ErrorAction SilentlyContinue }
  robocopy $prev $App /E /NFL /NDL /NJH /NJS /NP | Out-Null
  $back = (Run "npm install --no-audit --no-fund") -and (Run "npx prisma generate") -and (Run "npm run build")
  if ($back) { Fail "Se ha vuelto a la version anterior ($old). Sus datos estan intactos." }
  Fail "No se ha podido volver a la version anterior automaticamente. Sus datos estan intactos (copia en backups)."
}

# ── 6. Arrancar ──────────────────────────────────────────────────────────────
Step 6 "Arrancando"
if ($task) { Start-ScheduledTask -TaskName $TaskName; Done "Arrancada en segundo plano." }
else { Start-Process -FilePath (Join-Path $App "ARRANCAR.bat") -WorkingDirectory $App; Done "Arrancada en una ventana nueva." }
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "  [ok] Jardon Ortopedia actualizada de la version $old a la $new." -ForegroundColor Green
Write-Host "       Si algo no va bien, en Ajustes > Copias puede restaurar la copia 'Antes de actualizar'."
Write-Host ""
Read-Host "  Pulse Intro para cerrar"
