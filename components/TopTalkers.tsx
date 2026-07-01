'use client';

import { Connection } from '@/lib/api';

const flag = (cc?: string | null) =>
    cc && cc.length === 2 ? cc.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))) : '';

interface Row { label: string; count: number; cc?: string | null; onClick?: () => void }

function aggregate(
    connections: Connection[],
    keyFn: (c: Connection) => string,
    rowFn: (c: Connection) => Omit<Row, 'count'>,
    top = 7,
): Row[] {
    const map = new Map<string, Row>();
    for (const c of connections) {
        const k = keyFn(c);
        const ex = map.get(k);
        if (ex) ex.count += c.count;
        else map.set(k, { ...rowFn(c), count: c.count });
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, top);
}

function Panel({ title, rows }: { title: string; rows: Row[] }) {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-slate-200/70 dark:border-white/10">
            <h4 className="font-semibold text-center text-gray-900 dark:text-white mb-3 text-sm">{title}</h4>
            {rows.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">nessun dato</p>
            ) : (
                <div className="space-y-2">
                    {rows.map((r, i) => (
                        <div key={i} onClick={r.onClick} className={r.onClick ? 'cursor-pointer' : ''}>
                            <div className="flex items-center justify-between text-sm gap-2">
                                <span className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-gray-400 text-xs w-4 text-right shrink-0">{i + 1}</span>
                                    {r.cc && <span className="shrink-0">{flag(r.cc)}</span>}
                                    <span className="truncate text-gray-800 dark:text-gray-200" title={r.label}>{r.label}</span>
                                </span>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">{r.count}</span>
                            </div>
                            <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-700 mt-1 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function TopTalkers({ connections, onSelectHost }: { connections: Connection[]; onSelectHost?: (c: Connection) => void }) {
    const byHost = aggregate(connections, (c) => c.remoteIp, (c) => ({
        label: c.remoteHost || c.org || c.remoteIp, cc: c.countryCode,
        onClick: onSelectHost ? () => onSelectHost(c) : undefined,
    }));
    const byService = aggregate(connections, (c) => c.service, (c) => ({ label: c.service }));
    const byProgram = aggregate(connections, (c) => c.process || '?', (c) => ({ label: c.process || 'sconosciuto' }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Panel title="Host di rete" rows={byHost} />
            <Panel title="Servizi" rows={byService} />
            <Panel title="Programmi" rows={byProgram} />
        </div>
    );
}
