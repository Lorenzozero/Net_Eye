'use client';

import { useEffect, useRef, useState } from 'react';
import { Connection } from '@/lib/api';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

const flag = (cc?: string | null) =>
    cc && cc.length === 2 ? cc.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))) : '';

// Continenti approssimati (poligoni [lon,lat]) con nome, colore e centroide per l'etichetta.
interface Continent { name: string; color: string; label: [number, number]; poly: [number, number][] }
const CONTINENTS: Continent[] = [
    { name: 'Nord America', color: '#38bdf8', label: [-100, 45], poly: [[-165, 60], [-140, 68], [-100, 68], [-80, 62], [-64, 58], [-52, 47], [-70, 42], [-75, 35], [-82, 25], [-97, 17], [-105, 22], [-115, 28], [-124, 40], [-130, 50], [-140, 58]] },
    { name: 'Groenlandia', color: '#a5b4fc', label: [-40, 72], poly: [[-45, 60], [-30, 64], [-20, 72], [-32, 80], [-48, 80], [-55, 74], [-50, 66]] },
    { name: 'Sud America', color: '#fbbf24', label: [-58, -18], poly: [[-78, 8], [-60, 5], [-50, 0], [-35, -6], [-40, -16], [-50, -26], [-60, -42], [-66, -52], [-72, -50], [-71, -35], [-70, -18], [-76, -5], [-80, 2]] },
    { name: 'Europa', color: '#f472b6', label: [15, 50], poly: [[-10, 58], [0, 60], [12, 64], [28, 60], [40, 56], [40, 46], [28, 44], [16, 40], [4, 38], [-6, 42], [-9, 44]] },
    { name: 'Africa', color: '#34d399', label: [18, 3], poly: [[-16, 30], [-8, 34], [10, 34], [24, 32], [32, 30], [43, 12], [51, 11], [48, -2], [40, -16], [30, -30], [20, -34], [15, -30], [10, -16], [8, 0], [-2, 6], [-12, 12], [-16, 22]] },
    { name: 'Asia', color: '#fb923c', label: [95, 45], poly: [[30, 58], [45, 66], [70, 72], [100, 74], [130, 70], [160, 68], [178, 66], [168, 60], [145, 48], [135, 40], [122, 30], [110, 20], [100, 8], [92, 20], [80, 10], [72, 22], [58, 26], [48, 36], [40, 44], [34, 50]] },
    { name: 'Oceania', color: '#c084fc', label: [134, -25], poly: [[113, -20], [122, -16], [132, -12], [142, -12], [150, -22], [153, -30], [147, -38], [138, -36], [128, -32], [118, -34], [114, -28]] },
];

