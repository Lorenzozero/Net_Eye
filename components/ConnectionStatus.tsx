'use client';

import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface ConnectionStatusProps {
  connected: boolean;
  lastUpdate: Date | null;
}

export default function ConnectionStatus({ connected, lastUpdate }: ConnectionStatusProps) {
  return (
    <div className="flex items-center space-x-3 px-4 py-2 rounded-lg border transition-colors duration-200 ${
      connected 
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    }">
      {connected ? (
        <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
      ) : (
        <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
      )}
      
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${
          connected 
            ? 'text-green-700 dark:text-green-300' 
            : 'text-red-700 dark:text-red-300'
        }`}>
          {connected ? 'Connesso' : 'Disconnesso'}
        </span>
        {lastUpdate && connected && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Aggiornato {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: it })}
          </span>
        )}
      </div>
    </div>
  );
}
