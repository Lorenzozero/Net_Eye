// 🛰️  NetworkScope — Backend REALE di scansione e identificazione rete.
// Zero dipendenze, nessun privilegio admin. Avvio:  node server.mjs  → http://localhost:8000
//
// Identifica: telefoni (iPhone/Android, anche con MAC randomizzato), access point/router,
// NAS, stampanti, camere IP, inverter fotovoltaici, colonnine EV, container Docker/VM,
// smart TV/media, PC Windows/Linux, IoT — con vendor da tabella OUI offline + lookup online
// throttolato e persistente.
import http, { createServer } from 'node:http';
import { exec } from 'node:child_process';
import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';
import dns from 'node:dns/promises';
import os from 'node:os';
import https from 'node:https';
import { readFileSync, writeFileSync } from 'node:fs';

const PORT = 8000;
const isWin = process.platform === 'win32';
const CACHE_FILE = new URL('./.vendor-cache.json', import.meta.url);
const AGENT_VERSION = '3.0.0';

// ---- Modalità: SERVER (collector + API + scanner locale) oppure AGENT (riporta a un server remoto) ----
//   node server.mjs                          → server (default)
//   node server.mjs --agent http://host:8000 → agente che scansiona e riporta al server remoto
const _args = process.argv.slice(2);
const _ai = _args.indexOf('--agent');
const AGENT_TARGET = _ai >= 0 ? _args[_ai + 1] : (process.env.NS_AGENT_TARGET || null);
const AGENT_MODE = !!AGENT_TARGET;

// Identità agente persistente (stabile fra i riavvii). Override per test/multi-istanza con NS_AGENT_ID.
const AGENT_ID_FILE = new URL('./.agent-id', import.meta.url);
const AGENT_ID = process.env.NS_AGENT_ID || (() => {
  try { const v = readFileSync(AGENT_ID_FILE, 'utf8').trim(); if (v) return v; } catch {}
  const id = `agt-${os.hostname()}-${Math.random().toString(36).slice(2, 8)}`;
  try { writeFileSync(AGENT_ID_FILE, id); } catch {}
  return id;
})();
const osName = () => (isWin ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux');

// ---- Scansione "educata" (poco rumore di rete) ----
const FULL_INTERVAL = 5 * 60 * 1000;   // sweep ICMP completo: raro
const LIGHT_INTERVAL = 45 * 1000;      // ciclo leggero (solo ARP, nessun pacchetto extra): frequente
const jitter = (ms) => Math.round(ms + (Math.random() - 0.5) * ms * 0.3); // ±15% per non sincronizzare gli agent

// POST JSON minimale (per la comunicazione agent → server)
function postJson(url, obj) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const data = JSON.stringify(obj);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(u, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }, timeout: 8000 }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.write(data); req.end();
    } catch { resolve(null); }
  });
}

// Porte usate per il fingerprint del tipo di dispositivo (scan rapido su ogni host attivo).
const FINGERPRINT_PORTS = [
  22, 23, 53, 80, 139, 443, 445, 515, 548, 554, 631, 1883, 3389,
  5000, 5001, 8008, 8009, 8443, 9100, 7547, 8888, 62078, 1900, 5060,
];
// Porte per la scansione approfondita on-demand (bottone "Scan").
const DEEP_PORTS = [
  21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 502, 515, 548, 554, 631,
  993, 995, 1883, 3000, 3306, 3389, 5000, 5001, 5432, 5900, 8000, 8080, 8443, 9000, 9100, 62078,
];

