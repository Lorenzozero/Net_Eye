// Determina il metodo di connessione giusto per una porta/servizio:
//  - porte web  → URL da aprire nel browser
//  - altre      → comando + sessione "terminale simulato"
export type ConnectInfo =
    | { kind: 'web'; url: string; label: string }
    | { kind: 'terminal'; label: string; title: string; command: string; lines: string[] };

const WEB: Record<number, 'http' | 'https'> = {
    80: 'http', 8080: 'http', 8000: 'http', 3000: 'http', 5000: 'http', 5001: 'http', 9000: 'http', 631: 'http',
    443: 'https', 8443: 'https',
};

export function getConnection(ip: string, port: number, service: string, banner?: string): ConnectInfo {
    const proto = WEB[port];
    if (proto) {
        const url = `${proto}://${ip}${port === 80 || port === 443 ? '' : `:${port}`}`;
        return { kind: 'web', url, label: 'Apri nel browser' };
    }

    const title = `${service.toLowerCase()} · ${ip}:${port}`;
    const head = [`Connessione a ${ip}:${port} (${service})...`, ...(banner ? [`◀ ${banner}`] : [])];
    const t = (command: string, extra: string[] = [], label = 'Connetti'): ConnectInfo =>
        ({ kind: 'terminal', label, title, command, lines: [...head, ...extra] });

    switch (port) {
        case 22: return t(`ssh user@${ip}`, ["The authenticity of host can't be established.", `user@${ip}'s password:`, '▌ inserisci la password per autenticarti']);
        case 23: return t(`telnet ${ip}`, [`Trying ${ip}...`, `Connected to ${ip}.`, "Escape character is '^]'.", 'login:']);
        case 21: return t(`ftp ${ip}`, [`Connected to ${ip}.`, '220 FTP Server ready.', `Name (${ip}):`]);
        case 25: return t(`telnet ${ip} 25`, [`220 ${ip} ESMTP ready`, 'EHLO networkscope']);
        case 3389: return t(`mstsc /v:${ip}`, ['Apertura Connessione Desktop Remoto...', 'Inserisci le credenziali Windows per accedere.'], 'Connetti RDP');
        case 5900: return t(`vncviewer ${ip}`, [`Connessione VNC a ${ip}:5900...`, 'Richiesta password VNC.'], 'Connetti VNC');
        case 445:
        case 139: return t(`smbclient -L //${ip}/ -U guest`, ['Enumerazione condivisioni SMB...', 'Password:'], 'Sfoglia SMB');
        case 3306: return t(`mysql -h ${ip} -u root -p`, ['Enter password:', 'Welcome to the MySQL monitor.']);
        case 5432: return t(`psql -h ${ip} -U postgres`, ['Password for user postgres:']);
        case 6379: return t(`redis-cli -h ${ip}`, [`${ip}:6379>`]);
        case 27017: return t(`mongosh "mongodb://${ip}:27017"`, [`Connecting to: mongodb://${ip}:27017`]);
        case 53: return t(`nslookup example.com ${ip}`, [`Server:  ${ip}`, `Address: ${ip}#53`], 'Query DNS');
        case 1883: return t(`mosquitto_sub -h ${ip} -t '#' -v`, ['Sottoscrizione a tutti i topic MQTT...']);
        case 554: return t(`ffplay rtsp://${ip}:554/`, ['Apertura stream RTSP...', 'Premi q per chiudere il player.'], 'Apri stream');
        case 9100: return t(`nc ${ip} 9100`, ['Connessione raw alla stampante...']);
        case 62078: return t(`# porta lockdownd (iOS)`, ['Porta usata da iPhone/iPad per la sincronizzazione (usbmuxd/lockdownd).', 'Non direttamente connettibile via rete.'], 'Info');
        default: return t(`nc ${ip} ${port}`, [`Connessione raw a ${ip}:${port}...`]);
    }
}
