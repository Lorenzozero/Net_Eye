'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Device } from '@/types';
import { 
  ArrowLeft, Monitor, Wifi, Clock, Shield, Activity, 
  Sparkles, Loader2, CheckCircle, XCircle, Server
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [identifying, setIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDevice = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/devices/${params.id}`);
      if (!res.ok) throw new Error('Device not found');
      const data = await res.json();
      setDevice(data);
      setError(null);
    } catch (err) {
      setError('Impossibile caricare il dispositivo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevice();
  }, [params.id]);

  const handleIdentify = async () => {
    if (!device) return;
    
    setIdentifying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/devices/${device.id}/identify`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Identification failed');
      
      const data = await res.json();
      
      // Reload device to see updates
      await loadDevice();
      
      alert(`Dispositivo identificato: ${data.identification.device_model}\nConfidenza: ${(data.identification.confidence * 100).toFixed(1)}%`);
    } catch (err) {
      alert('Errore durante l\'identificazione. Verifica che GEMINI_API_KEY sia configurata.');
      console.error(err);
    } finally {
      setIdentifying(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </Layout>
    );
  }

  if (error || !device) {
    return (
      <Layout>
        <div className="text-center py-12">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Dispositivo non trovato'}
          </h2>
          <button
            onClick={() => router.back()}
            className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Torna indietro
          </button>
        </div>
      </Layout>
    );
  }

  const isOnline = device.status === 'online';
  const openPorts = device.ports?.filter(p => p.state === 'open') || [];
  const lastSeenDate = new Date(device.last_seen);
  const firstSeenDate = new Date(device.first_seen);

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna ai dispositivi
        </button>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
              <Monitor className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {device.hostname || 'Dispositivo Sconosciuto'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 font-mono text-lg">
                {device.ip_address}
              </p>
            </div>
          </div>

          <button
            onClick={handleIdentify}
            disabled={identifying}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {identifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Identificazione...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Identifica con AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
          isOnline 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        }`}>
          <Activity className={`w-4 h-4 mr-2 ${
            isOnline ? 'animate-pulse' : ''
          }`} />
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Info Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Device Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Informazioni Dispositivo
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Indirizzo IP" value={device.ip_address} mono />
              <InfoItem label="MAC Address" value={device.mac_address || 'N/A'} mono />
              <InfoItem label="Hostname" value={device.hostname || 'N/A'} />
              <InfoItem label="Produttore" value={device.manufacturer || 'Sconosciuto'} />
              <InfoItem label="Tipo" value={device.device_type || 'Non classificato'} />
              <InfoItem label="OS/Modello" value={device.os_detection || 'Non rilevato'} />
              <InfoItem 
                label="Prima Rilevazione" 
                value={formatDistanceToNow(firstSeenDate, { addSuffix: true, locale: it })}
              />
              <InfoItem 
                label="Ultima Attività" 
                value={formatDistanceToNow(lastSeenDate, { addSuffix: true, locale: it })}
              />
            </div>
          </div>

          {/* Open Ports */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Porte Aperte
              </h2>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                {openPorts.length} {openPorts.length === 1 ? 'porta' : 'porte'}
              </span>
            </div>

            {openPorts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nessuna porta aperta rilevata</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openPorts.map((port) => (
                  <div
                    key={port.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {port.port_number}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {port.service_name || 'Unknown Service'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {port.protocol.toUpperCase()}
                          {port.service_version && ` • ${port.service_version}`}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                      {port.state}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Quick Stats */}
        <div className="space-y-6">
          {/* Security Score */}
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-8 h-8" />
              <span className="text-sm font-medium">Security Score</span>
            </div>
            <div className="text-4xl font-bold mb-2">
              {openPorts.length > 10 ? 'Basso' : openPorts.length > 5 ? 'Medio' : 'Alto'}
            </div>
            <p className="text-sm opacity-90">
              {openPorts.length > 10 
                ? 'Troppe porte aperte rilevate' 
                : openPorts.length > 5
                ? 'Numero moderato di porte aperte'
                : 'Configurazione sicura'}
            </p>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-indigo-600" />
              Timeline
            </h3>
            <div className="space-y-4">
              <TimelineItem 
                label="Ultima Attività"
                time={lastSeenDate}
                icon={<Activity className="w-4 h-4" />}
              />
              <TimelineItem 
                label="Prima Rilevazione"
                time={firstSeenDate}
                icon={<CheckCircle className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Agent Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Server className="w-5 h-5 mr-2 text-indigo-600" />
              Agent
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Rilevato da agent:
            </p>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-500 mt-1">
              {device.agent_id}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfoItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-gray-900 dark:text-white font-medium ${
        mono ? 'font-mono text-sm' : ''
      }`}>
        {value}
      </p>
    </div>
  );
}

function TimelineItem({ label, time, icon }: { label: string; time: Date; icon: React.ReactNode }) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(time, { addSuffix: true, locale: it })}
        </p>
      </div>
    </div>
  );
}
