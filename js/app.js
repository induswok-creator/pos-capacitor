import { db, initDatabase } from './db.js';
import { api, warmCacheFromCloud } from './api.js';
import { startSyncListener, getSyncSummary } from './sync-engine.js';
import { loadSavedPrinter } from './bluetooth-printer.js';
import { getState, setState, updateState, subscribe } from './state.js';
import { fmtNum, toast, today, nowTime } from './utils.js';
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

let pinValue = '';

// ─── INIT AUTH FIRST (before anything that can crash) ───
function initAuth() {
  const pinPad = document.getElementById('pinPad');
  if (!pinPad) { console.error('PIN pad not found!'); return; }
  
  pinPad.addEventListener('click', (e) => {
    try {
      const btn = e.target.closest('.pin-key');
      if (!btn) return;
      const key = btn.dataset.key;
      if (key === 'login') attemptLogin();
      else pressKey(key);
    } catch (err) { console.error('PIN click error:', err); }
  });
  console.log('PIN pad initialized');
  
  const un = document.getElementById('loginUsername');
  if (un) un.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); });
}

function pressKey(key) {
  try {
    if (key === 'clear') { pinValue = pinValue.slice(0, -1); }
    else if (pinValue.length < 4 && /^[0-9]$/.test(key)) { pinValue += key; }
    updatePinDots();
  } catch (err) { console.error('pressKey error:', err); }
}

function updatePinDots() {
  try {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById('pd' + i);
      if (dot) {
        dot.classList.toggle('filled', i < pinValue.length);
        dot.textContent = i < pinValue.length ? '•' : '';
      }
    }
  } catch (err) { console.error('updatePinDots error:', err); }
}

async function attemptLogin() {
  try {
    const username = document.getElementById('loginUsername')?.value?.trim();
    if (!username || pinValue.length !== 4) {
      toast('Enter username and 4-digit PIN', 'warning'); return;
    }
    const res = await api('GET_USERS');
    let users = [];
    if (res.success && res.users) {
      try { users = typeof res.users === 'string' ? JSON.parse(res.users) : res.users; } catch { users = []; }
    }
    const match = users.find(u => u.username === username && String(u.pin) === pinValue);
    if (match) {
      await doLoginSuccess(match);
    } else {
      const err = document.getElementById('loginError');
      if (err) err.textContent = 'Invalid username or PIN';
      pinValue = ''; updatePinDots();
    }
  } catch (err) { console.error('Login error:', err); toast('Login failed', 'error'); }
}

async function doLoginSuccess(user) {
  try {
    setState('currentUser', user);
    await Preferences.set({ key: 'induswok_user', value: JSON.stringify(user) });
    document.getElementById('loginScreen').classList.add('hidden');
    const appShell = document.getElementById('appShell');
    if (appShell) appShell.style.display = 'block';
    document.body.classList.add('logged-in');
    renderTopBar();
    await warmCacheFromCloud(['GET_MENU','GET_TABLES','GET_CATEGORIES','GET_INVENTORY']);
    startSyncListener();
    switchTab('dashboard');
    toast(`Welcome, ${user.fullName || user.username}!`);
  } catch (err) { console.error('doLoginSuccess error:', err); }
}

// ─── BOOTSTRAP ───
(async function bootstrap() {
  // INIT AUTH IMMEDIATELY — before any async that might crash
  initAuth();
  
  try {
    await initDatabase();
    console.log('DB initialized');
  } catch (e) { console.error('DB init failed:', e); }
  
  try {
    await loadSavedPrinter();
  } catch (e) { console.error('Printer load failed:', e); }
  
  try {
    initTabs();
    initTopBar();
    initNetworkBadge();
    setDefaultDates();
  } catch (e) { console.error('UI init failed:', e); }
  
  try {
    const saved = await Preferences.get({ key: 'induswok_user' });
    if (saved.value) {
      try {
        const user = JSON.parse(saved.value);
        if (user && user.username) { 
          await doLoginSuccess(user); 
          return; 
        }
      } catch (e) { 
        try { await Preferences.remove({ key: 'induswok_user' }); } catch {}
      }
    }
  } catch (e) { console.error('Auto-login check failed:', e); }
  
  // Always ensure login screen is visible
  try {
    const ls = document.getElementById('loginScreen');
    if (ls) ls.classList.remove('hidden');
  } catch (e) {}
})();

