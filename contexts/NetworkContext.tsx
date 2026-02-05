'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Device, Agent, WSMessage } from '@/types';
import { fetchDevices, fetchAgents } from '@/lib/api';
import { getWebSocketClient } from '@/lib/websocket';

interface NetworkContextValue {
  devices: Device[];
  agents: Agent[];
  loading: boolean;
  connected: boolean;
  lastUpdate: Date | null;
  refreshDevices: () => Promise<void>;
  refreshAgents: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      const data = await fetchDevices();
      setDevices(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  }, []);

  const refreshAgents = useCallback(async () => {
    try {
      const data = await fetchAgents();
      setAgents(data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, []);

  useEffect(() => {
    // Initial data load
    const loadData = async () => {
      setLoading(true);
      await Promise.all([refreshDevices(), refreshAgents()]);
      setLoading(false);
    };
    loadData();

    // Setup WebSocket
    const ws = getWebSocketClient();
    ws.connect();

    const unsubscribe = ws.subscribe((message: WSMessage) => {
      console.log('[NetworkContext] WS message:', message.type);

      switch (message.type) {
        case 'devices_snapshot':
          setDevices(message.data.devices);
          setAgents(message.data.agents);
          setConnected(true);
          setLastUpdate(new Date());
          break;

        case 'agent_registered':
          setAgents((prev) => {
            const exists = prev.find(a => a.id === message.data.id);
            if (exists) {
              return prev.map(a => a.id === message.data.id ? message.data : a);
            }
            return [...prev, message.data];
          });
          break;

        case 'scan_update':
          refreshDevices();
          setLastUpdate(new Date());
          break;
      }
    });

    return () => {
      unsubscribe();
      ws.disconnect();
    };
  }, [refreshDevices, refreshAgents]);

  return (
    <NetworkContext.Provider
      value={{
        devices,
        agents,
        loading,
        connected,
        lastUpdate,
        refreshDevices,
        refreshAgents,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
