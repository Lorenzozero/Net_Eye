'use client';

import { useEffect, useState, Fragment } from 'react';
import { fetchFlows, PacketFlow } from '@/lib/api';
import {
    Radio, ChevronRight, AlertTriangle, ShieldCheck, Lock, Unlock,
    Search, Filter, Globe, Terminal, Info, Code, Eye
} from 'lucide-react';

const fmtBytes = (b: number) => {
    if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    if (b >= 1e3) return `${(b / 1e3).toFixed(1)} KB`;
    return `${b} B`;
};

// Spiegazioni chiare e accessibili per chi non è esperto di reti
const describeProtocol = (service: string, port: number) => {
    const s = (service || '').toUpperCase();
    if (s.includes('HTTPS') || port === 443) {
        return {
            friendly: 'Navigazione Web Sicura',
            simpleDesc: 'Connessione web protetta da crittografia moderna. I tuoi dati personali (password, sessioni) sono completamente illeggibili a chiunque sulla rete.',
            security: 'cifrato',
        };
    }
    if (s.includes('HTTP') || port === 80) {
        return {
            friendly: 'Sito Web Tradizionale (In Chiaro)',
            simpleDesc: 'Connessione web standard senza crittografia. Adatta per consultare pagine pubbliche, ma i dati viaggiano in chiaro.',
            security: 'in_chiaro',
        };
    }
    if (s.includes('DNS') || port === 53 || port === 853) {
        return {
            friendly: 'Risoluzione Nomi (DNS)',
            simpleDesc: 'Traduce i nomi dei siti (es. google.com) nell’indirizzo IP del server. È la "rubrica telefonica" di Internet.',
            security: port === 853 ? 'cifrato' : 'in_chiaro',
        };
    }
    if (s.includes('SSH') || port === 22) {
        return {
            friendly: 'Terminale Remoto Cifrato',
            simpleDesc: 'Accesso di comando amministrativo sicuro verso un server, Raspberry Pi o macchina remota.',
            security: 'cifrato',
        };
    }
    if (s.includes('QUIC')) {
        return {
            friendly: 'Web Ultra-Rapido Moderno',
            simpleDesc: 'Nuovo standard Internet (HTTP/3 via UDP) per connessioni ad altissima velocità e cifratura integrata.',
            security: 'cifrato',
        };
    }
    if (s.includes('SMB') || port === 445 || port === 139) {
        return {
            friendly: 'Condivisione File Windows/LAN',
            simpleDesc: 'Scambio di cartelle, dischi condivisi o stampanti all’interno della rete di casa o ufficio.',
            security: 'lan',
        };
    }
    if (s.includes('NTP') || port === 123) {
        return {
            friendly: 'Sincronizzazione Orologio',
            simpleDesc: 'Verifica periodica per mantenere l’ora e la data del tuo computer sincronizzate al millisecondo.',
            security: 'standard',
        };
    }
    if (s.includes('RTSP') || port === 554) {
        return {
            friendly: 'Flusso Video Telecamera',
            simpleDesc: 'Streaming in tempo reale da videocamere di sorveglianza IP o citofoni smart.',
            security: 'standard',
        };
    }
    if (s.includes('MQTT') || port === 1883 || port === 8883) {
        return {
            friendly: 'Dispositivi Smart Home / IoT',
            simpleDesc: 'Piccoli pacchetti di stato o comandi inviati da sensori, prese o lampadine domotiche.',
            security: port === 8883 ? 'cifrato' : 'in_chiaro',
        };
    }
    if (s.includes('TLS') || s.includes('SSL')) {
        return {
            friendly: 'Tunnel Crittografato Sicuro',
            simpleDesc: 'Scambio dati completamente blindato con crittografia end-to-end.',
            security: 'cifrato',
        };
    }
    return {
        friendly: service || `Porta ${port}`,
        simpleDesc: 'Comunicazione standard tra applicazioni di rete per scambio dati o servizi locali.',
        security: 'standard',
    };
};

