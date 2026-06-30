'use client';

import { useState } from 'react';
import { Device } from '@/types';
import DeviceDetailModal from '@/components/DeviceDetailModal';
import { Pencil, X, Check, Edit2 } from 'lucide-react';
import { Activity } from 'lucide-react';

interface NetworkGroupProps {
    subnet: string;
    devices: Device[];
    onUpdateDevice: (ip: string, updates: Partial<Device>) => void;
}

export default function NetworkGroup({ subnet, devices, onUpdateDevice }: NetworkGroupProps) {
    const [networkName, setNetworkName] = useState(subnet); // Mock, user asked to edit network name too
    const [isEditingName, setIsEditingName] = useState(false);
    const [editingDevice, setEditingDevice] = useState<string | null>(null);
    const [tempHostname, setTempHostname] = useState('');
    const [selected, setSelected] = useState<Device | null>(null);

    // Gateway della subnet (per mostrarne hostname/vendor nell'header)
    const gw = devices.find((d) => d.device_type === 'gateway' || d.device_type === 'router' || d.ip_address.endsWith('.1'));
    const gwLabel = gw ? (gw.hostname || gw.vendor || gw.ip_address) : null;

    const startEditing = (device: Device) => {
        setEditingDevice(device.ip_address);
        setTempHostname(device.hostname || '');
    };

    const saveDevice = async (ip: string) => {
        await onUpdateDevice(ip, { hostname: tempHostname });
        setEditingDevice(null);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-slate-200/70 dark:border-white/10 mb-6">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    {isEditingName ? (
                        <div className="flex items-center">
                            <input
                                type="text"
                                value={networkName}
                                onChange={(e) => setNetworkName(e.target.value)}
                                className="border border-indigo-300 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                autoFocus
                            />
                            <button onClick={() => setIsEditingName(false)} className="ml-2 text-green-600"><Check className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center group">
                                {networkName}
                                <button
                                    onClick={() => setIsEditingName(true)}
                                    className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-opacity"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                            </h3>
                            {gwLabel && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">Gateway: <span className="font-medium text-gray-700 dark:text-gray-300">{gwLabel}</span></span>
                            )}
                        </div>
                    )}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {devices.length} dispositivi
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/30">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Indirizzo IP</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hostname / Dispositivo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Porte / Servizi</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {devices.map((device) => (
                            <tr key={device.ip_address} onClick={() => setSelected(device)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                                    {device.ip_address}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingDevice === device.ip_address ? (
                                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={tempHostname}
                                                onChange={(e) => setTempHostname(e.target.value)}
                                                className="border border-indigo-300 rounded px-2 py-1 text-sm w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                            <button onClick={(e) => { e.stopPropagation(); saveDevice(device.ip_address); }} className="text-green-600"><Check className="w-4 h-4" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setEditingDevice(null); }} className="text-red-500"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">
                                                {device.hostname || 'N/D'}
                                            </span>
                                            <button onClick={(e) => { e.stopPropagation(); startEditing(device); }} className="text-gray-300 hover:text-indigo-600">
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="capitalize text-indigo-600 dark:text-indigo-400">{device.device_type?.replace('_', ' ') || '—'}</span>
                                        {device.os ? ` · ${device.os}` : ''} · {device.vendor || 'Vendor sconosciuto'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {device.open_ports && device.open_ports.length > 0 ? (
                                            device.open_ports.map(port => (
                                                <span key={port} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                    {port}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Nessun servizio rilevato</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${device.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                        {device.is_active ? 'Online' : 'Offline'}
                                    </span>
                                    {device.last_seen && (
                                        <div className="text-xs text-gray-400 mt-1">{new Date(device.last_seen).toLocaleString('it-IT')}</div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selected && <DeviceDetailModal device={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}
