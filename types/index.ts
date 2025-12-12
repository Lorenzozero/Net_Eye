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
}

export interface ScanResult {
    message: string;
    task_id: string;
}
