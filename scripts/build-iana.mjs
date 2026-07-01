// Converte il registro IANA service-names-port-numbers.csv in un JSON compatto
// (porta → { n: nome, d: descrizione, p: protocollo }) usato dal motore DPI.
// Uso: node scripts/build-iana.mjs <input.csv>  (default: /tmp/iana.csv)
import { readFileSync, writeFileSync } from 'node:fs';

const input = process.argv[2] || '/tmp/iana.csv';
const raw = readFileSync(input, 'utf8').split(/\r?\n/);

function cells(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const map = {};
for (let i = 1; i < raw.length; i++) {
  if (!raw[i]) continue;
  const c = cells(raw[i]);
  const name = (c[0] || '').trim();
  const port = (c[1] || '').trim();
  const proto = (c[2] || '').trim();
  const desc = (c[3] || '').trim();
  if (!name || !port || port.includes('-')) continue; // salta range e voci senza nome
  if (!map[port]) map[port] = desc ? { n: name, d: desc, p: proto } : { n: name, p: proto };
}

const outFile = new URL('../data/iana-ports.json', import.meta.url);
writeFileSync(outFile, JSON.stringify(map));
console.log('porte con servizio nominato:', Object.keys(map).length);
console.log('esempi:', JSON.stringify(map['80']), JSON.stringify(map['443']), JSON.stringify(map['3389']));
