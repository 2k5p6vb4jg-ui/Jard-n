#!/usr/bin/env bash
# Jardón Ortopedia · Arranque automático en Linux (servicio systemd del usuario).
# Uso:  bash scripts/linux/instalar-inicio.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"
NPM="$(command -v npm)" || { echo "No se encuentra Node.js/npm."; exit 1; }
cd "$APP_DIR"
[ -f .next/BUILD_ID ] || { echo "Compilando la aplicación (solo la primera vez)..."; npm run build; }
mkdir -p "$UNIT_DIR" logs

cat > "$UNIT_DIR/jardon-ortopedia.service" <<UNIT
[Unit]
Description=Jardón Ortopedia (gestión clínica y de taller)
After=network-online.target

[Service]
WorkingDirectory=$APP_DIR
Environment=PATH=$(dirname "$NPM"):/usr/bin:/bin
ExecStart=$NPM start
Restart=on-failure
RestartSec=10
StandardOutput=append:$APP_DIR/logs/servidor.log
StandardError=append:$APP_DIR/logs/servidor.log

[Install]
WantedBy=default.target
UNIT

systemctl --user daemon-reload
systemctl --user enable --now jardon-ortopedia.service
# Arranca aunque nadie haya iniciado sesión (puede pedir la contraseña)
loginctl enable-linger "${USER:-$(id -un)}" 2>/dev/null || echo "Aviso: no se pudo activar el arranque sin sesión (loginctl enable-linger)."
echo "Listo. Estado: systemctl --user status jardon-ortopedia · Registro: $APP_DIR/logs/servidor.log"
