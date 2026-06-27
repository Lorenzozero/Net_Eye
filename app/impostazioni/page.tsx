'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { fetchAgents, deleteAgent } from '@/lib/api';
import { Agent } from '@/types';
import {
    Save, Bell, Cpu, Terminal, Download,
    Monitor, Server, RefreshCw, Trash2, CheckCircle, XCircle, Clock
} from 'lucide-react';

export default function ImpostazioniPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [serverUrl, setServerUrl] = useState('http://localhost:8000');
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const loadAgents = async () => {
        try {
            setAgents(await fetchAgents());
        } catch {
            console.log('Errore caricamento agents');
        }
    };

    const removeAgent = async (agentId: string) => {
        if (!confirm('Sei sicuro di voler rimuovere questo agent?')) return;
        try {
            await deleteAgent(agentId);
            loadAgents();
            setToast({ msg: 'Agent rimosso con successo', type: 'success' });
            setTimeout(() => setToast(null), 3000);
        } catch {
            setToast({ msg: 'Errore durante la rimozione dell\'agent', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- hostname disponibile solo lato client
            setServerUrl(`http://${window.location.hostname}:8000`);
        }
        loadAgents();
        const interval = setInterval(loadAgents, 15000);
        window.addEventListener('ns:refresh', loadAgents);
        return () => { clearInterval(interval); window.removeEventListener('ns:refresh', loadAgents); };
    }, []);

    const downloadFile = (type: 'windows' | 'linux' | 'python') => {
        const filenames = {
            'windows': 'install_windows.bat',
            'linux': 'install_linux.sh',
            'python': 'networkscope_agent.py'
        };
        const filename = filenames[type];
        const url = `${serverUrl}/static/${filename}`;

        // Simuliamo un check o semplicemente notifichiamo l'avvio
        setToast({ msg: 'Download avviato...', type: 'success' });
        setTimeout(() => setToast(null), 3000);

        if (typeof document !== 'undefined') {
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            link.target = '_blank'; // Fallback per sicurezza
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString('it-IT');
        } catch {
            return dateStr;
        }
    };

    const getStatusInfo = (status: string) => {
        const isOnline = status === 'online' || status === 'scanning';
        return {
            icon: isOnline ? CheckCircle : XCircle,
            color: isOnline ? 'text-green-500' : 'text-red-500',
            bgColor: isOnline ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30',
            textColor: isOnline ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300',
            label: status === 'scanning' ? 'In scansione' : (isOnline ? 'Online' : 'Offline')
        };
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Agent di Rete */}
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-slate-200/70 dark:border-white/10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3">
                                <Cpu className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Agent di Scansione Rete</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Installa agent per monitorare la tua rete</p>
                            </div>
                        </div>
                        <button
                            onClick={loadAgents}
                            className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Aggiorna lista"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Download Installer Buttons */}
                    <div className="mb-8">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                            <Download className="w-4 h-4 mr-2" />
                            Scarica Installer
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Windows */}
                            <button
                                onClick={() => downloadFile('windows')}
                                className="flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 group"
                            >
                                <div className="text-center">
                                    <Monitor className="w-8 h-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold block">Windows</span>
                                    <span className="text-xs text-blue-200">Batch Installer (.bat)</span>
                                </div>
                            </button>

                            {/* Linux/Ubuntu */}
                            <button
                                onClick={() => downloadFile('linux')}
                                className="flex items-center justify-center p-4 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 group"
                            >
                                <div className="text-center">
                                    <Server className="w-8 h-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold block">Linux / Ubuntu</span>
                                    <span className="text-xs text-orange-200">Bash Script</span>
                                </div>
                            </button>

                            {/* Python */}
                            <button
                                onClick={() => downloadFile('python')}
                                className="flex items-center justify-center p-4 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 group"
                            >
                                <div className="text-center">
                                    <Terminal className="w-8 h-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold block">Python Script</span>
                                    <span className="text-xs text-green-200">Cross-Platform</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Istruzioni Rapide */}
                    <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            ⚡ Avvio Rapido
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-start">
                                <span className="font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs mr-2">Win</span>
                                <code className="text-gray-600 dark:text-gray-300 break-all">python agent\networkscope_agent.py {serverUrl}</code>
                            </div>
                            <div className="flex items-start">
                                <span className="font-mono bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded text-xs mr-2">Linux</span>
                                <code className="text-gray-600 dark:text-gray-300 break-all">python3 agent/networkscope_agent.py {serverUrl}</code>
                            </div>
                        </div>
                    </div>

                    {/* Tabella Agents */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Agent Registrati ({agents.length})
                            </h4>
                            {agents.length > 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Aggiornamento automatico ogni 15s
                                </span>
                            )}
                        </div>

                        {agents.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                                <Cpu className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Nessun agent registrato</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                    Installa un agent su una macchina della tua rete per iniziare la scansione
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stato</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hostname</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sistema</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Versione</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ultimo Contatto</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {agents.map((agent) => {
                                            const statusInfo = getStatusInfo(agent.status);
                                            const StatusIcon = statusInfo.icon;
                                            return (
                                                <tr key={agent.agent_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                                                            <StatusIcon className="w-3 h-3 mr-1" />
                                                            {statusInfo.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{agent.agent_hostname}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">ID: {agent.agent_id}</div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{agent.agent_ip}</span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${agent.agent_os === 'Windows'
                                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                                            }`}>
                                                            {agent.agent_os}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        v{agent.agent_version || '1.0.0'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {formatDate(agent.last_seen)}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                                        <button
                                                            onClick={() => removeAgent(agent.agent_id)}
                                                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors p-1"
                                                            title="Rimuovi agent"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notifiche */}
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-slate-200/70 dark:border-white/10">
                    <div className="flex items-center mb-4">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-3">
                            <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifiche</h3>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Abilita Notifiche</label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Ricevi avvisi per nuovi dispositivi</p>
                        </div>
                        <button className="bg-indigo-600 relative inline-flex h-7 w-12 items-center rounded-full transition-colors">
                            <span className="translate-x-6 inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform" />
                        </button>
                    </div>
                </div>

                {/* ... existing content ... */}

                {/* Salva */}
                <div className="flex justify-end">
                    <button
                        onClick={() => {
                            setToast({ msg: 'Impostazioni salvate con successo!', type: 'success' });
                            setTimeout(() => setToast(null), 3000);
                        }}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        Salva Impostazioni
                    </button>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-xl flex items-center space-x-3 transition-all transform translate-y-0 opacity-100 z-50 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span className="font-medium">{toast.msg}</span>
                    <button onClick={() => setToast(null)} className="ml-2 opacity-80 hover:opacity-100">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}
        </Layout>
    );
}
