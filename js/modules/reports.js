/**
 * reports.js — Email reports, daily/weekly/low-stock, logs
 */

import { api } from '../api.js';
import { escHtml, fmtNum, toast } from '../utils.js';

let emailSaved = '';

export async function onTabFocus() {
  await loadReportsLog();
  // Load saved email
  const s = await api('GET_SETTINGS');
  if (s.settings?.adminEmail) {
    emailSaved = s.settings.adminEmail;
    const el = document.getElementById('adminEmail');
    if (el) el.value = emailSaved;
  }
}

export async function saveSetting(key, value) {
  if (key === 'adminEmail' && (!value || !value.includes('@'))) { toast('Enter valid email', 'warning'); return; }
  await api('SAVE_SETTING', { key, value, updatedAt: Date.now() });
  if (key === 'adminEmail') {
    emailSaved = value;
    const st = document.getElementById('emailStatus');
    if (st) st.innerHTML = `<div class="alert-success">✅ Reports will be sent to ${escHtml(value)}</div>`;
  }
  toast('Setting saved');
}

export async function sendReport(type, email) {
  if (!email || !email.includes('@')) { toast('Please save a valid admin email first', 'warning'); return; }
  const btn = document.querySelector(`[onclick*="sendReport('${type}')"]`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending...'; }
  let action;
  if (type === 'daily') action = 'SEND_DAILY_REPORT';
  else if (type === 'weekly') action = 'SEND_WEEKLY_REPORT';
  else action = 'SEND_LOW_STOCK_ALERT';
  const res = await api(action, { email, updatedAt: Date.now() });
  if (btn) {
    btn.disabled = false;
    btn.textContent = type==='daily'?'📨 Send Now':type==='weekly'?'📨 Send Now':'🔔 Send Alert';
  }
  const rd = document.getElementById('reportResult');
  if (res.success) {
    if (rd) rd.innerHTML = `<div class="alert-success">✅ ${type.toUpperCase()} sent to ${escHtml(email)}</div>`;
    toast(`${type} report sent`);
    await loadReportsLog();
  } else {
    if (rd) rd.innerHTML = `<div class="alert-danger">❌ Failed: ${escHtml(res.message||'')}</div>`;
    toast('Failed to send: ' + res.message, 'error');
  }
}

async function loadReportsLog() {
  const res = await api('GET_REPORTS_LOG');
  const tbody = document.getElementById('reportsLogTable');
  if (!tbody) return;
  tbody.innerHTML = (res.reportsLog||[]).slice(0,50).map(r => `
    <tr>
      <td style="font-size:11px;">${r.timestamp ? new Date(r.timestamp).toLocaleString('en-IN') : '-'}</td>
      <td><span class="status-badge ${r.reportType?.includes('LOW')?'status-low':r.reportType?.includes('DAILY')?'status-ok':'status-active'}">${r.reportType}</span></td>
      <td>${r.date||'-'}</td>
      <td style="font-size:11px;">${r.sentTo||'-'}</td>
      <td><span class="status-badge status-ok">${r.status||'SENT'}</span></td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray);">No reports yet</td></tr>';
}
