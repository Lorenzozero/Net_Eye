import { Device, ScanResult, Agent } from '../types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const NS_TOKEN = process.env.NEXT_PUBLIC_NS_TOKEN;

// Query string per il token sul WebSocket (usata dal terminale reale).
export const WS_TOKEN_QS = NS_TOKEN ? `&token=${encodeURIComponent(NS_TOKEN)}` : '';

// Wrapper fetch che aggiunge il token di autenticazione (se configurato).
function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
    if (NS_TOKEN) headers['x-ns-token'] = NS_TOKEN;
    return fetch(`${API_URL}${path}`, { ...options, headers });
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
}

export async function fetchConnections(): Promise<Connection[]> {
    const res = await apiFetch('/api/v1/connections');
    if (!res.ok) throw new Error('Impossibile recuperare le connessioni');
    return res.json();
}
