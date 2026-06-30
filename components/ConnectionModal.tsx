'use client';

import { Connection } from '@/lib/api';
import { X, ArrowRight, Globe, Laptop } from 'lucide-react';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-xs font-bold text-gray-500 uppercase">{label}</label>
        <span className="text-sm text-gray-900 dark:text-white">{children}</span>
    </div>
);

export default function ConnectionModal({ conn, onClose }: { conn: Connection; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200/70 dark:border-white/10">
                <div className="flex items-center justify-between p-4 border-b border-slate-200/70 dark:border-white/10">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dettaglio flusso</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="p-4 space-y-4">
                    {/* sorgente → destinazione */}
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                        <div className="text-center flex-1 min-w-0">
                            <Laptop className="w-6 h-6 mx-auto text-indigo-500" />
                            <div className="text-xs font-medium text-gray-900 dark:text-white truncate mt-1">{conn.fromHost}</div>
                            <div className="text-[10px] text-gray-400">sorgente</div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 shrink-0" />
                        <div className="text-center flex-1 min-w-0">
                            <Globe className={`w-6 h-6 mx-auto ${conn.scope === 'LAN' ? 'text-green-500' : 'text-indigo-500'}`} />
                            <div className="text-xs font-medium text-gray-900 dark:text-white truncate mt-1" title={conn.remoteHost || conn.remoteIp}>{conn.remoteHost || conn.remoteIp}</div>
                            <div className="text-[10px] text-gray-400">destinazione</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Servizio"><span className="text-indigo-600 dark:text-indigo-400 font-medium">{conn.service}</span></Field>
                        <Field label="Protocollo">{conn.proto}</Field>
                        <Field label="IP destinazione"><span className="font-mono">{conn.remoteIp}:{conn.remotePort}</span></Field>
                        <Field label="Ambito">
                            <span className={conn.scope === 'LAN' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}>{conn.scope}</span>
                        </Field>
                        <Field label="Connessioni">{conn.count}</Field>
                        {conn.remoteHost && <Field label="Host remoto"><span className="break-all">{conn.remoteHost}</span></Field>}
                    </div>
                </div>

                <div className="flex justify-end p-4 border-t border-slate-200/70 dark:border-white/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">Chiudi</button>
                </div>
            </div>
        </div>
    );
}
