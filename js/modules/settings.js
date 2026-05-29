/**
 * settings.js — Restaurant info, users, audit log, printer, sync
 */

import { api } from '../api.js';
import { db } from '../db.js';
import { escHtml, toast, today } from '../utils.js';

let usersCache = [];
let auditCache = [];

export async function onTabFocus() {
  await loadUsers();
  await loadAudit();
  renderUsers();
  renderAudit();
  loadRestaurantInfo();
}

export function loadRestaurantInfo() {
  db.settings.get('restaurantInfo').then(s => {
    if (!s || !s.value) return;
    try {
      const info = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
      if (document.getElementById('restName')) document.getElementById('restName').value = info.name || '';
      if (document.getElementById('restTagline')) document.getElementById('restTagline').value = info.tagline || '';
      if (document.getElementById('restPhone')) document.getElementById('restPhone').value = info.phone || '';
      if (document.getElementById('restAddr1')) document.getElementById('restAddr1').value = info.address1 || '';
      if (document.getElementById('restAddr2')) document.getElementById('restAddr2').value = info.address2 || '';
      if (document.getElementById('restGstin')) document.getElementById('restGstin').value = info.gstin || '';
      if (document.getElementById('restUpi')) document.getElementById('restUpi').value = info.upiId || '';
      if (document.getElementById('restThanks')) document.getElementById('restThanks').value = info.thanks || '';
    } catch {}
  });
}

export async function saveRestaurantInfo() {
  const payload = {
    name: document.getElementById('restName')?.value || '',
    tagline: document.getElementById('restTagline')?.value || '',
    phone: document.getElementById('restPhone')?.value || '',
    address1: document.getElementById('restAddr1')?.value || '',
    address2: document.getElementById('restAddr2')?.value || '',
    gstin: document.getElementById('restGstin')?.value || '',
    upiId: document.getElementById('restUpi')?.value || '',
    thanks: document.getElementById('restThanks')?.value || ''
  };
  await api('SAVE_SETTING', { key: 'restaurantInfo', value: JSON.stringify(payload), updatedAt: Date.now() });
  toast('Restaurant info saved');
}

// ─── Users ───
async function loadUsers() {
  const res = await api('GET_USERS');
  let users = [];
  try { users = typeof res.users === 'string' ? JSON.parse(res.users) : res.users || []; } catch { users = []; }
  usersCache = users;
}

function renderUsers() {
  const tbody = document.getElementById('usersTable');
  if (!tbody) return;
  tbody.innerHTML = usersCache.map(u => `
    <tr>
      <td>${escHtml(u.username)}</td>
      <td>${escHtml(u.fullName||u.name||'-')}</td>
      <td>${escHtml(u.role)}</td>
      <td>****</td>
      <td>${escHtml(u.createdBy||'-')}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="Settings.resetPin('${escHtml(u.username)}')">🔄 Reset PIN</button>
        <button class="btn btn-sm btn-danger" onclick="Settings.deleteUser('${escHtml(u.username)}')">🗑️</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--gray);">No users</td></tr>';
}

export async function addUser() {
  const payload = {
    username: document.getElementById('addUserUsername')?.value?.trim(),
    fullName: document.getElementById('addUserFullName')?.value?.trim(),
    pin: document.getElementById('addUserPin')?.value?.trim(),
    role: document.getElementById('addUserRole')?.value || 'Staff',
    createdBy: window.App?.currentUser?.username || 'Admin',
    updatedAt: Date.now()
  };
  if (!payload.username || !payload.pin || payload.pin.length !== 4 || !/^\d{4}$/.test(payload.pin)) {
    toast('Enter username and exactly 4-digit numeric PIN', 'warning'); return;
  }
  await api('ADD_USER', payload);
  document.getElementById('addUserUsername').value = '';
  document.getElementById('addUserFullName').value = '';
  document.getElementById('addUserPin').value = '';
  await loadUsers(); renderUsers();
  toast('User added');
}

export async function resetPin(username) {
  const newPin = prompt('Enter new 4-digit PIN for ' + username + ':');
  if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { toast('Invalid PIN', 'warning'); return; }
  await api('UPDATE_USER', { username, pin: newPin, updatedAt: Date.now() });
  await loadUsers(); renderUsers();
  toast('PIN reset');
}

export async function deleteUser(username) {
  if (!confirm('Delete user ' + username + '?')) return;
  await api('DELETE_USER', { username, updatedAt: Date.now() });
  await loadUsers(); renderUsers();
  toast('User deleted');
}

// ─── Audit Log ───
async function loadAudit() {
  const res = await api('GET_AUDIT_LOG');
  auditCache = res.auditLog || [];
}

function renderAudit() {
  const tbody = document.getElementById('auditTable');
  if (!tbody) return;
  tbody.innerHTML = auditCache.slice(0, 100).map(a => `
    <tr>
      <td style="font-size:11px;">${a.time ? new Date(a.time).toLocaleString('en-IN') : '-'}</td>
      <td>${escHtml(a.user)}</td>
      <td>${escHtml(a.action)}</td>
      <td><span class="status-badge status-active">${escHtml(a.role)}</span></td>
    </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--gray);">No audit entries</td></tr>';
}
