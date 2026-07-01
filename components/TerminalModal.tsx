'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL, WS_TOKEN_QS } from '@/lib/api';
import { X, Copy, Check } from 'lucide-react';

// Parser ANSI minimale (SGR): colora l'output del terminale.
const ANSI_FG: Record<number, string> = {
    30: '#6b7280', 31: '#ef4444', 32: '#22c55e', 33: '#eab308', 34: '#3b82f6', 35: '#a855f7', 36: '#06b6d4', 37: '#e5e7eb',
    90: '#9ca3af', 91: '#f87171', 92: '#4ade80', 93: '#fde047', 94: '#60a5fa', 95: '#c084fc', 96: '#22d3ee', 97: '#f9fafb',
};
function ansiToSpans(text: string) {
    const parts: { text: string; color?: string; bold?: boolean }[] = [];
    let color: string | undefined;
    let bold = false;
    const regex = /\x1b\[([0-9;]*)m/g;
    let idx = 0;
    let m: RegExpExecArray | null;
    const push = (t: string) => { if (t) parts.push({ text: t, color, bold }); };
    while ((m = regex.exec(text))) {
        push(text.slice(idx, m.index));
        idx = regex.lastIndex;
        const codes = m[1].split(';').filter(Boolean).map(Number);
        if (codes.length === 0 || codes.includes(0)) { color = undefined; bold = false; }
        for (const c of codes) {
            if (c === 1) bold = true;
            else if (c === 22) bold = false;
            else if (c === 39) color = undefined;
            else if (ANSI_FG[c]) color = ANSI_FG[c];
        }
    }
    push(text.slice(idx));
    return parts;
}

export default function TerminalModal({ ip, port, title, hint, onClose }: { ip: number | string; port: number; title: string; hint: string; onClose: () => void }) {
    const [output, setOutput] = useState('');
    const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
    const [input, setInput] = useState('');
    const [copied, setCopied] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const bodyRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const wsBase = API_URL.replace(/^http/, 'ws');
        const ws = new WebSocket(`${wsBase}/api/v1/connect?ip=${encodeURIComponent(String(ip))}&port=${port}${WS_TOKEN_QS}`);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;
        ws.onopen = () => { setStatus('open'); bodyRef.current?.focus(); };
        ws.onmessage = (ev) => {
            const text = typeof ev.data === 'string' ? ev.data : new TextDecoder('utf-8', { fatal: false }).decode(ev.data as ArrayBuffer);
            setOutput((o) => (o + text).slice(-30000));
        };
        ws.onclose = () => setStatus('closed');
        ws.onerror = () => setStatus('closed');
        return () => { try { ws.close(); } catch { /* ignore */ } };
    }, [ip, port]);

    useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [output]);

    const sendRaw = (data: string) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
    };

    // Input carattere-per-carattere (utile per Telnet/sessioni interattive)
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (status !== 'open') return;
        let data: string | null = null;
        if (e.key === 'Enter') data = '\r\n';
        else if (e.key === 'Backspace') data = '\x7f';
        else if (e.key === 'Tab') data = '\t';
        else if (e.ctrlKey && e.key.length === 1) {
            const code = e.key.toUpperCase().charCodeAt(0);
            if (code >= 64 && code <= 95) data = String.fromCharCode(code - 64); // Ctrl+C, Ctrl+D, ecc.
        } else if (e.key.length === 1 && !e.metaKey && !e.altKey && !e.ctrlKey) data = e.key;
        if (data !== null) { e.preventDefault(); sendRaw(data); }
    };

    const sendLine = () => { sendRaw(input + '\r\n'); setOutput((o) => o + input + '\n'); setInput(''); };

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
                        <span className="text-[10px] text-slate-500">{status === 'open' ? 'connesso · interattivo' : status === 'connecting' ? 'connessione…' : 'chiuso'}</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>

                <div
                    ref={bodyRef}
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    className="p-4 font-mono text-[12.5px] text-emerald-300 h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap break-words outline-none focus:ring-1 focus:ring-indigo-500/40"
                >
                    {output ? ansiToSpans(output).map((p, i) => (
                        <span key={i} style={{ color: p.color, fontWeight: p.bold ? 700 : undefined }}>{p.text}</span>
                    )) : <span className="text-slate-500">apertura socket…</span>}
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-[#11182c] border-t border-slate-700">
                    <span className="text-emerald-400 font-mono text-sm">{'>'}</span>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendLine(); }}
                        disabled={status !== 'open'}
                        placeholder={status === 'open' ? 'invia una riga (Invio) · oppure clicca sopra per la modalità interattiva char-by-char' : 'in attesa…'}
                        className="flex-1 bg-transparent outline-none text-slate-100 font-mono text-sm placeholder:text-slate-600 disabled:opacity-50"
                    />
                    <button onClick={sendLine} disabled={status !== 'open'} className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">Invia</button>
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
