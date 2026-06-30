// Mappa porta → servizio/protocollo (allineata al backend) per mostrare cosa gira sulle porte.
export const PORT_SERVICES: Record<number, string> = {
    20: 'FTP', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 67: 'DHCP', 68: 'DHCP',
    80: 'HTTP', 110: 'POP3', 119: 'NNTP', 123: 'NTP', 135: 'RPC', 139: 'NetBIOS', 143: 'IMAP',
    161: 'SNMP', 389: 'LDAP', 443: 'HTTPS', 445: 'SMB', 465: 'SMTPS', 502: 'Modbus', 514: 'Syslog',
    515: 'Print', 548: 'AFP', 554: 'RTSP', 587: 'SMTP', 631: 'IPP', 636: 'LDAPS', 853: 'DNS/TLS',
    993: 'IMAPS', 995: 'POP3S', 1194: 'OpenVPN', 1433: 'MSSQL', 1723: 'PPTP', 1883: 'MQTT', 1900: 'SSDP',
    3000: 'Dev/Node', 3306: 'MySQL', 3389: 'RDP', 5000: 'UPnP/NAS', 5001: 'NAS', 5060: 'SIP', 5222: 'XMPP',
    5353: 'mDNS', 5432: 'PostgreSQL', 5900: 'VNC', 6379: 'Redis', 7547: 'TR-069', 8008: 'Chromecast',
    8009: 'Chromecast', 8080: 'HTTP', 8443: 'HTTPS', 8883: 'MQTTS', 9100: 'Stampa', 27017: 'MongoDB',
    62078: 'iPhone sync', 51820: 'WireGuard',
};

export const serviceName = (port: number) => PORT_SERVICES[port] || 'sconosciuto';
