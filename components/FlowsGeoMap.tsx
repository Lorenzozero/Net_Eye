'use client';

import { Connection } from '@/lib/api';

const flag = (cc?: string | null) =>
    cc && cc.length === 2 ? cc.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))) : '';

export default function FlowsGeoMap({ connections, onSelect }: { connections: Connection[]; onSelect?: (c: Connection) => void }) {
    const W = 720, H = 340;
    const proj = (lat: number, lon: number) => ({ x: ((lon + 180) / 360) * W, y: ((90 - lat) / 180) * H });

    // Un punto per IP remoto (con coordinate), sommando le connessioni.
    const byIp = new Map<string, Connection & { total: number }>();
    for (const c of connections) {
        if (typeof c.lat !== 'number' || typeof c.lon !== 'number') continue;
        const ex = byIp.get(c.remoteIp);
        if (ex) ex.total += c.count;
        else byIp.set(c.remoteIp, { ...c, total: c.count });
    }
    const points = [...byIp.values()];
    const maxTotal = Math.max(1, ...points.map((p) => p.total));

    if (points.length === 0) {
        return <div className="h-full flex items-center justify-center text-sm text-gray-400 text-center px-4">Nessuna destinazione geolocalizzata.<br />(attiva il lookup con connessioni verso Internet)</div>;
    }

    const gratLon = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
    const gratLat = [-60, -30, 0, 30, 60];

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full rounded-lg" role="img" aria-label="Mappa geografica dei flussi di rete">
            <rect x="0" y="0" width={W} height={H} className="fill-slate-100 dark:fill-[#0b1020]" rx="8" />
            {/* graticola */}
            {gratLon.map((lon) => { const { x } = proj(0, lon); return <line key={`vl${lon}`} x1={x} y1="0" x2={x} y2={H} className="stroke-slate-300/40 dark:stroke-white/5" strokeWidth="1" />; })}
            {gratLat.map((lat) => { const { y } = proj(lat, 0); return <line key={`hl${lat}`} x1="0" y1={y} x2={W} y2={y} className="stroke-slate-300/40 dark:stroke-white/5" strokeWidth="1" />; })}
            {/* equatore e meridiano principale */}
            <line x1="0" y1={H / 2} x2={W} y2={H / 2} className="stroke-slate-400/60 dark:stroke-white/10" strokeWidth="1" strokeDasharray="4 4" />
            <line x1={W / 2} y1="0" x2={W / 2} y2={H} className="stroke-slate-400/60 dark:stroke-white/10" strokeWidth="1" strokeDasharray="4 4" />

            {/* punti */}
            {points.map((p, i) => {
                const { x, y } = proj(p.lat as number, p.lon as number);
                const mal = (p.malicious || 0) > 0;
                const color = mal ? '#ef4444' : p.scope === 'LAN' ? '#22c55e' : '#6366f1';
                const r = 3 + (p.total / maxTotal) * 6;
                return (
                    <g key={i} onClick={() => onSelect?.(p)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
                        <title>{`${flag(p.countryCode)} ${p.remoteHost || p.remoteIp}\n${[p.city, p.country].filter(Boolean).join(', ')}\n${p.org || ''} ${p.asn || ''}\n${p.total} connessioni${mal ? ` · MALEVOLO (${p.malicious})` : ''}`}</title>
                        {mal && <circle cx={x} cy={y} r={r + 6} fill="#ef4444" opacity="0.25" className="animate-pulse" />}
                        <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth="1" fillOpacity="0.85" />
                        <text x={x} y={y - r - 3} textAnchor="middle" fontSize="9" className="fill-slate-600 dark:fill-slate-300 select-none pointer-events-none">{flag(p.countryCode)}{p.city ? ` ${p.city}` : ''}</text>
                    </g>
                );
            })}

            {/* legenda */}
            <g transform="translate(10,14)" fontSize="10">
                <circle cx="5" cy="4" r="4" fill="#6366f1" /><text x="14" y="8" className="fill-slate-500 dark:fill-slate-400">Internet</text>
                <circle cx="5" cy="20" r="4" fill="#22c55e" /><text x="14" y="24" className="fill-slate-500 dark:fill-slate-400">LAN</text>
                <circle cx="5" cy="36" r="4" fill="#ef4444" /><text x="14" y="40" className="fill-slate-500 dark:fill-slate-400">Malevolo</text>
            </g>
        </svg>
    );
}
