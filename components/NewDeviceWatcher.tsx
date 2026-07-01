'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchDevices, wsUrl, getWsTicket } from '@/lib/api';
import { addNotification } from '@/lib/notifications';
import { Device } from '@/types';
import { Bell, X } from 'lucide-react';

// Monitora la comparsa di nuovi dispositivi. Due canali:
//  • PUSH real-time via WebSocket /api/v1/events (nessun ritardo);
//  • polling di riserva ogni 15s (se il WS non è disponibile).
// Un set condiviso evita notifiche doppie tra i due canali. Montato globalmente nel Layout.
export default function NewDeviceWatcher() {
    const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
    const seen = useRef<Set<string> | null>(null);   // null = non ancora inizializzato (primo seed)

    const enabled = () => { try { return localStorage.getItem('ns:notifications') !== 'false'; } catch { return true; } };

    const announce = (key: string, name: string, ip: string) => {
        if (!seen.current) return;               // non seedato: ignora
        if (seen.current.has(key)) return;       // già visto/notificato
        seen.current.add(key);
        if (!enabled()) return;
        const msg = `Nuovo dispositivo: ${name}`;
        try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification('NetworkScope', { body: `${msg} — ${ip}` });
            }
        } catch { /* ignore */ }
        addNotification({ title: msg, detail: ip });
        const id = Date.now() + Math.random();
        setToasts((t) => [...t, { id, msg }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 7000);
    };

    // Polling di riserva (seed iniziale del set condiviso).
    useEffect(() => {
        let stopped = false;
        const keyOf = (d: Device) => d.mac_address || d.ip_address;
        const check = async () => {
            try {
                const devices = await fetchDevices();
                if (seen.current === null) { seen.current = new Set(devices.map(keyOf)); return; }
                for (const d of devices) {
                    const name = d.hostname || (d.vendor && d.vendor !== 'Unknown' ? d.vendor : null) || d.device_type || 'dispositivo';
                    announce(keyOf(d), name, d.ip_address);
                }
            } catch { /* backend non raggiungibile */ }
        };
        const first = setTimeout(() => { if (!stopped) check(); }, 600);
        const id = setInterval(() => { if (!stopped) check(); }, 15000);
        return () => { stopped = true; clearTimeout(first); clearInterval(id); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Push real-time via WebSocket.
    useEffect(() => {
        let stopped = false;
        let ws: WebSocket | null = null;
        let retry: ReturnType<typeof setTimeout> | null = null;
        const connect = async () => {
            if (stopped) return;
            const ticket = await getWsTicket();
            if (stopped) return;
            const tq = ticket ? `?ticket=${encodeURIComponent(ticket)}` : '';
            try {
                ws = new WebSocket(`${wsUrl()}/api/v1/events${tq}`);
            } catch { retry = setTimeout(connect, 8000); return; }
            ws.onmessage = (ev) => {
                try {
                    const m = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
                    if (m && m.type === 'new-device' && m.device) {
                        const d = m.device;
                        const name = d.hostname || (d.vendor && d.vendor !== 'Unknown' ? d.vendor : null) || d.device_type || 'dispositivo';
                        announce(d.mac || d.ip, name, d.ip);
                    }
                } catch { /* messaggio non valido */ }
            };
            ws.onclose = () => { if (!stopped) retry = setTimeout(connect, 8000); };
            ws.onerror = () => { try { ws?.close(); } catch { /* ignore */ } };
        };
        connect();
        return () => { stopped = true; if (retry) clearTimeout(retry); try { ws?.close(); } catch { /* ignore */ } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
