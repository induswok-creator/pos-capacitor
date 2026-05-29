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
  initAuth();
  try { await initDatabase(); } catch (e) { console.error('DB init failed:', e); }
  try { await loadSavedPrinter(); } catch (e) {}
  try { initTabs(); initTopBar(); initNetworkBadge(); setDefaultDates(); } catch (e) {}
  try {
    const saved = await Preferences.get({ key: 'induswok_user' });
    if (saved.value) {
      try {
        const user = JSON.parse(saved.value);
        if (user && user.username) { await doLoginSuccess(user); return; }
      } catch (e) { await Preferences.remove({ key: 'induswok_user' }); }
    }
  } catch (e) {}
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
  
  if (loginBtn) {
    loginBtn.addEventListener('click', () => attemptLogin());
  }
  if (pwInput) {
    pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); });
  }
  if (unInput) {
    unInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { pwInput?.focus(); } });
  }
}

async function attemptLogin() {
  try {
    const username = document.getElementById('loginUsername')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value?.trim();
    if (!username || !password || password.length !== 4) {
      toast('Enter username and 4-digit PIN', 'warning'); return;
    }
    const res = await api('GET_USERS');
    let users = [];
    if (res.success && res.users) {
      try { users = typeof res.users === 'string' ? JSON.parse(res.users) : res.users; } catch { users = []; }
    }
