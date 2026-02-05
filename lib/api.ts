import { Device, Agent, Scan } from '@/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function fetchDevices(): Promise<Device[]> {
    const res = await fetch(`${BACKEND_URL}/api/devices`);
    if (!res.ok) throw new Error('Impossibile recuperare i dispositivi');
    return res.json();
}

export async function fetchDevice(id: string): Promise<Device> {
    const res = await fetch(`${BACKEND_URL}/api/devices/${id}`);
    if (!res.ok) throw new Error('Impossibile recuperare il dispositivo');
    return res.json();
}

export async function fetchDevicesByAgent(agentId: string): Promise<Device[]> {
    const res = await fetch(`${BACKEND_URL}/api/devices/agent/${agentId}`);
    if (!res.ok) throw new Error('Impossibile recuperare i dispositivi dell\'agent');
    return res.json();
}

export async function fetchAgents(): Promise<Agent[]> {
    const res = await fetch(`${BACKEND_URL}/api/agent`);
    if (!res.ok) throw new Error('Impossibile recuperare gli agent');
    return res.json();
}

export async function fetchScans(): Promise<Scan[]> {
    const res = await fetch(`${BACKEND_URL}/api/scans`);
    if (!res.ok) throw new Error('Impossibile recuperare le scansioni');
    return res.json();
}

export async function fetchScansByAgent(agentId: string): Promise<Scan[]> {
    const res = await fetch(`${BACKEND_URL}/api/scans/agent/${agentId}`);
    if (!res.ok) throw new Error('Impossibile recuperare le scansioni dell\'agent');
    return res.json();
}

// Note: Gli agent avviano le scansioni autonomamente.
// In futuro si può aggiungere un endpoint per forzare scan on-demand.
export async function triggerNetworkScan(): Promise<{ message: string }> {
    return { 
        message: 'Le scansioni vengono eseguite automaticamente dagli agent. Verifica che siano in esecuzione.' 
    };
}
