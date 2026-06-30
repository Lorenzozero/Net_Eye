'use client';

import { Device } from '@/types';
import { triggerPortScan } from '@/lib/api';
import DeviceDetailModal from '@/components/DeviceDetailModal';
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
                                                {device.os ? ` Â· ${device.os}` : ''}
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

            {selectedDevice && <DeviceDetailModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />}
        </div>
    );
}