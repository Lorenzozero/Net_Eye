'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchDevices, fetchConnections, wsUrl, getWsTicket } from '@/lib/api';
import { addNotification, NsLevel } from '@/lib/notifications';
import { Device } from '@/types';
import { Bell, ShieldAlert, AlertTriangle, X } from 'lucide-react';

// Watcher unico degli eventi: nuovi dispositivi + connessioni malevole/minacce.
//  • PUSH real-time via WebSocket /api/v1/events;
//  • polling di riserva (dispositivi + connessioni);
//  • dedup condiviso → nessuna notifica doppia tra i canali;
//  • toast colorati per livello + cronologia + notifica del browser.
type Toast = { id: number; title: string; level: NsLevel };

const STYLE: Record<NsLevel, { bg: string; icon: React.ReactNode }> = {
    info: { bg: 'bg-indigo-600', icon: <Bell className="w-4 h-4" /> },
    warning: { bg: 'bg-amber-600', icon: <AlertTriangle className="w-4 h-4" /> },
    danger: { bg: 'bg-red-600', icon: <ShieldAlert className="w-4 h-4" /> },
};

export default function EventWatcher() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const seen = useRef<Set<string>>(new Set());
    const devicesSeeded = useRef(false);

    const enabled = () => { try { return localStorage.getItem('ns:notifications') !== 'false'; } catch { return true; } };

    const announce = (key: string, title: string, detail: string, level: NsLevel) => {
        if (seen.current.has(key)) return;
        seen.current.add(key);
        if (!enabled()) return;
        try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification('NetworkScope', { body: `${title} — ${detail}` });
            }
        } catch { /* ignore */ }
        addNotification({ title, detail, level });
        const id = Date.now() + Math.random();
        setToasts((t) => [...t, { id, title, level }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), level === 'danger' ? 10000 : 7000);
    };

    const onThreat = (m: { kind?: string; ip?: string; port?: number; host?: string | null; service?: string; threat?: string; engines?: number; process?: string | null }) => {
        const name = m.host || m.ip || 'IP';
        if (m.kind === 'malicious') {
            announce(`mal:${m.ip}`, `⚠️ IP malevolo: ${name}`, `${m.ip} · ${m.engines} motori VirusTotal`, 'danger');
        } else if (m.kind === 'port') {
            announce(`port:${m.ip}:${m.port}`, `⚠️ Porta a rischio: ${m.threat}`, `${name}:${m.port} · ${m.service || ''}${m.process ? ` · ${m.process}` : ''}`, 'warning');
        }
    };

    // Polling di riserva (dispositivi nuovi + connessioni malevole/minacce).
    useEffect(() => {
        let stopped = false;
        const keyOf = (d: Device) => d.mac_address || d.ip_address;
        const poll = async () => {
            try {
                const devices = await fetchDevices();
                if (!devicesSeeded.current) { for (const d of devices) seen.current.add(`dev:${keyOf(d)}`); devicesSeeded.current = true; }
                else for (const d of devices) {
                    const name = d.hostname || (d.vendor && d.vendor !== 'Unknown' ? d.vendor : null) || d.device_type || 'dispositivo';
                    announce(`dev:${keyOf(d)}`, `Nuovo dispositivo: ${name}`, d.ip_address, 'info');
                }
            } catch { /* backend giù */ }
            try {
                const conns = await fetchConnections();
                for (const c of conns) {
                    if ((c.malicious || 0) > 0) announce(`mal:${c.remoteIp}`, `⚠️ IP malevolo: ${c.remoteHost || c.org || c.remoteIp}`, `${c.remoteIp} · ${c.malicious} motori VirusTotal · ${c.service}`, 'danger');
                    else if (c.threat) announce(`port:${c.remoteIp}:${c.remotePort}`, `⚠️ Porta a rischio: ${c.threat}`, `${c.remoteHost || c.remoteIp}:${c.remotePort} · ${c.service}${c.process ? ` · ${c.process}` : ''}`, 'warning');
                }
            } catch { /* backend giù */ }
        };
        const first = setTimeout(() => { if (!stopped) poll(); }, 800);
        const id = setInterval(() => { if (!stopped) poll(); }, 15000);
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
            try { ws = new WebSocket(`${wsUrl()}/api/v1/events${tq}`); } catch { retry = setTimeout(connect, 8000); return; }
            ws.onmessage = (ev) => {
                try {
                    const m = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
                    if (!m || !m.type) return;
                    if (m.type === 'new-device' && m.device) {
                        const d = m.device;
                        const name = d.hostname || (d.vendor && d.vendor !== 'Unknown' ? d.vendor : null) || d.device_type || 'dispositivo';
                        announce(`dev:${d.mac || d.ip}`, `Nuovo dispositivo: ${name}`, d.ip, 'info');
                    } else if (m.type === 'threat') {
                        onThreat(m);
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
        <div className="fixed bottom-4 right-4 z-[70] space-y-2 max-w-sm">
            {toasts.map((t) => (
                <div key={t.id} className={`flex items-center gap-2 ${STYLE[t.level].bg} text-white px-4 py-2 rounded-lg shadow-xl text-sm`}>
                    {STYLE[t.level].icon}
                    <span className="flex-1">{t.title}</span>
                    <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="ml-2 opacity-80 hover:opacity-100"><X className="w-3 h-3" /></button>
                </div>
            ))}
        </div>
    );
}
