import { Device, ScanResult } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchDevices(): Promise<Device[]> {
    const res = await fetch(`${API_URL}/api/v1/devices`);
    if (!res.ok) throw new Error('Impossibile recuperare i dispositivi');
    return res.json();
}

export async function fetchDevice(ip: string): Promise<Device> {
    const res = await fetch(`${API_URL}/api/v1/devices/${ip}`);
    if (!res.ok) throw new Error('Impossibile recuperare il dispositivo');
    return res.json();
}

export async function triggerNetworkScan(subnet: string = '192.168.1.0/24'): Promise<ScanResult> {
    const res = await fetch(`${API_URL}/api/v1/scan/network?subnet=${subnet}`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Impossibile avviare la scansione di rete');
    return res.json();
}

export async function triggerPortScan(ip: string): Promise<ScanResult> {
    const res = await fetch(`${API_URL}/api/v1/scan/ports/${ip}`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Impossibile avviare la scansione delle porte');
    return res.json();
}