function setDefaultDates() {
  try {
    const els = document.querySelectorAll('input[type="date"]');
    const todayStr = today();
    els.forEach(el => { if (!el.value) el.value = todayStr; });
  } catch (e) {}
}

// ─── TABS ───
const TAB_MODULES = {
  dashboard: Dashboard, billing: Billing, kds: KDS, tables: Tables,
  inventory: Inventory, vendors: Vendors, sales: Sales, expenses: Expenses,
  staff: Staff, tasks: Tasks, content: Content, customers: Customers,
  'ai-chat': AIChat, reports: Reports, settings: Settings
};

function initTabs() {
  const bar = document.getElementById('tabBar');
  if (!bar) return;
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (btn) switchTab(btn.dataset.tab);
  });
}

export function switchTab(tabId) {
  try {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    const content = document.getElementById('tab-' + tabId);
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (content) content.classList.add('active');
    if (btn) btn.classList.add('active');
    window.scrollTo(0, 0);
    const mod = TAB_MODULES[tabId];
    if (mod && mod.onTabFocus) mod.onTabFocus();
  } catch (e) { console.error('switchTab error:', e); }
}

// ─── TOP BAR ───
function initTopBar() {
  subscribe('currentUser', renderTopBar);
  subscribe('syncStatus', renderSyncBadge);
}

function renderTopBar() {
  try {
    const user = getState().currentUser;
    if (!user) return;
    const userEl = document.getElementById('topBarUser');
    const roleEl = document.getElementById('topBarRole');
    if (userEl) userEl.textContent = user.fullName || user.username;
    if (roleEl) roleEl.textContent = (user.role || 'Staff').toUpperCase();
  } catch (e) {}
}

function initNetworkBadge() {
  try {
    const badge = document.getElementById('networkBadge');
    if (!badge) return;
    Network.addListener('networkStatusChange', (s) => {
      if (badge) {
        badge.textContent = s.connected ? '🌐 Online' : '📴 Offline';
        badge.style.background = s.connected ? '#27ae60' : '#e74c3c';
      }
    });
    Network.getStatus().then(s => {
      if (badge) {
        badge.textContent = s.connected ? '🌐 Online' : '📴 Offline';
        badge.style.background = s.connected ? '#27ae60' : '#e74c3c';
      }
    });
    setInterval(async () => {
      try {
        const sum = await getSyncSummary();
        updateState({ syncStatus: sum });
      } catch {}
    }, 5000);
  } catch (e) {}
}

function renderSyncBadge() {
  try {
    const s = getState().syncStatus;
    const dot = document.getElementById('syncDot');
    const txt = document.getElementById('syncText');
    if (!dot || !txt) return;
    if (s.conflicts > 0) { dot.className = 'sync-dot conflict'; txt.textContent = `${s.conflicts} conflict${s.conflicts>1?'s':''}`; }
    else if (s.pending > 0) { dot.className = 'sync-dot pending'; txt.textContent = `${s.pending} pending`; }
    else { dot.className = 'sync-dot'; txt.textContent = 'Synced'; }
  } catch (e) {}
}

export async function logout() {
  try {
    await Preferences.remove({ key: 'induswok_user' });
    setState('currentUser', null);
    document.body.classList.remove('logged-in');
    const appShell = document.getElementById('appShell');
    if (appShell) appShell.style.display = 'none';
    const ls = document.getElementById('loginScreen');
    if (ls) ls.classList.remove('hidden');
    pinValue = ''; updatePinDots();
  } catch (e) {}
}

export function closeModal(id) {
  try {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  } catch (e) {}
}

try {
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
  });
} catch (e) {}

try {
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      const openModal = document.querySelector('.modal-overlay.active');
      if (openModal) openModal.classList.remove('active');
      else { if (confirm('Exit Indus Wok POS?')) CapApp.exitApp(); }
    }
  });
} catch (e) {}

try {
  document.addEventListener('keydown', (e) => {
    const ls = document.getElementById('loginScreen');
    if (ls && !ls.classList.contains('hidden')) {
      const active = document.activeElement;
      if (active && active.id === 'loginUsername') return;
      if (e.key >= '0' && e.key <= '9') { pressKey(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { pressKey('clear'); e.preventDefault(); }
      else if (e.key === 'Enter') { attemptLogin(); e.preventDefault(); }
    }
  });
} catch (e) {}
