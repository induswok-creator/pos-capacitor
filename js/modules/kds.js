/**
 * kds.js — Kitchen Display System with station filtering & timers
 */

import { db } from '../db.js';
import { api } from '../api.js';
import { escHtml, fmtNum, toast } from '../utils.js';

export async function onTabFocus() {
  renderKDS();
  if (!window._kdsInterval) window._kdsInterval = setInterval(renderKDS, 3000);
}

export function onTabBlur() {
  if (window._kdsInterval) { clearInterval(window._kdsInterval); window._kdsInterval = null; }
}

async function renderKDS() {
  const grid = document.getElementById('kdsGrid');
  if (!grid) return;
  const station = document.getElementById('kdsStationFilter')?.value || 'All';
  const res = await api('GET_KOTS');
  let kots = (res.kots || []).filter(k => ['new','preparing','ready'].includes(k.status));
  if (station !== 'All') kots = kots.filter(k => (k.station||'All') === station || (k.station||'All') === 'All');

  grid.innerHTML = kots.length ? kots.map(k => {
    const ageMin = Math.floor((Date.now() - (k.createdAt||0)) / 60000);
    const sc = k.status === 'new' ? 'status-new pulse' : k.status === 'preparing' ? 'status-preparing' : 'status-ready';
    const timerWarn = ageMin > 15 ? 'warning' : '';
    return `
    <div class="kot-card ${sc}" onclick="KDS.updateStatus('${escHtml(k.kotId)}', '${nextStatus(k.status)}')">
      <div class="kot-header">
        <span style="font-weight:700;">${escHtml(k.kotId)}</span>
        <span class="timer ${timerWarn}">${ageMin}m ${ageMin>15?'⚠️':''}</span>
      </div>
      <div style="font-size:11px;color:var(--gray);margin-bottom:4px;">Table: ${escHtml(k.tableNo||'-')} • ${escHtml(k.station||'All')}</div>
      ${k.items?.map(i => `<div style="font-size:12px;padding:2px 0;"><strong>${i.qty}x</strong> ${escHtml(i.name)} ${i.size==='HALF'?'(H)':''} ${i.notes?`<span style="color:var(--primary);">(${escHtml(i.notes)})</span>`:''}</div>`).join('') || ''}
      <div style="margin-top:6px;text-align:right;"><span class="status-badge ${k.status==='new'?'status-critical':k.status==='preparing'?'status-low':'status-ok'}">${k.status.toUpperCase()}</span></div>
    </div>`;
  }).join('') : '<div style="grid-column:1/-1;text-align:center;color:var(--gray);padding:40px;">No active KOTs</div>';
}

function nextStatus(s) {
  return s === 'new' ? 'preparing' : s === 'preparing' ? 'ready' : 'served';
}

export async function updateStatus(kotId, newStatus) {
  await api('SAVE_KOT', { kotId, status: newStatus, updatedAt: Date.now() });
  renderKDS();
  toast(`KOT ${kotId} → ${newStatus}`);
}
