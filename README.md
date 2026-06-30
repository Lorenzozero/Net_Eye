<div align="center">

# 👁️ NetworkScope

### _La tua rete, finalmente sotto controllo._

**Dashboard di monitoraggio rete in tempo reale — scoperta dispositivi, scansione porte e topologia interattiva in stile Packet Tracer.**

<br/>

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)

![Status](https://img.shields.io/badge/status-MVP%20attivo-success?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![PRs](https://img.shields.io/badge/PRs-welcome-orange?style=flat-square)
![Dark Mode](https://img.shields.io/badge/dark%20mode-🌙%20sì-1f2937?style=flat-square)

</div>

---

## 📖 Indice

- [✨ Perché NetworkScope](#-perché-networkscope)
- [🎯 A chi serve](#-a-chi-serve-target)
- [🚀 Funzionalità](#-funzionalità)
- [🖼️ Le 4 schermate](#️-le-4-schermate)
- [🏗️ Architettura](#️-architettura)
- [🔬 Tecniche di monitoraggio](#-tecniche-di-monitoraggio)
- [🧰 Stack tecnico](#-stack-tecnico)
- [⚡ Avvio rapido](#-avvio-rapido)
- [🧪 Come testare dalla GUI web](#-come-testare-dalla-gui-web)
- [🐳 Avvio con Docker](#-avvio-con-docker)
- [🔌 Backend & API](#-backend--api)
- [🔐 Sicurezza & note di produzione](#-sicurezza--note-di-produzione)
- [🗺️ Roadmap](#️-roadmap)
- [📜 Licenza](#-licenza)

---

## ✨ Perché NetworkScope

> _"Conosci ogni dispositivo che respira sulla tua rete — prima che lo faccia qualcun altro."_

La maggior parte delle persone non ha **idea** di cosa sia collegato al proprio router. Telecamere IoT cinesi, vecchi telefoni, NAS dimenticati con la porta 445 spalancata... 🫠

**NetworkScope** trasforma quel caos in una **dashboard chiara, viva e bellissima**:

| Senza NetworkScope 😵 | Con NetworkScope 😎 |
|---|---|
| `arp -a` in un terminale nero | Topologia interattiva drag & drop |
| "Boh, c'è qualcosa su `.47`" | Hostname, vendor, porte, stato — in un click |
| Zero alert di sicurezza | Conteggio automatico delle anomalie |
| Tool brutti anni '90 | UI moderna, dark mode, responsive |

---

## 🎯 A chi serve (Target)

| 👤 Profilo | 💡 Caso d'uso |
|---|---|
| 🏠 **Home lab & smart home** | Tieni d'occhio IoT, NAS, console e ospiti sulla Wi-Fi |
| 🛡️ **Studenti di sicurezza / CTF** | Visualizza scansioni, porte aperte e mappa di rete |
| 🧑‍💻 **Sysadmin di PMI** | Inventario dispositivi e monitoraggio veloce senza tool pesanti |
| 🎓 **Didattica networking** | Topologia "Packet Tracer-style" per spiegare reti reali |

---

## 🚀 Funzionalità

- 📊 **Dashboard live** — dispositivi totali, online, reti monitorate e avvisi di sicurezza, con refresh automatico ogni 10s.
- 🗺️ **Topologia interattiva** — nodi trascinabili, zoom con rotella, pan, gateway evidenziato e pannello dettagli per dispositivo (`TopologyMap`, SVG puro, zero librerie pesanti).
- 🔍 **Scansione rete & porte REALE** — il backend incluso fa ping-sweep della subnet, legge l'ARP, risolve hostname/vendor e scansiona le porte TCP dei dispositivi veri.
- 🧠 **Identificazione intelligente** — riconosce telefoni (iPhone/Android, anche con MAC randomizzato), access point, NAS, stampanti, camere IP, **inverter FV**, **colonnine EV**, container Docker, smart TV e IoT, con OS e vendor.
- 📇 **Inventario dispositivi** — tabella ricercabile per IP / hostname / vendor, modale di dettaglio con porte aperte.
- 🧩 **Raggruppamento per subnet** — i dispositivi vengono aggregati automaticamente per rete `/24`, con rinomina inline.
- 🤖 **Gestione Agent** — scarica installer (Windows `.bat`, Linux `.sh`, Python) e monitora gli agent registrati.
- 🌙 **Dark / Light mode** — toggle in navbar che pilota davvero il tema (Tailwind v4 `@custom-variant`), persistente in localStorage.
- 📈 **Traffico di rete REALE** — throughput download/upload (KB/s, MB/s) e **pacchetti/s** letti dai contatori dell'interfaccia, aggiornati ogni 2s, con grafici live e totali trasferiti.
- 🔗 **Analisi flussi/connessioni** — `netstat` mostra le connessioni attive con **protocollo** (HTTPS, DNS, SSH…), **da quale dispositivo** e **verso quale destinazione**, risolta con **reverse DNS + organizzazione** (Cloudflare, Fastly, Anthropic, Google…), in tabella e su **mappa dei flussi cliccabile**.
- 🖱️ **Dettagli ovunque** — click su qualsiasi dispositivo (inventario, tabelle reti, **nodo della mappa**) apre il dettaglio completo; click su un flusso del traffico apre il dettaglio della connessione.
- 🔌 **Connessione REALE per porta** — ogni porta aperta ha un pulsante: le porte web aprono il **browser**, le altre un **terminale interattivo reale** (socket TCP via proxy WebSocket nel server) per parlare davvero col servizio (HTTP, Telnet, Redis, SMTP, FTP…); per i client dedicati (ssh/rdp) c'è il comando pronto da copiare.
- 🖱️ **Card KPI cliccabili** — Dispositivi/Online(→offline)/Reti/Avvisi aprono un modale con dettagli ed **evidenze**.
- 🔄 **Refresh + stato agenti** — pulsante in navbar che ricarica i dati da tutte le pagine e una **spia 🟢/🔴** che segnala se lo scanner/agente è attivo.
- 🔔 **Notifiche nuovi dispositivi** — avviso in-app + notifica del browser quando compare un nuovo dispositivo (attivabile da Impostazioni, salvataggio automatico).
- 🧬 **Fingerprint avanzato** — OS da **TTL**, **latenza RTT**, **banner grabbing** (SSH/HTTP/cert TLS), **SSDP/UPnP** (nome/modello), **security risk score** per dispositivo.
- ⚡ **Scansione incrementale + persistenza** — cicli ~3× più veloci (arricchimento solo per device nuovi/stale), **storico** dispositivi salvato su disco e ripristinato al riavvio; **autostart** dello scanner al login senza admin.
- 🏷️ **Vendor 100% offline** — database **OUI IEEE completo** (~40k vendor) via `npm run oui`: niente più "Unknown" anche senza internet.
- 📤 **Export CSV / PDF** — esporta l'inventario completo (IP, MAC, vendor, tipo, OS, porte, rischio) dalla pagina Dispositivi.

---

## 🖼️ Le schermate

| Rotta | Pagina | Cosa fa |
|---|---|---|
| `/` | 🏠 **Dashboard** | Hub: KPI, topologia compatta, traffico, azioni rapide |
| `/dispositivi` | 📇 **Dispositivi** | Inventario completo con ricerca e dettagli di sicurezza |
| `/mappa` | 🗺️ **Mappa** | Topologia a schermo intero, interattiva |
| `/traffico` | 📈 **Traffico** | Throughput e **pacchetti/s in tempo reale**, totali + **mappa dei flussi/connessioni attive** |
| `/impostazioni` | ⚙️ **Impostazioni** | Agent, download installer, tema, notifiche |

---

## 🏗️ Architettura

```
🌐 Browser
   │  (polling 10–15s)
   ▼
⚛️ Next.js 16 · App Router  ──►  RootLayout → Providers → ThemeContext
   │
   ├─ 🏠 /             ┐
   ├─ 📇 /dispositivi  │  Pagine "use client"
   ├─ 🗺️ /mappa        │
   └─ ⚙️ /impostazioni ┘
        │
        ▼
🧩 Componenti UI · TopologyMap · DeviceList · NetworkGroup · TrafficChart · Layout
        │
        ▼
🔗 lib/api.ts  +  types/index.ts   (unico punto di integrazione dati)
        │
        ▼
🟩 Backend REALE · server.mjs · http://localhost:8000
   (ping-sweep · arp · reverse DNS · OUI · port scan)
        │
        ▼
🌐 La tua rete locale (x.y.z.0/24)
```

> 💡 **Nota:** il cuore è il frontend Next.js, ma il repo include anche un **backend di scansione reale** ([`server.mjs`](server.mjs), zero dipendenze) che popola la dashboard con i dispositivi veri della tua LAN, più un **mock** ([`mock-api.mjs`](mock-api.mjs)) per la demo offline. Base API configurabile via `NEXT_PUBLIC_API_URL`. Vedi [Come testare](#-come-testare-dalla-gui-web).

---

## 🔬 Tecniche di monitoraggio

Tutte le tecniche sono **attive e reali**, implementate in `server.mjs` con i soli strumenti del sistema operativo — **zero dipendenze esterne e nessun privilegio di amministratore**.

### 🔎 Scoperta dei dispositivi
| Tecnica | Strumento | Cosa rileva |
|---|---|---|
| **ICMP ping-sweep** | `ping` su tutta la `/24` (a batch paralleli) | host attivi e raggiungibili |
| **Lettura tabella ARP** | `arp -a` | MAC address dei dispositivi nella LAN |
| **Re-scan automatico** | loop ogni 60s | comparsa/scomparsa dispositivi nel tempo |

### 🧠 Identificazione e fingerprinting
| Tecnica | Come funziona | Cosa rivela |
|---|---|---|
| **OS fingerprint via TTL** | analisi del TTL della risposta ICMP (64→Linux, 128→Windows, 255→embedded) | famiglia di sistema operativo |
| **Latenza RTT** | tempo di risposta del ping | reattività/qualità del link |
| **TCP connect scan** | apertura socket su porte note (set rapido + set profondo on-demand) | porte e servizi aperti |
| **Banner grabbing** | lettura della banner su SSH/FTP/SMTP, header `Server:` HTTP, **certificato TLS** | servizio e **versione** reali (es. `OpenSSH 10.0`, `nginx`, CN del certificato) |
| **Discovery SSDP/UPnP** | M-SEARCH multicast su `239.255.255.250:1900` + parsing dell'XML di descrizione | **nome, modello e produttore** (TV, router, NAS, media) |
| **Risoluzione hostname** | reverse DNS → **NetBIOS** (`nbtstat`) → nome UPnP | nome host leggibile |
| **Vendor via OUI** | tabella inline + **DB IEEE completo offline** (~40k) + lookup online throttolato e cachato | produttore della scheda di rete |
| **MAC randomizzato** | rilevamento del bit *locally-administered* | smartphone con MAC privacy (iPhone/Android) |
| **Classificazione tipo** | euristica combinata su porte + vendor + MAC + banner + UPnP + TTL | telefono, AP, NAS, stampante, camera, inverter, EV, Docker, IoT… |

### 📈 Monitoraggio del traffico
| Tecnica | Strumento | Cosa misura |
|---|---|---|
| **Contatori d'interfaccia** | `netstat -e` (Windows) · `/proc/net/dev` (Linux), campionati ogni 2s | **throughput** download/upload (KB/s–MB/s) e **pacchetti/s** in/out |
| **Totali cumulativi** | delta dei contatori | byte e pacchetti totali trasferiti |

### 🔗 Analisi dei flussi/connessioni
| Tecnica | Strumento | Cosa mostra |
|---|---|---|
| **Tabella connessioni attive** | `netstat -ano` (stati ESTABLISHED) | flussi in corso da/verso l'host |
| **Classificazione protocollo** | mappatura porta→servizio | HTTPS, DNS, SSH, MQTT, RTSP… (TCP/UDP) |
| **Risoluzione destinazione** | reverse DNS (PTR) + lookup **organizzazione/ISP** (ip-api, cachato) per gli IP senza PTR | *dove* va il traffico (Cloudflare, Fastly, Anthropic, Google…) |
| **Connessione per porta** | URL browser per le porte web; per le altre un **socket TCP reale** via proxy WebSocket (`/api/v1/connect`, RFC6455 implementato senza dipendenze, ristretto agli IP LAN) → terminale interattivo | parlare davvero col servizio (HTTP/Telnet/Redis/SMTP…) in un click |

### 🛡️ Sicurezza
| Tecnica | Logica | Output |
|---|---|---|
| **Security risk scoring** | porte pericolose esposte (Telnet, SMB, RDP, VNC, DB…) + n° porte + vendor ignoto | punteggio 0–100 e livello **basso/medio/alto** con evidenze |

### 🛰️ Architettura agent ↔ server (multi-rete)
Un solo codice, due modalità:
- **Server** (`npm run backend`): collector + API + **agente locale embedded** che scansiona la propria rete.
- **Agente** (`npm run agent -- --agent http://SERVER:8000`): scansiona la rete locale e **riporta al server** via HTTP.

Il server **aggrega più agenti**, sulla stessa rete o su reti diverse: ogni agente ha un `agent_id` persistente, e nei dispositivi viene tracciata la **rete di provenienza** (dedup per MAC per rete). La pagina **Impostazioni** mostra tutti gli agenti con rete, n° dispositivi e stato online/offline (heartbeat 90s).

**Installer agenti pronti all'uso** (pulsanti in Impostazioni → "Scarica Installer"): il server genera e serve uno **script Windows `.bat`**, **Linux `.sh`** e un **agente Python autonomo** ([`agent/networkscope_agent.py`](agent/networkscope_agent.py), solo libreria standard). Lo script scarica l'agente Python e lo avvia puntando automaticamente al server giusto; l'agente scansiona la rete locale (ping + ARP + reverse DNS + porte) e riporta — il server arricchisce poi il **vendor** dai MAC tramite il DB OUI.

### ⚡ Performance, politeness e persistenza
| Tecnica | Come funziona | Beneficio |
|---|---|---|
| **Scansione incrementale** | l'arricchimento pesante (porte, banner, UPnP) viene eseguito solo per i dispositivi **nuovi o "stale"** (TTL 5 min) | cicli ~3× più veloci (es. da 27s a <10s) |
| **Scansione educata (poco rumore)** | ciclo **leggero ogni 45s** che legge **solo la tabella ARP** (nessun pacchetto extra in rete) + sweep ICMP completo **raro** (5 min), con **jitter** anti-sincronizzazione tra agenti | drastica riduzione del traffico ICMP sulla rete |
| **Registro persistente** | stato su `state.json` con **storico** (`first_seen`, `last_seen`, `seen_count`) | i device noti ricompaiono **subito** al riavvio |
| **Tracciamento online/offline** | i device spariti restano *offline* e vengono rimossi dopo 30 min | si vede cosa è scomparso dalla rete |
| **Autostart a livello utente** | `npm run autostart:install` (opz. `-- --agent http://SERVER:8000` per la modalità agente) registra un avvio al login (Startup `.vbs` Windows, `.desktop` Linux, LaunchAgent macOS) | scanner/agente **sopravvive al riavvio del PC** senza admin né servizi critici |

> ⚠️ **Limiti onesti:** l'analisi dei flussi riguarda la **macchina che esegue lo scanner** (la sua socket table); per vedere il traffico *di altri* dispositivi servirebbe una porta mirror/gateway o packet-capture. Il **deep packet inspection** per-protocollo richiederebbe Npcap + privilegi (in roadmap).

---

## 🧰 Stack tecnico

| Livello | Tecnologia | Perché |
|---|---|---|
| **Framework** | Next.js 16 (App Router) + React 19 | Server Components, routing moderno, ottime performance |
| **Linguaggio** | TypeScript 5 (`strict`) | Type-safety end-to-end (`Device`, `Agent`, `ScanResult`) |
| **Styling** | Tailwind CSS 4 | UI consistente, dark mode nativa, zero CSS custom sparso |
| **Icone** | `lucide-react` | Set coerente e leggero |
| **Grafici** | `recharts` | Area chart fluidi e theme-aware |
| **Topologia** | SVG nativo + hook React | Drag/zoom/pan **senza** dipendenze pesanti = bundle snello |
| **Container** | Docker (`Dockerfile.dev`, node:20-alpine) | Ambiente riproducibile |

**Scelte che rendono il progetto solido:**
- 🧠 **Un solo data layer** (`lib/api.ts`): cambiare backend = cambiare 1 file.
- 🪶 **Topologia fatta a mano in SVG**: niente `d3`/`vis.js` da 200 KB, controllo totale su UX.
- 🔒 **`strict: true`** in TypeScript: i bug si prendono a compile-time.
- ♻️ **Componenti riutilizzabili** condivisi tra Dashboard e pagine dedicate.

---

## ⚡ Avvio rapido

> Requisiti: **Node.js ≥ 20** e npm.

```bash
# 1. Installa le dipendenze
npm install

# 2. Avvia il backend di scansione REALE (Terminale 1)
npm run backend

# 3. Avvia il frontend (Terminale 2)
npm run dev
```

➡️ Apri **http://localhost:3000** e dopo ~15s vedrai i dispositivi reali della tua rete 🎉

| Comando | Azione |
|---|---|
| `npm run backend` | 🛰️ Backend di scansione **reale** della rete (porta 8000) |
| `npm run agent -- --agent http://SERVER:8000` | 🛰️ Avvia un **agente** che scansiona la rete locale e riporta a un server remoto |
| `npm run mock` | 🧪 Backend finto con dati demo (porta 8000) |
| `npm run oui` | 🏷️ Scarica il DB OUI IEEE completo (~40k vendor) per la risoluzione offline |
| `npm run autostart:install` | 🔁 Avvio automatico dello scanner al login (livello utente, **no admin**) |
| `npm run autostart:uninstall` | ↩️ Rimuove l'avvio automatico |
| `npm run dev` | Server di sviluppo frontend con hot-reload |
| `npm run build` | Build di produzione |
| `npm start` | Avvia la build di produzione |
| `npm run lint` | Controllo ESLint |

---

## 🧪 Come testare dalla GUI web

### 🅰️ Monitoraggio REALE della tua rete (lo scopo del progetto)

Il repo include un **backend di scansione reale** a zero dipendenze ([`server.mjs`](server.mjs)) che **non simula nulla**: rileva la tua subnet, fa il **ping-sweep** della `/24`, legge la **tabella ARP** per i MAC, risolve **hostname** (reverse DNS) e **vendor** (OUI + lookup online), e fa **scansione porte TCP reale**. Non serve essere amministratore.

```bash
# Terminale 1 — avvia il backend di scansione (porta 8000)
npm run backend       # = node server.mjs

# Terminale 2 — avvia il frontend (porta 3000)
npm run dev
```

Apri **http://localhost:3000**: dopo ~15s vedrai i **dispositivi reali** della tua LAN. Il backend ri-scansiona da solo ogni 60s; il pulsante **"Avvia Scansione"** forza un refresh; il pulsante **"Scan"** su un dispositivo ne analizza le porte aperte dal vivo.

> ⚙️ **Come funziona davvero**
> | Dato | Tecnica |
> |---|---|
> | Host attivi | `ping` sweep di `x.y.z.1–254` in parallelo |
> | MAC address | parsing di `arp -a` di sistema |
> | Hostname | reverse DNS + **NetBIOS** (`nbtstat`, Windows) |
> | Vendor | tabella **OUI offline** (170+ prefissi) + coda online **throttolata e persistente** (`.vendor-cache.json`) |
> | Porte aperte | **fingerprint** automatico (~24 porte) + scan profondo on-demand |
> | Tipo + OS | classificazione per **firma porte + vendor + MAC + hostname** |
>
> 🔎 **Identifica automaticamente:** 📱 iPhone (porta 62078) · 🤖 Android/smartphone (anche con **MAC randomizzato** privacy) · 📶 access point/router · 🖥️ PC Windows (SMB/RDP) · 🐧 server Linux · 💾 NAS · 🖨️ stampanti · 📷 camere IP (RTSP) · ☀️ **inverter fotovoltaici** (Modbus 502) · 🔌 **colonnine EV** · 📺 smart TV/media (Chromecast) · 🐳 **container Docker**/VM · 💡 IoT (ESP/Tuya/Shelly).

### 🅱️ Demo con dati finti (offline, senza toccare la rete)

Se vuoi solo vedere la UI popolata senza scansionare nulla, usa il **mock** ([`mock-api.mjs`](mock-api.mjs)) con 6 dispositivi di esempio:

```bash
npm run mock          # Terminale 1 (porta 8000)
npm run dev           # Terminale 2 (porta 3000)
```

### ✅ Checklist di collaudo (vale per 🅰️ e 🅱️)

Apri **http://localhost:3000** e verifica:

| ✅ | Pagina | Cosa verificare |
|---|---|---|
| ☐ | 🏠 **Dashboard** (`/`) | Le 4 card mostrano i numeri della tua rete (dispositivi, online, reti, avvisi) |
| ☐ | 🏠 Dashboard | Il grafico **Traffico** si disegna (area blu/viola) |
| ☐ | 🗺️ **Topologia** | Vedi il **gateway/router** al centro con gli altri nodi in orbita |
| ☐ | 🗺️ Topologia | **Trascini** un nodo, **zoom** con la rotella, **click** apre il pannello dettagli |
| ☐ | 🔍 **Scansione** | Il pulsante "Avvia Scansione" cambia stato e torna "Pronto" dopo qualche secondo |
| ☐ | 📇 **Dispositivi** (`/dispositivi`) | Tabella popolata; la **ricerca** filtra per IP/hostname/vendor |
| ☐ | 📇 Dispositivi | Click su una riga → **modale** con MAC, vendor, porte aperte |
| ☐ | 🧩 Dashboard | In "Dettaglio Reti" puoi **rinominare** un hostname (matita → salva) |
| ☐ | ⚙️ **Impostazioni** (`/impostazioni`) | Tabella **Agent**: in modalità reale compare lo **scanner locale** (questo PC) come agente online |
| ☐ | 🌙 **Tema** | Il toggle 🌙/☀️ cambia tema e **resta** dopo un refresh |
| ☐ | 📱 **Responsive** | Riduci la finestra: la UI si adatta (DevTools → modalità mobile) |
| ☐ | 🧰 **Console** | DevTools (F12) → **nessun errore rosso** in console |

### 🅲️ Solo UI, senza alcun backend

```bash
npm run dev
```

L'app parte comunque: vedrai **stati vuoti/zero** (nessun dispositivo). In console comparirà un errore di `fetch` verso `:8000` — è **atteso** e dimostra che il data layer tenta correttamente la connessione. Utile per testare layout, navigazione, tema e responsività.

> 💡 **Health check da terminale** (con backend reale o mock attivo):
> ```bash
> curl http://localhost:8000/api/v1/devices   # → JSON con i dispositivi rilevati
> curl http://localhost:3000                   # → HTML 200 della dashboard
> ```

---

## 🐳 Avvio con Docker

Il progetto include un `Dockerfile.dev` pronto:

```bash
# Build dell'immagine
docker build -f Dockerfile.dev -t networkscope:dev .

# Avvio (porta 3000 esposta)
docker run -it --rm -p 3000:3000 networkscope:dev
```

➡️ Anche qui: **http://localhost:3000**

---

## 🔌 Backend & API

Tutte le chiamate passano da un **unico data layer** ([`lib/api.ts`](lib/api.ts)) che usa `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). Il repo fornisce un'implementazione **reale** ([`server.mjs`](server.mjs)) e una **mock** ([`mock-api.mjs`](mock-api.mjs)) — entrambe rispettano questo contratto:

Il frontend si aspetta queste rotte:

| Metodo | Endpoint | Scopo |
|---|---|---|
| `GET` | `/api/v1/devices` | Elenco dispositivi |
| `GET` | `/api/v1/devices/:ip` | Dettaglio dispositivo |
| `PATCH` | `/api/v1/devices/:ip` | Aggiorna (es. hostname) |
| `POST` | `/api/v1/scan/network?subnet=...` | Avvia scansione rete |
| `POST` | `/api/v1/scan/ports/:ip` | Avvia scansione porte |
| `GET` | `/api/v1/agents` | Agent registrati (scanner locale) |
| `DELETE` | `/api/v1/agents/:id` | Rimuove un agent |
| `GET` | `/api/v1/traffic` | Serie temporale traffico reale (KB/s + pacchetti/s + totali) |
| `GET` | `/api/v1/connections` | Connessioni attive: protocollo, sorgente, destinazione (reverse DNS) |

**Modello dati** (`types/index.ts`):

```ts
interface Device {
  id: number;
  ip_address: string;
  mac_address: string | null;
  hostname: string | null;
  vendor: string | null;
  is_active: boolean;
  last_seen: string;
  device_type: string;   // gateway | router | server | mobile | printer | iot_device | ...
  open_ports: number[];
}
```

---

## 🔐 Sicurezza & note di produzione

NetworkScope è pensato come **strumento di monitoraggio della propria rete locale**. Scansiona solo reti che possiedi o per cui hai autorizzazione.

### ✅ Robustezza già implementata
- **Nessun crash per errori imprevisti**: handler globali `uncaughtException` / `unhandledRejection`, ogni richiesta HTTP è in `try/catch` (risponde 500 invece di cadere), l'upgrade WebSocket è protetto.
- **Timeout ovunque**: ping, port scan, banner/TLS, reverse DNS, lookup org, comandi di sistema — niente operazioni che possono restare appese.
- **Best-effort**: vendor/DNS/UPnP/org falliscono in silenzio senza interrompere la scansione; cache su disco per vendor e stato.
- **Scansione "educata"**: ciclo ARP silenzioso + sweep ICMP raro con jitter → poco rumore in rete.

### ⚠️ Cosa indurire PRIMA di un uso oltre la LAN fidata
| Aspetto | Stato attuale | Mitigazione consigliata |
|---|---|---|
| **Autenticazione** | nessuna: API e proxy aperti a chi raggiunge la porta 8000 | aggiungere un **token condiviso** su API, report agenti e WebSocket |
| **Proxy terminale (WebSocket↔TCP)** | apre socket TCP verso host **solo della LAN** (RFC1918), senza auth | tenere il server su rete fidata; aggiungere auth/allowlist host |
| **Esposizione di rete** | il server ascolta su `0.0.0.0:8000` (serve agli agenti remoti) | se non servono agenti remoti, bind su `127.0.0.1`; altrimenti firewall/VPN |
| **Trasporto** | HTTP/WS in chiaro | mettere dietro reverse proxy con **HTTPS/WSS** |
| **Lookup organizzazione** | invia gli **IP di destinazione pubblici** a `ip-api.com` | disattivabile per restare 100% offline (vedi `lookupOrg` in `server.mjs`) |
| **PATCH dispositivi** | nessuna validazione forte del body | validare/limitare i campi modificabili |

> In sintesi: ottimo come tool personale/di laboratorio sulla **tua** rete. Per un deployment condiviso o esposto, aggiungi **autenticazione, HTTPS/WSS e una allowlist** come sopra.

---

## 🗺️ Roadmap

- [x] 🛰️ **Backend di scansione reale** (`server.mjs`) — ping-sweep, ARP, reverse DNS, OUI, port scan
- [x] 🧠 **Identificazione dispositivi** (telefoni, AP, NAS, inverter, EV, Docker, IoT…)
- [x] 📈 **Traffico reale** (throughput + pacchetti/s dai contatori interfaccia)
- [x] 🌙 **Dark/light mode** funzionante via toggle navbar
- [x] 🧪 Mock backend a zero dipendenze per il collaudo della GUI
- [x] 📦 Database OUI completo offline (~40k vendor, `npm run oui`)
- [x] 📤 Export report CSV / PDF
- [x] ⚡ Scansione incrementale + registro persistente con storico
- [x] 🔁 Autostart dello scanner al login (livello utente, no admin)
- [x] 🛰️ Architettura agent ↔ server multi-rete (più agenti, una dashboard)
- [x] 🤫 Scansione "educata" (ciclo ARP silenzioso + sweep ICMP raro con jitter)
- [x] 📥 Installer agenti (Windows/Linux/Python) generati e serviti dal server
- [x] 🔌 Connessione per porta REALE (browser / socket TCP via WebSocket) + risoluzione org dei flussi
- [x] 📡 Flussi/connessioni reali aggregati da tutti gli agenti (incl. agente Python)
- [x] 🖥️ Terminale reale con colori ANSI e input carattere-per-carattere (interattivo)
- [x] 🔔 Notifiche nuovi dispositivi (in-app + browser)
- [x] 🛡️ Resilienza: handler globali, request `try/catch`, timeout ovunque
- [x] 🖱️ Dettagli cliccabili ovunque (dispositivi, nodi mappa, flussi traffico)
- [ ] 🔬 Deep packet inspection per-protocollo (richiede Npcap + privilegi)
- [ ] 🔔 Notifiche real-time (WebSocket) per nuovi dispositivi
- [ ] 🧪 Test automatici (Vitest + Playwright)
- [ ] 🔐 Autenticazione e multi-utente
- [ ] 🐳 `docker-compose` frontend + backend con un comando

---

## 📜 Licenza

Distribuito sotto licenza **MIT**. Usalo, modificalo, miglioralo. ⭐ Se ti è utile, lascia una stella!

<div align="center">
<br/>
<sub>Costruito con ⚛️ Next.js, ❤️ e un sano sospetto verso i dispositivi sconosciuti sulla rete.</sub>
</div>
