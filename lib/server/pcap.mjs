// 📡 Cattura pacchetti REALE (Npcap su Windows / libpcap su Linux/macOS).
// Vede i BYTE effettivi per flusso — non solo la socket table — colmando il gap architetturale.
// Dipendenza NATIVA opzionale `cap` (richiede Npcap/libpcap + privilegi). Se assente, il modulo
// riporta available:false con il motivo e l'app continua in modalità socket-table.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const state = {
  available: false,   // libreria `cap` caricabile
  active: false,      // cattura in corso
  device: null,
  packets: 0,
  bytes: 0,
  reason: 'non avviata',
};

// flow key `${remoteIp}:${remotePort}` → { bytes, packets, sample, proto, at }
const flows = new Map();
let capInstance = null;

function keyOf(ip, port) { return `${ip}:${port}`; }

// Avvia la cattura. `localIps` = insiemi degli IP locali (per distinguere remoto/locale).
// `onFlow(flow)` opzionale: callback per DPI sul primo payload.
export function startCapture({ localIps = new Set(), onFlow } = {}) {
  if (state.active) return state;
  let Cap, decoders;
  try {
    ({ Cap, decoders } = require('cap'));
  } catch {
    state.available = false;
    state.reason = "libreria 'cap' non installata (npm i cap) — richiede Npcap/libpcap";
    return state;
  }
  state.available = true;
  try {
    const PROTOCOL = decoders.PROTOCOL;
    const c = new Cap();
    const device = Cap.findDevice();
    if (!device) { state.reason = 'nessun dispositivo di cattura trovato'; return state; }
    const buffer = Buffer.alloc(65535);
    const linkType = c.open(device, 'ip', 10 * 1024 * 1024, buffer);
    if (c.setMinBytes) c.setMinBytes(0);
    capInstance = c;
    state.active = true;
    state.device = device;
    state.reason = 'cattura attiva';

    c.on('packet', (nbytes) => {
      try {
        state.packets++; state.bytes += nbytes;
        if (linkType !== 'ETHERNET') return;
        let ret = decoders.Ethernet(buffer);
        if (ret.info.type !== PROTOCOL.ETHERNET.IPV4) return;
        ret = decoders.IPV4(buffer, ret.offset);
        const src = ret.info.srcaddr, dst = ret.info.dstaddr;
        let sport = 0, dport = 0, payloadOff = ret.offset, proto = 'ip';
        if (ret.info.protocol === PROTOCOL.IP.TCP) {
          const tcp = decoders.TCP(buffer, ret.offset); sport = tcp.info.srcport; dport = tcp.info.dstport; payloadOff = tcp.offset; proto = 'tcp';
        } else if (ret.info.protocol === PROTOCOL.IP.UDP) {
          const udp = decoders.UDP(buffer, ret.offset); sport = udp.info.srcport; dport = udp.info.dstport; payloadOff = udp.offset; proto = 'udp';
        } else return;
        // endpoint remoto = quello non locale
        const srcLocal = localIps.has(src);
        const remoteIp = srcLocal ? dst : src;
        const remotePort = srcLocal ? dport : sport;
        const k = keyOf(remoteIp, remotePort);
        let f = flows.get(k);
        if (!f) { f = { remoteIp, remotePort, proto, bytes: 0, packets: 0, sample: null, at: Date.now() }; flows.set(k, f); }
        f.bytes += nbytes; f.packets++;
        if (!f.sample && payloadOff < nbytes) {
          f.sample = Buffer.from(buffer.slice(payloadOff, Math.min(nbytes, payloadOff + 64)));
          if (onFlow) { try { onFlow(f); } catch { /* ignore */ } }
        }
      } catch { /* pacchetto malformato: ignora */ }
    });
  } catch (e) {
    state.active = false;
    state.reason = `errore apertura cattura: ${e && e.message ? e.message : 'privilegi mancanti?'}`;
  }
  return state;
}

export function stopCapture() {
  try { if (capInstance) capInstance.close(); } catch { /* ignore */ }
  capInstance = null; state.active = false; state.reason = 'ferma';
}

// Byte reali osservati verso un endpoint remoto (per arricchire le connessioni).
export function flowBytesFor(remoteIp, remotePort) {
  const f = flows.get(keyOf(remoteIp, remotePort));
  return f ? { bytes: f.bytes, packets: f.packets, sample: f.sample } : null;
}

export function getFlows() { return [...flows.values()]; }

export function pcapStatus() {
  return {
    available: state.available,
    active: state.active,
    device: state.device,
    packets: state.packets,
    bytes: state.bytes,
    flows: flows.size,
    reason: state.reason,
  };
}