// Tabella OUI offline (primi 3 byte MAC, uppercase, senza separatori → vendor).
// Hit istantanei e funziona anche offline. Il long-tail è coperto dal lookup online persistente.
const OUI = {
  // Apple
  '001451': 'Apple', '0017F2': 'Apple', '38C986': 'Apple', 'F0189A': 'Apple', 'A4D1D2': 'Apple',
  'A85C2C': 'Apple', '8866A5': 'Apple', 'DC2B2A': 'Apple', '6C4008': 'Apple', 'F0DBE2': 'Apple',
  '442A60': 'Apple', 'D89695': 'Apple', '14109F': 'Apple', '3C0754': 'Apple', '7CD1C3': 'Apple',
  '9C207B': 'Apple', 'F0766F': 'Apple', '5CF5DA': 'Apple', 'B065BD': 'Apple', '04F7E4': 'Apple',
  '84FCFE': 'Apple', 'F40F24': 'Apple', 'A4B197': 'Apple', 'D0817A': 'Apple', '8C8590': 'Apple',
  // Samsung
  '5CF938': 'Samsung', '8425DB': 'Samsung', '0021D1': 'Samsung', 'E8508B': 'Samsung', '286D97': 'Samsung',
  '001632': 'Samsung', '001FCC': 'Samsung', '1C5A3E': 'Samsung', '5001BB': 'Samsung', 'E4B021': 'Samsung',
  'FCC2DE': 'Samsung', '8C71F8': 'Samsung',
  // Xiaomi
  '286C07': 'Xiaomi', '64B473': 'Xiaomi', 'F8A45F': 'Xiaomi', '7451BA': 'Xiaomi', '98FAE3': 'Xiaomi',
  'A4506B': 'Xiaomi', 'F0B429': 'Xiaomi', '286130': 'Xiaomi',
  // Huawei / Honor
  '00E0FC': 'Huawei', '48435A': 'Huawei', '2008ED': 'Huawei', 'D0D04B': 'Huawei', '5CB395': 'Huawei',
  '781DBA': 'Huawei', 'A4BA76': 'Huawei', '10C61F': 'Huawei',
  // Google / Nest
  '7C2EBD': 'Google', 'F4F5D8': 'Google', 'DA0A0E': 'Google', '3C5AB4': 'Google', '1844B5': 'Google', 'F0EF86': 'Google',
  // Amazon (Echo / Fire)
  'F0272D': 'Amazon', '747548': 'Amazon', '68F728': 'Amazon', '44650D': 'Amazon', '4C17EB': 'Amazon', 'A002DC': 'Amazon',
  // Espressif (ESP8266/ESP32 → IoT, Shelly, Sonoff, Tasmota)
  '240AC4': 'Espressif (IoT)', '3C71BF': 'Espressif (IoT)', '807D3A': 'Espressif (IoT)', 'A020A6': 'Espressif (IoT)',
  '2462AB': 'Espressif (IoT)', 'D8A01D': 'Espressif (IoT)', 'EC94CB': 'Espressif (IoT)', 'B4E62D': 'Espressif (IoT)',
  '7C9EBD': 'Espressif (IoT)', '8CAAB5': 'Espressif (IoT)', 'C82B96': 'Espressif (IoT)', '34AB95': 'Espressif (IoT)',
  // Ubiquiti (AP/router)
  '24A43C': 'Ubiquiti', 'FCECDA': 'Ubiquiti', '788A20': 'Ubiquiti', '0418D6': 'Ubiquiti', 'DC9FDB': 'Ubiquiti',
  '68D79A': 'Ubiquiti', '802AA8': 'Ubiquiti',
  // MikroTik
  '4C5E0C': 'MikroTik', '6416C8': 'MikroTik', 'CC2DE0': 'MikroTik', 'D4CA6D': 'MikroTik', 'E48D8C': 'MikroTik', '744D28': 'MikroTik',
  // TP-Link
  'C0FFD4': 'TP-Link', '50C7BF': 'TP-Link', 'EC086B': 'TP-Link', 'B0487A': 'TP-Link', 'D85D4C': 'TP-Link',
  '1C61B4': 'TP-Link', '5091E3': 'TP-Link', 'A842A1': 'TP-Link', '003192': 'TP-Link',
  // Netgear
  'A42B8C': 'Netgear', '00146C': 'Netgear', '20E52A': 'Netgear', '9CD36D': 'Netgear', '28C68E': 'Netgear',
  // ASUS
  '2C56DC': 'ASUS', '50465D': 'ASUS', '1C872C': 'ASUS', 'AC220B': 'ASUS', '04D4C4': 'ASUS', '1CB72C': 'ASUS',
  // AVM (FRITZ!Box)
  '3CA6F6': 'AVM FRITZ!Box', '7C5EBC': 'AVM FRITZ!Box', 'C0250E': 'AVM FRITZ!Box', 'E0286D': 'AVM FRITZ!Box',
  // Aruba / HPE, Cisco
  '000B86': 'Aruba', '6CF37F': 'Aruba', '00000C': 'Cisco', 'FCFBFB': 'Cisco', '001AA1': 'Cisco',
  // ZTE, D-Link, Tenda, Technicolor, Sagemcom, Arris (CPE/router)
  '746F88': 'ZTE', '0015EB': 'ZTE', '4C09B4': 'ZTE', '1CBDB9': 'D-Link', '28107B': 'D-Link',
  'C83A35': 'Tenda', '081077': 'Technicolor', '0019E2': 'Sagemcom', '001DCD': 'Arris',
  // NAS
  '001132': 'Synology', '00089B': 'QNAP', '245EBE': 'QNAP',
  // Stampanti
  '3C2200': 'HP', '001B78': 'HP', '94572B': 'HP', 'F0921C': 'HP', '001E8F': 'Canon', '2860F7': 'Canon',
  '00904C': 'Epson', 'E0BE03': 'Epson', '649A37': 'Epson', '3C2AF4': 'Brother', '008077': 'Brother',
  // Smart TV / Media
  'FCF152': 'Sony', '00E091': 'LG', '98DAC4': 'Roku', 'DC3A5E': 'Roku', '347E5C': 'Sonos',
  // Inverter FV / energia (anche identificati via Modbus 502)
  '0040AD': 'SMA Solar', '0003AC': 'Fronius', '8CF681': 'Huawei (Inverter)',
  // EV charger
  '044EAF': 'Tesla', '98ED5C': 'Tesla', '4C7DCF': 'Tesla',
  // Raspberry Pi
  'B827EB': 'Raspberry Pi', 'DCA632': 'Raspberry Pi', 'E45F01': 'Raspberry Pi', '2CCF67': 'Raspberry Pi',
  '28CDC1': 'Raspberry Pi', 'D83ADD': 'Raspberry Pi', 'E4E112': 'Raspberry Pi',
  // Chip / virtualizzazione
  '24EB16': 'Intel', '001500': 'Intel', 'A0C589': 'Intel', '00E04C': 'Realtek',
  '000C29': 'VMware', '005056': 'VMware', '080027': 'VirtualBox', '00163E': 'Xen', '525400': 'QEMU/KVM',
  '00155D': 'Microsoft Hyper-V', '0242AC': 'Docker',
};

// Database OUI IEEE completo (opzionale): generalo con `npm run oui`.
const OUI_DB = (() => {
  try { return JSON.parse(readFileSync(new URL('./oui-db.json', import.meta.url), 'utf8')); }
  catch { return null; }
})();

// ---- stato ----
let devices = [];
let scanning = false;
const traffic = [];        // serie temporale: { time, download(KB/s), upload(KB/s), rxPps, txPps }
let lastCounters = null;   // ultimo snapshot dei contatori interfaccia
const removedAgents = new Set(); // agenti eliminati dall'utente (non vengono ri-mostrati)
const remoteAgents = new Map();  // id → { info, devices, traffic, connections, lastReport, registered_at } (agenti su altre macchine/reti)

// Registro persistente dei dispositivi (storico) — sopravvive al riavvio del backend.
const registry = new Map();                         // key (mac|ip) → device con storico
const STATE_FILE = new URL('./state.json', import.meta.url);
const ENRICH_TTL = 5 * 60 * 1000;                   // ri-arricchimento (banner/UPnP/porte) ogni 5 min
const PRUNE_TTL = 30 * 60 * 1000;                   // rimuovi i device offline da oltre 30 min
const deviceKey = (mac, ip) => (mac ? `mac:${mac}` : `ip:${ip}`);

function loadState() {
  try {
    const s = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    for (const d of (s.devices || [])) { d.is_active = false; registry.set(deviceKey(d.mac_address, d.ip_address), d); }
    for (const a of (s.removedAgents || [])) removedAgents.add(a);
    publishDevices();
    console.log(`   stato caricato: ${registry.size} dispositivi noti, ${removedAgents.size} agenti rimossi`);
  } catch { /* nessuno stato precedente */ }
}
function saveState() {
  try { writeFileSync(STATE_FILE, JSON.stringify({ devices: [...registry.values()], removedAgents: [...removedAgents] })); } catch {}
}
function publishDevices() {
  devices = [...registry.values()].sort((a, b) => ipKey(a.ip_address).localeCompare(ipKey(b.ip_address)));
  devices.forEach((d, i) => (d.id = i + 1));
}
const vendorCache = loadCache();
const vendorQueue = [];
let queueRunning = false;
const dnsCache = new Map(); // ip → hostname (per le destinazioni delle connessioni)

