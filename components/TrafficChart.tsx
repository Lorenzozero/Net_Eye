'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';

const data = [
    { name: '00:00', upload: 4000, download: 2400 },
    { name: '04:00', upload: 3000, download: 1398 },
    { name: '08:00', upload: 2000, download: 9800 },
    { name: '12:00', upload: 2780, download: 3908 },
    { name: '16:00', upload: 1890, download: 4800 },
    { name: '20:00', upload: 2390, download: 3800 },
    { name: '23:59', upload: 3490, download: 4300 },
];

export default function TrafficChart() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Colors for axis text
    const axisColor = isDark ? '#9ca3af' : '#6b7280';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const tooltipBg = isDark ? '#1f2937' : '#ffffff';
    const tooltipBorder = isDark ? '#374151' : '#e5e7eb';
    const tooltipText = isDark ? '#f3f4f6' : '#111827';

    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 0,
                    }}
                >
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
                    <XAxis
                        dataKey="name"
                        stroke={axisColor}
                        tick={{ fill: axisColor, fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke={axisColor}
                        tick={{ fill: axisColor, fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value / 1000}k`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: tooltipBg,
                            borderColor: tooltipBorder,
                            borderRadius: '0.5rem',
                            color: tooltipText,
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelStyle={{ color: tooltipText, fontWeight: 600, marginBottom: '0.25rem' }}
                        cursor={{ stroke: axisColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="download"
                        stackId="1"
                        stroke="#0ea5e9"
                        fill="url(#colorDownload)"
                        strokeWidth={2}
                        name="Download"
                    />
                    <Area
                        type="monotone"
                        dataKey="upload"
                        stackId="1"
                        stroke="#6366f1"
                        fill="url(#colorUpload)"
                        strokeWidth={2}
                        name="Upload"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
