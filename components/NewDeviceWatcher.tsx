'use client';

import { useEffect, useState } from 'react';
import { fetchDevices } from '@/lib/api';
import { Device } from '@/types';
import { Bell, X } from 'lucide-react';

// Monitora la comparsa di nuovi dispositivi e, se le notifiche sono abilitate,
// mostra un toast in-app + una notifica del browser. Montato globalmente nel Layout.
export default function NewDeviceWatcher() {
    const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

    useEffect(() => {
        let known: Set<string> | null = null;
        let stopped = false;

        const enabled = () => { try { return localStorage.getItem('ns:notifications') !== 'false'; } catch { return true; } };
        const keyOf = (d: Device) => d.mac_address || d.ip_address;

        const notify = (msg: string, body: string) => {
            try {
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification('NetworkScope', { body: `${msg} — ${body}` });
                }
            } catch { /* ignore */ }
            const id = Date.now() + Math.random();
            setToasts((t) => [...t, { id, msg }]);
            setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 7000);
        };

        const check = async () => {
            try {
                const devices = await fetchDevices();
                const keys = new Set(devices.map(keyOf));
                if (known === null) { known = keys; return; }   // primo giro: solo seed, niente notifiche
                if (enabled()) {
                    for (const d of devices) {
                        if (!known.has(keyOf(d))) {
                            const name = d.hostname || (d.vendor && d.vendor !== 'Unknown' ? d.vendor : null) || d.device_type || 'dispositivo';
                            notify(`Nuovo dispositivo: ${name}`, d.ip_address);
                        }
                    }
                }
                known = keys;
            } catch { /* backend non raggiungibile: ignora */ }
        };

        const first = setTimeout(() => { if (!stopped) check(); }, 600);
        const id = setInterval(() => { if (!stopped) check(); }, 15000);
        return () => { stopped = true; clearTimeout(first); clearInterval(id); };
    }, []);

    if (toasts.length === 0) return null;
    return (
        <div className="fixed bottom-4 right-4 z-[70] space-y-2">
            {toasts.map((t) => (
                <div key={t.id} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-xl text-sm">
                    <Bell className="w-4 h-4" />
                    <span>{t.msg}</span>
                    <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="ml-2 opacity-80 hover:opacity-100"><X className="w-3 h-3" /></button>
                </div>
            ))}
        </div>
    );
}
