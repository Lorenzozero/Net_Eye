export interface Device {
    id: number;
    ip_address: string;
    mac_address: string | null;
    hostname: string | null;
    vendor: string | null;
    is_active: boolean;
    last_seen: string;
    device_type: string;
    open_ports: number[];
    os?: string | null;
    ttl?: number | null;
    latency?: number | null;
    banners?: Record<string, string> | null;
    upnp?: { friendlyName?: string | null; model?: string | null; manufacturer?: string | null; server?: string | null } | null;
    risk?: { score: number; level: string; reasons: string[] } | null;
    first_seen?: string;
    seen_count?: number;
}

export interface ScanResult {
    message: string;
    task_id: string;
}

export interface Agent {
    agent_id: string;
    agent_ip: string;
    agent_hostname: string;
    agent_os: string;
    agent_version: string;
    status: string;
    last_seen: string;
    registered_at: string;
    subnet?: string;
    device_count?: number;
    local?: boolean;
}
