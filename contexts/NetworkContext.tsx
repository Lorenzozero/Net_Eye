"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Device, Agent, NetworkSnapshot } from "@/types/network";

// Tipi per lo stato di connessione WebSocket
export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface NetworkContextValue {
  agents: Agent[];
  devices: Device[];
  snapshot: NetworkSnapshot | null;
  connectionStatus: ConnectionStatus;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [snapshot, setSnapshot] = useState<NetworkSnapshot | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [retryAttempt, setRetryAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback(
    (attempt: number = 0) => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
      if (!wsUrl) {
        console.error("NEXT_PUBLIC_WS_URL non è definita");
        setConnectionStatus("disconnected");
        return;
      }

      setConnectionStatus("connecting");

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setConnectionStatus("connected");
        setRetryAttempt(0);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "devices_snapshot": {
              const payload = data.payload as NetworkSnapshot;
              setSnapshot(payload);
              setAgents(payload.agents || []);
              setDevices(payload.devices || []);
              break;
            }
            case "agent_registered": {
              const agent = data.payload as Agent;
              setAgents((prev) => {
                const existing = prev.find((a) => a.id === agent.id);
                if (existing) {
                  return prev.map((a) => (a.id === agent.id ? agent : a));
                }
                return [...prev, agent];
              });
              break;
            }
            case "scan_update": {
              const updatedDevices = data.payload.devices as Device[];
              setDevices(updatedDevices);
              break;
            }
            default:
              console.warn("Evento WebSocket sconosciuto:", data.type);
          }
        } catch (error) {
          console.error("Errore parsing messaggio WebSocket", error);
        }
      };

      socket.onclose = () => {
        setConnectionStatus("disconnected");

        const nextAttempt = attempt + 1;
        setRetryAttempt(nextAttempt);

        const baseDelay = 1000; // 1s
        const maxDelay = 30000; // 30s
        const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);

        setTimeout(() => {
          connectWebSocket(nextAttempt);
        }, delay);
      };

      socket.onerror = (err) => {
        console.error("Errore WebSocket", err);
        setConnectionStatus("disconnected");
      };
    },
    []
  );

  useEffect(() => {
    connectWebSocket(0);

    return () => {
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  const value = useMemo(
    () => ({ agents, devices, snapshot, connectionStatus }),
    [agents, devices, snapshot, connectionStatus]
  );

  return (
    <NetworkContext.Provider value={value}>
      {connectionStatus !== "connected" && (
        <div className="w-full bg-yellow-500 text-black text-center py-1 text-xs">
          Connessione in tempo reale persa – retry automatico in corso
          ({connectionStatus})...
        </div>
      )}
      {children}
    </NetworkContext.Provider>
  );
};

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error("useNetwork deve essere usato dentro NetworkProvider");
  }
  return ctx;
}