// Porta → servizio/protocollo applicativo (per capire "di che pacchetti si tratta")
const SERVICES = {
  20: 'FTP', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 67: 'DHCP', 68: 'DHCP',
  80: 'HTTP', 110: 'POP3', 119: 'NNTP', 123: 'NTP', 135: 'RPC', 139: 'NetBIOS', 143: 'IMAP',
  161: 'SNMP', 389: 'LDAP', 443: 'HTTPS', 445: 'SMB', 465: 'SMTPS', 514: 'Syslog', 515: 'Print',
  548: 'AFP', 554: 'RTSP', 587: 'SMTP', 631: 'IPP', 636: 'LDAPS', 853: 'DNS/TLS', 993: 'IMAPS',
  995: 'POP3S', 1194: 'OpenVPN', 1433: 'MSSQL', 1723: 'PPTP', 1883: 'MQTT', 1900: 'SSDP',
  3306: 'MySQL', 3389: 'RDP', 5060: 'SIP', 5222: 'XMPP', 5228: 'Google Play', 5353: 'mDNS',
  5432: 'PostgreSQL', 5900: 'VNC', 6379: 'Redis', 8080: 'HTTP', 8443: 'HTTPS', 8883: 'MQTTS',
  9100: 'Print', 27017: 'MongoDB', 51820: 'WireGuard',
  3478: 'STUN/WebRTC', 5223: 'Apple Push', 5938: 'TeamViewer', 19302: 'WebRTC',
};
const svc = (remote, localp) => SERVICES[remote] || SERVICES[localp] || `porta ${remote}`;

function loadCache() {
  try { return new Map(Object.entries(JSON.parse(readFileSync(CACHE_FILE, 'utf8')))); }
  catch { return new Map(); }
}
function saveCache() {
  try { writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(vendorCache))); } catch {}
}

const local = (() => {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) {
        const p = ni.address.split('.');
        return { base: `${p[0]}.${p[1]}.${p[2]}`, ip: ni.address, mac: (ni.mac || '').toUpperCase() };
      }
    }
  }
  return { base: '192.168.1', ip: null, mac: '' };
})();

// ---- utility ----
const run = (cmd, timeout = 6000) => new Promise((resolve) => exec(cmd, { windowsHide: true, timeout }, (_e, out = '') => resolve(out || '')));

async function mapLimit(items, limit, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  }));
  return out;
}

// Ping con estrazione di TTL (per OS fingerprint) e RTT (latenza).
async function ping(ip) {
  const out = await run(isWin ? `ping -n 1 -w 600 ${ip}` : `ping -c 1 -W 1 ${ip}`);
  const alive = /ttl[=:]/i.test(out);
  if (!alive) return { alive: false, ttl: null, rtt: null };
  const ttl = Number((out.match(/ttl[=:]\s*(\d+)/i) || [])[1]) || null;
  const rttM = out.match(/(?:durata|tempo|time)[=<]\s*(\d+)\s*ms/i);
  const rtt = rttM ? Number(rttM[1]) : (/[<]\s*1\s*ms/i.test(out) ? 0 : null);
  return { alive, ttl, rtt };
}

// TTL ricevuto → famiglia OS (su LAN gli hop sono ~0, quindi TTL ≈ valore iniziale).
function ttlOs(ttl) {
  if (!ttl) return null;
  if (ttl <= 64) return 'Linux/Unix';     // anche Android/iOS/macOS
  if (ttl <= 128) return 'Windows';
  return 'Embedded/Network';               // router, stampanti, IoT (TTL 255)
}

async function arpTable() {
  const out = await run('arp -a');
  const map = {};
  const re = /(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f]{2}(?:[-:][0-9a-f]{2}){5})/gi;
  let m;
  while ((m = re.exec(out))) {
    const mac = m[2].replace(/-/g, ':').toUpperCase();
    if (mac !== 'FF:FF:FF:FF:FF:FF' && !mac.startsWith('01:00:5E') && !mac.startsWith('33:33')) map[m[1]] = mac;
  }
  return map;
}

// MAC localmente amministrato (randomizzato per privacy) → tipico di iPhone/Android.
function isRandomMac(mac) {
  if (!mac) return false;
  const first = parseInt(mac.slice(0, 2), 16);
  return Number.isFinite(first) && (first & 0x02) === 0x02 && (first & 0x01) === 0x00;
}

function ouiVendor(mac) {
  if (!mac) return null;
  const prefix = mac.replace(/[^0-9a-f]/gi, '').toUpperCase().slice(0, 6);
  return OUI[prefix] || (OUI_DB ? OUI_DB[prefix] : null) || null;  // inline (nomi corti) → DB IEEE completo
}

function onlineVendor(mac) {
  return new Promise((resolve) => {
    const req = https.get(`https://api.macvendors.com/${mac}`, { timeout: 2500 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(res.statusCode === 200 ? body.trim() : null));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// Risoluzione immediata (cache + OUI offline). Il long-tail va in coda online.
function quickVendor(mac) {
  if (!mac) return null;
  if (isRandomMac(mac)) return 'MAC privato (randomizzato)';
  if (vendorCache.has(mac)) return vendorCache.get(mac);
  const v = ouiVendor(mac);
  if (v) { vendorCache.set(mac, v); return v; }
  return null; // → coda online
}

// Coda online throttolata (1 richiesta/1.3s) per non sbattere sul rate-limit.
function enqueueVendor(mac) {
  if (!mac || isRandomMac(mac) || vendorCache.has(mac) || vendorQueue.includes(mac)) return;
  vendorQueue.push(mac);
  runVendorQueue();
}
async function runVendorQueue() {
  if (queueRunning) return;
  queueRunning = true;
  while (vendorQueue.length) {
    const mac = vendorQueue.shift();
    if (vendorCache.has(mac)) continue;
    const v = (await onlineVendor(mac)) || 'Unknown';
    vendorCache.set(mac, v);
    saveCache();
    // Aggiorna i device che usano questo MAC e riclassifica
    let updated = false;
    for (const d of devices) {
      if (d.mac_address === mac) { d.vendor = v; Object.assign(d, identify(d)); d.risk = computeRisk(d); updated = true; }
    }
    if (updated) saveState();
    await new Promise((r) => setTimeout(r, 1300));
  }
  queueRunning = false;
}

async function reverseDns(ip) {
  try { return (await dns.reverse(ip))[0] || null; } catch { return null; }
}
async function netbios(ip) {
  if (!isWin) return null;
  const out = await run(`nbtstat -A ${ip}`, 2500);
  const m = out.match(/^\s*([^\s<]+)\s+<00>\s+UNIQUE/m);
  return m && m[1] && m[1] !== '__MSBROWSE__' ? m[1].trim() : null;
}

function checkPort(ip, port, timeout = 700) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let done = false;
    const end = (open) => { if (!done) { done = true; s.destroy(); resolve(open); } };
    s.setTimeout(timeout);
    s.once('connect', () => end(true));
    s.once('timeout', () => end(false));
    s.once('error', () => end(false));
    s.connect(port, ip);
  });
}
async function scanPortsList(ip, ports) {
  const res = await Promise.all(ports.map(async (p) => ((await checkPort(ip, p)) ? p : null)));
  return res.filter((p) => p !== null);
}

// ---- BANNER GRABBING (identifica servizio e versione realmente in ascolto) ----
const BANNER_PORTS = [21, 22, 25, 80, 110, 143, 443, 8080, 8000, 8443];

function readSocket(ip, port, timeout, payload) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let data = '';
    let done = false;
    const end = (v) => { if (!done) { done = true; try { s.destroy(); } catch {} resolve(v); } };
    s.setTimeout(timeout);
    s.on('data', (d) => { data += d.toString('latin1'); if (data.length > 2048) end(data); });
    s.once('timeout', () => end(data || null));
    s.once('error', () => end(null));
    s.connect(port, ip, () => { if (payload) s.write(payload); });
    setTimeout(() => end(data || null), timeout + 800); // guardia hard
  });
}

