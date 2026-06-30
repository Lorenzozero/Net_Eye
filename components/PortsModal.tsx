'use client';

import { Device } from '@/types';
import { serviceName } from '@/lib/services';
import { X, Terminal } from 'lucide-react';

export default function PortsModal({ devices, onClose }: { devices: Device[]; onClose: () => void }) {
    const withPorts = devices
        .filter((d) => d.open_ports && d.open_ports.length > 0)
        .sort((a, b) => (b.open_ports?.length || 0) - (a.open_ports?.length || 0));
    const totalPorts = devices.reduce((acc, d) => acc + (d.open_ports?.length || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[82vh] flex flex-col border border-slate-200/70 dark:border-white/10">
                <div className="flex items-center justify-between p-4 border-b border-slate-200/70 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600"><Terminal className="w-5 h-5" /></span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Porte aperte &amp; servizi <span className="text-gray-400 font-normal">({totalPorts})</span></h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="p-4 overflow-y-auto space-y-4">
                    {withPorts.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">Nessuna porta aperta rilevata. Usa il pulsante &quot;Scan&quot; su un dispositivo per un&apos;analisi approfondita.</p>
                    ) : withPorts.map((d) => (
                        <div key={d.ip_address} className="rounded-lg border border-slate-200/70 dark:border-white/10 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <span className="font-medium text-gray-900 dark:text-white">{d.hostname || d.vendor || d.device_type}</span>
                                    <span className="ml-2 font-mono text-xs text-gray-500">{d.ip_address}</span>
                                </div>
                                <span className="text-xs text-gray-400 capitalize">{d.device_type?.replace('_', ' ')}</span>
                            </div>
                            <div className="space-y-1">
                                {(d.open_ports ?? []).map((port) => {
                                    const banner = d.banners?.[String(port)];
                                    return (
                                        <div key={port} className="flex items-start gap-2 text-sm">
                                            <span className="inline-flex items-center justify-center min-w-[3.5rem] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-mono text-xs">{port}</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{serviceName(port)}</span>
                                            {banner && <span className="text-xs text-gray-400 font-mono truncate" title={banner}>· {banner}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
