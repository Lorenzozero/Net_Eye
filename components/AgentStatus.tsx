'use client';

import { Agent } from '@/types';
import { Server, Circle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface AgentStatusProps {
  agents: Agent[];
}

export default function AgentStatus({ agents }: AgentStatusProps) {
  const onlineAgents = agents.filter(a => a.status === 'online');
  const offlineAgents = agents.filter(a => a.status === 'offline');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
          <Server className="w-5 h-5 mr-2 text-indigo-600" />
          Agent Status
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">{onlineAgents.length} online</span>
          <Circle className="w-2 h-2 fill-green-500 text-green-500" />
        </div>
      </div>

      <div className="space-y-3">
        {agents.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Server className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nessun agent connesso</p>
            <p className="text-xs mt-1">Avvia un agent per iniziare</p>
          </div>
        )}

        {agents.map((agent) => {
          const isOnline = agent.status === 'online';
          const lastSeenDate = new Date(agent.last_seen);
          const timeAgo = formatDistanceToNow(lastSeenDate, { addSuffix: true, locale: it });

          return (
            <div
              key={agent.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className={`p-2 rounded-lg ${
                  isOnline 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}>
                  <Server className={`w-4 h-4 ${
                    isOnline 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {agent.hostname}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{agent.ip_address}</span>
                    {agent.os_type && (
                      <>
                        <span>•</span>
                        <span>{agent.os_type}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {timeAgo}
                </span>
                <div className={`w-2 h-2 rounded-full ${
                  isOnline 
                    ? 'bg-green-500 animate-pulse' 
                    : 'bg-gray-400'
                }`} />
              </div>
            </div>
          );
        })}
      </div>

      {offlineAgents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {offlineAgents.length} agent offline
          </p>
        </div>
      )}
    </div>
  );
}
