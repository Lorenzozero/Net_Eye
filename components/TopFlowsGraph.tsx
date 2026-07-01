'use client';

import { Connection } from '@/lib/api';

const flag = (cc?: string | null) =>
    cc && cc.length === 2 ? cc.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))) : '';
const short = (s: string, n = 20) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

interface Flow { device: string; program: string; ip: string; label: string; cc?: string | null; service: string; count: number; malicious: number; conn: Connection }

export default function TopFlowsGraph({ connections, onSelect }: { connections: Connection[]; onSelect?: (c: Connection) => void }) {
    // Aggrega per (dispositivo, programma, host).
    const flows = new Map<string, Flow>();
    for (const c of connections) {
        const device = c.fromHost || 'dispositivo';
        const program = c.process || 'sconosciuto';
        const key = `${device}|${program}|${c.remoteIp}`;
        const ex = flows.get(key);
        if (ex) ex.count += c.count;
        else flows.set(key, { device, program, ip: c.remoteIp, label: c.remoteHost || c.org || c.remoteIp, cc: c.countryCode, service: c.service, count: c.count, malicious: c.malicious || 0, conn: c });
    }
    const top = [...flows.values()].sort((a, b) => b.count - a.count).slice(0, 11);
    if (top.length === 0) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Nessuna connessione da rappresentare</div>;

    const devices = [...new Set(top.map((f) => f.device))];
    const programs = [...new Set(top.map((f) => f.program))];
    const hosts = [...new Set(top.map((f) => f.ip))];
    const hostInfo = new Map(top.map((f) => [f.ip, { label: f.label, cc: f.cc, malicious: f.malicious, conn: f.conn }]));
    const maxCount = Math.max(...top.map((f) => f.count));

    // Archi device→program e program→host (aggregati).
    const dp = new Map<string, { device: string; program: string; count: number }>();
    const ph = new Map<string, { program: string; ip: string; count: number; service: string; malicious: number; conn: Connection }>();
    for (const f of top) {
        const dpk = `${f.device}|${f.program}`;
        dp.set(dpk, { device: f.device, program: f.program, count: (dp.get(dpk)?.count || 0) + f.count });
        const phk = `${f.program}|${f.ip}`;
        ph.set(phk, { program: f.program, ip: f.ip, count: (ph.get(phk)?.count || 0) + f.count, service: f.service, malicious: f.malicious, conn: f.conn });
    }

    const W = 840, rowH = 42;
    const H = Math.max(devices.length, programs.length, hosts.length, 2) * rowH + 34;
    const devX = 120, progX = 420, hostX = 700;
    const colY = (i: number, n: number) => H / 2 + (i - (n - 1) / 2) * rowH;
    const dY = (d: string) => colY(devices.indexOf(d), devices.length);
    const pY = (p: string) => colY(programs.indexOf(p), programs.length);
    const hY = (ip: string) => colY(hosts.indexOf(ip), hosts.length);
    const bez = (x1: number, y1: number, x2: number, y2: number) => `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} role="img" aria-label="Grafo dispositivo → programma → host">
            <text x={devX} y="13" textAnchor="middle" fontSize="10" className="fill-slate-400 uppercase tracking-wider">Dispositivo</text>
            <text x={progX} y="13" textAnchor="middle" fontSize="10" className="fill-slate-400 uppercase tracking-wider">Programma</text>
            <text x={hostX} y="13" textAnchor="middle" fontSize="10" className="fill-slate-400 uppercase tracking-wider">Host remoto</text>

            {/* archi dispositivo → programma */}
            {[...dp.values()].map((e, i) => (
                <path key={`dp${i}`} d={bez(devX + 6, dY(e.device), progX - 6, pY(e.program))} fill="none" stroke="#94a3b8" strokeWidth={1 + (e.count / maxCount) * 4} strokeOpacity="0.4" />
            ))}
            {/* archi programma → host */}
            {[...ph.values()].map((e, i) => {
                const color = e.malicious > 0 ? '#ef4444' : '#6366f1';
                const mx = (progX + hostX) / 2, y1 = pY(e.program), y2 = hY(e.ip);
                return (
                    <g key={`ph${i}`} onClick={() => onSelect?.(e.conn)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
                        <path d={bez(progX + 6, y1, hostX - 6, y2)} fill="none" stroke={color} strokeWidth={1.5 + (e.count / maxCount) * 5} strokeOpacity="0.45" />
                        <rect x={mx - 23} y={(y1 + y2) / 2 - 8} width="46" height="14" rx="7" className="fill-white dark:fill-gray-800" stroke={color} strokeOpacity="0.4" />
                        <text x={mx} y={(y1 + y2) / 2 + 2} textAnchor="middle" fontSize="8" fontWeight="600" fill={color}>{e.service}</text>
                    </g>
                );
            })}

            {/* nodi dispositivo */}
            {devices.map((d) => (
                <g key={`d${d}`}>
                    <circle cx={devX} cy={dY(d)} r="6" fill="#0ea5e9" />
                    <text x={devX - 12} y={dY(d) + 4} textAnchor="end" fontSize="11" fontWeight="700" className="fill-slate-700 dark:fill-slate-100">{short(d, 18)}</text>
                </g>
            ))}
            {/* nodi programma */}
            {programs.map((p) => (
                <g key={`p${p}`}>
                    <circle cx={progX} cy={pY(p)} r="5" fill="#6366f1" />
                    <text x={progX} y={pY(p) - 9} textAnchor="middle" fontSize="10.5" fontWeight="600" className="fill-slate-700 dark:fill-slate-200">{short(p, 20)}</text>
                </g>
            ))}
            {/* nodi host */}
            {hosts.map((ip) => {
                const t = hostInfo.get(ip);
                return (
                    <g key={`h${ip}`} onClick={() => t?.conn && onSelect?.(t.conn)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
                        <circle cx={hostX} cy={hY(ip)} r="5" fill={(t?.malicious || 0) > 0 ? '#ef4444' : '#8b5cf6'} />
                        <text x={hostX + 12} y={hY(ip) + 4} fontSize="11" fontWeight="600" className="fill-slate-700 dark:fill-slate-200">{t?.cc ? flag(t.cc) + ' ' : ''}{short(t?.label || ip, 22)}</text>
                    </g>
                );
            })}
        </svg>
    );
}
