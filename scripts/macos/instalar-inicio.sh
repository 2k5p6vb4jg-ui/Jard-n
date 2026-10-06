#!/bin/zsh
# Jardón Ortopedia · Arranque automático en macOS (LaunchAgent del usuario).
# Uso: abrir Terminal y ejecutar   zsh scripts/macos/instalar-inicio.sh
set -euo pipefail

LABEL="es.jardon.ortopedia"
APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
cd "$APP_DIR"

command -v npm >/dev/null || { echo "No se encuentra Node.js/npm. Instálelo desde https://nodejs.org (LTS)."; exit 1; }
[ -f .next/BUILD_ID ] || { echo "Compilando la aplicación (solo la primera vez)..."; npm run build; }
mkdir -p logs "$HOME/Library/LaunchAgents"

# Se usa una shell de inicio de sesión para que encuentre node (Homebrew, nvm…)
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/zsh</string><string>-lc</string><string>cd "$APP_DIR" &amp;&amp; npm start</string></array>
  <key>WorkingDirectory</key><string>$APP_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$APP_DIR/logs/servidor.log</string>
  <key>StandardErrorPath</key><string>$APP_DIR/logs/servidor.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Listo. La aplicación se iniciará sola al iniciar sesión. Registro: $APP_DIR/logs/servidor.log"
echo "Si macOS pregunta si permite conexiones entrantes a «node», pulse Permitir."
echo "Para quitarlo:  launchctl bootout gui/\$(id -u)/$LABEL && rm \"$PLIST\""
