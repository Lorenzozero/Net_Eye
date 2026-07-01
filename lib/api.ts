import { Device, ScanResult, Agent } from '../types';

// Modalità di default: proxy same-origin (/api/backend). Il token NS_TOKEN resta server-side
// e NON viene mai incluso nel bundle client. Impostando NEXT_PUBLIC_API_URL si passa alla
// modalità DIRETTA legacy (il browser parla col backend, token nel client — solo uso locale).
const DIRECT_URL = process.env.NEXT_PUBLIC_API_URL || '';
const DIRECT_TOKEN = process.env.NEXT_PUBLIC_NS_TOKEN;
export const API_URL = DIRECT_URL || '/api/backend';

// Wrapper fetch. In modalità diretta aggiunge il token; in modalità proxy non serve
// (lo inietta il route handler server-side).
function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
    if (DIRECT_URL && DIRECT_TOKEN) headers['x-ns-token'] = DIRECT_TOKEN;
    return fetch(`${API_URL}${path}`, { ...options, headers });
}

// URL WebSocket del backend per il terminale reale. L'host NON è un segreto:
// l'autenticazione avviene tramite un ticket monouso a breve scadenza (getWsTicket).
export function wsUrl(): string {
    if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
    if (DIRECT_URL) return DIRECT_URL.replace(/^http/, 'ws');
    if (typeof window !== 'undefined') {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        return `${proto}://${window.location.hostname}:8000`;
    }
    return 'ws://localhost:8000';
}

// Richiede un ticket monouso per aprire il WebSocket senza esporre il token.
export async function getWsTicket(): Promise<string | null> {
    try {
        const r = await apiFetch('/api/v1/ws-ticket', { method: 'POST' });
        if (!r.ok) return null;
        const j = await r.json();
        return j.ticket ?? null;
    } catch {
        return null;
    }
}

export async function fetchDevices(): Promise<Device[]> {
    const res = await apiFetch('/api/v1/devices');
    if (!res.ok) throw new Error('Impossibile recuperare i dispositivi');
    return res.json();
}

export async function fetchDevice(ip: string): Promise<Device> {
    const res = await apiFetch(`/api/v1/devices/${ip}`);
    if (!res.ok) throw new Error('Impossibile recuperare il dispositivo');
    return res.json();
}

export async function triggerNetworkScan(subnet: string = '192.168.1.0/24'): Promise<ScanResult> {
    const res = await apiFetch(`/api/v1/scan/network?subnet=${subnet}`, { method: 'POST' });
    if (!res.ok) throw new Error('Impossibile avviare la scansione di rete');
    return res.json();
}

export async function triggerPortScan(ip: string): Promise<ScanResult> {
    const res = await apiFetch(`/api/v1/scan/ports/${ip}`, { method: 'POST' });
    if (!res.ok) throw new Error('Impossibile avviare la scansione delle porte');
    return res.json();
}

export async function updateDevice(ip: string, updates: Partial<Device>): Promise<void> {
    const res = await apiFetch(`/api/v1/devices/${ip}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Impossibile aggiornare il dispositivo');
}

export async function fetchAgents(): Promise<Agent[]> {
    const res = await apiFetch('/api/v1/agents');
    if (!res.ok) throw new Error('Impossibile recuperare gli agent');
    const data = await res.json();
    return data.agents || [];
}

export async function deleteAgent(agentId: string): Promise<void> {
    const res = await apiFetch(`/api/v1/agents/${agentId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Impossibile rimuovere l'agent");
}

export interface TrafficPoint {
    time: string;
    download: number; // KB/s
    upload: number;   // KB/s
    rxPps: number;    // pacchetti/s ricevuti
    txPps: number;    // pacchetti/s inviati
}

export interface TrafficData {
    history: TrafficPoint[];
    current: { download: number; upload: number; rxPps: number; txPps: number };
    totals: { bytesIn: number; bytesOut: number; pktIn: number; pktOut: number } | null;
}

export async function fetchTraffic(): Promise<TrafficData> {
    const res = await apiFetch('/api/v1/traffic');
    if (!res.ok) throw new Error('Impossibile recuperare il traffico di rete');
    return res.json();
}

export interface Connection {
    remoteIp: string;
    remotePort: number;
    remoteHost: string | null;
    org?: string | null;
    asn?: string | null;
    country?: string | null;
    countryCode?: string | null;
    city?: string | null;
    lat?: number | null;
    lon?: number | null;
    process?: string | null;
    threat?: string | null;
    malicious?: number;
    vt?: { malicious: number; suspicious: number; harmless: number } | null;
    service: string;
    proto: string;
    count: number;
    scope: 'LAN' | 'Internet';
    localIps: string[];
    fromHost: string;
    bytes?: number | null;        // byte reali osservati (cattura pacchetti); null in socket-table
    protocolDesc?: string | null; // descrizione IANA del protocollo
    inspected?: boolean;          // true = riconosciuto dal payload reale (DPI su pcap)
    geoSource?: string | null;    // 'maxmind' | 'ip-api'
}

export interface Capabilities {
    pcap: { available: boolean; active: boolean; device: string | null; packets: number; bytes: number; flows: number; reason: string };
    dpi: { services: number; threats: number; payloadSignatures: number; ianaLoaded: boolean };
    geo: { provider: string; maxmind: { city: boolean; asn: boolean }; queue: number; backoffMs: number; cached: number };
    offline: boolean;
}

export async function fetchCapabilities(): Promise<Capabilities> {
    const res = await apiFetch('/api/v1/capabilities');
    if (!res.ok) throw new Error('Impossibile recuperare le capacità');
    return res.json();
}

export interface PacketFlow {
    remoteIp: string;
    remotePort: number;
    remoteHost: string | null;
    proto: string;
    packets: number;
    bytes: number;
    service: string;
    inspected: boolean;      // riconosciuto dal payload reale
    threat: string | null;
    payloadHex: string | null; // primi byte del payload (esadecimale)
    payloadLen: number;
    at: number;
}

export async function fetchFlows(): Promise<{ active: boolean; reason: string; packets: number; flows: PacketFlow[] }> {
    const res = await apiFetch('/api/v1/flows');
    if (!res.ok) throw new Error('Impossibile recuperare i flussi catturati');
    return res.json();
}

export async function fetchConnections(): Promise<Connection[]> {
    const res = await apiFetch('/api/v1/connections');
    if (!res.ok) throw new Error('Impossibile recuperare le connessioni');
    return res.json();
}

export async function fetchConfig(): Promise<{ vtConfigured: boolean; offline?: boolean }> {
    const res = await apiFetch('/api/v1/config');
    if (!res.ok) throw new Error('Impossibile recuperare la configurazione');
    return res.json();
}

export async function setVtApiKey(vtApiKey: string): Promise<{ vtConfigured: boolean }> {
    const res = await apiFetch('/api/v1/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vtApiKey }),
    });
    if (!res.ok) throw new Error('Impossibile salvare la configurazione');
    return res.json();
}