export default function FlowsGeoMap({ connections, onSelect }: { connections: Connection[]; onSelect?: (c: Connection) => void }) {
    const W = 720, H = 360;
    const proj = (lat: number, lon: number) => ({ x: ((lon + 180) / 360) * W, y: ((90 - lat) / 180) * H });
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
    const wrapRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => { e.preventDefault(); setScale((s) => Math.min(Math.max(s * (e.deltaY > 0 ? 0.9 : 1.1), 1), 8)); };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const byIp = new Map<string, Connection & { total: number }>();
    for (const c of connections) {
        if (typeof c.lat !== 'number' || typeof c.lon !== 'number') continue;
        const ex = byIp.get(c.remoteIp);
        if (ex) ex.total += c.count; else byIp.set(c.remoteIp, { ...c, total: c.count });
    }
    const points = [...byIp.values()];
    const maxTotal = Math.max(1, ...points.map((p) => p.total));

    const polyPath = (poly: [number, number][]) =>
        'M ' + poly.map(([lon, lat]) => { const p = proj(lat, lon); return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join(' L ') + ' Z';

    const onDown = (e: React.MouseEvent) => setDrag({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    const onMove = (e: React.MouseEvent) => { if (drag) setOffset({ x: e.clientX - drag.x, y: e.clientY - drag.y }); };
    const onUp = () => setDrag(null);

    return (
        <div ref={wrapRef} className="relative h-full w-full overflow-hidden rounded-lg bg-sky-50 dark:bg-[#0b1020]">
            <div className="absolute top-2 right-2 z-10 flex gap-1">
                <button onClick={() => setScale((s) => Math.min(s + 0.4, 8))} title="Zoom +" className="p-1.5 rounded bg-white/90 dark:bg-gray-800/90 border border-slate-200 dark:border-white/10 hover:bg-white"><ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-200" /></button>
                <button onClick={() => setScale((s) => Math.max(s - 0.4, 1))} title="Zoom −" className="p-1.5 rounded bg-white/90 dark:bg-gray-800/90 border border-slate-200 dark:border-white/10 hover:bg-white"><ZoomOut className="w-4 h-4 text-gray-700 dark:text-gray-200" /></button>
                <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} title="Reset" className="p-1.5 rounded bg-white/90 dark:bg-gray-800/90 border border-slate-200 dark:border-white/10 hover:bg-white"><Maximize className="w-4 h-4 text-gray-700 dark:text-gray-200" /></button>
            </div>

            {points.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 text-center px-4 z-10">Nessuna destinazione geolocalizzata (serve traffico verso Internet).</div>
            )}

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full cursor-grab active:cursor-grabbing" onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
                <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`}>
                    {/* continenti (ognuno con colore proprio) */}
                    {CONTINENTS.map((c, i) => (
                        <path key={i} d={polyPath(c.poly)} fill={c.color} fillOpacity={0.28} stroke={c.color} strokeOpacity={0.6} strokeWidth={0.6} />
                    ))}
                    {/* graticola */}
                    {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => { const { x } = proj(0, lon); return <line key={`v${lon}`} x1={x} y1="0" x2={x} y2={H} className="stroke-slate-400/20 dark:stroke-white/5" strokeWidth={0.5} />; })}
                    {[-60, -30, 0, 30, 60].map((lat) => { const { y } = proj(lat, 0); return <line key={`h${lat}`} x1="0" y1={y} x2={W} y2={y} className="stroke-slate-400/20 dark:stroke-white/5" strokeWidth={0.5} />; })}
                    {/* nomi dei continenti */}
                    {CONTINENTS.map((c, i) => { const { x, y } = proj(c.label[1], c.label[0]); return (
                        <text key={`cn${i}`} x={x} y={y} textAnchor="middle" fontSize={9 / scale} fontWeight="700" fill={c.color} fillOpacity={0.95} className="select-none pointer-events-none uppercase" style={{ letterSpacing: 0.5 }}>{c.name}</text>
                    ); })}

                    {/* punti */}
                    {points.map((p, i) => {
                        const { x, y } = proj(p.lat as number, p.lon as number);
                        const mal = (p.malicious || 0) > 0;
                        const color = mal ? '#ef4444' : p.scope === 'LAN' ? '#22c55e' : '#6366f1';
                        const r = (3 + (p.total / maxTotal) * 6) / Math.max(1, scale * 0.6);
                        return (
                            <g key={i} onClick={(e) => { e.stopPropagation(); onSelect?.(p); }} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
                                <title>{`${flag(p.countryCode)} ${p.remoteHost || p.remoteIp}\n${[p.city, p.country].filter(Boolean).join(', ')}\n${p.org || ''} ${p.asn || ''}\n${p.total} connessioni${mal ? ` · MALEVOLO (${p.malicious})` : ''}`}</title>
                                {mal && <circle cx={x} cy={y} r={r + 5} fill="#ef4444" opacity="0.25" className="animate-pulse" />}
                                <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth={0.7} fillOpacity="0.9" />
                                <text x={x} y={y - r - 2} textAnchor="middle" fontSize={8 / scale} className="fill-slate-700 dark:fill-slate-200 select-none pointer-events-none">{flag(p.countryCode)}{p.city ? ` ${p.city}` : ''}</text>
                            </g>
                        );
                    })}
                </g>
            </svg>

            <div className="absolute bottom-2 left-2 flex gap-3 text-[10px] text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-900/60 rounded px-2 py-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" />Internet</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />LAN</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Malevolo</span>
                <span className="text-gray-400">· rotella=zoom, trascina=sposta</span>
            </div>
        </div>
    );
}
