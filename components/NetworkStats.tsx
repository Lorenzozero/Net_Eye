'use client';

import { Device, Agent } from '@/types';
import { Activity, Server, Shield, Wifi, TrendingUp, AlertTriangle } from 'lucide-react';

interface NetworkStatsProps {
  devices: Device[];
  agents: Agent[];
}

export default function NetworkStats({ devices, agents }: NetworkStatsProps) {
  const activeDevices = devices.filter(d => d.status === 'online').length;
  const onlineAgents = agents.filter(a => a.status === 'online').length;
  const activePercentage = devices.length > 0 ? Math.round((activeDevices / devices.length) * 100) : 0;
  
  // Security alerts
  const devicesWithManyPorts = devices.filter(d => (d.ports?.filter(p => p.state === 'open').length || 0) > 10).length;
  const unknownDevices = devices.filter(d => !d.hostname || d.hostname === 'Unknown').length;
  const totalAlerts = devicesWithManyPorts + unknownDevices;

  // Unique subnets
  const subnets = new Set(
    devices.map(d => {
      const parts = d.ip_address.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    })
  );

  const stats = [
    {
      label: 'Dispositivi Totali',
      value: devices.length,
      icon: Server,
      color: 'indigo',
      trend: '+100%',
      bgGradient: 'from-indigo-500 to-purple-500',
    },
    {
      label: 'Online Ora',
      value: activeDevices,
      icon: Activity,
      color: 'green',
      percentage: activePercentage,
      bgGradient: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Reti Monitorate',
      value: subnets.size,
      icon: Wifi,
      color: 'blue',
      subtitle: `${onlineAgents} agent attivi`,
      bgGradient: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Avvisi Sicurezza',
      value: totalAlerts,
      icon: AlertTriangle,
      color: 'orange',
      subtitle: `${devicesWithManyPorts} porte anomale`,
      bgGradient: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            {/* Gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            
            {/* Icon background */}
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Icon className="w-24 h-24 transform translate-x-4 -translate-y-4" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
              </div>

              <div className="mb-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value.toLocaleString()}
                </p>
              </div>

              {stat.percentage !== undefined && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`bg-${stat.color}-500 h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-right">
                    {stat.percentage}% della rete
                  </p>
                </div>
              )}

              {stat.trend && (
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className={`w-4 h-4 mr-1 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                  <span className={`font-medium text-${stat.color}-600 dark:text-${stat.color}-400`}>
                    {stat.trend}
                  </span>
                  <span className="text-gray-400 ml-2">vs ultimo scan</span>
                </div>
              )}

              {stat.subtitle && (
                <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <span>{stat.subtitle}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
