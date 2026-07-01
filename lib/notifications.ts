// Cronologia notifiche persistente (localStorage) con evento per aggiornare la UI.
export type NsLevel = 'info' | 'warning' | 'danger';
export interface NsNotification {
    id: number;
    time: string;   // ISO
    title: string;
    detail: string;
    level?: NsLevel;
}

const KEY = 'ns:notif-history';
const SEEN_KEY = 'ns:notif-seen';

export function getNotifications(): NsNotification[] {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function addNotification(n: { title: string; detail: string; level?: NsLevel }): NsNotification {
    const item: NsNotification = { id: Date.now() + Math.random(), time: new Date().toISOString(), level: 'info', ...n };
    const next = [item, ...getNotifications()].slice(0, 100);
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('ns:notification'));
    } catch { /* ignore */ }
    return item;
}

export function clearNotifications() {
    try { localStorage.removeItem(KEY); window.dispatchEvent(new CustomEvent('ns:notification')); } catch { /* ignore */ }
}

export function getLastSeen(): number {
    try { return Number(localStorage.getItem(SEEN_KEY) || 0); } catch { return 0; }
}

export function markSeen() {
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); window.dispatchEvent(new CustomEvent('ns:notification')); } catch { /* ignore */ }
}
