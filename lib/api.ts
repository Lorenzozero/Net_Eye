import { Device } from '../types';

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

// In questa versione l'app non avvia direttamente lo scan: lo fanno gli agent.
// Possiamo però aggiungere in futuro endpoint per chiedere all'agent di forzare una scansione.
export async function triggerNetworkScan(): Promise<{ message: string }> {
    return { message: 'La scansione viene eseguita dagli agent installati nelle reti. Assicurati che siano in esecuzione.' };
}

export async function triggerPortScan(): Promise<{ message: string }> {
    return { message: 'La scansione delle porte è gestita dagli agent. Nessuna azione diretta dal frontend.' };
}