function grabTls(ip, port) {
  return new Promise((resolve) => {
    let done = false;
    const fin = (v) => { if (!done) { done = true; try { s.destroy(); } catch {} resolve(v); } };
    const s = tls.connect({ host: ip, port, rejectUnauthorized: false, timeout: 1800 }, () => {
      const c = s.getPeerCertificate();
      const subj = c && c.subject ? (c.subject.CN || c.subject.O) : null;
      const issuer = c && c.issuer ? (c.issuer.O || '') : '';
      fin(subj ? `TLS: ${subj}${issuer ? ` (CA: ${issuer})` : ''}`.slice(0, 120) : null);
    });
    s.on('error', () => fin(null));
    s.setTimeout(1800, () => fin(null));
    setTimeout(() => fin(null), 2600); // guardia hard
  });
}

async function grabBanner(ip, port) {
  if ([22, 21, 25, 110, 143].includes(port)) {
    const d = await readSocket(ip, port, 1300, null);
    return d ? d.split(/\r?\n/)[0].trim().slice(0, 120) : null;
  }
  if ([80, 8080, 8000, 8443].includes(port)) {
    const d = await readSocket(ip, port, 1500, `HEAD / HTTP/1.0\r\nHost: ${ip}\r\nUser-Agent: NetworkScope\r\n\r\n`);
    if (!d) return null;
    const server = (d.match(/^Server:\s*(.+)$/im) || [])[1];
    const auth = (d.match(/^WWW-Authenticate:\s*(.+)$/im) || [])[1];
    return server ? `HTTP: ${server.trim()}`.slice(0, 120) : (auth ? `HTTP auth: ${auth.trim()}`.slice(0, 80) : 'HTTP');
  }
  if (port === 443) return grabTls(ip, 443);
  return null;
}

async function grabBanners(ip, ports, allowed = BANNER_PORTS) {
  const targets = ports.filter((p) => allowed.includes(p));
  const banners = {};
  await Promise.all(targets.map(async (p) => {
    const b = await grabBanner(ip, p);
    if (b) banners[p] = b;
  }));
  return banners;
}

// ---- DISCOVERY SSDP/UPnP (nome amichevole, modello, produttore dei dispositivi) ----
function ssdpDiscover(timeout = 3000) {
  return new Promise((resolve) => {
    const found = {};
    const sock = dgram.createSocket('udp4');
    const msg = Buffer.from(
      'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: ssdp:all\r\n\r\n'
    );
    sock.on('message', (buf, rinfo) => {
      const txt = buf.toString();
      const ip = rinfo.address;
      if (!found[ip]) found[ip] = {
        server: (txt.match(/^SERVER:\s*(.+)$/im) || [])[1]?.trim() || null,
        location: (txt.match(/^LOCATION:\s*(.+)$/im) || [])[1]?.trim() || null,
      };
    });
    sock.on('error', () => { try { sock.close(); } catch {} resolve({}); });
    sock.bind(() => { try { sock.send(msg, 1900, '239.255.255.250'); } catch {} });
    setTimeout(() => { try { sock.close(); } catch {} resolve(found); }, timeout);
  });
}

