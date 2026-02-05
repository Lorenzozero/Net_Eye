# Net_Eye Agent

Agent per la scansione della rete locale che comunica con il backend Net_Eye.

## Requisiti

- Python 3.8+
- nmap installato sul sistema
- Privilegi di amministratore/root per scansioni complete

## Installazione

### Linux/Mac

```bash
# Installa nmap
sudo apt-get install nmap  # Debian/Ubuntu
brew install nmap          # macOS

# Installa dipendenze Python
pip install -r requirements.txt

# Copia e configura
cp config.json.example config.json
nano config.json
```

### Windows

1. Scarica e installa nmap da https://nmap.org/download.html
2. Installa Python 3.8+
3. Apri PowerShell come amministratore:

```powershell
pip install -r requirements.txt
copy config.json.example config.json
notepad config.json
```

## Configurazione

Modifica `config.json`:

```json
{
  "backend_url": "http://your-backend:3001",
  "agent_secret": "your-secret-here",
  "scan_interval": 300,
  "scan_types": {
    "network_discovery": true,
    "port_scan": true,
    "service_detection": true
  }
}
```

## Esecuzione

```bash
# Linux/Mac (richiede sudo per scansioni complete)
sudo python3 agent.py

# Windows (esegui come amministratore)
python agent.py
```

## Come funziona

1. **Registrazione**: L'agent si registra al backend all'avvio
2. **Scansione rete**: Rileva tutti i dispositivi sulla rete locale
3. **Port scanning**: Identifica porte aperte su ogni dispositivo
4. **Service detection**: Tenta di identificare i servizi in esecuzione
5. **Invio dati**: Trasmette i risultati al backend via HTTP
6. **Heartbeat**: Invia segnali di vita ogni 60 secondi

## Installazione come servizio

### Linux (systemd)

Crea `/etc/systemd/system/neteye-agent.service`:

```ini
[Unit]
Description=Net_Eye Network Scanner Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/neteye-agent
ExecStart=/usr/bin/python3 /opt/neteye-agent/agent.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Poi:
```bash
sudo systemctl enable neteye-agent
sudo systemctl start neteye-agent
```

### Windows (Task Scheduler)

1. Apri Task Scheduler
2. Crea nuova attività
3. Trigger: All'avvio del sistema
4. Azione: Avvia programma → `python.exe` con argomento percorso di `agent.py`
5. Esegui con privilegi più elevati
