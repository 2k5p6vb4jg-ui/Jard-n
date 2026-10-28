# Crea un acceso directo "Jardón Ortopedia" en el escritorio que abre la app en una ventana propia
# (Microsoft Edge en modo aplicación: sin pestañas ni barra de direcciones), con el icono de la app.
$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Jardón Ortopedia · acceso directo"

function Test-App($url) {
  try { Invoke-WebRequest -Uri "$url/manifest.webmanifest" -UseBasicParsing -TimeoutSec 4 | Out-Null; return $true } catch { return $false }
}

Write-Host ""
Write-Host "  Acceso directo a Jardón Ortopedia" -ForegroundColor Green
Write-Host "  ---------------------------------"
Write-Host ""

# 1. Dirección de la app: en el ordenador de la tienda es localhost; en otro PC, la que muestra la ventana negra
$url = "http://localhost:3000"
if (-not (Test-App $url)) {
  Write-Host "  Este no es el ordenador de la tienda (o la app no está abierta en él)."
  Write-Host "  Escriba la dirección que aparece en la ventana negra del ordenador de la tienda,"
  Write-Host "  por ejemplo: 192.168.1.40"
  Write-Host ""
  while ($true) {
    $entrada = (Read-Host "  Dirección").Trim()
    if (-not $entrada) { continue }
    if ($entrada -notmatch "^https?://") { $entrada = "http://$entrada" }
    if ($entrada -notmatch ":\d+/?$") { $entrada = $entrada.TrimEnd("/") + ":3000" }
    $url = $entrada.TrimEnd("/")
    Write-Host "  Comprobando $url ..."
    if (Test-App $url) { break }
    Write-Host "  No responde. Compruebe que la app está abierta en el ordenador de la tienda y la dirección es correcta." -ForegroundColor Yellow
  }
}

# 2. Navegador: Edge (viene con Windows); si no está, Chrome
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
          "$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Host "  No se encuentra Microsoft Edge ni Google Chrome." -ForegroundColor Red; Read-Host "  Pulse Intro para salir"; exit 1 }

# 3. Icono: se descarga de la app (logo o iniciales) y se convierte a .ico
$carpeta = Join-Path $env:LOCALAPPDATA "JardonOrtopedia"
New-Item -ItemType Directory -Force -Path $carpeta | Out-Null
$ico = Join-Path $carpeta "icono.ico"
try {
  $png = Join-Path $carpeta "icono.png"
  Invoke-WebRequest -Uri "$url/api/icono?t=256" -OutFile $png -UseBasicParsing -TimeoutSec 10
  Add-Type -AssemblyName System.Drawing
  $bmp = [System.Drawing.Bitmap]::FromFile($png)
  $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
  $fs = [System.IO.File]::Create($ico); $icon.Save($fs); $fs.Close(); $bmp.Dispose()
} catch {
  $ico = "$edge,0"
}

# 4. Accesos directos: escritorio y, si se quiere, al iniciar Windows
$shell = New-Object -ComObject WScript.Shell
function New-Shortcut($ruta) {
  $lnk = $shell.CreateShortcut($ruta)
  $lnk.TargetPath = $edge
  $lnk.Arguments = "--app=$url"
  $lnk.IconLocation = $ico
  $lnk.Description = "Jardón Ortopedia · gestión clínica y taller"
  $lnk.Save()
}
$escritorio = [Environment]::GetFolderPath("Desktop")
New-Shortcut (Join-Path $escritorio "Jardón Ortopedia.lnk")
Write-Host ""
Write-Host "  [ok] Icono «Jardón Ortopedia» creado en el escritorio ($url)." -ForegroundColor Green

$resp = Read-Host "  ¿Abrir la app automáticamente al encender este ordenador? (S/N)"
if ($resp -match "^[sS]") {
  New-Shortcut (Join-Path ([Environment]::GetFolderPath("Startup")) "Jardón Ortopedia.lnk")
  Write-Host "  [ok] Se abrirá al iniciar sesión en Windows." -ForegroundColor Green
}
Write-Host ""
Write-Host "  Consejo: haga clic derecho en el icono de la barra de tareas -> «Anclar a la barra de tareas»."
Write-Host ""
Read-Host "  Pulse Intro para cerrar"
