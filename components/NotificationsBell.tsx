'use client';

import { useEffect, useState } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { getNotifications, clearNotifications, getLastSeen, markSeen, NsNotification } from '@/lib/notifications';

export default function NotificationsBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NsNotification[]>([]);
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        const refresh = () => {
            const list = getNotifications();
            setItems(list);
            const seen = getLastSeen();
            setUnread(list.filter((n) => new Date(n.time).getTime() > seen).length);
        };
        refresh();
        window.addEventListener('ns:notification', refresh);
        window.addEventListener('storage', refresh);
        return () => { window.removeEventListener('ns:notification', refresh); window.removeEventListener('storage', refresh); };
    }, []);

    const toggle = () => {
        setOpen((o) => {
            if (!o) { markSeen(); setUnread(0); }
            return !o;
        });
    };

    return (
        <div className="relative">
            <button
                onClick={toggle}
                aria-label="Cronologia notifiche"
                className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 max-h-[26rem] overflow-hidden flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200/70 dark:border-white/10 z-50">
                        <div className="flex items-center justify-between p-3 border-b border-slate-200/70 dark:border-white/10">
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">Notifiche</span>
                            {items.length > 0 && (
                                <button onClick={clearNotifications} title="Svuota cronologia" className="text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="overflow-y-auto">
                            {items.length === 0 ? (
                                <p className="p-8 text-center text-sm text-gray-400">Nessuna notifica</p>
                            ) : items.map((n) => {
                                const bar = n.level === 'danger' ? 'border-l-red-500' : n.level === 'warning' ? 'border-l-amber-500' : 'border-l-indigo-500';
                                return (
                                    <div key={n.id} className={`p-3 pl-2.5 border-b border-slate-100 dark:border-white/5 last:border-0 border-l-4 ${bar}`}>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            <span className="font-mono">{n.detail}</span> · {new Date(n.time).toLocaleString('it-IT')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
