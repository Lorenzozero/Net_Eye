'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Layout from '@/components/Layout';
import TopologyMap from '@/components/TopologyMap';
import NetworkGroup from '@/components/NetworkGroup';
import KpiDetailModal from '@/components/KpiDetailModal';

// Caricato solo lato client: Recharts ha bisogno di un container misurabile,
// non disponibile durante il render SSR. Evita il warning width(-1)/height(-1).
const TrafficChart = dynamic(() => import('@/components/TrafficChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center text-sm text-gray-400">
      Caricamento grafico…
    </div>
  ),
});
import { fetchDevices, triggerNetworkScan, updateDevice } from '@/lib/api';
import { Device } from '@/types';
import {
  Activity, Server, Shield, Wifi,
  ArrowRight, Search, Zap, AlertTriangle
} from 'lucide-react';

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('Pronto');
  const [detail, setDetail] = useState<'total' | 'online' | 'networks' | 'alerts' | null>(null);

  const loadDevices = async () => {
    try {
      const data = await fetchDevices();
      setDevices(data);
    } catch (error) {
      console.error('Errore nel caricamento dispositivi', error);
    }
  };

  useEffect(() => {
    // Fetch asincrono on-mount + polling: lo setState avviene dopo l'await,
    // quindi non innesca i render a cascata che la regola vuole evitare.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDevices();
    const interval = setInterval(loadDevices, 10000);
    window.addEventListener('ns:refresh', loadDevices);
    return () => { clearInterval(interval); window.removeEventListener('ns:refresh', loadDevices); };
  }, []);

  const handleScanNetwork = async () => {
    setScanning(true);
    setScanStatus('Inizializzazione...');
    try {
      await triggerNetworkScan();
      setScanStatus('Scansione avviata');
      setTimeout(() => setScanStatus('Scansione in corso...'), 2000);

      // Reset status after 10s (simulated duration)
      setTimeout(() => {
        setScanning(false);
        setScanStatus('Pronto');
        loadDevices();
      }, 10000);
    } catch {
      setScanStatus('Errore scansione');
      setTimeout(() => setScanning(false), 3000);
    }
  };

  // Calcolo statistiche
  const activeDevices = devices.filter(d => d.is_active).length;
  const activePercentage = devices.length > 0 ? Math.round((activeDevices / devices.length) * 100) : 0;

  // Avvisi basati sul risk score reale calcolato dal backend
  const riskyDevices = devices.filter(d => d.risk && d.risk.level !== 'ok').length;
  const highRisk = devices.filter(d => d.risk && d.risk.level === 'alto').length;

  // Raggruppa dispositivi per Subnet (es. 192.168.1.0/24)
  const groupedDevices = devices.reduce((acc, device) => {
    const parts = device.ip_address.split('.');
    const subnet = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`; // Semplificazione /24
    if (!acc[subnet]) acc[subnet] = [];
    acc[subnet].push(device);
    return acc;
  }, {} as Record<string, Device[]>);

  const handleUpdateDevice = async (ip: string, updates: Partial<Device>) => {
    try {
      await updateDevice(ip, updates);
      loadDevices(); // Reload to see changes
    } catch (e) {
      console.error("Update failed", e);
    }
  };

  return (
    <Layout>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Panoramica in tempo reale della tua infrastruttura di rete
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stato Sistema</span>
            <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Online
            </div>
          </div>

          <button
            type="button"
            onClick={handleScanNetwork}
            disabled={scanning}
            className={`
              relative inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
              transition-all duration-200 
              ${scanning
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5'
              }
            `}
          >
            {scanning ? (
              <>
                <RefreshIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                {scanStatus}
              </>
            ) : (
              <>
                <Search className="-ml-1 mr-2 h-4 w-4" />
                Avvia Scansione
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Total Devices */}
        <div onClick={() => setDetail('total')} role="button" tabIndex={0}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:-translate-y-0.5 transition-all">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Server className="w-24 h-24 text-indigo-600 dark:text-indigo-400 transform translate-x-4 -translate-y-4" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Dispositivi Totali</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{devices.length}</p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <Server className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 dark:text-green-400 font-medium flex items-center">
              <Activity className="w-3 h-3 mr-1" />
              {devices.length > 0 ? '+100%' : '0%'}
            </span>
            <span className="text-gray-400 ml-2">vs ultimo scan</span>
          </div>
        </div>

        {/* Active Devices */}
        <div onClick={() => setDetail('online')} role="button" tabIndex={0}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-green-400 hover:-translate-y-0.5 transition-all">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-24 h-24 text-green-600 dark:text-green-400 transform translate-x-4 -translate-y-4" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Online Ora</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{activeDevices}</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${activePercentage}%` }}></div>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-right">{activePercentage}% della rete</p>
        </div>

        {/* Networks */}
        <div onClick={() => setDetail('networks')} role="button" tabIndex={0}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-blue-400 hover:-translate-y-0.5 transition-all">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wifi className="w-24 h-24 text-blue-600 dark:text-blue-400 transform translate-x-4 -translate-y-4" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reti Monitorate</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">1</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Wifi className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-blue-600 dark:text-blue-400 font-medium">192.168.1.0/24</span>
            <span className="text-gray-400 ml-2">subnets</span>
          </div>
        </div>

        {/* Security Alerts */}
        <div onClick={() => setDetail('alerts')} role="button" tabIndex={0}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-orange-400 hover:-translate-y-0.5 transition-all">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Shield className="w-24 h-24 text-orange-600 dark:text-orange-400 transform translate-x-4 -translate-y-4" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avvisi</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{riskyDevices}</p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center text-red-600 dark:text-red-400 mr-2 font-semibold">
              {highRisk}
            </span>
            <span className="truncate">a rischio alto</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-8">
          {/* Topology Map */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">Topologia Rete</h3>
              <Link href="/mappa" className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center">
                Schermo Intero
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="h-[400px]">
              <TopologyMap devices={devices} />
            </div>
          </div>

          {/* Network Tables (Servizi e Porte) */}
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Dettaglio Reti e Servizi</h3>
            {Object.entries(groupedDevices).map(([subnet, subDevices]) => (
              <NetworkGroup
                key={subnet}
                subnet={subnet}
                devices={subDevices}
                onUpdateDevice={handleUpdateDevice}
              />
            ))}
          </div>
        </div>

        {/* Right Column - Stats & Traffic */}
        <div className="space-y-8">
          {/* Traffic Monitor */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 h-[400px] flex flex-col">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Traffico Rete</h3>
            <div className="flex-1">
              <TrafficChart />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-md p-6 text-white">
            <h3 className="font-bold text-lg mb-2">Azioni Rapide</h3>
            <p className="text-indigo-100 text-sm mb-6">Gestisci e configura la tua rete</p>

            <div className="space-y-3">
              <Link href="/dispositivi" className="block w-full bg-white/10 hover:bg-white/20 transition-colors rounded-lg p-3 text-sm font-medium flex items-center">
                <Search className="w-4 h-4 mr-3" />
                Cerca Dispositivi
              </Link>
              <Link href="/impostazioni" className="block w-full bg-white/10 hover:bg-white/20 transition-colors rounded-lg p-3 text-sm font-medium flex items-center">
                <Zap className="w-4 h-4 mr-3" />
                Configura Agent
              </Link>
            </div>
          </div>
        </div>
      </div>

      {detail && <KpiDetailModal kind={detail} devices={devices} onClose={() => setDetail(null)} />}
    </Layout>
  );
}

function RefreshIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}
