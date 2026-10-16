// Gestione del Metodo 2 (ARP Redirection / MITM) dalla GUI.
// Esegue scripts/arp_redirect.sh come processo figlio (spawn con argomenti separati,
// MAI una stringa di shell interpolata: zero rischio command-injection sugli IP).
//
// Sicurezza:
//   - Richiede root (CAP_NET_ADMIN/NET_RAW) — nel container gira già come root.
//   - Un solo MITM attivo per volta.
//   - Stop automatico di sicurezza dopo MAX_DURATION_MS: un MITM dimenticato attivo
//     non deve restare acceso indefinitamente.
//   - Lo stop manda SIGINT (non SIGKILL): fa scattare il trap dello script, che
//     rimuove le regole iptables e disabilita l'IP forwarding prima di uscire.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(new URL('../../scripts/arp_redirect.sh', import.meta.url));
const MAX_DURATION_MS = 20 * 60 * 1000; // 20 minuti

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
function isValidIpv4(ip) {
  if (typeof ip !== 'string' || !IPV4_RE.test(ip)) return false;
  return ip.split('.').every((o) => Number(o) >= 0 && Number(o) <= 255);
}

let current = null; // { proc, victimIp, routerIp, startedAt, autoStopTimer, log: [] }

export function mitmStatus() {
  if (!current) return { active: false };
  return {
    active: true,
    victimIp: current.victimIp,
    routerIp: current.routerIp,
    startedAt: current.startedAt,
    expiresAt: current.startedAt + MAX_DURATION_MS,
  };
}

export function startMitm(victimIp, routerIp) {
  if (current) return { ok: false, error: 'un MITM è già attivo — fermalo prima di avviarne un altro' };
  if (!isValidIpv4(victimIp) || !isValidIpv4(routerIp)) {
    return { ok: false, error: 'victimIp/routerIp devono essere indirizzi IPv4 validi' };
  }
  if (victimIp === routerIp) return { ok: false, error: 'victimIp e routerIp non possono coincidere' };
  if (process.getuid && process.getuid() !== 0) {
    return { ok: false, error: 'il backend non gira come root: servono CAP_NET_ADMIN/NET_RAW (vedi docker-compose.yml)' };
  }

  const proc = spawn('bash', [SCRIPT_PATH, victimIp, routerIp], { stdio: ['ignore', 'pipe', 'pipe'] });
  const log = [];
  const pushLog = (buf) => { log.push(buf.toString()); if (log.length > 200) log.shift(); };
  proc.stdout.on('data', pushLog);
  proc.stderr.on('data', pushLog);

  const autoStopTimer = setTimeout(() => {
    console.log(`[mitm] stop automatico di sicurezza dopo ${MAX_DURATION_MS / 60000} minuti`);
    stopMitm();
  }, MAX_DURATION_MS);

  proc.on('exit', () => {
    clearTimeout(autoStopTimer);
    current = null;
  });

  current = { proc, victimIp, routerIp, startedAt: Date.now(), autoStopTimer, log };
  return { ok: true, ...mitmStatus() };
}

export function stopMitm() {
  if (!current) return { ok: false, error: 'nessun MITM attivo' };
  clearTimeout(current.autoStopTimer);
  current.proc.kill('SIGINT'); // fa scattare il cleanup (trap) nello script
  // Se non si ferma entro 5s (non dovrebbe succedere), forza la chiusura.
  const pid = current.proc.pid;
  setTimeout(() => { try { process.kill(pid, 'SIGKILL'); } catch { /* già terminato */ } }, 5000);
  return { ok: true };
}

export function mitmLog() {
  return current ? current.log.join('') : '';
}
