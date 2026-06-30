'use client';

import { useEffect, useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

export default function TerminalModal({ title, command, lines, onClose }: { title: string; command: string; lines: string[]; onClose: () => void }) {
    const [typed, setTyped] = useState('');
    const [shown, setShown] = useState<string[]>([]);
    const [cmdDone, setCmdDone] = useState(false);
    const [copied, setCopied] = useState(false);

    // Fase 1: digita il comando carattere per carattere
    useEffect(() => {
        let i = 0;
        const id = setInterval(() => {
            i++;
            setTyped(command.slice(0, i));
            if (i >= command.length) { clearInterval(id); setCmdDone(true); }
        }, 30);
        return () => clearInterval(id);
    }, [command]);

    // Fase 2: rivela le righe di output una alla volta
    useEffect(() => {
        if (!cmdDone) return;
        let i = 0;
        const id = setInterval(() => {
            const line = lines[i];
            setShown((s) => [...s, line]);
            i++;
            if (i >= lines.length) clearInterval(id);
        }, 380);
        return () => clearInterval(id);
    }, [cmdDone, lines]);

    const copy = () => {
        try { navigator.clipboard?.writeText(command); } catch { /* ignore */ }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-xl rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-[#0b1020]">
                <div className="flex items-center justify-between px-4 py-2 bg-[#11182c] border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="ml-2 text-xs text-slate-300 font-mono">{title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={copy} className="text-xs text-slate-300 hover:text-white inline-flex items-center gap-1">
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{copied ? 'copiato' : 'copia'}
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="p-4 font-mono text-[13px] text-emerald-300 h-72 overflow-y-auto leading-relaxed">
                    <div>
                        <span className="text-sky-400">user@networkscope</span>:<span className="text-indigo-400">~</span>$ <span className="text-slate-100">{typed}</span>
                        {!cmdDone && <span className="animate-pulse">▌</span>}
                    </div>
                    {shown.map((l, i) => <div key={i} className="text-slate-300 whitespace-pre-wrap">{l}</div>)}
                    {cmdDone && shown.length >= lines.length && <span className="animate-pulse text-slate-400">▌</span>}
                </div>

                <div className="px-4 py-2 bg-[#11182c] border-t border-slate-700 text-[11px] text-slate-400">
                    Sessione <span className="text-slate-300">simulata</span> · copia il comando per connetterti dal tuo terminale reale.
                </div>
            </div>
        </div>
    );
}
