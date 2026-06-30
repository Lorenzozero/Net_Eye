'use client';

import { Device } from '@/types';
import { triggerPortScan } from '@/lib/api';
import { useState } from 'react';
import {
    Search, Server, Wifi, Smartphone, Monitor, Router, Printer,
    HardDrive, Camera, SunMedium, Zap, Tv, Box, Activity,
    Shield, Globe, Terminal
} from 'lucide-react';

interface DeviceListProps {
    devices: Device[];
}

const riskCls = (level: string) =>
    level === 'alto' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        : level === 'medio' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
            : level === 'basso' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';

export default function DeviceList({ devices }: DeviceListProps) {
    const [scanning, setScanning] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleScan = async (ip: string) => {
        setScanning(ip);
        try {
            await triggerPortScan(ip);
            // In a real app, we'd show a toast notification here
        } catch (error) {
            console.error(error);
        } finally {
            setScanning(null);
        }
    };

    const getDeviceIcon = (vendor: string | null | undefined, type: string) => {
        const cls = "w-5 h-5";
        switch (type) {
            case 'gateway':
            case 'router': return <Router className={cls} />;
            case 'access_point': return <Wifi className={cls} />;
            case 'server':
            case 'vm': return <Server className={cls} />;
            case 'nas': return <HardDrive className={cls} />;
            case 'mobile':
            case 'tablet': return <Smartphone className={cls} />;
            case 'printer': return <Printer className={cls} />;
            case 'camera': return <Camera className={cls} />;
            case 'inverter': return <SunMedium className={cls} />;
            case 'ev_charger': return <Zap className={cls} />;
            case 'media':
            case 'tv': return <Tv className={cls} />;
            case 'container': return <Box className={cls} />;
            case 'iot_device': return <Activity className={cls} />;
            default: return <Monitor className={cls} />;
        }
    };

    const q = searchTerm.toLowerCase().trim();
    const filteredDevices = devices.filter((device) => {
        if (!q) return true;
        const haystack = [
            device.hostname, device.ip_address, device.vendor, device.device_type, device.os,
            device.mac_address, (device.open_ports || []).join(' '),
            device.banners ? Object.values(device.banners).join(' ') : '',
            device.risk?.level,
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
    });

    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-slate-200/70 dark:border-white/10">
            {/* Header with Search */}
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3">
                        <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Inventario Dispositivi</h3>
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Cerca IP, nome, vendor, tipo, OS, porta, MAC..."
                        className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 transition-shadow"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dispositivo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Indirizzo IP</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dettagli</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stato</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredDevices.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                                        <p>Nessun dispositivo trovato</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredDevices.map((device) => (
                                <tr
                                    key={device.id || device.ip_address}
                                    onClick={() => setSelectedDevice(device)}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300">
                                                {getDeviceIcon(device.vendor, device.device_type)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {device.hostname || device.vendor || device.device_type?.replace('_', ' ') || 'Dispositivo'}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {device.mac_address || 'MAC Sconosciuto'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Globe className="w-4 h-4 text-gray-400 mr-2" />
                                            <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{device.ip_address}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <span className="inline-flex items-center gap-1 text-xs font-medium capitalize px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 w-fit">
                                                {device.device_type?.replace('_', ' ') || 'sconosciuto'}
                                                {device.os ? ` · ${device.os}` : ''}
                                            </span>
                                            <span className="text-sm text-gray-900 dark:text-white">{device.vendor || 'Vendor Sconosciuto'}</span>
                                            <div className="flex items-center gap-2">
                                                {device.open_ports && device.open_ports.length > 0 && (
                                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center">
                                                        <Terminal className="w-3 h-3 mr-1" />
                                                        {device.open_ports.length} porte
                                                    </span>
                                                )}
                                                {typeof device.latency === 'number' && (
                                                    <span className="text-xs text-gray-400">{device.latency} ms</span>
                                                )}
                                                {device.risk && device.risk.level !== 'ok' && (
                                                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${riskCls(device.risk.level)}`}>
                                                        rischio {device.risk.level}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${device.is_active
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                                            : 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${device.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                            {device.is_active ? 'Online' : 'Offline'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleScan(device.ip_address);
                                            }}
                                            disabled={scanning === device.ip_address}
                                            className={`
                                                inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white 
                                                transition-all
                                                ${scanning === device.ip_address
                                                    ? 'bg-indigo-400 cursor-not-allowed'
                                                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                                                }
                                            `}
                                        >
                                            {scanning === device.ip_address ? (
                                                <>
                                                    <Activity className="animate-spin w-3 h-3 mr-1" />
                                                    Analisi...
                                                </>
                                            ) : (
                                                <>
                                                    <Shield className="w-3 h-3 mr-1" />
                                                    Scan
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Mostrando {filteredDevices.length} di {devices.length} dispositivi
                </p>
            </div>

            {/* Device Detail Modal */}
            {selectedDevice && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Backdrop */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedDevice(null)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 dark:border-gray-700">
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 sm:mx-0 sm:h-10 sm:w-10">
                                        <Server className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                            Dettagli Dispositivo
                                        </h3>
                                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            Visualizza le informazioni complete rilevate per questo dispositivo.
                                        </div>

                                        <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">Hostname</label>
                                                    <span className="text-sm text-gray-900 dark:text-white">{selectedDevice.hostname || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">IP Address</label>
                                                    <span className="text-sm font-mono text-gray-900 dark:text-white">{selectedDevice.ip_address}</span>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">MAC Address</label>
                                                    <span className="text-sm font-mono text-gray-900 dark:text-white">{selectedDevice.mac_address || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">Vendor</label>
                                                    <span className="text-sm text-gray-900 dark:text-white">{selectedDevice.vendor || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">Tipo</label>
                                                    <span className="text-sm capitalize text-indigo-600 dark:text-indigo-400">{selectedDevice.device_type?.replace('_', ' ')}</span>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">Sistema (OS)</label>
                                                    <span className="text-sm text-gray-900 dark:text-white">{selectedDevice.os || 'N/A'}{selectedDevice.ttl ? ` · TTL ${selectedDevice.ttl}` : ''}</span>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">Latenza</label>
                                                    <span className="text-sm text-gray-900 dark:text-white">{typeof selectedDevice.latency === 'number' ? `${selectedDevice.latency} ms` : 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">Rischio</label>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${riskCls(selectedDevice.risk?.level || 'ok')}`}>
                                                        {selectedDevice.risk ? `${selectedDevice.risk.level} (${selectedDevice.risk.score})` : 'ok'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">Stato</label>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${selectedDevice.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {selectedDevice.is_active ? 'Online' : 'Offline'}
                                                    </span>
                                                </div>
                                                {selectedDevice.first_seen && (
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase">Primo rilevamento</label>
                                                        <span className="text-sm text-gray-900 dark:text-white">{new Date(selectedDevice.first_seen).toLocaleString('it-IT')}</span>
                                                    </div>
                                                )}
                                                {typeof selectedDevice.seen_count === 'number' && (
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase">Rilevamenti</label>
                                                        <span className="text-sm text-gray-900 dark:text-white">{selectedDevice.seen_count}× · ultimo {new Date(selectedDevice.last_seen).toLocaleTimeString('it-IT')}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {selectedDevice.risk && selectedDevice.risk.reasons.length > 0 && (
                                                <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 p-3">
                                                    <label className="block text-xs font-bold text-orange-700 dark:text-orange-300 uppercase mb-1">⚠️ Evidenze di rischio</label>
                                                    <ul className="list-disc list-inside text-xs text-orange-700 dark:text-orange-300">
                                                        {selectedDevice.risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                                    </ul>
                                                </div>
                                            )}

                                            {selectedDevice.banners && Object.keys(selectedDevice.banners).length > 0 && (
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Servizi rilevati (banner)</label>
                                                    <div className="space-y-1">
                                                        {Object.entries(selectedDevice.banners).map(([port, b]) => (
                                                            <div key={port} className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 rounded px-2 py-1">
                                                                <span className="text-indigo-500">:{port}</span> {b}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {selectedDevice.upnp && (selectedDevice.upnp.friendlyName || selectedDevice.upnp.model || selectedDevice.upnp.manufacturer) && (
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">UPnP / SSDP</label>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                                        {[selectedDevice.upnp.friendlyName, selectedDevice.upnp.model, selectedDevice.upnp.manufacturer].filter(Boolean).join(' · ')}
                                                    </p>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Porte Aperte (Scansione)</label>
                                                {selectedDevice.open_ports && selectedDevice.open_ports.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedDevice.open_ports.map(port => (
                                                            <span key={port} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                                <Terminal className="w-3 h-3 mr-1" />
                                                                Porta {port}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">Nessuna porta aperta rilevata o scansione non completata.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setSelectedDevice(null)}
                                >
                                    Chiudi
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => {
                                        handleScan(selectedDevice.ip_address);
                                    }}
                                >
                                    {scanning === selectedDevice.ip_address ? 'Scansione in corso...' : 'Avvia Scansione Completa'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
