import { describe, it, expect } from 'vitest';
import { getConnection } from '../lib/connect';
import { serviceName } from '../lib/services';

describe('getConnection', () => {
    it('porta 80 → apre nel browser (http, senza porta)', () => {
        const c = getConnection('192.168.1.1', 80);
        expect(c.kind).toBe('web');
        if (c.kind === 'web') expect(c.url).toBe('http://192.168.1.1');
    });

    it('porta 443 → https senza porta esplicita', () => {
        const c = getConnection('10.0.0.5', 443);
        expect(c.kind).toBe('web');
        if (c.kind === 'web') expect(c.url).toBe('https://10.0.0.5');
    });

    it('porta 8080 → include la porta nell URL', () => {
        const c = getConnection('10.0.0.5', 8080);
        expect(c.kind).toBe('web');
        if (c.kind === 'web') expect(c.url).toBe('http://10.0.0.5:8080');
    });

    it('porta 22 → socket con hint ssh', () => {
        const c = getConnection('192.168.1.10', 22);
        expect(c.kind).toBe('socket');
        if (c.kind === 'socket') expect(c.hint).toBe('ssh user@192.168.1.10');
    });

    it('porta 3389 → hint RDP', () => {
        const c = getConnection('192.168.1.10', 3389);
        if (c.kind === 'socket') expect(c.hint).toBe('mstsc /v:192.168.1.10');
    });

    it('porta sconosciuta → fallback netcat', () => {
        const c = getConnection('192.168.1.10', 12345);
        expect(c.kind).toBe('socket');
        if (c.kind === 'socket') expect(c.hint).toBe('nc 192.168.1.10 12345');
    });
});

describe('serviceName', () => {
    it('mappa le porte note', () => {
        expect(serviceName(443)).toBe('HTTPS');
        expect(serviceName(22)).toBe('SSH');
        expect(serviceName(53)).toBe('DNS');
        expect(serviceName(3389)).toBe('RDP');
    });

    it('porta sconosciuta → "sconosciuto"', () => {
        expect(serviceName(99999)).toBe('sconosciuto');
    });
});
