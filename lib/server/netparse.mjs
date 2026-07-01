// Parsing e classificazione di rete — funzioni pure estratte da server.mjs (testabili).

// TTL ricevuto → famiglia OS (su LAN gli hop sono ~0, quindi TTL ≈ valore iniziale).
export function ttlOs(ttl) {
  if (!ttl) return null;
  if (ttl <= 64) return 'Linux/Unix';     // anche Android/iOS/macOS
  if (ttl <= 128) return 'Windows';
  return 'Embedded/Network';               // router, stampanti, IoT (TTL 255)
}

// MAC localmente amministrato (randomizzato per privacy) → tipico di iPhone/Android.
export function isRandomMac(mac) {
  if (!mac) return false;
  const first = parseInt(mac.slice(0, 2), 16);
  return Number.isFinite(first) && (first & 0x02) === 0x02 && (first & 0x01) === 0x00;
}

// IP privato/locale (RFC1918 + loopback + link-local). Usato per limitare il proxy terminale alla LAN.
export function isPrivateIp(ip) {
  return /^10\./.test(ip) || /^192\.168\./.test(ip) || /^127\./.test(ip) || /^169\.254\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}

// Parser dell'output di `arp -a` → mappa { ip: MAC }. Scarta broadcast e multicast.
/**
 * @param {string} [text]
 * @returns {Record<string, string>}
 */
export function parseArpTable(text) {
  const map = {};
  const re = /(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f]{2}(?:[-:][0-9a-f]{2}){5})/gi;
  let m;
  while ((m = re.exec(text || ''))) {
    const mac = m[2].replace(/-/g, ':').toUpperCase();
    if (mac !== 'FF:FF:FF:FF:FF:FF' && !mac.startsWith('01:00:5E') && !mac.startsWith('33:33')) map[m[1]] = mac;
  }
  return map;
}

// Prefisso OUI normalizzato (prime 6 cifre esadecimali del MAC).
export function ouiPrefix(mac) {
  if (!mac) return null;
  return mac.replace(/[^0-9a-f]/gi, '').toUpperCase().slice(0, 6);
}

// Lookup vendor cercando il prefisso OUI in una o più tabelle (inline corta → DB IEEE completo).
export function ouiVendor(mac, ...dbs) {
  const p = ouiPrefix(mac);
  if (!p) return null;
  for (const db of dbs) if (db && db[p]) return db[p];
  return null;
}
