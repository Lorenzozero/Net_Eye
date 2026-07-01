// 🔬 Deep Packet Inspection / classificazione protocolli e minacce.
// Due livelli:
//   1) per-porta: 6000+ servizi dal registro IANA + DB di porte trojan/worm note;
//   2) per-payload (quando la cattura pacchetti fornisce i byte reali): firme "magic bytes".
import { readFileSync } from 'node:fs';

// --- Dataset IANA (porta → servizio). 6000+ voci. Rigenerabile con: node scripts/build-iana.mjs ---
let IANA = {};
try {
  IANA = JSON.parse(readFileSync(new URL('../../data/iana-ports.json', import.meta.url), 'utf8'));
} catch { /* dataset assente: si usa comunque il set integrato sotto */ }

// Servizi comuni con nomi "amichevoli" (prevalgono sul nome tecnico IANA nella UI).
const COMMON = {
  20: 'FTP-DATA', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 67: 'DHCP', 68: 'DHCP',
  80: 'HTTP', 110: 'POP3', 123: 'NTP', 135: 'RPC', 137: 'NetBIOS', 138: 'NetBIOS', 139: 'NetBIOS',
  143: 'IMAP', 161: 'SNMP', 389: 'LDAP', 443: 'HTTPS', 445: 'SMB', 465: 'SMTPS', 514: 'Syslog',
  587: 'SMTP', 636: 'LDAPS', 993: 'IMAPS', 995: 'POP3S', 1080: 'SOCKS', 1194: 'OpenVPN',
  1433: 'MSSQL', 1521: 'Oracle', 1883: 'MQTT', 2049: 'NFS', 3306: 'MySQL', 3389: 'RDP',
  5060: 'SIP', 5432: 'PostgreSQL', 5900: 'VNC', 5985: 'WinRM', 6379: 'Redis', 8080: 'HTTP-Proxy',
  8443: 'HTTPS-Alt', 9000: 'HTTP-Alt', 9200: 'Elasticsearch', 11211: 'Memcached', 27017: 'MongoDB',
  51820: 'WireGuard',
};

// --- Porte associate a trojan/backdoor/worm noti (rilevamento DIFENSIVO). ---
// Fonte: database storici di trojan (Sub7, NetBus, Back Orifice…) e worm.
const THREATS = {
  31: { n: 'Master Paradise', k: 'trojan' }, 121: { n: 'JammerKillah', k: 'trojan' },
  456: { n: 'Hackers Paradise', k: 'trojan' }, 555: { n: 'Phase Zero', k: 'trojan' },
  666: { n: 'Attack FTP / Satanz', k: 'trojan' }, 1001: { n: 'Silencer', k: 'trojan' },
  1170: { n: 'Psyber Stream', k: 'trojan' }, 1234: { n: 'Ultors', k: 'trojan' },
  1243: { n: 'SubSeven', k: 'trojan' }, 1245: { n: 'VooDoo Doll', k: 'trojan' },
  1492: { n: 'FTP99CMP', k: 'trojan' }, 1600: { n: 'Shivka-Burka', k: 'trojan' },
  1807: { n: 'SpySender', k: 'trojan' }, 1981: { n: 'Shockrave', k: 'trojan' },
  1999: { n: 'BackDoor', k: 'trojan' }, 2001: { n: 'Trojan Cow', k: 'trojan' },
  2023: { n: 'Ripper', k: 'trojan' }, 2115: { n: 'Bugs', k: 'trojan' },
  2140: { n: 'Deep Throat', k: 'trojan' }, 2222: { n: 'Rootshell', k: 'backdoor' },
  2301: { n: 'CompuServe', k: 'trojan' }, 2565: { n: 'Striker', k: 'trojan' },
  2583: { n: 'WinCrash', k: 'trojan' }, 2801: { n: 'Phineas', k: 'trojan' },
  3024: { n: 'WinCrash', k: 'trojan' }, 3129: { n: 'Masters Paradise', k: 'trojan' },
  3150: { n: 'Deep Throat', k: 'trojan' }, 3700: { n: 'Portal of Doom', k: 'trojan' },
  4092: { n: 'WinCrash', k: 'trojan' }, 4590: { n: 'ICQTrojan', k: 'trojan' },
  5000: { n: 'Sockets de Troie', k: 'trojan' }, 5001: { n: 'Sockets de Troie', k: 'trojan' },
  5321: { n: 'Firehotcker', k: 'trojan' }, 5400: { n: 'Blade Runner', k: 'trojan' },
  5401: { n: 'Blade Runner', k: 'trojan' }, 5569: { n: 'Robo-Hack', k: 'trojan' },
  5742: { n: 'WinCrash', k: 'trojan' }, 6670: { n: 'DeepThroat', k: 'trojan' },
  6711: { n: 'SubSeven', k: 'trojan' }, 6712: { n: 'SubSeven', k: 'trojan' },
  6713: { n: 'SubSeven', k: 'trojan' }, 6776: { n: 'SubSeven', k: 'trojan' },
  6939: { n: 'Indoctrination', k: 'trojan' }, 6969: { n: 'GateCrasher / Priority', k: 'trojan' },
  7000: { n: 'Remote Grab / SubSeven', k: 'trojan' }, 7300: { n: 'NetMonitor', k: 'trojan' },
  7789: { n: 'ICKiller', k: 'trojan' }, 9872: { n: 'Portal of Doom', k: 'trojan' },
  9989: { n: 'iNi-Killer', k: 'trojan' }, 10067: { n: 'Portal of Doom', k: 'trojan' },
  10167: { n: 'Portal of Doom', k: 'trojan' }, 10520: { n: 'Acid Shivers', k: 'trojan' },
  11000: { n: 'Senna Spy', k: 'trojan' }, 11223: { n: 'Progenic', k: 'trojan' },
  12223: { n: 'Hack99 KeyLogger', k: 'keylogger' }, 12345: { n: 'NetBus', k: 'trojan' },
  12346: { n: 'NetBus', k: 'trojan' }, 12361: { n: 'Whack-a-mole', k: 'trojan' },
  16969: { n: 'Priority', k: 'trojan' }, 20001: { n: 'Millennium', k: 'trojan' },
  20034: { n: 'NetBus 2 Pro', k: 'trojan' }, 21544: { n: 'GirlFriend', k: 'trojan' },
  22222: { n: 'Prosiak', k: 'trojan' }, 23456: { n: 'Evil FTP / Ugly FTP', k: 'trojan' },
  26274: { n: 'Delta Source', k: 'trojan' }, 27374: { n: 'SubSeven 2.x', k: 'trojan' },
  30100: { n: 'NetSphere', k: 'trojan' }, 30303: { n: 'Sockets de Troie', k: 'trojan' },
  31337: { n: 'Back Orifice', k: 'backdoor' }, 31338: { n: 'Back Orifice / DeepBO', k: 'backdoor' },
  31339: { n: 'NetSpy DK', k: 'trojan' }, 31666: { n: 'BOWhack', k: 'backdoor' },
  31785: { n: 'Hack Attack', k: 'trojan' }, 33333: { n: 'Prosiak', k: 'trojan' },
  33911: { n: 'Spirit 2001a', k: 'trojan' }, 40412: { n: 'The Spy', k: 'trojan' },
  40421: { n: 'Masters Paradise', k: 'trojan' }, 40423: { n: 'Masters Paradise', k: 'trojan' },
  47262: { n: 'Delta Source', k: 'trojan' }, 50505: { n: 'Sockets de Troie', k: 'trojan' },
  50766: { n: 'Fore / Schwindler', k: 'trojan' }, 54321: { n: 'SchoolBus / BO2K', k: 'backdoor' },
  61466: { n: 'Telecommando', k: 'trojan' }, 65000: { n: 'Devil', k: 'trojan' },
  4444: { n: 'Metasploit / Blaster worm', k: 'worm' }, 5554: { n: 'Sasser worm FTP', k: 'worm' },
  9996: { n: 'Sasser worm', k: 'worm' }, 3127: { n: 'MyDoom backdoor', k: 'worm' },
  1434: { n: 'SQL Slammer worm', k: 'worm' }, 135135: { n: 'n/a', k: 'trojan' },
};

