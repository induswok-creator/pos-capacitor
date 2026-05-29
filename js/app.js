/**
 * app.js — Bootstrap, auth, tab switching, top bar, toast, sync badge
 */

import { db, initDatabase } from './db.js';
import { api, warmCacheFromCloud } from './api.js';
import { startSyncListener, getSyncSummary } from './sync-engine.js';
import { loadSavedPrinter } from './bluetooth-printer.js';
import { getState, setState, updateState, subscribe } from './state.js';
import { fmtNum, toast, today } from './utils.js';
import { Preferences } from '@capacitor/preferences';
import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';

import * as Dashboard from './modules/dashboard.js';
import * as Auth from './modules/auth.js';
import * as Billing from './modules/billing.js';
import * as KDS from './modules/kds.js';
import * as Tables from './modules/tables.js';
import * as Inventory from './modules/inventory.js';
import * as Vendors from './modules/vendors.js';
import * as Sales from './modules/sales.js';
import * as Expenses from './modules/expenses.js';
import * as Staff from './modules/staff.js';
import * as Tasks from './modules/tasks.js';
import * as Content from './modules/content.js';
import * as Customers from './modules/customers.js';
import * as AIChat from './modules/ai-chat.js';
import * as Reports from './modules/reports.js';
import * as Settings from './modules/settings.js';

window.AppModules = { Dashboard, Auth, Billing, KDS, Tables, Inventory, Vendors, Sales, Expenses, Staff, Tasks, Content, Customers, AIChat, Reports, Settings };

// ─── BOOTSTRAP ───
(async function bootstrap() {
  try { await initDatabase(); } catch (e) { console.error('DB init failed:', e); }
  try { await loadSavedPrinter(); } catch (e) {}
  try { initTabs(); initTopBar(); initNetworkBadge(); setDefaultDates(); } catch (e) { console.error('Init UI error:', e); }
  try {
    const saved = await Preferences.get({ key: 'induswok_user' });
    if (saved.value) {
      try {
        const user = JSON.parse(saved.value);
        if (user && user.username) { await doLoginSuccess(user); return; }
      } catch (e) { await Preferences.remove({ key: 'induswok_user' }); }
    }
  } catch (e) { console.warn('Preferences check error:', e); }
  initAuth();
  const ls = document.getElementById('loginScreen');
  if (ls) ls.classList.remove('hidden');
})();

function setDefaultDates() {
  try {
    const els = document.querySelectorAll('input[type="date"]');
    const todayStr = today();
    els.forEach(el => { if (!el.value) el.value = todayStr; });
  } catch (e) {}
}

// ─── AUTH ───
function initAuth() {
  const loginBtn = document.getElementById('loginBtn');
  const pwInput = document.getElementById('loginPassword');
  const unInput = document.getElementById('loginUsername');
  if (loginBtn) { loginBtn.addEventListener('click', () => attemptLogin()); }
  if (pwInput) { pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); }); }
  if (unInput) { unInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { pwInput?.focus(); } }); }
}

// Robust user loader — tries API, DB, and always returns an array
async function loadUsers() {
  // 1. Try the API (reads from settings table with key='users')
  try {
    const res = await api('GET_USERS');
    if (res) {
      // API wraps settings data in res.settings or res.users
      let raw = res.users || res.settings?.users || (res.settings && typeof res.settings === 'object' ? res.settings.users : null);
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) return parsed;
        // Could be an object with a users property
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // Maybe it's a single user object
          return [parsed];
        }
      }
    }
  } catch(e) { console.warn('loadUsers API failed:', e); }

  // 2. Try IndexedDB directly
  try {
    const rec = await db.settings.get('users');
    if (rec) {
      let raw = rec.users || rec.value;
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
      }
    }
  } catch(e) { console.warn('loadUsers DB failed:', e); }

  // 3. No users found
  return [];
}

async function attemptLogin() {
  const errEl = document.getElementById('loginError');
  try {
    const username = document.getElementById('loginUsername')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value?.trim();
    if (!username || !password || password.length !== 4) {
      if (errEl) errEl.textContent = 'Enter username and 4-digit PIN';
      toast('Enter username and 4-digit PIN', 'warning'); return;
    }
    const btn = document.getElementById('loginBtn');
    if (btn) { btn.textContent = 'Logging in...'; btn.disabled = true; }

    // Try multiple sources to find users, always ensure we get an array
    let users = await loadUsers();

    // If no users found, create default admin user
    if (!Array.isArray(users) || users.length === 0) {
      const defaultUsers = [{ username: 'admin', fullName: 'Admin', pin: '1234', role: 'Owner', createdAt: Date.now() }];
      await db.settings.put({ key: 'users', users: JSON.stringify(defaultUsers), syncStatus: 'pending', updatedAt: Date.now() });
      users = defaultUsers;
    }
    const matched = users.find(u => u.username?.toLowerCase() === username.toLowerCase() && u.pin === password);
    if (!matched) {
      if (errEl) errEl.textContent = 'Invalid username or PIN';
      toast('Invalid username or PIN', 'error');
      if (btn) { btn.textContent = '→ Login'; btn.disabled = false; }
      return;
    }
    const userObj = { username: matched.username, fullName: matched.fullName || matched.username, role: matched.role || 'Staff' };
    await doLoginSuccess(userObj);
  } catch (err) {
    console.error('Login error:', err);
    if (errEl) errEl.textContent = 'Login failed: ' + err.message;
    toast('Login error — see console', 'error');
    const btn = document.getElementById('loginBtn');
    if (btn) { btn.textContent = '→ Login'; btn.disabled = false; }
  }
}

