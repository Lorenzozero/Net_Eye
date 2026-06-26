// Scarica il database OUI IEEE completo e lo converte in JSON compatto.
// Uso:  node scripts/fetch-oui.mjs   →  genera oui-db.json (~30k vendor)
// Dopo, il backend risolve i vendor al 100% anche OFFLINE.
import https from 'node:https';
import { writeFileSync } from 'node:fs';

const SOURCES = [
  'https://standards-oui.ieee.org/oui/oui.csv',
  'https://raw.githubusercontent.com/wireshark/wireshark/master/manuf', // fallback formato manuf
];

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'NetworkScope/2' }, timeout: 30000 }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
        res.resume();
        return resolve(get(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} su ${url}`)); }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}

function parseCsv(text) {
  const db = {};
  // formato IEEE: Registry,Assignment,Organization Name,Organization Address
  const re = /^MA-[LMS],([0-9A-F]{6}),(?:"([^"]*)"|([^,]*)),/gm;
  let m;
  while ((m = re.exec(text))) {
    const prefix = m[1].toUpperCase();
    const org = (m[2] || m[3] || '').trim();
    if (org) db[prefix] = org;
  }
  return db;
}

function parseManuf(text) {
  const db = {};
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2})\s+(\S+)(?:\s+(.+))?/);
    if (!m) continue;
    const prefix = m[1].replace(/:/g, '').toUpperCase();
    const org = (m[3] || m[2] || '').trim();
    if (prefix.length === 6 && org) db[prefix] = org;
  }
  return db;
}

(async () => {
  let db = {};
  for (const url of SOURCES) {
    try {
      console.log(`⬇️  Scarico ${url} ...`);
      const text = await get(url);
      db = url.endsWith('.csv') ? parseCsv(text) : parseManuf(text);
      if (Object.keys(db).length > 1000) break;
    } catch (e) {
      console.warn(`   fallito: ${e.message}`);
    }
  }
  const n = Object.keys(db).length;
  if (n < 1000) { console.error('❌ Database OUI non scaricato (controlla la connessione).'); process.exit(1); }
  writeFileSync(new URL('../oui-db.json', import.meta.url), JSON.stringify(db));
  console.log(`✅ oui-db.json generato con ${n} vendor. Riavvia il backend per usarlo.`);
})();
