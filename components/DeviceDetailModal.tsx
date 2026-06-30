'use client';

import { useState } from 'react';
import { Device } from '@/types';
import { triggerPortScan } from '@/lib/api';
import { serviceName } from '@/lib/services';
import { Server, Terminal } from 'lucide-react';

const riskCls = (level: string) =>
    level === 'alto' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        : level === 'medio' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
            : level === 'basso' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-xs font-bold text-gray-500 uppercase">{label}</label>
        <span className="text-sm text-gray-900 dark:text-white">{children}</span>
    </div>
);

export default function DeviceDetailModal({ device, onClose }: { device: Device; onClose: () => void }) {
    const [scanning, setScanning] = useState(false);

    const handleScan = async () => {
        setScanning(true);
        try { await triggerPortScan(device.ip_address); } catch { /* ignore */ }
        finally { setTimeout(() => setScanning(false), 2000); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-slate-200/70 dark:border-white/10">
                <div className="flex items-center gap-3 p-4 border-b border-slate-200/70 dark:border-white/10">
                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                        <Server className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{device.hostname || device.vendor || device.device_type || 'Dispositivo'}</h3>
                        <p className="font-mono text-xs text-gray-500">{device.ip_address}</p>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="MAC Address"><span className="font-mono">{device.mac_address || 'N/A'}</span></Field>
                        <Field label="Vendor">{device.vendor || 'N/A'}</Field>
                        <Field label="Tipo"><span className="capitalize text-indigo-600 dark:text-indigo-400">{device.device_type?.replace('_', ' ')}</span></Field>
                        <Field label="Sistema (OS)">{device.os || 'N/A'}{device.ttl ? ` · TTL ${device.ttl}` : ''}</Field>
                        <Field label="Latenza">{typeof device.latency === 'number' ? `${device.latency} ms` : 'N/A'}</Field>
                        <Field label="Rischio">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${riskCls(device.risk?.level || 'ok')}`}>
                                {device.risk ? `${device.risk.level} (${device.risk.score})` : 'ok'}
                            </span>
                        </Field>
                        <Field label="Stato">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${device.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                {device.is_active ? 'Online' : 'Offline'}
                            </span>
                        </Field>
                        {device.seen_count != null && (
                            <Field label="Rilevamenti">{device.seen_count}× · ultimo {new Date(device.last_seen).toLocaleTimeString('it-IT')}</Field>
                        )}
                        {device.first_seen && (
                            <Field label="Primo rilevamento">{new Date(device.first_seen).toLocaleString('it-IT')}</Field>
                        )}
                    </div>

                    {device.risk && device.risk.reasons.length > 0 && (
                        <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 p-3">
                            <label className="block text-xs font-bold text-orange-700 dark:text-orange-300 uppercase mb-1">⚠️ Evidenze di rischio</label>
                            <ul className="list-disc list-inside text-xs text-orange-700 dark:text-orange-300">
                                {device.risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Porte aperte &amp; servizi</label>
                        {device.open_ports && device.open_ports.length > 0 ? (
                            <div className="space-y-1">
                                {device.open_ports.map((port) => {
                                    const banner = device.banners?.[String(port)];
                                    return (
                                        <div key={port} className="flex items-start gap-2 text-sm">
                                            <span className="inline-flex items-center justify-center min-w-[3.5rem] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-mono text-xs">{port}</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{serviceName(port)}</span>
                                            {banner && <span className="text-xs text-gray-400 font-mono truncate" title={banner}>· {banner}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">Nessuna porta rilevata. Premi &quot;Scansione completa&quot; per analizzare.</p>
                        )}
                    </div>

                    {device.upnp && (device.upnp.friendlyName || device.upnp.model || device.upnp.manufacturer) && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">UPnP / SSDP</label>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {[device.upnp.friendlyName, device.upnp.model, device.upnp.manufacturer].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-slate-200/70 dark:border-white/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Chiudi</button>
                    <button onClick={handleScan} disabled={scanning} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center disabled:opacity-60">
                        <Terminal className="w-4 h-4 mr-2" />{scanning ? 'Scansione…' : 'Scansione completa'}
                    </button>
                </div>
            </div>
        </div>
    );
}
