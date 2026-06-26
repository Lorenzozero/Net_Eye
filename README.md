<div align="center">

# 👁️ Net Eye

**Network monitoring dashboard in real-time**

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## 📖 Overview

**Net Eye** è una dashboard web per il monitoraggio della rete locale in tempo reale. Permette di visualizzare tutti i dispositivi connessi, analizzare le porte aperte, monitorare il traffico e avviare scansioni di rete direttamente dall'interfaccia.

Il frontend (questo repo) si connette a un backend FastAPI che esegue le scansioni tramite `nmap` e altri strumenti di rete.

---

## ✨ Funzionalità

- **Dashboard in tempo reale** — KPI aggiornati ogni 10 secondi (dispositivi totali, online, reti, avvisi sicurezza)
- **Mappa topologica** — visualizzazione grafica interattiva dei dispositivi e delle loro connessioni
- **Monitor traffico** — grafico del traffico di rete in tempo reale
- **Scansione rete** — avvia una scansione manuale della subnet con un click
- **Port scan** — analisi delle porte aperte per ogni dispositivo
- **Lista dispositivi** — tabella dettagliata con IP, MAC, vendor, porte, stato
- **Raggruppamento per subnet** — dispositivi organizzati per segmento `/24`
- **Avvisi sicurezza** — rilevamento automatico di vendor sconosciuti e porte anomale
- **Dark mode** — supporto nativo light/dark
- **Azioni rapide** — ricerca dispositivi e configurazione agent dalla sidebar

---

## 🏗️ Architettura

```
net-eye/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Dashboard principale
│   ├── dispositivi/        # Lista completa dispositivi
│   ├── mappa/              # Topologia fullscreen
│   └── impostazioni/       # Configurazione agent
├── components/
│   ├── Layout.tsx          # Layout comune + sidebar
│   ├── TopologyMap.tsx     # Mappa rete interattiva
│   ├── TrafficChart.tsx    # Grafico traffico
│   ├── DeviceList.tsx      # Tabella dispositivi
│   └── NetworkGroup.tsx    # Gruppo per subnet
├── lib/
│   └── api.ts              # Client API verso il backend
├── types/                  # TypeScript types
└── contexts/               # React Contexts (stato globale)
```

Il backend espone le API REST su `http://localhost:8000` (configurabile via variabile d'ambiente).

---

## 🚀 Quick Start

### Prerequisiti

- Node.js 18+
- Backend Net Eye in esecuzione su `localhost:8000`

### Installazione

```bash
# Clona il repo
git clone https://github.com/Lorenzozero/Net_Eye.git
cd Net_Eye

# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

### Con Docker

```bash
docker build -f Dockerfile.dev -t net-eye .
docker run -p 3000:3000 net-eye
```

---

## ⚙️ Configurazione

Crea un file `.env.local` nella root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

| Variabile | Default | Descrizione |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL del backend FastAPI |

---

## 🔌 API Backend

Il frontend si aspetta le seguenti API dal backend:

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/api/v1/devices` | Lista tutti i dispositivi |
| `GET` | `/api/v1/devices/:ip` | Dettaglio singolo dispositivo |
| `PATCH` | `/api/v1/devices/:ip` | Aggiorna un dispositivo |
| `POST` | `/api/v1/scan/network?subnet=` | Avvia scansione rete |
| `POST` | `/api/v1/scan/ports/:ip` | Avvia port scan |

---

## 🛠️ Stack Tecnologico

| Layer | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguaggio | TypeScript |
| Styling | Tailwind CSS |
| Icone | Lucide React |
| Charts | Recharts |
| Containerization | Docker |

---

## 📄 Licenza

MIT — vedi [LICENSE](LICENSE) per i dettagli.

---

<div align="center">
Made with ❤️ by <a href="https://github.com/Lorenzozero">Lorenzozero</a>
</div>