// ─── LOGIN SUCCESS ───
async function doLoginSuccess(user) {
  try { await Preferences.set({ key: 'induswok_user', value: JSON.stringify(user) }); } catch (e) {}
  updateState({ currentUser: user });
  const topBarUser = document.getElementById('topBarUser');
  const topBarRole = document.getElementById('topBarRole');
  if (topBarUser) topBarUser.textContent = user.fullName || user.username;
  if (topBarRole) topBarRole.textContent = (user.role || 'STAFF').toUpperCase();
  const loginScreen = document.getElementById('loginScreen');
  const appShell = document.getElementById('appShell');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (appShell) appShell.style.display = '';
  try { await api('LOG_AUDIT', { time: new Date().toISOString(), user: user.username, action: 'LOGIN', role: user.role }); } catch (e) {}
  try { await loadInitialData(); } catch (e) { console.error('Initial data load error:', e); }
  try { startSyncListener(); } catch (e) {}
  const btn = document.getElementById('loginBtn');
  if (btn) { btn.textContent = '→ Login'; btn.disabled = false; }
}

async function loadInitialData() {
  try { if (Dashboard && Dashboard.onTabFocus) await Dashboard.onTabFocus(); } catch (e) { console.error('Dashboard load error:', e); }
  try { warmCacheFromCloud().catch(() => {}); } catch (e) {}
}

// ─── TAB SWITCHING ───
function initTabs() {
  const tabBar = document.getElementById('tabBar');
  if (!tabBar) return;
  tabBar.addEventListener('click', async (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const tabName = btn.dataset.tab;
    if (!tabName) return;
    tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    const tabEl = document.getElementById('tab-' + tabName);
    if (tabEl) tabEl.classList.add('active');
    const moduleNameMap = { 'dashboard': 'Dashboard', 'billing': 'Billing', 'kds': 'KDS', 'tables': 'Tables', 'inventory': 'Inventory', 'vendors': 'Vendors', 'sales': 'Sales', 'expenses': 'Expenses', 'staff': 'Staff', 'tasks': 'Tasks', 'content': 'Content', 'customers': 'Customers', 'ai-chat': 'AIChat', 'reports': 'Reports', 'settings': 'Settings' };
    const mod = window.AppModules[moduleNameMap[tabName]];
    if (mod && mod.onTabFocus) { try { await mod.onTabFocus(); } catch (e) { console.error(`Tab ${tabName} load error:`, e); } }
  });
}

// ─── TOP BAR ───
function initTopBar() {
  const syncDot = document.getElementById('syncDot');
  const syncText = document.getElementById('syncText');
  if (syncDot) syncDot.style.background = '#27ae60';
  if (syncText) syncText.textContent = 'Synced';
}

// ─── NETWORK BADGE ───
function initNetworkBadge() {
  const badge = document.getElementById('networkBadge');
  if (!badge) return;
  async function updateBadge() {
    try {
      const status = await Network.getStatus();
      if (status.connected) { badge.textContent = '🌐 Online'; badge.style.background = '#27ae60'; badge.style.color = '#fff'; }
      else { badge.textContent = '📴 Offline'; badge.style.background = '#e74c3c'; badge.style.color = '#fff'; }
    } catch (e) {
      if (navigator.onLine) { badge.textContent = '🌐 Online'; badge.style.background = '#27ae60'; }
      else { badge.textContent = '📴 Offline'; badge.style.background = '#e74c3c'; }
    }
  }
  updateBadge();
  try { Network.addListener('networkStatusChange', () => updateBadge()); } catch (e) {
    window.addEventListener('online', updateBadge); window.addEventListener('offline', updateBadge);
  }
}

// ─── LOGOUT ───
export async function logout() {
  try { await Preferences.remove({ key: 'induswok_user' }); } catch (e) {}
  updateState({ currentUser: null });
  const loginScreen = document.getElementById('loginScreen');
  const appShell = document.getElementById('appShell');
  if (loginScreen) loginScreen.classList.remove('hidden');
  if (appShell) appShell.style.display = 'none';
  const unInput = document.getElementById('loginUsername');
  const pwInput = document.getElementById('loginPassword');
  if (unInput) unInput.value = '';
  if (pwInput) pwInput.value = '';
  initAuth();
  toast('Logged out', 'info');
}

// ─── CLOSE MODAL ───
export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}
