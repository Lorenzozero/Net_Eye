#!/usr/bin/env bash
# Deploy di NetworkScope (Net_Eye) su Raspberry Pi
# --------------------------------------------------
# Pensato per Raspberry Pi OS (Debian-based, 64-bit consigliato) con Docker.
# Idempotente: puoi rilanciarlo per aggiornare un'installazione esistente.
#
# Uso:
#   chmod +x scripts/deploy-raspberrypi.sh
#   ./scripts/deploy-raspberrypi.sh
#
# Cosa fa:
#   1. Installa Docker + Docker Compose plugin se mancanti (richiede sudo).
#   2. Abilita e avvia il servizio Docker (systemd) → autostart al boot.
#   3. Builda e avvia i container (host network, NET_ADMIN/NET_RAW per
#      cattura pacchetti reale e per il Metodo 2 ARP Redirection).
#
# NOTA: network_mode "host" nel docker-compose.yml funziona nativamente su
# Linux (Raspberry Pi OS incluso) — nessuna limitazione come su Docker
# Desktop per Windows/macOS.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "[+] Progetto: $PROJECT_DIR"

# 1. Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "[+] Docker non trovato: installazione tramite get.docker.com"
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sudo sh /tmp/get-docker.sh
  sudo usermod -aG docker "$USER" || true
  echo "[!] Aggiunto $USER al gruppo docker: riavvia la sessione (logout/login) per usare docker senza sudo."
else
  echo "[+] Docker già installato: $(docker --version)"
fi

# 2. Docker Compose plugin (incluso nelle build recenti di Docker; verifica comunque)
if ! docker compose version >/dev/null 2>&1; then
  echo "[+] Installazione plugin docker-compose"
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker-compose-plugin
else
  echo "[+] Docker Compose plugin presente: $(docker compose version --short 2>/dev/null)"
fi

# 3. Servizio Docker attivo al boot
sudo systemctl enable --now docker

# 4. Variabili d'ambiente opzionali (token di autenticazione API/WS)
if [[ -n "${NS_TOKEN:-}" ]]; then
  echo "[+] NS_TOKEN impostato: autenticazione API/WebSocket abilitata"
else
  echo "[i] NS_TOKEN non impostato: API/WebSocket senza autenticazione (ok in LAN fidata, sconsigliato altrimenti)"
fi

# 5. Build + avvio (usa sudo se l'utente non è ancora nel gruppo docker in questa sessione)
DOCKER_CMD="docker"
if ! docker info >/dev/null 2>&1; then
  DOCKER_CMD="sudo docker"
fi

echo "[+] Build & avvio container (può richiedere qualche minuto su Raspberry Pi)"
$DOCKER_CMD compose up --build -d

echo
echo "[✓] Deploy completato."
echo "    Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo "    Backend:  http://$(hostname -I | awk '{print $1}'):8000"
echo
echo "    I container hanno restart: unless-stopped → ripartono da soli dopo un reboot"
echo "    (il servizio Docker è già abilitato al boot con systemctl enable docker)."
echo
echo "    Comandi utili:"
echo "      $DOCKER_CMD compose logs -f backend   # log live del backend"
echo "      $DOCKER_CMD compose down              # stop"
echo "      $DOCKER_CMD compose up --build -d     # aggiorna dopo un git pull"
