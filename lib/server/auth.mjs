// Autenticazione e ticket WebSocket — logica pura, estratta da server.mjs per essere testabile.
import crypto from 'node:crypto';

// Verifica del token: se non è impostato alcun token atteso, l'accesso è aperto (uso locale).
export function checkToken(expected, provided) {
  if (!expected) return true;
  return provided === expected;
}

// Estrae il token da una richiesta HTTP (header "x-ns-token" oppure query "?token=").
export function tokenFromRequest(req) {
  try {
    return req.headers['x-ns-token'] || new URL(req.url, 'http://x').searchParams.get('token');
  } catch {
    return null;
  }
}

// Store di ticket monouso a breve scadenza per aprire il WebSocket del terminale
// senza esporre il token long-lived. `randomHex` è iniettabile per test deterministici.
/**
 * @param {{ ttlMs?: number, randomHex?: () => string }} [opts]
 */
export function createTicketStore(opts = {}) {
  const { ttlMs = 30_000, randomHex } = opts;
  const tickets = new Map(); // ticket -> scadenza (ms)
  const gen = randomHex || (() => crypto.randomBytes(24).toString('hex'));

  function purge(now) {
    for (const [t, exp] of tickets) if (exp < now) tickets.delete(t);
  }

  return {
    issue() {
      const now = Date.now();
      purge(now);
      const ticket = gen();
      tickets.set(ticket, now + ttlMs);
      return ticket;
    },
    // Consuma il ticket: valido solo una volta e solo se non scaduto.
    consume(ticket) {
      if (!ticket) return false;
      const exp = tickets.get(ticket);
      if (exp === undefined) return false;
      tickets.delete(ticket); // monouso
      return exp >= Date.now();
    },
    get size() { return tickets.size; },
  };
}