// Estrae parole o stringhe leggibili in chiaro dal payload per utenti non tecnici
function extractPrintableText(hex: string): string[] {
    if (!hex) return [];
    const bytes: number[] = [];
    for (let i = 0; i + 1 < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
    let current = '';
    const strings: string[] = [];
    for (const b of bytes) {
        if (b >= 32 && b <= 126) {
            current += String.fromCharCode(b);
        } else {
            if (current.length >= 4) {
                const trimmed = current.trim();
                if (trimmed && !/^[0-9\s.,]+$/.test(trimmed)) strings.push(trimmed);
            }
            current = '';
        }
    }
    if (current.length >= 4) {
        const trimmed = current.trim();
        if (trimmed && !/^[0-9\s.,]+$/.test(trimmed)) strings.push(trimmed);
    }
    // Rimuove duplicati e limita
    return [...new Set(strings)].slice(0, 6);
}

// Dump stile Wireshark per utenti tecnici
function HexDump({ hex }: { hex: string }) {
    const bytes: number[] = [];
    for (let i = 0; i + 1 < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
    const rows: React.ReactNode[] = [];
    for (let off = 0; off < bytes.length; off += 16) {
        const slice = bytes.slice(off, off + 16);
        const hexPart = slice.map((b) => b.toString(16).padStart(2, '0')).join(' ');
        const asciiPart = slice.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');
        rows.push(
            <div key={off} className="flex gap-3 whitespace-pre">
                <span className="text-slate-400 dark:text-slate-500">{off.toString(16).padStart(4, '0')}</span>
                <span className="text-indigo-600 dark:text-indigo-300 flex-1">{hexPart.padEnd(47, ' ')}</span>
                <span className="text-emerald-600 dark:text-emerald-400">{asciiPart}</span>
            </div>
        );
    }
    return (
        <div className="font-mono text-[11px] leading-relaxed bg-slate-50 dark:bg-black/50 rounded-lg p-3 overflow-x-auto border border-slate-200/60 dark:border-white/10">
            {rows}
        </div>
    );
}

export default function PacketFlowsTable() {
    const [data, setData] = useState<{ active: boolean; reason: string; packets: number; flows: PacketFlow[] } | null>(null);
    const [open, setOpen] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<Record<string, 'simple' | 'hex'>>({});
    const [filter, setFilter] = useState<'all' | 'encrypted' | 'web' | 'dns' | 'threats'>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        let alive = true;
        const load = () => fetchFlows().then((d) => { if (alive) setData(d); }).catch(() => { });
        load();
        const t = setInterval(load, 3000);
        return () => { alive = false; clearInterval(t); };
    }, []);

    if (!data) return null;

    // Statistiche calcolate per la testata
    const totalFlows = data.flows.length;
    const encryptedFlows = data.flows.filter((f) => {
        const info = describeProtocol(f.service, f.remotePort);
        return info.security === 'cifrato';
    }).length;
    const encryptedPercent = totalFlows > 0 ? Math.round((encryptedFlows / totalFlows) * 100) : 0;
    const threatFlows = data.flows.filter((f) => !!f.threat);

    // Filtro attivo
    const filteredFlows = data.flows.filter((f) => {
        const info = describeProtocol(f.service, f.remotePort);
        if (filter === 'encrypted' && info.security !== 'cifrato') return false;
        if (filter === 'web' && !['HTTPS', 'HTTP', 'QUIC'].some((w) => f.service.toUpperCase().includes(w) || f.remotePort === 443 || f.remotePort === 80)) return false;
        if (filter === 'dns' && !f.service.toUpperCase().includes('DNS') && f.remotePort !== 53) return false;
        if (filter === 'threats' && !f.threat) return false;

        if (search.trim()) {
            const q = search.toLowerCase();
            const target = `${f.remoteHost || ''} ${f.remoteIp} ${f.service} ${f.remotePort} ${info.friendly}`.toLowerCase();
            return target.includes(q);
        }
        return true;
    });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-slate-200/70 dark:border-white/10 mb-8">
            {/* Titolo e Badge Stato */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                        <Radio className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Analisi Pacchetti & Flussi dal Vivo</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Ispezione in tempo reale dei dati scambiati tra questo dispositivo e la rete.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                        data.active
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${data.active ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        {data.active ? `Cattura attiva (${data.packets.toLocaleString('it-IT')} pacchetti)` : 'Cattura non attiva'}
                    </span>
                </div>
            </div>

            {/* Tre schede sintetiche per i non-tecnici */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="bg-slate-50 dark:bg-gray-900/40 rounded-xl p-3.5 border border-slate-200/60 dark:border-white/5">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Flussi in Corso</span>
                        <Radio className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{totalFlows}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">connessioni attive campionate</div>
                </div>

                <div className="bg-slate-50 dark:bg-gray-900/40 rounded-xl p-3.5 border border-slate-200/60 dark:border-white/5">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Crittografia e Privacy</span>
                        <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{encryptedPercent}% protetto</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{encryptedFlows} flussi con dati cifrati (TLS/HTTPS)</div>
                </div>

                <div className="bg-slate-50 dark:bg-gray-900/40 rounded-xl p-3.5 border border-slate-200/60 dark:border-white/5">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Sicurezza & Minacce</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    {threatFlows.length === 0 ? (
                        <>
                            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">0 anomalie</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">Tutte le porte note sono legittime</div>
                        </>
                    ) : (
                        <>
                            <div className="text-xl font-bold text-red-600 dark:text-red-400">{threatFlows.length} sospette</div>
                            <div className="text-[11px] text-red-500 dark:text-red-400 mt-0.5">Verifica porte trojan o IP malevoli</div>
                        </>
                    )}
                </div>
            </div>

            {/* Barra filtri rapidi e ricerca */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                            filter === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-slate-200'
                        }`}
                    >
                        Tutti ({totalFlows})
                    </button>
                    <button
                        onClick={() => setFilter('encrypted')}
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                            filter === 'encrypted'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-slate-200'
                        }`}
                    >
                        <Lock className="w-3 h-3" /> Cifrati ({encryptedFlows})
                    </button>
                    <button
                        onClick={() => setFilter('web')}
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                            filter === 'web'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-slate-200'
                        }`}
                    >
                        <Globe className="w-3 h-3" /> Solo Web
                    </button>
                    <button
                        onClick={() => setFilter('dns')}
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                            filter === 'dns'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-slate-200'
                        }`}
                    >
                        DNS
                    </button>
                    {threatFlows.length > 0 && (
                        <button
                            onClick={() => setFilter('threats')}
                            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                                filter === 'threats'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200'
                            }`}
                        >
                            <AlertTriangle className="w-3 h-3" /> Anomalie ({threatFlows.length})
                        </button>
                    )}
                </div>

                <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Filtra host o servizio..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/40 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-48"
                    />
                </div>
            </div>

            {!data.active && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 mb-4">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Cattura pacchetti non attiva ({data.reason}). Con Npcap/libpcap attivo puoi vedere i byte reali e i payload di ogni connessione.</span>
                </div>
            )}

            {data.active && filteredFlows.length === 0 && (
                <div className="text-sm text-gray-400 py-8 text-center bg-slate-50/50 dark:bg-gray-900/20 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
                    Nessun flusso corrispondente ai filtri selezionati.
                </div>
            )}

            {filteredFlows.length > 0 && (
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-sm text-left divide-y divide-gray-200 dark:divide-gray-700">
                        <thead>
                            <tr className="text-xs uppercase text-gray-400 bg-slate-50/70 dark:bg-gray-900/30">
                                <th className="py-2.5 px-3 w-8"></th>
                                <th className="py-2.5 px-3">Destinazione & Host</th>
                                <th className="py-2.5 px-3">Cosa Fa (Protocollo)</th>
                                <th className="py-2.5 px-3">Privacy / Sicurezza</th>
                                <th className="py-2.5 px-3 text-right">Pacchetti</th>
                                <th className="py-2.5 px-3 text-right">Dati Reali</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {filteredFlows.map((f) => {
                                const id = `${f.remoteIp}:${f.remotePort}`;
                                const isOpen = open === id;
                                const protoInfo = describeProtocol(f.service, f.remotePort);
                                const currentMode = viewMode[id] || 'simple';
                                const readableStrings = extractPrintableText(f.payloadHex || '');

                                return (
                                    <Fragment key={id}>
                                        <tr
                                            onClick={() => setOpen(isOpen ? null : id)}
                                            className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${
                                                f.threat ? 'bg-red-50/60 dark:bg-red-900/10' : ''
                                            }`}
                                        >
                                            <td className="py-3 px-3">
                                                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90 text-indigo-500' : ''}`} />
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="font-medium text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-xs" title={f.remoteHost || f.remoteIp}>
                                                    {f.remoteHost || f.remoteIp}
                                                </div>
                                                <div className="text-xs text-gray-400 font-mono">
                                                    {f.remoteIp}:{f.remotePort} ({f.proto.toUpperCase()})
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                                    <span>{protoInfo.friendly}</span>
                                                    {f.inspected && (
                                                        <span className="text-[10px] font-semibold rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2" title="Ispezione profonda sul payload">
                                                            DPI
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                                                    {f.service}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                {f.threat ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                                        <AlertTriangle className="w-3 h-3" /> Minaccia: {f.threat}
                                                    </span>
                                                ) : protoInfo.security === 'cifrato' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                                        <Lock className="w-3 h-3" /> Cifrato (Sicuro)
                                                    </span>
                                                ) : protoInfo.security === 'in_chiaro' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                                                        <Unlock className="w-3 h-3" /> Dati in chiaro
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                                                        Standard LAN
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                                                {f.packets.toLocaleString('it-IT')}
                                            </td>
                                            <td className="py-3 px-3 text-right tabular-nums font-semibold text-gray-900 dark:text-white">
                                                {fmtBytes(f.bytes)}
                                            </td>
                                        </tr>

                                        {/* Vista Dettaglio Espanso */}
                                        {isOpen && (
                                            <tr className="bg-slate-50/80 dark:bg-black/30 border-b border-indigo-100 dark:border-white/5">
                                                <td colSpan={6} className="p-4 sm:p-5">
                                                    {/* Toggle Semplice / Tecnico */}
                                                    <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-white/10 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setViewMode({ ...viewMode, [id]: 'simple' });
                                                                }}
                                                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                                                    currentMode === 'simple'
                                                                        ? 'bg-indigo-600 text-white'
                                                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-slate-100'
                                                                }`}
                                                            >
                                                                <Eye className="w-3 h-3" /> Spiegazione Semplice
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setViewMode({ ...viewMode, [id]: 'hex' });
                                                                }}
                                                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                                                    currentMode === 'hex'
                                                                        ? 'bg-indigo-600 text-white'
                                                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-slate-100'
                                                                }`}
                                                            >
                                                                <Code className="w-3 h-3" /> Dump Esadecimale (Wireshark)
                                                            </button>
                                                        </div>

                                                        <span className="text-xs text-gray-400 font-mono">
                                                            Payload: {f.payloadLen} byte
                                                        </span>
                                                    </div>

                                                    {/* Contenuto Modalità Semplice */}
                                                    {currentMode === 'simple' ? (
                                                        <div className="space-y-3">
                                                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-slate-200/60 dark:border-white/5">
                                                                <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1 flex items-center gap-1.5">
                                                                    <Info className="w-3.5 h-3.5 text-indigo-500" /> Cosa fa questo flusso
                                                                </h4>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                                    {protoInfo.simpleDesc}
                                                                </p>
                                                            </div>

                                                            {readableStrings.length > 0 && (
                                                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-slate-200/60 dark:border-white/5">
                                                                    <h4 className="text-xs font-semibold uppercase text-gray-400 mb-1.5 flex items-center gap-1.5">
                                                                        <Terminal className="w-3.5 h-3.5 text-indigo-500" /> Testo leggibile intercettato nel pacchetto
                                                                    </h4>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {readableStrings.map((txt, idx) => (
                                                                            <span
                                                                                key={idx}
                                                                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-700 font-mono text-xs text-gray-800 dark:text-gray-200"
                                                                            >
                                                                                {txt}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {!f.payloadHex && (
                                                                <div className="text-xs text-gray-400 italic">
                                                                    Nessun pacchetto dati applicativo nel segmento campionato (connessione cifrata o solo handshake iniziale ACK/SYN).
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        /* Contenuto Modalità Hex Wireshark */
                                                        <div>
                                                            {f.payloadHex ? (
                                                                <HexDump hex={f.payloadHex} />
                                                            ) : (
                                                                <div className="text-xs text-gray-400 py-2">
                                                                    Nessun payload campionato disponibile per questo flusso.
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
