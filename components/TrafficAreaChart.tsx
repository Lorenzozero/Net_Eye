'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrafficPoint } from '@/lib/api';

interface Props {
    data: TrafficPoint[];
    dataKeys: string[];
    colors: string[];
    axisColor: string;
    gridColor: string;
    isDark: boolean;
    fmt: (v: number) => string;
}

export default function TrafficAreaChart({ data, dataKeys, colors, axisColor, gridColor, isDark, fmt }: Props) {
    if (!data.length) {
        return <div className="h-full flex items-center justify-center text-sm text-gray-400">Raccolta dati…</div>;
    }
    return (
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    {dataKeys.map((k, i) => (
                        <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors[i]} stopOpacity={0.7} />
                            <stop offset="95%" stopColor={colors[i]} stopOpacity={0} />
                        </linearGradient>
                    ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="time" stroke={axisColor} tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} dy={6} />
                <YAxis stroke={axisColor} tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={fmt} />
                <Tooltip
                    contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: gridColor, borderRadius: '0.5rem', color: isDark ? '#f3f4f6' : '#111827' }}
                    formatter={(v: number) => fmt(v)}
                />
                {dataKeys.map((k, i) => (
                    <Area key={k} type="monotone" dataKey={k} stroke={colors[i]} fill={`url(#g-${k})`} strokeWidth={2} isAnimationActive={false} />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}
