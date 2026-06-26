import { Device } from '@/types';

function downloadBlob(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Esporta l'inventario dispositivi in CSV (compatibile Excel, con BOM). */
export function exportDevicesCsv(devices: Device[]) {
    const headers = ['IP', 'MAC', 'Hostname', 'Vendor', 'Tipo', 'OS', 'Latenza(ms)', 'Porte', 'Rischio', 'Score', 'Stato'];
    const esc = (v: unknown) => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = devices.map((d) => [
        d.ip_address, d.mac_address || '', d.hostname || '', d.vendor || '', d.device_type || '',
        d.os || '', d.latency ?? '', (d.open_ports || []).join(' '),
        d.risk?.level || 'ok', d.risk?.score ?? 0, d.is_active ? 'online' : 'offline',
    ]);
    const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    downloadBlob('﻿' + csv, `networkscope-${today()}.csv`, 'text/csv;charset=utf-8');
}

/** Genera un report stampabile e apre la finestra di stampa (Salva come PDF). */
export function exportDevicesPdf(devices: Device[]) {
    const riskColor = (lvl?: string) =>
        lvl === 'alto' ? '#dc2626' : lvl === 'medio' ? '#ea580c' : lvl === 'basso' ? '#ca8a04' : '#16a34a';

    const online = devices.filter((d) => d.is_active).length;
    const risky = devices.filter((d) => d.risk && d.risk.level !== 'ok').length;
    const subnet = devices[0]?.ip_address.split('.').slice(0, 3).join('.') + '.0/24';

    const rows = devices.map((d) => `
      <tr>
        <td class="mono">${d.ip_address}</td>
        <td class="mono">${d.mac_address || '—'}</td>
        <td>${d.hostname || '—'}</td>
        <td>${d.vendor || '—'}</td>
        <td>${(d.device_type || '').replace('_', ' ')}${d.os ? `<br><span class="muted">${d.os}</span>` : ''}</td>
        <td class="mono">${(d.open_ports || []).join(', ') || '—'}</td>
        <td><span class="badge" style="background:${riskColor(d.risk?.level)}">${d.risk?.level || 'ok'}${d.risk ? ` (${d.risk.score})` : ''}</span></td>
      </tr>`).join('');

    const html = `<!doctype html><html lang="it"><head><meta charset="utf-8">
    <title>NetworkScope — Report ${today()}</title>
    <style>
      * { font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
      body { margin: 32px; color: #1f2937; }
      h1 { margin: 0; font-size: 22px; }
      .sub { color: #6b7280; font-size: 13px; margin-top: 4px; }
      .cards { display: flex; gap: 12px; margin: 20px 0; }
      .card { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
      .card .n { font-size: 24px; font-weight: 700; }
      .card .l { color: #6b7280; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { text-align: left; background: #f3f4f6; padding: 8px; border-bottom: 2px solid #e5e7eb; }
      td { padding: 7px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
      .mono { font-family: ui-monospace, Consolas, monospace; }
      .muted { color: #9ca3af; }
      .badge { color: #fff; padding: 1px 7px; border-radius: 10px; font-size: 11px; font-weight: 600; }
      @media print { body { margin: 12mm; } }
    </style></head><body>
      <h1>👁️ NetworkScope — Report di rete</h1>
      <div class="sub">Rete ${subnet} · generato il ${new Date().toLocaleString('it-IT')}</div>
      <div class="cards">
        <div class="card"><div class="n">${devices.length}</div><div class="l">Dispositivi totali</div></div>
        <div class="card"><div class="n">${online}</div><div class="l">Online</div></div>
        <div class="card"><div class="n" style="color:#ea580c">${risky}</div><div class="l">A rischio</div></div>
      </div>
      <table>
        <thead><tr><th>IP</th><th>MAC</th><th>Hostname</th><th>Vendor</th><th>Tipo / OS</th><th>Porte</th><th>Rischio</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) { alert('Abilita i popup per esportare il PDF.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
}
