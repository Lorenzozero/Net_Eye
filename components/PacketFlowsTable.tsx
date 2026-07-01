'use client';

import { useEffect, useState, Fragment } from 'react';
import { fetchFlows, PacketFlow } from '@/lib/api';
import { Radio, ChevronRight, AlertTriangle } from 'lucide-react';

const fmtBytes = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${(b / 1e3).toFixed(1)} KB` : `${b} B`);

// Rende il payload esadecimale come un dump stile Wireshark: offset | 16 byte hex | ASCII.
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
    return <div className="font-mono text-[11px] leading-relaxed bg-slate-50 dark:bg-black/40 rounded-lg p-3 overflow-x-auto">{rows}</div>;
}

export default function PacketFlowsTable() {
    const [data, setData] = useState<{ active: boolean; reason: string; packets: number; flows: PacketFlow[] } | null>(null);
    const [open, setOpen] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        const load = () => fetchFlows().then((d) => { if (alive) setData(d); }).catch(() => { });
        load();
        const t = setInterval(load, 3000);
        return () => { alive = false; clearInterval(t); };
    }, []);

    if (!data) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-slate-200/70 dark:border-white/10 mb-8">
            <div className="flex items-center gap-2 mb-1">
                <Radio className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Analisi pacchetti — flussi catturati</h3>
                <span className={`ml-auto text-xs flex items-center gap-1 ${data.active ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${data.active ? 'bg-green-500' : 'bg-amber-500'}`} />
                    {data.active ? `cattura attiva · ${data.packets.toLocaleString('it-IT')} pacchetti` : 'cattura non attiva'}
                </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Byte reali per flusso dal driver di cattura. Clicca una riga per il dump del payload (HEX/ASCII).</p>

            {!data.active && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Cattura pacchetti non attiva ({data.reason}). Installa Npcap/libpcap e avvia il backend con i privilegi adeguati per vedere i byte reali e i payload.</span>
                </div>
            )}

            {data.active && data.flows.length === 0 && (
                <div className="text-sm text-gray-400 py-6 text-center">In attesa di traffico… (nessun flusso ancora catturato)</div>
            )}

            {data.flows.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase text-gray-400 border-b border-slate-200/70 dark:border-white/10">
                                <th className="py-2 pr-2 w-6"></th>
                                <th className="py-2 pr-3">Host remoto</th>
                                <th className="py-2 pr-3">Porta</th>
                                <th className="py-2 pr-3">Proto</th>
                                <th className="py-2 pr-3 text-right">Pacchetti</th>
                                <th className="py-2 pr-3 text-right">Byte reali</th>
                                <th className="py-2 pr-3">Protocollo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.flows.map((f) => {
                                const id = `${f.remoteIp}:${f.remotePort}`;
                                const isOpen = open === id;
                                return (
                                    <Fragment key={id}>
                                        <tr
                                            onClick={() => setOpen(isOpen ? null : id)}
                                            className={`border-b border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${f.threat ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                        >
                                            <td className="py-2 pr-2"><ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} /></td>
                                            <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white truncate max-w-[220px]" title={f.remoteHost || f.remoteIp}>{f.remoteHost || f.remoteIp}</td>
                                            <td className="py-2 pr-3 font-mono text-gray-500">{f.remotePort}</td>
                                            <td className="py-2 pr-3 uppercase text-gray-500">{f.proto}</td>
                                            <td className="py-2 pr-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{f.packets.toLocaleString('it-IT')}</td>
                                            <td className="py-2 pr-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">{fmtBytes(f.bytes)}</td>
                                            <td className="py-2 pr-3">
                                                <span className="text-indigo-600 dark:text-indigo-400">{f.service}</span>
                                                {f.inspected && <span className="ml-1 text-[10px] rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1 py-0.5" title="Riconosciuto dal payload reale">DPI</span>}
                                                {f.threat && <span className="ml-1 text-[10px] rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1 py-0.5">⚠ {f.threat}</span>}
                                            </td>
                                        </tr>
                                        {isOpen && (
                                            <tr className="bg-slate-50/50 dark:bg-black/20">
                                                <td colSpan={7} className="p-3">
                                                    {f.payloadHex
                                                        ? <><div className="text-xs text-gray-400 mb-1">Payload campionato ({f.payloadLen} byte) — {f.remoteIp}:{f.remotePort}</div><HexDump hex={f.payloadHex} /></>
                                                        : <div className="text-xs text-gray-400">Nessun payload campionato per questo flusso (es. solo handshake/ACK, oppure traffico cifrato senza dati applicativi nel primo segmento).</div>}
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
