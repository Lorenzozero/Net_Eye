'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Layout from '@/components/Layout';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchTraffic, fetchConnections, TrafficData, TrafficPoint, Connection } from '@/lib/api';
import { ArrowDown, ArrowUp, Activity, Database, AlertTriangle, Network, Globe } from 'lucide-react';

const TrafficAreaChart = dynamic(() => import('@/components/TrafficAreaChart'), {
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center text-sm text-gray-400">Caricamento grafico…</div>,
});
const ConnectionsMap = dynamic(() => import('@/components/ConnectionsMap'), {
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center text-sm text-gray-400">Caricamento mappa…</div>,
});

const fmtRate = (kbps: number) => (kbps >= 1024 ? `${(kbps / 1024).toFixed(2)} MB/s` : `${kbps.toFixed(0)} KB/s`);
const fmtBytes = (b: number) => {
    if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`;
    return `${b} B`;
};

function Stat({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
                </div>
                <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
            </div>
        </div>
    );
}

export default function TrafficoPage() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [data, setData] = useState<TrafficData | null>(null);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [offline, setOffline] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const t = await fetchTraffic();
                if (!active) return;
                setData(t);
                setOffline(false);
            } catch {
                if (active) setOffline(true);
            }
        };
        load();
        const id = setInterval(load, 2000);
        return () => { active = false; clearInterval(id); };
    }, []);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try { const c = await fetchConnections(); if (active) setConnections(c); }
            catch { if (active) setConnections([]); }
        };
        load();
        const id = setInterval(load, 5000);
        const onRefresh = () => load();
        window.addEventListener('ns:refresh', onRefresh);
        return () => { active = false; clearInterval(id); window.removeEventListener('ns:refresh', onRefresh); };
    }, []);

    const history: TrafficPoint[] = data?.history ?? [];
    const cur = data?.current ?? { download: 0, upload: 0, rxPps: 0, txPps: 0 };
    const totals = data?.totals;

    const axisColor = isDark ? '#9ca3af' : '#6b7280';
    const gridColor = isDark ? '#374151' : '#e5e7eb';

    return (
        <Layout>
            <div className="mb-8">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl">Monitoraggio Traffico</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Throughput e pacchetti di rete in tempo reale (contatori dell&apos;interfaccia, aggiornamento ogni 2s)
                </p>
            </div>

            {offline && (
                <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4" />
                    Backend non raggiungibile. Avvia lo scanner con <code className="font-mono mx-1">npm run backend</code> per i dati reali.
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <Stat icon={<ArrowDown className="w-6 h-6 text-sky-600 dark:text-sky-400" />} color="bg-sky-50 dark:bg-sky-900/20"
                    label="Download" value={fmtRate(cur.download)} sub={`${cur.rxPps} pacchetti/s`} />
                <Stat icon={<ArrowUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />} color="bg-indigo-50 dark:bg-indigo-900/20"
                    label="Upload" value={fmtRate(cur.upload)} sub={`${cur.txPps} pacchetti/s`} />
                <Stat icon={<Activity className="w-6 h-6 text-green-600 dark:text-green-400" />} color="bg-green-50 dark:bg-green-900/20"
                    label="Pacchetti/s totali" value={`${cur.rxPps + cur.txPps}`} sub="ricevuti + inviati" />
                <Stat icon={<Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />} color="bg-purple-50 dark:bg-purple-900/20"
                    label="Totale trasferito" value={totals ? fmtBytes(totals.bytesIn + totals.bytesOut) : '—'}
                    sub={totals ? `↓ ${fmtBytes(totals.bytesIn)} · ↑ ${fmtBytes(totals.bytesOut)}` : undefined} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 mb-8">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Throughput (KB/s) — 🔵 download · 🟣 upload</h3>
                <div className="h-[300px]">
                    <TrafficAreaChart data={history} dataKeys={['download', 'upload']} colors={['#0ea5e9', '#6366f1']}
                        axisColor={axisColor} gridColor={gridColor} isDark={isDark} fmt={fmtRate} />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 mb-8">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Pacchetti al secondo — 🟢 ricevuti · 🟠 inviati</h3>
                <div className="h-[260px]">
                    <TrafficAreaChart data={history} dataKeys={['rxPps', 'txPps']} colors={['#22c55e', '#f59e0b']}
                        axisColor={axisColor} gridColor={gridColor} isDark={isDark} fmt={(v) => `${Math.round(v)}`} />
                </div>
            </div>

            {/* Flussi / connessioni attive */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                <div className="xl:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center">
                        <Network className="w-5 h-5 mr-2 text-indigo-500" /> Mappa flussi di rete attivi
                    </h3>
                    <p className="text-xs text-gray-400 mb-2">Connessioni in uscita da questo host verso le destinazioni, etichettate per protocollo.</p>
                    <div className="h-[480px]">
                        <ConnectionsMap connections={connections} />
                    </div>
                </div>

                <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Globe className="w-5 h-5 mr-2 text-indigo-500" /> Connessioni ({connections.length})
                    </h3>
                    <div className="overflow-y-auto max-h-[480px] -mx-2">
                        <table className="min-w-full text-sm">
                            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase sticky top-0 bg-white dark:bg-gray-800">
                                <tr>
                                    <th className="px-2 py-2 text-left">Destinazione</th>
                                    <th className="px-2 py-2 text-left">Protocollo</th>
                                    <th className="px-2 py-2 text-right">Conn.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {connections.length === 0 ? (
                                    <tr><td colSpan={3} className="px-2 py-8 text-center text-gray-400">Nessuna connessione attiva</td></tr>
                                ) : connections.map((c, i) => (
                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-2 py-2">
                                            <div className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]" title={c.remoteHost || c.remoteIp}>
                                                {c.remoteHost || c.remoteIp}
                                            </div>
                                            <div className="text-xs text-gray-400 font-mono">{c.remoteIp}:{c.remotePort}</div>
                                        </td>
                                        <td className="px-2 py-2">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                                {c.service}
                                            </span>
                                            <span className={`ml-1 text-xs ${c.scope === 'LAN' ? 'text-green-600' : 'text-gray-400'}`}>{c.scope}</span>
                                        </td>
                                        <td className="px-2 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">{c.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
