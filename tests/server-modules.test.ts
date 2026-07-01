import { describe, it, expect } from 'vitest';
import { checkToken, tokenFromRequest, createTicketStore } from '../lib/server/auth.mjs';
import { ttlOs, isRandomMac, isPrivateIp, parseArpTable, ouiPrefix, ouiVendor } from '../lib/server/netparse.mjs';
import { classifyFlow, dpiStatus } from '../lib/server/dpi.mjs';
import { computeBackoff, geoStatus } from '../lib/server/geo.mjs';

describe('auth: checkToken', () => {
    it('accesso aperto se nessun token atteso', () => {
        expect(checkToken(null, undefined)).toBe(true);
        expect(checkToken('', 'qualsiasi')).toBe(true);
    });
    it('richiede corrispondenza esatta quando il token è impostato', () => {
        expect(checkToken('segreto', 'segreto')).toBe(true);
        expect(checkToken('segreto', 'sbagliato')).toBe(false);
        expect(checkToken('segreto', undefined)).toBe(false);
    });
});

describe('auth: tokenFromRequest', () => {
    it('legge header x-ns-token', () => {
        expect(tokenFromRequest({ headers: { 'x-ns-token': 'abc' }, url: '/api/v1/x' })).toBe('abc');
    });
    it('fallback su query ?token=', () => {
        expect(tokenFromRequest({ headers: {}, url: '/api/v1/x?token=xyz' })).toBe('xyz');
    });
});

describe('auth: createTicketStore', () => {
    it('emette e consuma una sola volta', () => {
        let n = 0;
        const store = createTicketStore({ ttlMs: 1000, randomHex: () => `t${++n}` });
        const t = store.issue();
        expect(t).toBe('t1');
        expect(store.consume(t)).toBe(true);
        expect(store.consume(t)).toBe(false); // già consumato
    });
    it('rifiuta ticket sconosciuti o scaduti', () => {
        const store = createTicketStore({ ttlMs: -1, randomHex: () => 'scaduto' });
        expect(store.consume('mai-emesso')).toBe(false);
        const t = store.issue();
        expect(store.consume(t)).toBe(false); // ttl negativo → già scaduto
    });
});

describe('netparse: ttlOs', () => {
    it('mappa il TTL alla famiglia OS', () => {
        expect(ttlOs(64)).toBe('Linux/Unix');
        expect(ttlOs(128)).toBe('Windows');
        expect(ttlOs(255)).toBe('Embedded/Network');
        expect(ttlOs(0)).toBe(null);
    });
});

describe('netparse: isRandomMac', () => {
    it('riconosce i MAC localmente amministrati (randomizzati)', () => {
        expect(isRandomMac('62:60:63:A7:87:BC')).toBe(true);  // bit 0x02 attivo
        expect(isRandomMac('90:1B:0E:41:E8:94')).toBe(false); // MAC OUI reale
        expect(isRandomMac(null)).toBe(false);
    });
});

describe('netparse: isPrivateIp', () => {
    it('riconosce gli IP privati/locali', () => {
        expect(isPrivateIp('192.168.1.1')).toBe(true);
        expect(isPrivateIp('10.0.0.5')).toBe(true);
        expect(isPrivateIp('172.16.5.5')).toBe(true);
        expect(isPrivateIp('172.32.5.5')).toBe(false);
        expect(isPrivateIp('8.8.8.8')).toBe(false);
    });
});

describe('netparse: parseArpTable', () => {
    it('estrae ip→MAC e scarta broadcast/multicast', () => {
        const out = [
            'Interface: 192.168.1.10 --- 0x5',
            '  192.168.1.1           00-11-22-33-44-55     dynamic',
            '  192.168.1.20          aa-bb-cc-dd-ee-ff     dynamic',
            '  192.168.1.255         ff-ff-ff-ff-ff-ff     static',
            '  224.0.0.22            01-00-5e-00-00-16     static',
        ].join('\n');
        const map = parseArpTable(out);
        expect(map['192.168.1.1']).toBe('00:11:22:33:44:55');
        expect(map['192.168.1.20']).toBe('AA:BB:CC:DD:EE:FF');
        expect(map['192.168.1.255']).toBeUndefined();  // broadcast
        expect(map['224.0.0.22']).toBeUndefined();      // multicast
    });
    it('gestisce input vuoto', () => {
        expect(parseArpTable('')).toEqual({});
        expect(parseArpTable(undefined)).toEqual({});
    });
});

describe('netparse: OUI', () => {
    it('normalizza il prefisso e cerca in più tabelle', () => {
        expect(ouiPrefix('90:1B:0E:41:E8:94')).toBe('901B0E');
        const inline = { '901B0E': 'Fujitsu' };
        const ieee = { 'AABBCC': 'Acme' };
        expect(ouiVendor('90:1B:0E:41:E8:94', inline, ieee)).toBe('Fujitsu');
        expect(ouiVendor('AA:BB:CC:00:00:00', inline, ieee)).toBe('Acme');
        expect(ouiVendor('00:00:00:00:00:00', inline, ieee)).toBe(null);
    });
});

describe('dpi: classifyFlow', () => {
    it('riconosce i servizi comuni per porta', () => {
        expect(classifyFlow({ port: 443 }).service).toBe('HTTPS');
        expect(classifyFlow({ port: 22 }).service).toBe('SSH');
        expect(classifyFlow({ port: 3306 }).service).toBe('MySQL');
    });
    it('segnala le porte trojan/worm note', () => {
        expect(classifyFlow({ port: 31337 }).threat).toEqual({ name: 'Back Orifice', kind: 'backdoor' });
        expect(classifyFlow({ port: 12345 }).threat).toEqual({ name: 'NetBus', kind: 'trojan' });
        expect(classifyFlow({ port: 443 }).threat).toBe(null);
    });
    it('riconosce il protocollo dal payload reale (magic bytes)', () => {
        const http = classifyFlow({ port: 12345, payload: Buffer.from('GET / HTTP/1.1\r\n') });
        expect(http.service).toBe('HTTP');
        expect(http.inspected).toBe(true);
        const tls = classifyFlow({ port: 9999, payload: Buffer.from([0x16, 0x03, 0x01, 0x00]) });
        expect(tls.service).toBe('TLS');
    });
    it('espone 6000+ servizi dal registro IANA', () => {
        const s = dpiStatus();
        expect(s.services).toBeGreaterThan(6000);
        expect(s.threats).toBeGreaterThan(50);
    });
});

describe('geo: computeBackoff', () => {
    it('raddoppia su rate-limit e decresce altrimenti', () => {
        expect(computeBackoff(0, true)).toBe(5000);
        expect(computeBackoff(5000, true)).toBe(10000);
        expect(computeBackoff(60000, true)).toBe(60000); // cap
        expect(computeBackoff(5000, false)).toBe(4500);
        expect(computeBackoff(0, false)).toBe(0);
    });
    it('parte con provider ip-api quando MaxMind non è presente', () => {
        expect(geoStatus().provider).toBe('ip-api');
    });
});
