'use client';

import { Connection } from '@/lib/api';

const flag = (cc?: string | null) =>
    cc && cc.length === 2 ? cc.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))) : '';
const short = (s: string, n = 22) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

interface Flow { from: string; toLabel: string; ip: string; cc?: string | null; service: string; count: number; malicious: number; conn: Connection }

export default function TopFlowsGraph({ connections, onSelect }: { connections: Connection[]; onSelect?: (c: Connection) => void }) {
    // Aggrega per (programma sorgente, host remoto) → connessioni totali.
    const flows = new Map<string, Flow>();
    for (const c of connections) {
        const from = c.process || c.fromHost || 'sconosciuto';
        const key = `${from}|${c.remoteIp}`;
        const ex = flows.get(key);
        if (ex) ex.count += c.count;
        else flows.set(key, {
            from, toLabel: c.remoteHost || c.org || c.remoteIp, ip: c.remoteIp, cc: c.countryCode,
            service: c.service, count: c.count, malicious: c.malicious || 0, conn: c,
        });
    }
    const top = [...flows.values()].sort((a, b) => b.count - a.count).slice(0, 9);
    if (top.length === 0) {
        return <div className="h-full flex items-center justify-center text-sm text-gray-400">Nessuna connessione da rappresentare</div>;
    }

    const sources = [...new Set(top.map((f) => f.from))];
    const targets = [...new Set(top.map((f) => f.ip))];
    const targetLabel = new Map(top.map((f) => [f.ip, { label: f.toLabel, cc: f.cc }]));
    const maxCount = Math.max(...top.map((f) => f.count));

    const W = 760;
    const rowH = 42;
    const H = Math.max(sources.length, targets.length, 3) * rowH + 30;
    const srcX = 190, tgtX = 570;
    const colY = (i: number, n: number) => H / 2 + (i - (n - 1) / 2) * rowH;
    const srcY = (name: string) => colY(sources.indexOf(name), sources.length);
    const tgtY = (ip: string) => colY(targets.indexOf(ip), targets.length);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} role="img" aria-label="Grafo delle connessioni più frequenti">
            {/* archi */}
            {top.map((f, i) => {
                const y1 = srcY(f.from), y2 = tgtY(f.ip);
                const mx = (srcX + tgtX) / 2;
                const color = f.malicious > 0 ? '#ef4444' : '#6366f1';
                return (
                    <g key={`e${i}`} onClick={() => onSelect?.(f.conn)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
                        <path d={`M ${srcX} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${tgtX} ${y2}`} fill="none" stroke={color} strokeWidth={1.5 + (f.count / maxCount) * 5} strokeOpacity="0.45" />
                        <rect x={mx - 24} y={(y1 + y2) / 2 - 8} width="48" height="15" rx="7" className="fill-white dark:fill-gray-800" stroke={color} strokeOpacity="0.4" />
                        <text x={mx} y={(y1 + y2) / 2 + 3} textAnchor="middle" fontSize="8.5" fontWeight="600" fill={color}>{f.service}</text>
                    </g>
                );
            })}

            {/* nodi sorgente (programmi) */}
            {sources.map((s) => {
                const y = srcY(s);
                return (
                    <g key={`s${s}`}>
                        <circle cx={srcX} cy={y} r="5" fill="#6366f1" />
                        <text x={srcX - 12} y={y + 4} textAnchor="end" fontSize="11" fontWeight="600" className="fill-slate-700 dark:fill-slate-200">{short(s, 20)}</text>
                    </g>
                );
            })}

            {/* nodi destinazione (host) */}
            {targets.map((ip) => {
                const y = tgtY(ip);
                const t = targetLabel.get(ip);
                const mal = top.some((f) => f.ip === ip && f.malicious > 0);
                return (
                    <g key={`t${ip}`} onClick={() => { const f = top.find((x) => x.ip === ip); if (f) onSelect?.(f.conn); }} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
                        <circle cx={tgtX} cy={y} r="5" fill={mal ? '#ef4444' : '#8b5cf6'} />
                        <text x={tgtX + 12} y={y + 4} fontSize="11" fontWeight="600" className="fill-slate-700 dark:fill-slate-200">{t?.cc ? flag(t.cc) + ' ' : ''}{short(t?.label || ip, 22)}</text>
                    </g>
                );
            })}

            {/* intestazioni colonne */}
            <text x={srcX} y="14" textAnchor="middle" fontSize="10" className="fill-slate-400 uppercase tracking-wider">Programma</text>
            <text x={tgtX} y="14" textAnchor="middle" fontSize="10" className="fill-slate-400 uppercase tracking-wider">Host remoto</text>
        </svg>
    );
}
