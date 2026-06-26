'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchAgents, triggerNetworkScan } from '@/lib/api';

export default function NavActions() {
    const [online, setOnline] = useState<boolean | null>(null);
    const [name, setName] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const check = async () => {
        try {
            const agents = await fetchAgents();
            setOnline(agents.some((a) => a.status === 'online' || a.status === 'scanning'));
            setName(agents[0]?.agent_hostname ?? '');
        } catch {
            setOnline(false);
            setName('');
        }
    };

    useEffect(() => {
        check();
        const id = setInterval(check, 10000);
        return () => clearInterval(id);
    }, []);

    const refresh = async () => {
        setRefreshing(true);
        try {
            await triggerNetworkScan();                          // forza una nuova scansione
            window.dispatchEvent(new CustomEvent('ns:refresh')); // chiede alle pagine di ricaricare
            await check();
        } catch {
            setOnline(false);
        } finally {
            setTimeout(() => setRefreshing(false), 1200);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <span
                title={online ? 'Lo scanner/agente sta rispondendo' : 'Nessun agente raggiungibile: avvia npm run backend'}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${online === null
                    ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                    : online
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}
            >
                <span className={`w-2 h-2 rounded-full ${online === null ? 'bg-gray-400' : online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                {online === null ? 'Verifica…' : online ? `Agente attivo${name ? ` · ${name}` : ''}` : 'Nessun agente attivo'}
            </span>

            <button
                onClick={refresh}
                disabled={refreshing}
                title="Ricarica i dati dagli agenti attivi"
                aria-label="Ricarica dati"
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-60"
            >
                <RefreshCw className={`w-5 h-5 text-gray-700 dark:text-gray-200 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
        </div>
    );
}
