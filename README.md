# Net_Eye - Network Monitoring & Discovery Platform

![Net_Eye](https://img.shields.io/badge/version-2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Piattaforma completa per il monitoraggio e la scoperta automatica di dispositivi di rete con architettura agent-based distribuita.

## 🚀 Caratteristiche

- **Scansione Distribuita**: Agent Python installabili su qualsiasi macchina della rete
- **Real-time Updates**: WebSocket per aggiornamenti live della UI
- **Port Scanning**: Rilevamento automatico di porte aperte e servizi
- **MAC Address Detection**: Identificazione dispositivi tramite ARP
- **Topologia di Rete**: Visualizzazione grafica della rete
- **Multi-Network**: Supporto per più subnet monitorate contemporaneamente
- **REST API**: Backend Express con API complete
- **Database Persistente**: SQLite per storico scansioni

## 📋 Architettura

```
┌─────────────┐         WebSocket          ┌──────────────┐
│             │◄──────────────────────────►│              │
│  Frontend   │         REST API            │   Backend    │
│  (Next.js)  │◄──────────────────────────►│  (Express)   │
│             │                             │              │
└─────────────┘                             └───────┬──────┘
                                                    │
                                            ┌───────▼──────┐
                                            │   SQLite DB  │
                                            │   (devices,  │
                                            │   agents,    │
                                            │   ports)     │
                                            └──────────────┘
                                                    ▲
                                                    │
                      POST /api/agent/scan         │
                      POST /api/agent/register     │
                      POST /api/agent/heartbeat    │
                                                    │
          ┌──────────────────┬────────────────────┴─────────────────┐
          │                  │                                       │
     ┌────▼─────┐       ┌────▼─────┐                          ┌────▼─────┐
     │  Agent 1 │       │  Agent 2 │                          │  Agent N │
     │  (Python)│       │  (Python)│             ...          │  (Python)│
     │          │       │          │                          │          │
     │ 192.168  │       │ 10.0.0.x │                          │ 172.16.x │
     │  .1.x    │       │          │                          │          │
     └──────────┘       └──────────┘                          └──────────┘
        Rete A              Rete B                               Rete N
```

## 🛠️ Installazione

### Prerequisiti

- Node.js 20+ (per backend e frontend)
- Python 3.11+ (per agent)
- Docker & Docker Compose (opzionale, consigliato)

### Opzione 1: Docker Compose (Consigliato)

```bash
# 1. Clona il repository
git clone https://github.com/Lorenzozero/Net_Eye.git
cd Net_Eye
git checkout feature/agent-implementation

# 2. Configura l'agent
cp agent/config.yaml agent/config.yaml.local
# Edita agent/config.yaml.local con i tuoi parametri

# 3. Configura il backend secret in docker-compose.yml
# Cambia AGENT_SECRET nel file docker-compose.yml

# 4. Avvia tutto lo stack
docker-compose up -d

# 5. Verifica i container
docker-compose ps

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# WebSocket: ws://localhost:3001/ws
```

### Opzione 2: Installazione Manuale

#### Backend

```bash
cd backend
cp .env.example .env
# Edita .env con i tuoi parametri
npm install
npm run build
npm start
# Oppure in dev mode: npm run dev
```

#### Agent

```bash
cd agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copia e configura
cp config.yaml config.yaml.local
# Edita config.yaml.local

# Avvia agent
NETEYE_CONFIG=config.yaml.local python net_eye_agent.py
```

#### Frontend

```bash
# Dalla root del progetto
npm install
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:3001" > .env.local
echo "NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws" >> .env.local
npm run dev
# Frontend su http://localhost:3000
```

## ⚙️ Configurazione

### Backend (.env)

```bash
PORT=3001
DB_PATH=./data/neteye.db
AGENT_SECRET=your_secret_here_CHANGE_THIS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Agent (config.yaml)

```yaml
backend_url: "http://localhost:3001"
agent_secret: "your_secret_here_CHANGE_THIS"  # Deve corrispondere al backend

scan_interval_seconds: 60      # Intervallo tra scansioni
heartbeat_interval_seconds: 30 # Intervallo heartbeat

subnet: "auto"  # "auto" rileva automaticamente, oppure "192.168.1.0/24"

common_ports:
  - 22    # SSH
  - 80    # HTTP
  - 443   # HTTPS
  - 3389  # RDP
  - 8080  # HTTP-Alt
  - 3306  # MySQL
  - 5432  # PostgreSQL

port_scan_timeout: 0.5  # Timeout per ogni porta (secondi)
```

## 📡 API Endpoints

### Backend REST API

#### Agent Endpoints

```
POST   /api/agent/register     # Registra nuovo agent
POST   /api/agent/scan         # Invia risultati scansione
POST   /api/agent/heartbeat    # Heartbeat periodico
GET    /api/agent              # Lista tutti gli agent
```

#### Device Endpoints

```
GET    /api/devices            # Lista tutti i dispositivi
GET    /api/devices/:id        # Dettagli dispositivo
GET    /api/devices/agent/:id  # Dispositivi per agent
```

#### Scan Endpoints

```
GET    /api/scans              # Lista scansioni
GET    /api/scans/agent/:id    # Scansioni per agent
```

#### WebSocket

```
WS     /ws                     # Real-time updates
```

**Eventi WebSocket:**
- `devices_snapshot`: Snapshot iniziale (agents + devices)
- `agent_registered`: Nuovo agent registrato
- `scan_update`: Aggiornamento scansione completata

## 🔒 Sicurezza

### Autenticazione Agent

Gli agent si autenticano tramite header `x-agent-secret`:

```bash
curl -X POST http://localhost:3001/api/agent/register \
  -H "x-agent-secret: your_secret" \
  -H "Content-Type: application/json" \
  -d '{"hostname": "test", "ip_address": "192.168.1.100"}'
```

### Best Practices

1. **Cambia sempre `AGENT_SECRET`** in produzione
2. Usa HTTPS per backend (reverse proxy con Traefik/Nginx)
3. Limita accesso API solo a IP fidati (firewall)
4. Usa WSS (WebSocket Secure) in produzione
5. Esegui agent con permessi minimi necessari
6. Monitora i log per attività sospette

## 🚢 Deploy in Produzione

### Con Docker Swarm

```bash
# Converti docker-compose.yml per swarm
docker stack deploy -c docker-compose.yml neteye
```

### Con Kubernetes

```bash
# TODO: Aggiungi manifests k8s
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name neteye.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Database Schema

### Tabelle

**agents**
- `id` (TEXT, PK)
- `hostname` (TEXT)
- `ip_address` (TEXT)
- `os_type` (TEXT)
- `last_seen` (DATETIME)
- `status` (TEXT: online/offline)
- `created_at` (DATETIME)

**devices**
- `id` (TEXT, PK)
- `agent_id` (TEXT, FK)
- `ip_address` (TEXT)
- `mac_address` (TEXT)
- `hostname` (TEXT)
- `manufacturer` (TEXT)
- `device_type` (TEXT)
- `os_detection` (TEXT)
- `first_seen` (DATETIME)
- `last_seen` (DATETIME)
- `status` (TEXT)

**ports**
- `id` (INTEGER, PK, AUTOINCREMENT)
- `device_id` (TEXT, FK)
- `port_number` (INTEGER)
- `protocol` (TEXT: tcp/udp)
- `state` (TEXT: open/closed/filtered)
- `service_name` (TEXT)
- `service_version` (TEXT)
- `last_seen` (DATETIME)

**scans**
- `id` (TEXT, PK)
- `agent_id` (TEXT, FK)
- `scan_type` (TEXT)
- `target_range` (TEXT)
- `devices_found` (INTEGER)
- `started_at` (DATETIME)
- `completed_at` (DATETIME)
- `status` (TEXT)

## 🐛 Troubleshooting

### Agent non si connette al backend

```bash
# Verifica che il backend sia raggiungibile
curl http://localhost:3001/health

# Controlla i log del backend
docker-compose logs backend

# Verifica secret in config.yaml e .env
```

### Nessun dispositivo rilevato

```bash
# Verifica che agent abbia permessi per ARP e socket
sudo setcap cap_net_raw+ep $(which python)

# Oppure esegui come root (non consigliato)
sudo python net_eye_agent.py

# Testa manualmente la scansione
arp -a
ping 192.168.1.1
```

### Frontend non riceve aggiornamenti

```bash
# Verifica WebSocket nel browser DevTools (Network > WS)
# Controlla URL WebSocket in .env.local
echo $NEXT_PUBLIC_WS_URL

# Verifica backend WebSocket
wscat -c ws://localhost:3001/ws
```

## 📝 TODO / Roadmap

- [ ] Dashboard per gestione agent (start/stop scansioni remote)
- [ ] Export dati (CSV, JSON, PDF)
- [ ] Notifiche (email, Telegram, webhook) per nuovi dispositivi
- [ ] Integrazione SNMP per switch/router
- [ ] Rilevamento OS avanzato (p0f, nmap)
- [ ] Analisi vulnerabilità (CVE lookup)
- [ ] Grafici storici (trend dispositivi nel tempo)
- [ ] Supporto IPv6
- [ ] Agent in Go/Rust per performance migliori
- [ ] Manifest Kubernetes
- [ ] Autenticazione utenti (JWT, OAuth)

## 🤝 Contribuire

1. Fork del progetto
2. Crea un branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

MIT License - vedi [LICENSE](LICENSE)

## 👤 Autore

**Lorenzo Garoffolo**
- GitHub: [@Lorenzozero](https://github.com/Lorenzozero)
- Portfolio: [lorenzo-garoffolo-cyber.netlify.app](https://lorenzo-garoffolo-cyber.netlify.app/)

## 🙏 Credits

- Next.js - React Framework
- Express - Backend API
- SQLite - Database
- Python - Agent scripting
