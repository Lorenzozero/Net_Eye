'use client';

import { Connection } from '@/lib/api';
import { X, ArrowRight, Globe, Laptop, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-xs font-bold text-gray-500 uppercase">{label}</label>
        <span className="text-sm text-gray-900 dark:text-white">{children}</span>
    </div>
);

const fmtBytes = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${(b / 1e3).toFixed(0)} KB` : `${b} B`);

// Bandiera emoji dal codice paese ISO-2.
const flag = (cc?: string | null) =>
    cc && cc.length === 2 ? cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0))) : '';

export default function ConnectionModal({ conn, onClose }: { conn: Connection; onClose: () => void }) {
    const malicious = conn.malicious || 0;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col border border-slate-200/70 dark:border-white/10">
                <div className="flex items-center justify-between p-4 border-b border-slate-200/70 dark:border-white/10">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dettaglio flusso</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto">
                    {/* Avviso minaccia / VirusTotal */}
                    {malicious > 0 && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-red-700 dark:text-red-300">
                            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <b>IP segnalato MALEVOLO</b> da {malicious} motori su VirusTotal.
                                <a href={`https://www.virustotal.com/gui/ip-address/${conn.remoteIp}`} target="_blank" rel="noopener" className="underline ml-1">Apri report ↗</a>
                            </div>
                        </div>
                    )}
                    {conn.threat && (
                        <div className="flex items-start gap-2 rounded-lg border border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-3 text-orange-700 dark:text-orange-300 text-sm">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /> Porta {conn.remotePort} nota per: <b>{conn.threat}</b>
                        </div>
                    )}

                    {/* sorgente → destinazione */}
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                        <div className="text-center flex-1 min-w-0">
                            <Laptop className="w-6 h-6 mx-auto text-indigo-500" />
                            <div className="text-xs font-medium text-gray-900 dark:text-white truncate mt-1">{conn.fromHost}</div>
                            <div className="text-[10px] text-gray-400">{conn.process || 'sorgente'}</div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 shrink-0" />
                        <div className="text-center flex-1 min-w-0">
                            <Globe className={`w-6 h-6 mx-auto ${malicious > 0 ? 'text-red-500' : conn.scope === 'LAN' ? 'text-green-500' : 'text-indigo-500'}`} />
                            <div className="text-xs font-medium text-gray-900 dark:text-white truncate mt-1" title={conn.remoteHost || conn.remoteIp}>{flag(conn.countryCode)} {conn.remoteHost || conn.remoteIp}</div>
                            <div className="text-[10px] text-gray-400">{[conn.city, conn.country].filter(Boolean).join(', ') || 'destinazione'}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Servizio">
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">{conn.service}</span>
                            {conn.inspected && <span className="ml-1 text-[10px] align-middle rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1 py-0.5" title="Riconosciuto dal payload reale (deep packet inspection)">DPI</span>}
                        </Field>
                        <Field label="Protocollo">{conn.proto}</Field>
                        {conn.protocolDesc && <Field label="Descrizione IANA"><span className="text-xs">{conn.protocolDesc}</span></Field>}
                        {typeof conn.bytes === 'number' && conn.bytes > 0 && <Field label="Byte reali (pcap)">{fmtBytes(conn.bytes)}</Field>}
                        <Field label="IP destinazione"><span className="font-mono">{conn.remoteIp}:{conn.remotePort}</span></Field>
                        <Field label="Ambito"><span className={conn.scope === 'LAN' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}>{conn.scope}</span></Field>
                        {conn.process && <Field label="Programma">{conn.process}</Field>}
                        <Field label="Connessioni">{conn.count}</Field>
                        {conn.geoSource && <Field label="Fonte geo">{conn.geoSource === 'maxmind' ? 'MaxMind' : 'ip-api'}</Field>}
                        {conn.org && <Field label="Organizzazione"><span className="break-all">{conn.org}</span></Field>}
                        {conn.asn && <Field label="ASN">{conn.asn}</Field>}
                        {(conn.country || conn.city) && <Field label="Località">{flag(conn.countryCode)} {[conn.city, conn.country].filter(Boolean).join(', ')}</Field>}
                        {conn.remoteHost && conn.remoteHost !== conn.org && <Field label="Host remoto"><span className="break-all">{conn.remoteHost}</span></Field>}
                        {conn.vt && malicious === 0 && (
                            <Field label="VirusTotal"><span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400"><ShieldCheck className="w-4 h-4" /> pulito</span></Field>
                        )}
                    </div>
                </div>

                <div className="flex justify-end p-4 border-t border-slate-200/70 dark:border-white/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">Chiudi</button>
                </div>
            </div>
        </div>
    );
}
