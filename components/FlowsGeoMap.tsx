'use client';

import { useEffect, useRef, useState } from 'react';
import { Connection } from '@/lib/api';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

const flag = (cc?: string | null) =>
    cc && cc.length === 2 ? cc.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))) : '';

// Etichette dei continenti (nome + centroide [lon,lat] + colore) sovrapposte alla mappa reale.
const CONTINENT_LABELS: { name: string; color: string; at: [number, number] }[] = [
    { name: 'Nord America', color: '#38bdf8', at: [-100, 46] },
    { name: 'Sud America', color: '#fbbf24', at: [-60, -12] },
    { name: 'Europa', color: '#f472b6', at: [15, 51] },
    { name: 'Africa', color: '#34d399', at: [20, 6] },
    { name: 'Asia', color: '#fb923c', at: [90, 46] },
    { name: 'Oceania', color: '#c084fc', at: [134, -25] },
];

type Ring = [number, number][];
type Feature = { geometry: { type: string; coordinates: unknown } };

export default function FlowsGeoMap({ connections, onSelect }: { connections: Connection[]; onSelect?: (c: Connection) => void }) {
    const W = 720, H = 360;
    const proj = (lat: number, lon: number) => ({ x: ((lon + 180) / 360) * W, y: ((90 - lat) / 180) * H });
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
    const [land, setLand] = useState<string[]>([]); // path SVG per ogni paese
    const wrapRef = useRef<HTMLDivElement | null>(null);

    // Carica la geometria reale del mondo (confini dei paesi) e la converte in path SVG.
    useEffect(() => {
        let alive = true;
        fetch('/world-110m.geo.json')
            .then((r) => r.json())
            .then((geo: { features: Feature[] }) => {
                if (!alive) return;
                const ringToPath = (ring: Ring) =>
                    'M ' + ring.map(([lon, lat]) => { const p = proj(lat, lon); return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join(' L ') + ' Z';
                const paths: string[] = [];
                for (const f of geo.features) {
                    const g = f.geometry;
                    if (g.type === 'Polygon') {
                        paths.push((g.coordinates as Ring[]).map(ringToPath).join(' '));
                    } else if (g.type === 'MultiPolygon') {
                        paths.push((g.coordinates as Ring[][]).map((poly) => poly.map(ringToPath).join(' ')).join(' '));
                    }
                }
                setLand(paths);
            })
            .catch(() => { });
        return () => { alive = false; };
    }, []);

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

    const onDown = (e: React.MouseEvent) => setDrag({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    const onMove = (e: React.MouseEvent) => { if (drag) setOffset({ x: e.clientX - drag.x, y: e.clientY - drag.y }); };
    const onUp = () => setDrag(null);

    return (
        <div ref={wrapRef} className="relative h-full w-full overflow-hidden rounded-lg bg-[#0b2545] dark:bg-[#081226]">
            <div className="absolute top-2 right-2 z-10 flex gap-1">
                <button onClick={() => setScale((s) => Math.min(s + 0.4, 8))} title="Zoom +" className="p-1.5 rounded bg-white/90 dark:bg-gray-800/90 border border-slate-200 dark:border-white/10 hover:bg-white"><ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-200" /></button>
                <button onClick={() => setScale((s) => Math.max(s - 0.4, 1))} title="Zoom −" className="p-1.5 rounded bg-white/90 dark:bg-gray-800/90 border border-slate-200 dark:border-white/10 hover:bg-white"><ZoomOut className="w-4 h-4 text-gray-700 dark:text-gray-200" /></button>
                <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} title="Reset" className="p-1.5 rounded bg-white/90 dark:bg-gray-800/90 border border-slate-200 dark:border-white/10 hover:bg-white"><Maximize className="w-4 h-4 text-gray-700 dark:text-gray-200" /></button>
            </div>

            {points.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-200/80 text-center px-4 z-10">Nessuna destinazione geolocalizzata (serve traffico verso Internet).</div>
            )}

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full cursor-grab active:cursor-grabbing" onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
                <defs>
                    <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0e3a63" />
                        <stop offset="100%" stopColor="#0a1e38" />
                    </linearGradient>
                    <linearGradient id="landfill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2f5a3a" />
                        <stop offset="100%" stopColor="#22452c" />
                    </linearGradient>
                </defs>
                <rect x="0" y="0" width={W} height={H} fill="url(#ocean)" />
                <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`}>
                    {/* graticola (meridiani/paralleli) */}
                    {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => { const { x } = proj(0, lon); return <line key={`v${lon}`} x1={x} y1="0" x2={x} y2={H} stroke="#ffffff" strokeOpacity={0.06} strokeWidth={0.5} />; })}
                    {[-60, -30, 0, 30, 60].map((lat) => { const { y } = proj(lat, 0); return <line key={`h${lat}`} x1="0" y1={y} x2={W} y2={y} stroke="#ffffff" strokeOpacity={0.06} strokeWidth={0.5} />; })}

                    {/* terre reali (confini dei paesi) */}
                    {land.map((d, i) => (
                        <path key={i} d={d} fill="url(#landfill)" stroke="#0b2545" strokeWidth={0.35} strokeOpacity={0.9} fillRule="evenodd" />
                    ))}

                    {/* etichette dei continenti */}
                    {CONTINENT_LABELS.map((c, i) => { const { x, y } = proj(c.at[1], c.at[0]); return (
                        <text key={`cn${i}`} x={x} y={y} textAnchor="middle" fontSize={9 / scale} fontWeight="700" fill={c.color} fillOpacity={0.9} className="select-none pointer-events-none uppercase" style={{ letterSpacing: 0.6, paintOrder: 'stroke' }} stroke="#0a1e38" strokeWidth={2.4 / scale} strokeOpacity={0.5}>{c.name}</text>
                    ); })}

                    {/* punti di destinazione */}
                    {points.map((p, i) => {
                        const { x, y } = proj(p.lat as number, p.lon as number);
                        const mal = (p.malicious || 0) > 0;
                        const color = mal ? '#ef4444' : p.scope === 'LAN' ? '#22c55e' : '#38bdf8';
                        const r = (3 + (p.total / maxTotal) * 6) / Math.max(1, scale * 0.6);
                        return (
                            <g key={i} onClick={(e) => { e.stopPropagation(); onSelect?.(p); }} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
                                <title>{`${flag(p.countryCode)} ${p.remoteHost || p.remoteIp}\n${[p.city, p.country].filter(Boolean).join(', ')}\n${p.org || ''} ${p.asn || ''}\n${p.total} connessioni${mal ? ` · MALEVOLO (${p.malicious})` : ''}`}</title>
                                {mal && <circle cx={x} cy={y} r={r + 5} fill="#ef4444" opacity="0.25" className="animate-pulse" />}
                                <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth={0.7} fillOpacity="0.95" />
                                <text x={x} y={y - r - 2} textAnchor="middle" fontSize={8 / scale} fill="#e2e8f0" className="select-none pointer-events-none" style={{ paintOrder: 'stroke' }} stroke="#0a1e38" strokeWidth={2 / scale} strokeOpacity={0.6}>{flag(p.countryCode)}{p.city ? ` ${p.city}` : ''}</text>
                            </g>
                        );
                    })}
                </g>
            </svg>

            <div className="absolute bottom-2 left-2 flex gap-3 text-[10px] text-slate-200/90 bg-black/40 rounded px-2 py-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" />Internet</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />LAN</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Malevolo</span>
                <span className="text-slate-300/70">· rotella=zoom, trascina=sposta</span>
            </div>
        </div>
    );
}
