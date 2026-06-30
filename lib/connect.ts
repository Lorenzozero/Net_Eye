// Determina il metodo di connessione per una porta/servizio:
//  - porte web  → URL da aprire nel browser
//  - altre      → socket TCP REALE (terminale interattivo via WebSocket), con un
//                 comando "hint" per i client dedicati (ssh/rdp/...).
export type ConnectInfo =
    | { kind: 'web'; url: string; label: string }
    | { kind: 'socket'; label: string; hint: string };

const WEB: Record<number, 'http' | 'https'> = {
    80: 'http', 8080: 'http', 8000: 'http', 3000: 'http', 5000: 'http', 5001: 'http', 9000: 'http', 631: 'http',
    443: 'https', 8443: 'https',
};

const HINTS: Record<number, (ip: string) => string> = {
    22: (ip) => `ssh user@${ip}`,
    23: (ip) => `telnet ${ip}`,
    21: (ip) => `ftp ${ip}`,
    25: (ip) => `telnet ${ip} 25`,
    3389: (ip) => `mstsc /v:${ip}`,
    5900: (ip) => `vncviewer ${ip}`,
    445: (ip) => `smbclient -L //${ip}/ -U guest`,
    139: (ip) => `smbclient -L //${ip}/ -U guest`,
    3306: (ip) => `mysql -h ${ip} -u root -p`,
    5432: (ip) => `psql -h ${ip} -U postgres`,
    6379: (ip) => `redis-cli -h ${ip}`,
    27017: (ip) => `mongosh "mongodb://${ip}:27017"`,
    53: (ip) => `nslookup example.com ${ip}`,
    1883: (ip) => `mosquitto_sub -h ${ip} -t '#' -v`,
    554: (ip) => `ffplay rtsp://${ip}:554/`,
    9100: (ip) => `nc ${ip} 9100`,
};

const LABELS: Record<number, string> = {
    22: 'SSH', 23: 'Telnet', 21: 'FTP', 3389: 'RDP', 5900: 'VNC', 445: 'SMB', 139: 'SMB',
    3306: 'MySQL', 5432: 'Postgres', 6379: 'Redis', 27017: 'Mongo', 53: 'DNS', 1883: 'MQTT', 554: 'RTSP',
};

export function getConnection(ip: string, port: number): ConnectInfo {
    const proto = WEB[port];
    if (proto) {
        const url = `${proto}://${ip}${port === 80 || port === 443 ? '' : `:${port}`}`;
        return { kind: 'web', url, label: 'Apri nel browser' };
    }
    return {
        kind: 'socket',
        label: 'Connetti',
        hint: (HINTS[port] || ((i: string) => `nc ${i} ${port}`))(ip),
    };
}

export const protoLabel = (port: number) => LABELS[port] || `porta ${port}`;
