'use client';

import { useEffect, useState } from 'react';
import { fetchCapabilities, Capabilities } from '@/lib/api';
import { Radio, Microscope, Globe2, ShieldOff } from 'lucide-react';

const fmtBytes = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${(b / 1e3).toFixed(0)} KB` : `${b} B`);

function Card({ icon, title, active, lines, tone }: { icon: React.ReactNode; title: string; active: boolean; lines: string[]; tone: 'on' | 'off' | 'warn' }) {
    const ring = tone === 'on' ? 'border-green-300 dark:border-green-800' : tone === 'warn' ? 'border-amber-300 dark:border-amber-800' : 'border-slate-200 dark:border-white/10';
    const dot = tone === 'on' ? 'bg-green-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-slate-400';
    return (
        <div className={`flex-1 min-w-[220px] rounded-xl border ${ring} bg-white dark:bg-gray-800 p-4`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-indigo-500">{icon}</span>
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{title}</h4>
                <span className={`ml-auto flex items-center gap-1 text-xs ${active ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${dot}`} />{active ? 'attivo' : 'non attivo'}
                </span>
            </div>
            {lines.map((l, i) => <p key={i} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{l}</p>)}
        </div>
    );
}

export default function CapabilitiesPanel() {
    const [cap, setCap] = useState<Capabilities | null>(null);

    useEffect(() => {
        let alive = true;
        const load = () => fetchCapabilities().then((c) => { if (alive) setCap(c); }).catch(() => { });
        load();
        const t = setInterval(load, 10000);
        return () => { alive = false; clearInterval(t); };
    }, []);

    if (!cap) return null;

    return (
        <div className="mb-8">
            <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">Motore di analisi — evidenze</h3>
                <span className="text-xs text-gray-400">sorgente reale dei dati</span>
            </div>
            <div className="flex flex-wrap gap-3">
                <Card
                    icon={<Radio className="w-4 h-4" />}
                    title="Cattura pacchetti"
                    active={cap.pcap.active}
                    tone={cap.pcap.active ? 'on' : 'warn'}
                    lines={cap.pcap.active
                        ? [`Byte reali per flusso su ${cap.pcap.device || 'interfaccia'}`, `${cap.pcap.packets.toLocaleString('it-IT')} pacchetti · ${fmtBytes(cap.pcap.bytes)} · ${cap.pcap.flows} flussi`]
                        : ['Modalità socket-table (conteggi connessioni)', cap.pcap.reason]}
                />
                <Card
                    icon={<Microscope className="w-4 h-4" />}
                    title="Deep Packet Inspection"
                    active={cap.dpi.services > 0}
                    tone="on"
                    lines={[`${cap.dpi.services.toLocaleString('it-IT')} servizi/protocolli${cap.dpi.ianaLoaded ? ' (registro IANA)' : ''}`, `${cap.dpi.threats} porte trojan/worm note · ${cap.dpi.payloadSignatures} firme payload`]}
                />
                <Card
                    icon={<Globe2 className="w-4 h-4" />}
                    title="Geolocalizzazione"
                    active={!cap.offline}
                    tone={cap.offline ? 'off' : cap.geo.provider === 'maxmind' ? 'on' : 'warn'}
                    lines={cap.offline
                        ? ['Disattivata (NS_OFFLINE)', 'Nessun IP inviato a terzi']
                        : [`Provider: ${cap.geo.provider === 'maxmind' ? 'MaxMind GeoLite2 (locale)' : 'ip-api.com (fallback)'}`, `${cap.geo.cached} IP in cache${cap.geo.backoffMs ? ` · backoff ${cap.geo.backoffMs}ms` : ''}${cap.geo.queue ? ` · coda ${cap.geo.queue}` : ''}`]}
                />
                {cap.offline && (
                    <Card icon={<ShieldOff className="w-4 h-4" />} title="Modalità offline" active tone="off"
                        lines={['Nessuna chiamata a servizi esterni', 'ip-api e VirusTotal disabilitati']} />
                )}
            </div>
        </div>
    );
}