function fetchUpnpDesc(location) {
  return new Promise((resolve) => {
    try {
      const req = http.get(location, { timeout: 1500 }, (res) => {
        let b = '';
        res.on('data', (c) => { b += c; if (b.length > 16384) req.destroy(); });
        res.on('end', () => {
          const g = (t) => (b.match(new RegExp(`<${t}>([^<]+)</${t}>`, 'i')) || [])[1]?.trim() || null;
          resolve({ friendlyName: g('friendlyName'), model: g('modelName'), manufacturer: g('manufacturer') });
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch { resolve(null); }
  });
}

// ---- SECURITY RISK SCORING (servizi esposti pericolosi) ----
const RISKY = {
  23: ['Telnet in chiaro', 35], 21: ['FTP in chiaro', 20], 445: ['SMB esposto', 25], 139: ['NetBIOS esposto', 15],
  3389: ['RDP esposto', 25], 5900: ['VNC esposto', 25], 3306: ['MySQL esposto', 20], 5432: ['PostgreSQL esposto', 20],
  6379: ['Redis esposto', 25], 27017: ['MongoDB esposto', 25], 1883: ['MQTT senza TLS', 10], 161: ['SNMP esposto', 10],
};
function computeRisk(d) {
  const reasons = [];
  let score = 0;
  for (const p of d.open_ports || []) {
    if (RISKY[p]) { reasons.push(RISKY[p][0]); score += RISKY[p][1]; }
  }
  if ((d.open_ports?.length || 0) > 8) { reasons.push(`${d.open_ports.length} porte aperte`); score += 15; }
  if (!d.vendor || d.vendor === 'Unknown') { reasons.push('vendor non identificato'); score += 5; }
  score = Math.min(100, score);
  const level = score >= 50 ? 'alto' : score >= 20 ? 'medio' : score > 0 ? 'basso' : 'ok';
  return { score, level, reasons };
}

// ---- IDENTIFICAZIONE: tipo + OS in base a vendor, porte, hostname, MAC, banner, UPnP, TTL ----
function identify(d) {
  const r = classifyDevice(d);
  if (!r.os) r.os = ttlOs(d.ttl);     // fallback OS dal TTL del ping
  return r;
}

function classifyDevice(d) {
  const v = (d.vendor || '').toLowerCase();
  const h = (d.hostname || '').toLowerCase();
  const mac = (d.mac_address || '').toUpperCase();
  const ports = d.open_ports || [];
  const has = (p) => ports.includes(p);
  const random = isRandomMac(mac);
  const up = d.upnp || {};
  const text = `${v} ${h} ${Object.values(d.banners || {}).join(' ')} ${up.manufacturer || ''} ${up.model || ''} ${up.friendlyName || ''}`.toLowerCase();

  // Virtualizzazione / container
  if (h.includes('docker') || mac.startsWith('02:42')) return { device_type: 'container', os: 'Docker' };
  if (/vmware|virtualbox|xen|hyper-v|qemu|kvm/.test(v)) return { device_type: 'vm', os: 'Virtuale' };

  // Segnali forti da banner/UPnP (autorevoli)
  if (/mikrotik|routeros/.test(text)) return { device_type: 'router', os: 'RouterOS' };
  if (/synology|diskstation|qnap|truenas|openmediavault/.test(text)) return { device_type: 'nas', os: 'Linux (NAS)' };
  if (/fritz!?box|openwrt|dd-wrt|asuswrt|tp-link router/.test(text)) return { device_type: 'router', os: null };
  if (/webos|tizen|bravia|android tv|smarttv|vidaa|chromecast|samsung.*tv|lg.*tv/.test(text)) return { device_type: 'tv', os: null };
  if (/laserjet|officejet|inkjet|deskjet|ipp|airprint|brother|epson|canon.*print/.test(text)) return { device_type: 'printer', os: null };
  if (/ip.?camera|ipcam|hikvision|dahua|reolink|rtsp/.test(text)) return { device_type: 'camera', os: null };

  // iPhone: porta 62078 (lockdownd) è una firma fortissima
  if (has(62078)) return { device_type: 'mobile', os: 'iOS (iPhone/iPad)' };

  // Stampanti
  if (has(9100) || has(631) || has(515) || /hp|hewlett|canon|epson|brother|lexmark|kyocera|ricoh|xerox/.test(v))
    return { device_type: 'printer', os: null };

  // Camere IP / videosorveglianza (RTSP)
  if (has(554)) return { device_type: 'camera', os: null };

  // Colonnina di ricarica EV (vendor noto o hostname "charge/wallbox/go-e")
  if (/wallbox|tesla|keba|alfen|easee|vestel|go-e|charge/.test(v + h))
    return { device_type: 'ev_charger', os: null };

  // Inverter FV / energia (Modbus TCP 502 o vendor noto)
  if (has(502) || /sma|fronius|solaredge|growatt|goodwe|sungrow|enphase|victron|kostal|fimer|deye|solis|huawei \(inverter\)/.test(v))
    return { device_type: 'inverter', os: null };

  // Gateway / router
  if (d.ip_address.endsWith('.1') || d.ip_address.endsWith('.254')) return { device_type: 'gateway', os: null };
  if ((has(53) || has(7547)) && (has(80) || has(443)) &&
    /ubiquiti|mikrotik|tp-link|netgear|asus|aruba|cisco|zte|huawei|d-link|tenda|fritz|avm|technicolor|sagemcom|arris/.test(v))
    return { device_type: 'router', os: null };

  // Access point
  if (/ubiquiti|aruba|ruckus|mikrotik/.test(v)) return { device_type: 'access_point', os: null };

  // NAS
  if (/synology|qnap|asustor|terramaster|buffalo|western digital/.test(v) || (has(5000) && has(5001)) || h.includes('nas'))
    return { device_type: 'nas', os: 'Linux (NAS)' };

  // Smart TV / media player (Chromecast 8008/8009, AirPlay, brand)
  if (has(8008) || has(8009) || /roku|chromecast|samsung.*tv|lg electron|sony|vizio|sonos|amazon/.test(v))
    return { device_type: 'media', os: null };

  // PC Windows (SMB/RDP)
  if (has(3389) || has(445) || has(139)) return { device_type: 'desktop', os: 'Windows' };

  // Dispositivi Apple (no iPhone-port): Mac se ha file sharing, altrimenti mobile
  if (/apple/.test(v)) return { device_type: has(548) || has(22) ? 'desktop' : 'mobile', os: 'Apple' };

  // Android / smartphone per brand
  if (/samsung|xiaomi|oppo|vivo|oneplus|motorola|realme|nokia|huawei|honor|google/.test(v))
    return { device_type: 'mobile', os: 'Android' };

  // IoT (ESP/Tuya/Shelly/Sonos/Amazon...)
  if (/espressif|tuya|shelly|sonoff|tasmota|sonos|nest|ring|iot/.test(v))
    return { device_type: 'iot_device', os: null };

  // MAC randomizzato senza porte server → quasi certamente uno smartphone
  if (random && !has(22) && !has(80) && !has(443) && !has(445))
    return { device_type: 'mobile', os: 'Smartphone (MAC privato)' };

  // Solo SSH → server Linux/Unix
  if (has(22)) return { device_type: 'server', os: 'Linux/Unix' };

  // Solo web → device IoT/embedded con UI
  if (has(80) || has(443) || has(8080) || has(8443)) return { device_type: 'iot_device', os: null };

  if (random) return { device_type: 'mobile', os: 'Smartphone (MAC privato)' };
  return { device_type: 'desktop', os: null };
}

const ipKey = (ip) => ip.split('.').map((n) => n.padStart(3, '0')).join('');

// Arricchimento "pesante" di un dispositivo (hostname, porte, banner, UPnP, vendor, tipo, rischio).
// Eseguito solo per device nuovi o "stale" → cicli successivi molto più leggeri.
async function enrichDevice(dev, upnp) {
  const ip = dev.ip_address;
  let host = await reverseDnsT(ip);
  if (!host) host = await netbios(ip);
  if (!host && upnp?.friendlyName) host = upnp.friendlyName;
  if (!host && ip === local.ip) host = os.hostname();
  if (host) dev.hostname = host;

  const fp = await scanPortsList(ip, FINGERPRINT_PORTS);
  dev.open_ports = dev.open_ports?.length ? [...new Set([...dev.open_ports, ...fp])].sort((a, b) => a - b) : fp;
  dev.banners = { ...(dev.banners || {}), ...(await grabBanners(ip, dev.open_ports, [22, 80, 443])) };
  if (upnp) dev.upnp = upnp;

  const vendor = quickVendor(dev.mac_address);
  if (vendor) dev.vendor = vendor; else { enqueueVendor(dev.mac_address); if (!dev.vendor) dev.vendor = 'Unknown'; }

  Object.assign(dev, identify(dev));
  dev.risk = computeRisk(dev);
  dev.enriched_at = Date.now();
}

// Aggiorna il registro a partire dagli host "vivi". Condiviso da full e light scan.
async function processLive(live, pingInfo, arp, upnpByIp, markOffline) {
  const nowISO = new Date().toISOString();
  const now = Date.now();
  const liveKeys = new Set();
  const toEnrich = [];
  let newCount = 0;

  for (const ip of live) {
    const mac = arp[ip] || (ip === local.ip ? local.mac : null);
    const key = deviceKey(mac, ip);
    liveKeys.add(key);
    let dev = registry.get(key);
    const isNew = !dev;
    if (isNew) {
      dev = { first_seen: nowISO, seen_count: 0, enriched_at: 0, open_ports: [], banners: {}, upnp: null, vendor: 'Unknown', device_type: 'desktop', os: null };
      registry.set(key, dev);
      newCount++;
    }
    dev.ip_address = ip;
    dev.mac_address = mac;
    dev.is_active = true;
    dev.last_seen = nowISO;
    dev.seen_count = (dev.seen_count || 0) + 1;
    const pInfo = pingInfo[ip] || {};
    if (pInfo.ttl != null) dev.ttl = pInfo.ttl;
    if (pInfo.rtt != null) dev.latency = pInfo.rtt;
    if (isNew || now - (dev.enriched_at || 0) > ENRICH_TTL) toEnrich.push([dev, upnpByIp[ip]]);
  }

  // Arricchimento SOLO per device nuovi o stale → cicli successivi molto più leggeri
  await mapLimit(toEnrich, 8, async ([dev, upnp]) => { await enrichDevice(dev, upnp); });

  // Marca offline + pruning solo dopo uno sweep ICMP completo (l'ARP da solo non è affidabile)
  if (markOffline) {
    for (const [key, dev] of registry) {
      if (!liveKeys.has(key)) {
        dev.is_active = false;
        if (now - new Date(dev.last_seen).getTime() > PRUNE_TTL) registry.delete(key);
      }
    }
  }

  publishDevices();
  saveState();
  return { newCount, enriched: toEnrich.length };
}

// Sweep ICMP completo (rumoroso) — eseguito di rado.
async function fullScan() {
  if (scanning) return;
  scanning = true;
  const t0 = Date.now();
  try {
    const ips = Array.from({ length: 254 }, (_, i) => `${local.base}.${i + 1}`);
    const live = new Set();
    const pingInfo = {};
    const ssdpPromise = ssdpDiscover(3000);
    const BATCH = 48;
    for (let i = 0; i < ips.length; i += BATCH) {
      const res = await Promise.all(ips.slice(i, i + BATCH).map(async (ip) => {
        const r = await ping(ip);
        if (r.alive) { pingInfo[ip] = r; return ip; }
        return null;
      }));
      res.forEach((ip) => ip && live.add(ip));
    }
    if (local.ip) live.add(local.ip);
    const arp = await arpTable();
    Object.keys(arp).forEach((ip) => { if (ip.startsWith(local.base + '.')) live.add(ip); });
    const ssdp = await ssdpPromise;
    const upnpByIp = {};
    await Promise.all(Object.entries(ssdp).map(async ([ip, info]) => {
      const desc = info.location ? await fetchUpnpDesc(info.location) : null;
      upnpByIp[ip] = { server: info.server, ...(desc || {}) };
    }));
    const { newCount, enriched } = await processLive(live, pingInfo, arp, upnpByIp, true);
    const active = devices.filter((d) => d.is_active).length;
    console.log(`✅ full ${active}/${devices.length} attivi · ${newCount} nuovi · ${enriched} arricchiti in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.error('Errore full scan:', e.message);
  } finally {
    scanning = false;
  }
}

// Ciclo leggero: legge solo la tabella ARP (nessun pacchetto extra in rete) → presenza silenziosa.
async function lightScan() {
  if (scanning) return;
  scanning = true;
  try {
    const arp = await arpTable();
    const live = new Set();
    Object.keys(arp).forEach((ip) => { if (ip.startsWith(local.base + '.')) live.add(ip); });
    if (local.ip) live.add(local.ip);
    await processLive(live, {}, arp, {}, false); // niente ping/SSDP, non marca offline
  } catch (e) {
    console.error('Errore light scan:', e.message);
  } finally {
    scanning = false;
  }
}

// Compatibilità: "Avvia Scansione" e codice esistente → sweep completo.
const scanNetwork = fullScan;

// Scheduler educato: light frequente (silenzioso) + full raro, con jitter anti-sincronizzazione.
function startScanScheduler(after) {
  const loopLight = async () => { await lightScan(); if (after) await after(); setTimeout(loopLight, jitter(LIGHT_INTERVAL)); };
  const loopFull = async () => { await fullScan(); if (after) await after(); setTimeout(loopFull, jitter(FULL_INTERVAL)); };
  setTimeout(loopLight, jitter(LIGHT_INTERVAL));
  setTimeout(loopFull, jitter(FULL_INTERVAL));
}

// ---- Monitoraggio TRAFFICO reale (contatori interfaccia di sistema) ----
async function readCounters() {
  if (isWin) {
    // netstat -e: righe in ordine fisso (Byte, Pacchetti unicast, Pacchetti non-unicast),
    // ognuna con 2 numeri (Ricevuti, Trasmessi). Parsing posizionale → indipendente dalla lingua.
    const out = await run('netstat -e');
    const rows = out.split(/\r?\n/)
      .map((l) => l.match(/^(.+?)\s+(\d+)\s+(\d+)\s*$/))
      .filter(Boolean)
      .map((m) => [Number(m[2]), Number(m[3])]);
    const [bytes = [0, 0], uni = [0, 0], non = [0, 0]] = rows;
    return { bytesIn: bytes[0], bytesOut: bytes[1], pktIn: uni[0] + non[0], pktOut: uni[1] + non[1] };
  }
  try {
    const data = readFileSync('/proc/net/dev', 'utf8');
    let bIn = 0, bOut = 0, pIn = 0, pOut = 0;
    for (const line of data.split('\n')) {
      const m = line.match(/^\s*([^:]+):\s*(.+)$/);
      if (!m || m[1].trim() === 'lo') continue;
      const f = m[2].trim().split(/\s+/).map(Number);
      bIn += f[0]; pIn += f[1]; bOut += f[8]; pOut += f[9];
    }
    return { bytesIn: bIn, bytesOut: bOut, pktIn: pIn, pktOut: pOut };
  } catch { return { bytesIn: 0, bytesOut: 0, pktIn: 0, pktOut: 0 }; }
}

async function sampleTraffic() {
  const c = await readCounters();
  const now = Date.now();
  if (lastCounters) {
    const dt = (now - lastCounters.t) / 1000;
    if (dt > 0) {
      traffic.push({
        time: new Date(now).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        download: +Math.max(0, (c.bytesIn - lastCounters.bytesIn) / dt / 1024).toFixed(1),  // KB/s
        upload: +Math.max(0, (c.bytesOut - lastCounters.bytesOut) / dt / 1024).toFixed(1),   // KB/s
        rxPps: Math.max(0, Math.round((c.pktIn - lastCounters.pktIn) / dt)),                 // pacchetti/s ricevuti
        txPps: Math.max(0, Math.round((c.pktOut - lastCounters.pktOut) / dt)),               // pacchetti/s inviati
      });
      while (traffic.length > 60) traffic.shift();
    }
  }
  lastCounters = { ...c, t: now };
}

// ---- CONNESSIONI ATTIVE (flussi reali da/verso questa macchina) ----
function splitAddr(a) {
  if (!a || a.includes('[')) return [null, null]; // salta IPv6
  const i = a.lastIndexOf(':');
  return i < 0 ? [a, null] : [a.slice(0, i), a.slice(i + 1)];
}
const isLocalAddr = (ip) => !ip || ip.startsWith('127.') || ip === '0.0.0.0' || ip === '*' || ip.startsWith('169.254') || ip.startsWith('224.');

async function reverseDnsT(ip) {
  return Promise.race([reverseDns(ip), new Promise((r) => setTimeout(() => r(null), 1500))]);
}

async function getConnections() {
  const out = await run(isWin ? 'netstat -ano' : "ss -tn state established 2>/dev/null || netstat -tn");
  const agg = new Map();
  for (const line of out.split(/\r?\n/)) {
    const p = line.trim().split(/\s+/);
    const proto = p[0];
    if (proto !== 'TCP' && proto !== 'UDP') continue;
    const state = proto === 'TCP' ? p[3] : 'ACTIVE';
    if (proto === 'TCP' && state !== 'ESTABLISHED') continue;
    const [lip, lport] = splitAddr(p[1]);
    const [rip, rport] = splitAddr(p[2]);
    if (!rip || !lip || isLocalAddr(rip) || rip === lip) continue;
    const service = svc(Number(rport), Number(lport));
    const key = `${rip}|${service}`;
    const e = agg.get(key) || {
      remoteIp: rip, remotePort: Number(rport), service, proto, count: 0,
      localIps: new Set(), scope: rip.startsWith(local.base + '.') ? 'LAN' : 'Internet',
    };
    e.count++; e.localIps.add(lip);
    agg.set(key, e);
  }
  const list = [...agg.values()].map((e) => ({ ...e, localIps: [...e.localIps] }));
  // reverse DNS delle destinazioni (con cache e timeout)
  await Promise.all([...new Set(list.map((e) => e.remoteIp))].map(async (ip) => {
    if (!dnsCache.has(ip)) dnsCache.set(ip, await reverseDnsT(ip));
  }));
  for (const e of list) {
    e.remoteHost = dnsCache.get(e.remoteIp) || null;
    const dev = devices.find((d) => d.ip_address === e.localIps[0]);
    e.fromHost = dev?.hostname || (e.localIps[0] === local.ip ? os.hostname() : e.localIps[0]);
  }
  list.sort((a, b) => b.count - a.count);
  return list.slice(0, 60);
}

// ---- HTTP API ----
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const startedAt = Date.now();

function localAgentDescriptor() {
  return {
    agent_id: AGENT_ID, agent_ip: local.ip || '127.0.0.1', agent_hostname: os.hostname(),
    agent_os: osName(), agent_version: AGENT_VERSION, subnet: `${local.base}.0/24`,
  };
}

// Lista agenti: scanner locale (embedded) + agenti remoti che hanno riportato.
function listAgents() {
  // auto-pulizia degli agenti remoti che non riportano da oltre 1 ora
  for (const [id, a] of remoteAgents) if (Date.now() - a.lastReport > 3_600_000) remoteAgents.delete(id);
  const out = [];
  if (!removedAgents.has(AGENT_ID)) {
    out.push({
      ...localAgentDescriptor(),
      status: scanning ? 'scanning' : 'online',
      device_count: devices.filter((d) => d.is_active).length,
      last_seen: new Date().toISOString(), registered_at: new Date(startedAt).toISOString(), local: true,
    });
  }
  for (const a of remoteAgents.values()) {
    if (removedAgents.has(a.info.agent_id)) continue;
    const online = Date.now() - a.lastReport < 90_000;
    out.push({
      ...a.info, status: online ? 'online' : 'offline',
      device_count: (a.devices || []).filter((d) => d.is_active).length,
      last_seen: new Date(a.lastReport).toISOString(),
      registered_at: new Date(a.registered_at || a.lastReport).toISOString(), local: false,
    });
  }
  return out;
}

// Dispositivi aggregati: locali + di tutti gli agenti remoti, dedup per (MAC|rete), con attribuzione.
function aggregatedDevices() {
  if (remoteAgents.size === 0) return devices; // caso comune: solo scanner locale
  const byKey = new Map();
  const add = (d, agentName, network) => {
    const key = deviceKey(d.mac_address, d.ip_address) + '|' + network;
    const ex = byKey.get(key);
    if (!ex || (d.open_ports?.length || 0) > (ex.open_ports?.length || 0)) byKey.set(key, { ...d, agent: agentName, network });
  };
  const localNet = `${local.base}.0/24`;
  for (const d of devices) add(d, os.hostname(), localNet);
  for (const a of remoteAgents.values()) {
    if (removedAgents.has(a.info.agent_id)) continue;
    for (const d of (a.devices || [])) add(d, a.info.agent_hostname || a.info.agent_id, a.info.subnet || 'remota');
  }
  const all = [...byKey.values()].sort((x, y) => ipKey(x.ip_address).localeCompare(ipKey(y.ip_address)));
  all.forEach((d, i) => (d.id = i + 1));
  return all;
}

// Arricchisce un device riportato da un agente remoto: vendor dall'OUI + risk score (lato server).
function enrichRemoteDevice(d) {
  if (d.mac_address && (!d.vendor || d.vendor === 'Unknown')) {
    d.vendor = isRandomMac(d.mac_address) ? 'MAC privato (randomizzato)' : (ouiVendor(d.mac_address) || 'Unknown');
  }
  if (!d.risk) d.risk = computeRisk(d);
  return d;
}

// Serve gli installer dell'agente (script + agente Python), con l'URL del server iniettato.
function serveInstaller(req, res, name) {
  const base = 'http://' + (req.headers.host || `${local.ip}:${PORT}`);
  const send = (content, type) => {
    res.writeHead(200, { 'Content-Type': type, 'Content-Disposition': `attachment; filename="${name}"`, 'Access-Control-Allow-Origin': '*' });
    res.end(content);
  };
  if (name === 'networkscope_agent.py') {
    try { return send(readFileSync(new URL('./agent/networkscope_agent.py', import.meta.url)), 'text/x-python; charset=utf-8'); }
    catch { res.writeHead(404); return res.end('agent non trovato'); }
  }
  if (name === 'install_windows.bat') {
    const bat = [
      '@echo off', 'setlocal', `set "SERVER=${base}"`,
      'echo === NetworkScope Agent ===',
      'where python >nul 2>nul || (echo [!] Python non trovato. Installalo da https://python.org e riprova. ^& pause ^& exit /b 1)',
      'echo Scarico l\'agent da %SERVER% ...',
      'curl -L -o "%TEMP%\\networkscope_agent.py" "%SERVER%/static/networkscope_agent.py" || (echo [!] Download fallito ^& pause ^& exit /b 1)',
      'echo Avvio agent (Ctrl+C per fermare)...',
      'python "%TEMP%\\networkscope_agent.py" "%SERVER%"', 'pause',
    ].join('\r\n');
    return send(bat, 'application/octet-stream');
  }
  if (name === 'install_linux.sh') {
    const sh = [
      '#!/bin/bash', `SERVER="${base}"`,
      'echo "=== NetworkScope Agent ==="',
      'command -v python3 >/dev/null 2>&1 || { echo "[!] Installa python3"; exit 1; }',
      'echo "Scarico l\'agent da $SERVER ..."',
      'curl -fsSL -o /tmp/networkscope_agent.py "$SERVER/static/networkscope_agent.py" || { echo "[!] Download fallito"; exit 1; }',
      'echo "Avvio agent (Ctrl+C per fermare)..."',
      'python3 /tmp/networkscope_agent.py "$SERVER"',
    ].join('\n');
    return send(sh, 'application/x-sh');
  }
  res.writeHead(404); res.end('not found');
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.end();

  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
  const parts = pathname.split('/').filter(Boolean);

  // Download installer/agent (i pulsanti "Scarica Installer")
  if (req.method === 'GET' && parts[0] === 'static' && parts[1]) return serveInstaller(req, res, parts[1]);

  if (req.method === 'GET' && pathname === '/api/v1/devices') return json(res, 200, aggregatedDevices());

  if (req.method === 'GET' && pathname === '/api/v1/connections') {
    return json(res, 200, await getConnections());
  }

  if (req.method === 'GET' && pathname === '/api/v1/traffic') {
    const current = traffic[traffic.length - 1] || { download: 0, upload: 0, rxPps: 0, txPps: 0 };
    return json(res, 200, {
      history: traffic,
      current,
      totals: lastCounters
        ? { bytesIn: lastCounters.bytesIn, bytesOut: lastCounters.bytesOut, pktIn: lastCounters.pktIn, pktOut: lastCounters.pktOut }
        : null,
    });
  }

  if (req.method === 'GET' && parts[2] === 'devices' && parts[3]) {
    const d = devices.find((x) => x.ip_address === parts[3]);
    return d ? json(res, 200, d) : json(res, 404, { error: 'not found' });
  }

  if (req.method === 'PATCH' && parts[2] === 'devices' && parts[3]) {
    const d = devices.find((x) => x.ip_address === parts[3]);
    if (!d) return json(res, 404, { error: 'not found' });
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => { try { Object.assign(d, JSON.parse(raw || '{}')); } catch {} json(res, 200, d); });
    return;
  }

  if (req.method === 'POST' && parts[2] === 'scan' && parts[3] === 'network') {
    scanNetwork();
    return json(res, 200, { message: 'Scansione di rete avviata', task_id: `net-${Date.now()}` });
  }

  if (req.method === 'POST' && parts[2] === 'scan' && parts[3] === 'ports' && parts[4]) {
    const ip = parts[4];
    json(res, 200, { message: `Scansione porte di ${ip} avviata`, task_id: `ports-${Date.now()}` });
    scanPortsList(ip, DEEP_PORTS).then(async (ports) => {
      const d = devices.find((x) => x.ip_address === ip);
      if (d) {
        d.open_ports = ports;
        d.banners = { ...(d.banners || {}), ...(await grabBanners(ip, ports)) };
        Object.assign(d, identify(d));
        d.risk = computeRisk(d);
        d.enriched_at = Date.now();
        saveState();
      }
      console.log(`🔓 ${ip}: porte → ${ports.join(', ') || 'nessuna'}`);
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/v1/agents') {
    return json(res, 200, { agents: listAgents() });
  }

  // Un agente remoto si registra
  if (req.method === 'POST' && pathname === '/api/v1/agents/register') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        const info = JSON.parse(raw || '{}');
        if (info.agent_id) {
          const ex = remoteAgents.get(info.agent_id);
          remoteAgents.set(info.agent_id, { info, devices: ex?.devices || [], traffic: ex?.traffic || null, connections: ex?.connections || [], lastReport: Date.now(), registered_at: ex?.registered_at || Date.now() });
          removedAgents.delete(info.agent_id);
          console.log(`🔗 Agente registrato: ${info.agent_hostname} (${info.subnet})`);
        }
      } catch {}
      json(res, 200, { message: 'registrato' });
    });
    return;
  }

  // Un agente remoto invia il suo report (dispositivi, traffico, connessioni)
  if (req.method === 'POST' && parts[2] === 'agents' && parts[4] === 'report' && parts[3]) {
    const id = parts[3];
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        const body = JSON.parse(raw || '{}');
        const ex = remoteAgents.get(id);
        remoteAgents.set(id, {
          info: body.info || ex?.info || { agent_id: id },
          devices: (body.devices || []).map(enrichRemoteDevice), traffic: body.traffic || null, connections: body.connections || [],
          lastReport: Date.now(), registered_at: ex?.registered_at || Date.now(),
        });
        removedAgents.delete(id);
      } catch {}
      json(res, 200, { message: 'ok' });
    });
    return;
  }

  if (req.method === 'DELETE' && parts[2] === 'agents' && parts[3]) {
    removedAgents.add(parts[3]);
    remoteAgents.delete(parts[3]);
    saveState();
    return json(res, 200, { message: 'agente rimosso' });
  }

  json(res, 404, { error: 'rotta non gestita' });
});

function startupLog() {
  console.log(`   Subnet: ${local.base}.0/24 · host: ${local.ip} · OUI: ${Object.keys(OUI).length}${OUI_DB ? ` + DB IEEE ${Object.keys(OUI_DB).length}` : ' (esegui npm run oui per il DB completo)'} · cache: ${vendorCache.size}`);
}

// Invio del report al server remoto (modalità agente)
async function reportToServer() {
  const connections = await getConnections();
  const current = traffic[traffic.length - 1] || { download: 0, upload: 0, rxPps: 0, txPps: 0 };
  await postJson(`${AGENT_TARGET}/api/v1/agents/${AGENT_ID}/report`, {
    info: localAgentDescriptor(),
    devices,
    traffic: { history: traffic, current, totals: lastCounters },
    connections,
  });
}

if (AGENT_MODE) {
  // ── MODALITÀ AGENTE: scansiona la rete locale e riporta a un server remoto ──
  console.log(`🛰️  NetworkScope AGENTE ${AGENT_ID} → riporta a ${AGENT_TARGET}`);
  startupLog();
  loadState();
  postJson(`${AGENT_TARGET}/api/v1/agents/register`, localAgentDescriptor());
  fullScan().then(reportToServer);
  startScanScheduler(reportToServer);
  sampleTraffic();
  setInterval(sampleTraffic, 2000);
} else {
  // ── MODALITÀ SERVER: collector + API + scanner locale embedded ──
  server.listen(PORT, () => {
    console.log(`🛰️  NetworkScope server su http://localhost:${PORT}  (agente locale ${AGENT_ID})`);
    startupLog();
    loadState();
    fullScan();
    startScanScheduler();                 // light (silenzioso) frequente + full raro, con jitter
    sampleTraffic();
    setInterval(sampleTraffic, 2000);     // throughput live ogni 2s
  });
}
