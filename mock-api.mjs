// 🧪 Mock backend per NetworkScope — zero dipendenze.
// Avvio:  node mock-api.mjs   (ascolta su http://localhost:8000)
// Serve solo per provare la GUI senza il backend reale.
import { createServer } from 'node:http';

const PORT = 8000;

// --- Dati finti coerenti col modello Device di types/index.ts ---
const devices = [
  { id: 1, ip_address: '192.168.1.1',  mac_address: 'A4:2B:8C:00:11:01', hostname: 'router.lan',   vendor: 'AVM FRITZ!Box', is_active: true,  last_seen: new Date().toISOString(), device_type: 'gateway',  open_ports: [53, 80, 443] },
  { id: 2, ip_address: '192.168.1.10', mac_address: '3C:22:FB:AA:BB:10', hostname: 'desktop-lorenzo', vendor: 'Intel',       is_active: true,  last_seen: new Date().toISOString(), device_type: 'desktop',  open_ports: [135, 139, 445, 3389] },
  { id: 3, ip_address: '192.168.1.23', mac_address: 'B8:27:EB:12:34:56', hostname: 'raspberrypi',     vendor: 'Raspberry Pi', is_active: true,  last_seen: new Date().toISOString(), device_type: 'server',   open_ports: [22, 80, 8080, 1883, 3000, 9000] },
  { id: 4, ip_address: '192.168.1.42', mac_address: 'F0:18:98:AB:CD:EF', hostname: 'iphone-di-luca',  vendor: 'Apple',        is_active: false, last_seen: new Date(Date.now() - 36e5).toISOString(), device_type: 'mobile', open_ports: [] },
  { id: 5, ip_address: '192.168.1.77', mac_address: '00:1A:22:33:44:55', hostname: null,              vendor: 'Unknown',      is_active: true,  last_seen: new Date().toISOString(), device_type: 'iot_device', open_ports: [80, 554, 8000, 8443, 9999, 23, 21] },
  { id: 6, ip_address: '192.168.1.90', mac_address: '00:11:32:55:66:77', hostname: 'nas-synology',    vendor: 'Synology',     is_active: true,  last_seen: new Date().toISOString(), device_type: 'server',   open_ports: [22, 80, 443, 5000, 5001] },
];

const agents = [
  { agent_id: 'agt-01', agent_ip: '192.168.1.10', agent_hostname: 'desktop-lorenzo', agent_os: 'Windows', agent_version: '1.0.0', status: 'online',  last_seen: new Date().toISOString(), registered_at: new Date(Date.now() - 864e5).toISOString() },
  { agent_id: 'agt-02', agent_ip: '192.168.1.23', agent_hostname: 'raspberrypi',      agent_os: 'Linux',   agent_version: '1.0.0', status: 'offline', last_seen: new Date(Date.now() - 72e5).toISOString(), registered_at: new Date(Date.now() - 1728e5).toISOString() },
];

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const server = createServer((req, res) => {
  // CORS: il frontend gira su :3000 e chiama :8000
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.end();

  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
  const parts = pathname.split('/').filter(Boolean); // es: ['api','v1','devices','192.168.1.1']
  console.log(`${req.method} ${pathname}`);

  // GET /api/v1/devices
  if (req.method === 'GET' && pathname === '/api/v1/devices') return json(res, 200, devices);

  // GET /api/v1/devices/:ip
  if (req.method === 'GET' && parts[2] === 'devices' && parts[3]) {
    const d = devices.find(x => x.ip_address === parts[3]);
    return d ? json(res, 200, d) : json(res, 404, { error: 'not found' });
  }

  // PATCH /api/v1/devices/:ip
  if (req.method === 'PATCH' && parts[2] === 'devices' && parts[3]) {
    const d = devices.find(x => x.ip_address === parts[3]);
    if (!d) return json(res, 404, { error: 'not found' });
    let raw = '';
    req.on('data', c => (raw += c));
    req.on('end', () => { Object.assign(d, raw ? JSON.parse(raw) : {}); json(res, 200, d); });
    return;
  }

  // POST /api/v1/scan/network  e  /api/v1/scan/ports/:ip
  if (req.method === 'POST' && parts[2] === 'scan') {
    return json(res, 200, { message: 'Scansione avviata (mock)', task_id: `task-${Date.now()}` });
  }

  // GET /api/v1/agents
  if (req.method === 'GET' && pathname === '/api/v1/agents') return json(res, 200, { agents });

  // DELETE /api/v1/agents/:id
  if (req.method === 'DELETE' && parts[2] === 'agents' && parts[3]) {
    return json(res, 200, { message: 'rimosso (mock)' });
  }

  json(res, 404, { error: 'rotta non gestita dal mock' });
});

server.listen(PORT, () => console.log(`🧪 Mock NetworkScope API su http://localhost:${PORT}`));
