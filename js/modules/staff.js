/**
 * staff.js — Staff list, attendance, payments (complete)
 */

import { api } from '../api.js';
import { escHtml, fmtNum, toast, today } from '../utils.js';

let staffCache = [];

export async function onTabFocus() {
  await loadStaff();
  renderStaff();
  renderAttendanceHistory();
  renderPaymentHistory();
  populateStaffSelects();
}

async function loadStaff() {
  const res = await api('GET_STAFF');
  staffCache = res.staff || [];
}

function populateStaffSelects() {
  const attendSel = document.getElementById('attendanceStaff');
  const paySel = document.getElementById('paymentStaff');
  const opts = '<option value="">Select...</option>' + staffCache.map(s => `<option value="${escHtml(s.id)}">${escHtml(s.name)}</option>`).join('');
  if (attendSel) attendSel.innerHTML = opts;
  if (paySel) paySel.innerHTML = opts;
  // Also populate task assign dropdown
  const taskAssign = document.getElementById('taskAssign');
  if (taskAssign) {
    taskAssign.innerHTML = '<option value="Unassigned">Unassigned</option>' + staffCache.map(s => `<option value="${escHtml(s.name)}">${escHtml(s.name)}</option>`).join('');
  }
}

function renderStaff() {
  const tbody = document.getElementById('staffTable');
  if (!tbody) return;
  tbody.innerHTML = staffCache.map(s => `
    <tr>
      <td>${escHtml(s.name)}</td>
      <td>${escHtml(s.phone||'-')}</td>
      <td>${escHtml(s.role)}</td>
      <td>₹${fmtNum(s.salary)}</td>
      <td>${s.joined ? new Date(s.joined).toLocaleDateString('en-IN') : '-'}</td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray);">No staff</td></tr>';
}

export async function addStaff() {
  const payload = {
    name: document.getElementById('staffName')?.value?.trim(),
    phone: document.getElementById('staffPhone')?.value?.trim(),
    role: document.getElementById('staffRole')?.value || 'Other',
    salary: Number(document.getElementById('staffSalary')?.value) || 0,
    address: document.getElementById('staffAddress')?.value || '',
    joined: document.getElementById('staffJoinDate')?.value || today(),
    updatedAt: Date.now()
  };
  if (!payload.name) { toast('Enter staff name', 'warning'); return; }
  await api('ADD_STAFF', payload);
  document.getElementById('staffName').value = '';
  await loadStaff(); renderStaff(); populateStaffSelects();
  toast('Staff added');
}

export async function checkIn() {
  const staffId = document.getElementById('attendanceStaff')?.value;
  if (!staffId) { toast('Select staff', 'warning'); return; }
  await api('MARK_ATTENDANCE', { staffId, type: 'in', date: today(), checkIn: new Date().toISOString(), status: 'Present', updatedAt: Date.now() });
  await renderAttendanceHistory();
  toast('Check-in recorded');
}

export async function checkOut() {
  const staffId = document.getElementById('attendanceStaff')?.value;
  if (!staffId) { toast('Select staff', 'warning'); return; }
  // Find last open check-in
  const res = await api('GET_ATTENDANCE');
  const recs = (res.attendance || []).filter(a => a.staffId === staffId && !a.checkOut).sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
  const open = recs[0];
  if (!open) { toast('No open check-in found', 'warning'); return; }
  const hours = open.checkIn ? Math.round((Date.now() - new Date(open.checkIn).getTime()) / 3600000 * 10) / 10 : 0;
  await api('MARK_ATTENDANCE', { id: open.id, staffId, type: 'out', checkOut: new Date().toISOString(), hours, updatedAt: Date.now() });
  await renderAttendanceHistory();
  toast('Check-out recorded');
}

async function renderAttendanceHistory() {
  const res = await api('GET_ATTENDANCE');
  const tbody = document.getElementById('attendanceTable');
  if (!tbody) return;
  tbody.innerHTML = (res.attendance||[]).slice(0,50).map(a => {
    const name = (staffCache.find(s=>String(s.id)===String(a.staffId))||{}).name || a.staffId;
    return `<tr>
      <td>${a.date}</td>
      <td>${escHtml(name)}</td>
      <td>${a.checkIn?new Date(a.checkIn).toLocaleTimeString('en-IN'):'-'}</td>
      <td>${a.checkOut?new Date(a.checkOut).toLocaleTimeString('en-IN'):'-'}</td>
      <td>${a.hours||'-'}</td>
      <td><span class="status-badge status-ok">${a.status||'Present'}</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--gray);">No attendance</td></tr>';
}

export async function recordPayment() {
  const staffId = document.getElementById('paymentStaff')?.value;
  const amount = Number(document.getElementById('paymentAmount')?.value) || 0;
  if (!staffId || !amount) { toast('Select staff and enter amount', 'warning'); return; }
  await api('RECORD_PAYMENT', {
    staffId,
    type: document.getElementById('paymentType')?.value || 'Salary',
    amount,
    date: document.getElementById('paymentDate')?.value || today(),
    month: document.getElementById('paymentMonth')?.value || '',
    note: document.getElementById('paymentNote')?.value || '',
    updatedAt: Date.now()
  });
  await renderPaymentHistory();
  toast('Payment recorded');
}

async function renderPaymentHistory() {
  const res = await api('GET_PAYMENTS');
  const tbody = document.getElementById('paymentTable');
  if (!tbody) return;
  tbody.innerHTML = (res.payments||[]).slice(0,50).map(p => {
    const name = (staffCache.find(s=>String(s.id)===String(p.staffId))||{}).name || p.staffId;
    return `<tr>
      <td>${p.date}</td>
      <td>${escHtml(name)}</td>
      <td><span class="status-badge ${p.type==='Salary'?'status-ok':p.type==='Bonus'?'status-done':p.type==='Deduction'?'status-critical':'status-low'}">${p.type}</span></td>
      <td>₹${fmtNum(p.amount)}</td>
      <td>${escHtml(p.month||'-')}</td>
      <td>${escHtml(p.note||'-')}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--gray);">No payments</td></tr>';
}
