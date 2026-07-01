'use client';

import { useEffect } from 'react';
import { fetchConnections } from '@/lib/api';
import { addNotification } from '@/lib/notifications';

// Rileva le connessioni verso IP segnalati malevoli da VirusTotal e notifica (una volta per IP).
export default function ThreatWatcher() {
    useEffect(() => {
        let stopped = false;
        const seen = new Set<string>();

        const check = async () => {
            try {
                const conns = await fetchConnections();
                for (const c of conns) {
                    if ((c.malicious || 0) > 0 && !seen.has(c.remoteIp)) {
                        seen.add(c.remoteIp);
                        const name = c.remoteHost || c.org || c.remoteIp;
                        const title = `⚠️ IP malevolo rilevato: ${name}`;
                        const detail = `${c.remoteIp} · ${c.malicious} motori VirusTotal · ${c.service}${c.process ? ` · ${c.process}` : ''}`;
                        addNotification({ title, detail });
                        try {
                            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                                new Notification('NetworkScope — minaccia rilevata', { body: `${title}\n${detail}` });
                            }
                        } catch { /* ignore */ }
                    }
                }
            } catch { /* backend non raggiungibile */ }
        };

        const first = setTimeout(() => { if (!stopped) check(); }, 3000);
        const id = setInterval(() => { if (!stopped) check(); }, 20000);
        return () => { stopped = true; clearTimeout(first); clearInterval(id); };
    }, []);

    return null;
}
