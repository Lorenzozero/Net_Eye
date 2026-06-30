'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL } from '@/lib/api';
import { X, Copy, Check } from 'lucide-react';

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

export default function TerminalModal({ ip, port, title, hint, onClose }: { ip: number | string; port: number; title: string; hint: string; onClose: () => void }) {
    const [output, setOutput] = useState('');
    const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
    const [input, setInput] = useState('');
    const [copied, setCopied] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const bodyRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const wsBase = API_URL.replace(/^http/, 'ws');
        const ws = new WebSocket(`${wsBase}/api/v1/connect?ip=${encodeURIComponent(String(ip))}&port=${port}`);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;
        ws.onopen = () => setStatus('open');
        ws.onmessage = (ev) => {
            const text = typeof ev.data === 'string' ? ev.data : new TextDecoder('utf-8', { fatal: false }).decode(ev.data as ArrayBuffer);
            setOutput((o) => (o + stripAnsi(text)).slice(-20000));
        };
        ws.onclose = () => setStatus('closed');
        ws.onerror = () => setStatus('closed');
        return () => { try { ws.close(); } catch { /* ignore */ } };
    }, [ip, port]);

    useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [output]);

    const send = () => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(input + '\r\n');
        setOutput((o) => o + input + '\n');   // echo locale
        setInput('');
    };

    const copyHint = () => {
        try { navigator.clipboard?.writeText(hint); } catch { /* ignore */ }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const dot = status === 'open' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-[#0b1020]">
                <div className="flex items-center justify-between px-4 py-2 bg-[#11182c] border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                        <span className="text-xs text-slate-300 font-mono">{title}</span>
                        <span className="text-[10px] text-slate-500">{status === 'open' ? 'connesso' : status === 'connecting' ? 'connessione…' : 'chiuso'}</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>

                <div ref={bodyRef} className="p-4 font-mono text-[12.5px] text-emerald-300 h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap break-words">
                    {output || <span className="text-slate-500">apertura socket…</span>}
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-[#11182c] border-t border-slate-700">
                    <span className="text-emerald-400 font-mono text-sm">{'>'}</span>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                        disabled={status !== 'open'}
                        placeholder={status === 'open' ? 'digita e premi Invio (es. richiesta HTTP, comando Redis/Telnet…)' : 'in attesa di connessione…'}
                        className="flex-1 bg-transparent outline-none text-slate-100 font-mono text-sm placeholder:text-slate-600 disabled:opacity-50"
                        autoFocus
                    />
                    <button onClick={send} disabled={status !== 'open'} className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">Invia</button>
                </div>

                <div className="flex items-center justify-between px-4 py-2 bg-[#0e1424] border-t border-slate-700 text-[11px] text-slate-400">
                    <span>Socket TCP <span className="text-emerald-400">reale</span>. Per client dedicati: <code className="text-slate-300">{hint}</code></span>
                    <button onClick={copyHint} className="inline-flex items-center gap-1 text-slate-300 hover:text-white">
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{copied ? 'copiato' : 'copia'}
                    </button>
                </div>
            </div>
        </div>
    );
}