// --- Firme sui payload reali (magic bytes) — usate solo quando la cattura pacchetti fornisce i byte. ---
function matchPayload(buf) {
  if (!buf || !buf.length) return null;
  const b = buf;
  const ascii = (n) => b.slice(0, n).toString('latin1');
  const head = ascii(Math.min(16, b.length));
  if (/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) /.test(head)) return { proto: 'HTTP', cat: 'web' };
  if (/^HTTP\/1\./.test(head)) return { proto: 'HTTP', cat: 'web' };
  if (b[0] === 0x16 && b[1] === 0x03) return { proto: 'TLS', cat: 'crypto' }; // TLS handshake
  if (/^SSH-/.test(head)) return { proto: 'SSH', cat: 'remote' };
  if (b[0] === 0x00 && b.length > 4 && b[4] === 0x17 && b[5] === 0xfe) return { proto: 'RDP', cat: 'remote' };
  if (/^220[ -]/.test(head)) return { proto: 'FTP/SMTP', cat: 'mail/file' }; // banner 220
  if (b.length > 2 && b[2] === 0x01 && b[3] === 0x00) return { proto: 'DNS', cat: 'name' };
  if (head.startsWith('\xffSMB') || (b[0] === 0xfe && ascii(4) === '\xfeSMB')) return { proto: 'SMB', cat: 'file' };
  if (/^\*|^\$\d|^\+OK|^-ERR/.test(head)) return { proto: 'Redis/POP3', cat: 'db/mail' };
  return null;
}

// Classifica un flusso. `port`/`localPort` = porte remota/locale; `payload` = Buffer opzionale (da pcap).
/**
 * @param {{ port?: number|string, localPort?: number|string, proto?: string, payload?: Buffer|null }} [opts]
 */
export function classifyFlow(opts = {}) {
  const { port, localPort, payload } = opts;
  const p = Number(port), lp = Number(localPort);
  // 1) minaccia nota per porta
  const threat = THREATS[p] || THREATS[lp] || null;
  // 2) firma sul payload reale (priorità se disponibile)
  const sig = matchPayload(payload);
  // 3) servizio per porta: COMMON → IANA(6000+)
  const known = (n) => COMMON[n] || (IANA[n] && IANA[n].n) || null;
  const service = (sig && sig.proto) || known(p) || known(lp) || `porta ${p || lp || '?'}`;
  const ianaDesc = (IANA[p] && IANA[p].d) || (IANA[lp] && IANA[lp].d) || null;
  return {
    service,
    description: ianaDesc,
    category: sig ? sig.cat : null,
    inspected: !!sig,                 // true = riconosciuto dal payload reale
    threat: threat ? { name: threat.n, kind: threat.k } : null,
  };
}

// Stato del motore per l'evidenza in frontend.
export function dpiStatus() {
  return {
    services: Object.keys(IANA).length || Object.keys(COMMON).length,
    threats: Object.keys(THREATS).length,
    payloadSignatures: 9,
    ianaLoaded: Object.keys(IANA).length > 0,
  };
}

export const _internal = { matchPayload, THREATS, COMMON };
