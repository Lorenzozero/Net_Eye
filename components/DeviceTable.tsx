'use client';

import { Device } from '@/types';
import { Monitor, Circle, Clock, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface DeviceTableProps {
  devices: Device[];
  title?: string;
  showAgent?: boolean;
}

export default function DeviceTable({ devices, title = 'Dispositivi Rilevati', showAgent = false }: DeviceTableProps) {
  if (devices.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Monitor className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>Nessun dispositivo rilevato</p>
          <p className="text-sm mt-2">Gli agent stanno scansionando la rete...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {devices.length} dispositiv{devices.length === 1 ? 'o' : 'i'} trovat{devices.length === 1 ? 'o' : 'i'}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Dispositivo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                MAC Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Porte Aperte
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Ultimo Visto
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {devices.map((device) => {
              const isOnline = device.status === 'online';
              const lastSeenDate = new Date(device.last_seen);
              const timeAgo = formatDistanceToNow(lastSeenDate, { addSuffix: true, locale: it });
              const openPorts = device.ports?.filter(p => p.state === 'open') || [];
              const hasManyCorts = openPorts.length > 10;

              return (
                <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Circle className={`w-3 h-3 ${
                        isOnline 
                          ? 'fill-green-500 text-green-500' 
                          : 'fill-gray-400 text-gray-400'
                      }`} />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                        <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {device.hostname || 'Unknown'}
                        </div>
                        {device.manufacturer && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {device.manufacturer}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white font-mono">
                      {device.ip_address}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {device.mac_address || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        hasManyCorts
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                          : openPorts.length > 0
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {openPorts.length} {openPorts.length === 1 ? 'porta' : 'porte'}
                      </span>
                      {hasManyCorts && (
                        <Shield className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {timeAgo}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
