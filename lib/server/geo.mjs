// 🌍 Geolocalizzazione + ASN.
// Provider preferito: MaxMind GeoLite2 locale (data/GeoLite2-City.mmdb + GeoLite2-ASN.mmdb),
// più affidabile e senza inviare IP a terzi. Fallback: ip-api.com con coda a rate-limit + backoff
// esponenziale (evita di saturare il free tier ~45 req/min a cold start con molti agenti).
import http from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cache = new Map();          // ip → info | null
let cityReader = null, asnReader = null, mmdbTried = false;

// Coda ip-api
const queue = [];
let processing = false;
let lastReqAt = 0;
let backoff = 0;                  // ms extra dopo un rate-limit
const MIN_INTERVAL = 1400;        // ~42 richieste/min < limite free tier

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Backoff esponenziale (funzione pura, testabile): raddoppia su rate-limit, decresce gradualmente.
export function computeBackoff(current, rateLimited) {
  if (rateLimited) return Math.min(current ? current * 2 : 5000, 60000);
  return Math.max(0, current - 500);
}

// Tenta di aprire i database MaxMind locali (dipendenza opzionale `maxmind`).
export async function initGeo() {
  if (mmdbTried) return geoStatus();
  mmdbTried = true;
  try {
    const cityPath = fileURLToPath(new URL('../../data/GeoLite2-City.mmdb', import.meta.url));
    if (!existsSync(cityPath)) return geoStatus();
    const maxmind = await import('maxmind').catch(() => null);
    if (!maxmind) return geoStatus();
    const open = maxmind.open || (maxmind.default && maxmind.default.open);
    cityReader = await open(cityPath);
    const asnPath = fileURLToPath(new URL('../../data/GeoLite2-ASN.mmdb', import.meta.url));
    if (existsSync(asnPath)) { try { asnReader = await open(asnPath); } catch { /* no asn db */ } }
  } catch { cityReader = null; asnReader = null; }
  return geoStatus();
}

function fromMaxmind(ip) {
  try {
    const c = cityReader.get(ip);
    if (!c) return null;
    const a = asnReader ? asnReader.get(ip) : null;
    return {
      org: (a && a.autonomous_system_organization) || null,
      asn: a && a.autonomous_system_number ? `AS${a.autonomous_system_number}` : null,
      country: c.country && c.country.names && c.country.names.en || null,
      countryCode: c.country && c.country.iso_code || null,
      city: c.city && c.city.names && c.city.names.en || null,
      lat: c.location && typeof c.location.latitude === 'number' ? c.location.latitude : null,
      lon: c.location && typeof c.location.longitude === 'number' ? c.location.longitude : null,
      source: 'maxmind',
    };
  } catch { return null; }
}

function ipApiLookup(ip) {
  return new Promise((resolve) => {
    try {
      const req = http.get(`http://ip-api.com/json/${ip}?fields=status,message,org,isp,as,country,countryCode,city,lat,lon`, { timeout: 3000 }, (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => {
          if (res.statusCode === 429) return resolve({ _rateLimited: true });
          try {
            const j = JSON.parse(b);
            if (j.status !== 'success') return resolve(j.message === 'too many requests' ? { _rateLimited: true } : null);
            const asMatch = (j.as || '').match(/^AS(\d+)\s*(.*)$/);
            resolve({
              org: j.org || j.isp || (asMatch ? asMatch[2] : null) || null,
              asn: asMatch ? `AS${asMatch[1]}` : null,
              country: j.country || null, countryCode: j.countryCode || null, city: j.city || null,
              lat: typeof j.lat === 'number' ? j.lat : null, lon: typeof j.lon === 'number' ? j.lon : null,
              source: 'ip-api',
            });
          } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch { resolve(null); }
  });
}

async function drain() {
  if (processing) return;
  processing = true;
  while (queue.length) {
    const job = queue.shift();
    if (cache.has(job.ip)) { job.resolve(cache.get(job.ip)); continue; }
    const wait = Math.max(0, lastReqAt + MIN_INTERVAL + backoff - Date.now());
    if (wait) await sleep(wait);
    lastReqAt = Date.now();
    const r = await ipApiLookup(job.ip);
    if (r && r._rateLimited) {
      backoff = computeBackoff(backoff, true);
      queue.unshift(job);              // riprova più tardi
      continue;
    }
    backoff = computeBackoff(backoff, false);
    cache.set(job.ip, r);
    job.resolve(r);
  }
  processing = false;
}

// Lookup principale. MaxMind è immediato; ip-api passa dalla coda con rate-limit.
export function lookupGeo(ip) {
  if (cache.has(ip)) return Promise.resolve(cache.get(ip));
  if (cityReader) { const r = fromMaxmind(ip); cache.set(ip, r); return Promise.resolve(r); }
  return new Promise((resolve) => { queue.push({ ip, resolve }); drain(); });
}

export function geoStatus() {
  return {
    provider: cityReader ? 'maxmind' : 'ip-api',
    maxmind: { city: !!cityReader, asn: !!asnReader },
    queue: queue.length,
    backoffMs: backoff,
    cached: cache.size,
  };
}
