'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchTraffic, TrafficPoint } from '@/lib/api';
import { ArrowDown, ArrowUp } from 'lucide-react';

const fmt = (kbps: number) => (kbps >= 1024 ? `${(kbps / 1024).toFixed(1)} MB/s` : `${kbps.toFixed(0)} KB/s`);

export default function TrafficChart() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [data, setData] = useState<TrafficPoint[]>([]);
    const [current, setCurrent] = useState({ download: 0, upload: 0, rxPps: 0, txPps: 0 });
    const [offline, setOffline] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const t = await fetchTraffic();
                if (!active) return;
                setData(t.history);
                setCurrent(t.current);
                setOffline(false);
            } catch {
                if (active) setOffline(true);
            }
        };
        load();
        const id = setInterval(load, 2000);
        return () => { active = false; clearInterval(id); };
    }, []);

    const axisColor = isDark ? '#9ca3af' : '#6b7280';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const tooltipBg = isDark ? '#1f2937' : '#ffffff';
    const tooltipText = isDark ? '#f3f4f6' : '#111827';

    return (
        <div className="w-full h-full min-h-[300px] flex flex-col">
            {/* Letture live */}
            <div className="flex items-center gap-4 mb-2 text-sm">
                <span className="flex items-center text-sky-500 font-medium">
                    <ArrowDown className="w-4 h-4 mr-1" /> {fmt(current.download)}
                    <span className="text-gray-400 ml-1 font-normal">· {current.rxPps} pkt/s</span>
                </span>
                <span className="flex items-center text-indigo-500 font-medium">
                    <ArrowUp className="w-4 h-4 mr-1" /> {fmt(current.upload)}
                    <span className="text-gray-400 ml-1 font-normal">· {current.txPps} pkt/s</span>
                </span>
                {offline && <span className="ml-auto text-xs text-red-500">backend offline</span>}
            </div>

            <div className="flex-1 min-h-[240px]">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">
                        {offline ? 'Nessun dato: avvia il backend (npm run backend)' : 'Raccolta dati di traffico…'}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorDownload" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                            <XAxis dataKey="time" stroke={axisColor} tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} dy={6} />
                            <YAxis stroke={axisColor} tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => fmt(v)} />
                            <Tooltip
                                contentStyle={{ backgroundColor: tooltipBg, borderColor: gridColor, borderRadius: '0.5rem', color: tooltipText }}
                                labelStyle={{ color: tooltipText, fontWeight: 600 }}
                                formatter={(v: number, name) => [fmt(v), name === 'download' ? 'Download' : 'Upload']}
                            />
                            <Area type="monotone" dataKey="download" stroke="#0ea5e9" fill="url(#colorDownload)" strokeWidth={2} name="download" isAnimationActive={false} />
                            <Area type="monotone" dataKey="upload" stroke="#6366f1" fill="url(#colorUpload)" strokeWidth={2} name="upload" isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
