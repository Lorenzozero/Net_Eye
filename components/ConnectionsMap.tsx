'use client';

import { Connection } from '@/lib/api';
import { Laptop, Globe } from 'lucide-react';

const short = (c: Connection) => {
    const name = c.remoteHost || c.remoteIp;
    return name.length > 22 ? name.slice(0, 20) + '…' : name;
};

export default function ConnectionsMap({ connections }: { connections: Connection[] }) {
    const top = connections.slice(0, 16);
    if (!top.length) {
        return <div className="h-full flex items-center justify-center text-sm text-gray-400">Nessuna connessione attiva rilevata</div>;
    }

    const W = 820, H = 520, cx = W / 2, cy = H / 2, R = 190;
    const fromHost = top[0]?.fromHost || 'questo host';
    const maxCount = Math.max(...top.map((c) => c.count));

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label="Mappa dei flussi di rete attivi">
            {/* archi */}
            {top.map((c, i) => {
                const a = (i / top.length) * 2 * Math.PI - Math.PI / 2;
                const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
                const color = c.scope === 'LAN' ? '#22c55e' : '#6366f1';
                const mx = (cx + x) / 2, my = (cy + y) / 2;
                return (
                    <g key={`edge-${i}`}>
                        <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth={1 + (c.count / maxCount) * 3} strokeOpacity="0.45" />
                        <rect x={mx - 26} y={my - 9} width="52" height="16" rx="8" fill="white" className="dark:fill-gray-800" stroke={color} strokeOpacity="0.5" />
                        <text x={mx} y={my + 3} textAnchor="middle" fontSize="9" fontWeight="600" fill={color}>{c.service}</text>
                    </g>
                );
            })}

            {/* nodi remoti */}
            {top.map((c, i) => {
                const a = (i / top.length) * 2 * Math.PI - Math.PI / 2;
                const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
                const color = c.scope === 'LAN' ? '#16a34a' : '#4f46e5';
                return (
                    <g key={`node-${i}`}>
                        <circle cx={x} cy={y} r="16" fill="white" className="dark:fill-gray-800" stroke={color} strokeWidth="2" />
                        <foreignObject x={x - 9} y={y - 9} width="18" height="18">
                            <Globe width="100%" height="100%" color={color} />
                        </foreignObject>
                        <text x={x} y={y + 30} textAnchor="middle" fontSize="10" className="fill-slate-600 dark:fill-slate-300" fontWeight="500">{short(c)}</text>
                        <text x={x} y={y + 42} textAnchor="middle" fontSize="8" className="fill-slate-400">{c.count}× · {c.scope}</text>
                    </g>
                );
            })}

            {/* nodo centrale (dispositivo locale) */}
            <circle cx={cx} cy={cy} r="34" fill="#6366f1" />
            <circle cx={cx} cy={cy} r="40" fill="none" stroke="#6366f1" strokeOpacity="0.25" strokeWidth="3" />
            <foreignObject x={cx - 16} y={cy - 16} width="32" height="32">
                <Laptop width="100%" height="100%" color="white" />
            </foreignObject>
            <text x={cx} y={cy + 56} textAnchor="middle" fontSize="12" fontWeight="700" className="fill-slate-800 dark:fill-white">{fromHost}</text>

            {/* legenda */}
            <g transform="translate(16,16)" fontSize="11">
                <circle cx="6" cy="6" r="5" fill="#6366f1" /><text x="18" y="10" className="fill-slate-500 dark:fill-slate-400">Internet</text>
                <circle cx="6" cy="26" r="5" fill="#22c55e" /><text x="18" y="30" className="fill-slate-500 dark:fill-slate-400">LAN locale</text>
            </g>
        </svg>
    );
}
