'use client';

import { Device } from '@/types';
import { X, Server, Zap, Wifi, AlertTriangle } from 'lucide-react';

type DetailKind = 'total' | 'online' | 'networks' | 'alerts';

const TITLES: Record<DetailKind, { title: string; icon: React.ReactNode; color: string }> = {
    total: { title: 'Tutti i dispositivi', icon: <Server className="w-5 h-5" />, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },
    online: { title: 'Dispositivi online', icon: <Zap className="w-5 h-5" />, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    networks: { title: 'Reti monitorate', icon: <Wifi className="w-5 h-5" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    alerts: { title: 'Avvisi di sicurezza', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
};

function DeviceTable({ devices }: { devices: Device[] }) {
    return (
        <table className="min-w-full text-sm">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                <tr>
                    <th className="px-3 py-2 text-left">IP</th>
                    <th className="px-3 py-2 text-left">Tipo / OS</th>
                    <th className="px-3 py-2 text-left">Vendor</th>
                    <th className="px-3 py-2 text-left">Hostname</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {devices.map((d) => (
                    <tr key={d.ip_address} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">{d.ip_address}</td>
                        <td className="px-3 py-2 capitalize text-indigo-600 dark:text-indigo-400">{d.device_type?.replace('_', ' ')}{d.os ? ` · ${d.os}` : ''}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{d.vendor || '—'}</td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{d.hostname || '—'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function KpiDetailModal({ kind, devices, onClose }: { kind: DetailKind; devices: Device[]; onClose: () => void }) {
    const meta = TITLES[kind];

    let body: React.ReactNode = null;
    if (kind === 'total') body = <DeviceTable devices={devices} />;
    else if (kind === 'online') body = <DeviceTable devices={devices.filter((d) => d.is_active)} />;
    else if (kind === 'networks') {
        const groups = devices.reduce((acc, d) => {
            const p = d.ip_address.split('.');
            const subnet = `${p[0]}.${p[1]}.${p[2]}.0/24`;
            (acc[subnet] ||= []).push(d);
            return acc;
        }, {} as Record<string, Device[]>);
        body = (
            <div className="space-y-4">
                {Object.entries(groups).map(([subnet, list]) => {
                    const gw = list.find((d) => d.device_type === 'gateway' || d.device_type === 'router');
                    return (
                        <div key={subnet} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{subnet}</span>
                                <span className="text-sm text-gray-500">{list.length} dispositivi · {list.filter((d) => d.is_active).length} online</span>
                            </div>
                            {gw && <p className="text-xs text-gray-500 dark:text-gray-400">Gateway: <span className="font-mono">{gw.ip_address}</span> ({gw.vendor || 'n/d'})</p>}
                        </div>
                    );
                })}
            </div>
        );
    } else {
        // alerts: evidenze dal risk score reale del backend
        const flagged = devices
            .filter((d) => d.risk && d.risk.level !== 'ok' && d.risk.reasons.length > 0)
            .sort((a, b) => (b.risk!.score) - (a.risk!.score))
            .map((d) => ({ d, reasons: [`Rischio ${d.risk!.level} (${d.risk!.score}/100)`, ...d.risk!.reasons] }));
        body = flagged.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Nessun avviso: la rete sembra a posto 🎉</p>
        ) : (
            <div className="space-y-3">
                {flagged.map(({ d, reasons }) => (
                    <div key={d.ip_address} className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 p-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 dark:text-white">{d.hostname || d.ip_address}</span>
                            <span className="font-mono text-xs text-gray-500">{d.ip_address}</span>
                        </div>
                        <ul className="mt-1 list-disc list-inside text-xs text-orange-700 dark:text-orange-300">
                            {reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <span className={`p-2 rounded-lg ${meta.color}`}>{meta.icon}</span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{meta.title}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto">{body}</div>
            </div>
        </div>
    );
}
