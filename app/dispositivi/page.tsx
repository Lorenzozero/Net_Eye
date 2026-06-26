'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DeviceList from '@/components/DeviceList';
import { fetchDevices } from '@/lib/api';
import { exportDevicesCsv, exportDevicesPdf } from '@/lib/export';
import { Device } from '@/types';
import { Server, Wifi, Activity, Shield, Download, FileText } from 'lucide-react';

export default function DispositiviPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    const loadDevices = async () => {
        try {
            const data = await fetchDevices();
            setDevices(data);
        } catch (error) {
            console.error('Errore nel caricamento dispositivi', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDevices();
        const interval = setInterval(loadDevices, 10000);
        window.addEventListener('ns:refresh', loadDevices);
        return () => { clearInterval(interval); window.removeEventListener('ns:refresh', loadDevices); };
    }, []);

    // Calculate stats
    const onlineCount = devices.filter(d => d.is_active).length;
    const vendorCounts = devices.reduce((acc, device) => {
        const vendor = device.vendor || 'Unknown';
        acc[vendor] = (acc[vendor] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topVendor = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0];
    const openPortsCount = devices.reduce((acc, d) => acc + (d.open_ports?.length || 0), 0);

    return (
        <Layout>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl">
                        Dispositivi di Rete
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Gestione completa dell&apos;inventario e analisi di sicurezza
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => exportDevicesCsv(devices)}
                        disabled={devices.length === 0}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        <Download className="w-4 h-4 mr-2" /> CSV
                    </button>
                    <button
                        onClick={() => exportDevicesPdf(devices)}
                        disabled={devices.length === 0}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
                    >
                        <FileText className="w-4 h-4 mr-2" /> PDF
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Server className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Totale Dispositivi</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900 dark:text-white">{devices.length}</div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Activity className="h-6 w-6 text-green-500" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Online</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900 dark:text-white">{onlineCount}</div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Wifi className="h-6 w-6 text-indigo-500" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Top Vendor</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900 dark:text-white truncate">
                                            {topVendor ? topVendor[0] : '-'}
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Shield className="h-6 w-6 text-orange-500" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Porte Aperte Totali</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900 dark:text-white">{openPortsCount}</div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <DeviceList devices={devices} />
            )}
        </Layout>
    );
}
