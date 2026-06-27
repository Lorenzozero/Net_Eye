'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import TopologyMap from '@/components/TopologyMap';
import { fetchDevices } from '@/lib/api';
import { Device } from '@/types';

export default function MappaPage() {
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
        const interval = setInterval(loadDevices, 15000);
        window.addEventListener('ns:refresh', loadDevices);
        return () => { clearInterval(interval); window.removeEventListener('ns:refresh', loadDevices); };
    }, []);

    return (
        <Layout>
            {loading ? (
                <div className="flex justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="absolute inset-0 top-24 left-0 right-0 bottom-0 bg-gray-100 dark:bg-gray-900">
                    <TopologyMap
                        devices={devices}
                        className="h-full w-full rounded-none border-0 shadow-none"
                    />
                </div>
            )}
        </Layout>
    );
}
