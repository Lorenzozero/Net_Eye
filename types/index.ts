// Frontend types aligned with backend
export interface Agent {
  id: string;
  hostname: string;
  ip_address: string;
  os_type?: string;
  last_seen: string;
  status: 'online' | 'offline';
  created_at: string;
}

export interface Device {
  id: string;
  agent_id: string;
  ip_address: string;
  mac_address?: string;
  hostname?: string;
  manufacturer?: string;
  device_type?: string;
  os_detection?: string;
  first_seen: string;
  last_seen: string;
  status: 'online' | 'offline';
  ports?: Port[];
}

export interface Port {
  id: number;
  device_id: string;
  port_number: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service_name?: string;
  service_version?: string;
  last_seen: string;
}

export interface Scan {
  id: string;
  agent_id: string;
  scan_type: 'network' | 'port' | 'service';
  target_range?: string;
  devices_found: number;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed';
}

// WebSocket event types
export interface WSDevicesSnapshot {
  type: 'devices_snapshot';
  data: {
    agents: Agent[];
    devices: Device[];
  };
}

export interface WSAgentRegistered {
  type: 'agent_registered';
  data: Agent;
}

export interface WSScanUpdate {
  type: 'scan_update';
  data: {
    agent_id: string;
    devices_count: number;
  };
}

export type WSMessage = WSDevicesSnapshot | WSAgentRegistered | WSScanUpdate;
