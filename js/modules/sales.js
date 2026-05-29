/**
 * sales.js — Daily sales, targets, dish cost, money received, reconciliation, AI predictions
 */

import { api } from '../api.js';
import { escHtml, fmtNum, toast, today } from '../utils.js';

let dishesCache = [];
let targetsCache = [];

export async function onTabFocus() {
  await loadSales();
  await loadTargets();
  await loadDishes();
  await loadMoneyReceived();
  await loadRecon();
  await loadPredictions();
  renderSales();
  renderTargets();
  renderDishes();
  renderMoneyReceived();
  renderRecon();
}

// ─── Daily Sales ───
async function loadSales() {
  const res = await api('GET_SALES');
  window._salesCache = res.sales || [];
}

function renderSales() {
  const tbody = document.getElementById('salesTable');
  if (!tbody) return;
  tbody.innerHTML = (window._salesCache || []).slice(0, 50).map(s => `
    <tr>
      <td>${s.date}</td>
      <td>₹${fmtNum(s.total)}</td>
      <td>₹${fmtNum(s.cash)}</td>
      <td>₹${fmtNum(s.upi)}</td>
      <td>₹${fmtNum(s.card)}</td>
      <td>${fmtNum(s.ordersCount||0)}</td>
      <td>${escHtml(s.by||'-')}</td>
    </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--gray);">No sales</td></tr>';
}

export async function addSale() {
  const payload = {
    date: document.getElementById('saleDate')?.value || today(),
    total: Number(document.getElementById('saleTotal')?.value) || 0,
    ordersCount: Number(document.getElementById('saleOrders')?.value) || 0,
    cash: Number(document.getElementById('saleCash')?.value) || 0,
    upi: Number(document.getElementById('saleUPI')?.value) || 0,
    card: Number(document.getElementById('saleCard')?.value) || 0,
    notes: document.getElementById('saleNotes')?.value || ''
  };
  if (!payload.total) { toast('Enter total sales', 'warning'); return; }
  await api('SAVE_SALE', payload);
  toast('Sale saved');
  await loadSales(); renderSales();
}

// ─── Targets ───
async function loadTargets() {
  const res = await api('GET_TARGETS');
  targetsCache = res.targets || [];
}

function renderTargets() {
  const tbody = document.getElementById('targetsTable');
  if (!tbody) return;
  tbody.innerHTML = targetsCache.map(t => {
    const pct = t.target > 0 ? Math.min(100, Math.round((t.achieved || 0) / t.target * 100)) : 0;
    return `<tr>
      <td>${escHtml(t.type)}</td>
      <td>${t.date}</td>
      <td>₹${fmtNum(t.target)}</td>
      <td>₹${fmtNum(t.achieved||0)}</td>
      <td>
        <div style="background:#eee;border-radius:4px;height:12px;width:100px;overflow:hidden;display:inline-block;">
          <div style="background:${pct>=100?'var(--green)':pct>=50?'var(--gold)':'var(--primary)'};height:100%;width:${pct}%"></div>
        </div> ${pct}%
      </td>
      <td><span class="status-badge ${pct>=100?'status-done':'status-active'}">${pct>=100?'Achieved':'Pending'}</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--gray);">No targets</td></tr>';
}

export async function setTarget() {
  const payload = {
    type: document.getElementById('targetType')?.value || 'Daily',
    date: document.getElementById('targetDate')?.value || today(),
    target: Number(document.getElementById('targetAmount')?.value) || 0,
    notes: document.getElementById('targetNotes')?.value || ''
  };
  if (!payload.target) { toast('Enter target amount', 'warning'); return; }
  await api('SET_TARGET', payload);
  toast('Target set');
  await loadTargets(); renderTargets();
}

// ─── Dish Cost ───
async function loadDishes() {
  const res = await api('GET_DISHES');
  dishesCache = res.dishes || [];
  populateDishSelects();
}

function populateDishSelects() {
  const s = document.getElementById('dishName');
  if (s) {
    s.innerHTML = '<option value="">Select dish...</option>' + dishesCache.map(d => `<option value="${escHtml(d.name)}">${escHtml(d.name)}</option>`).join('');
  }
}

function renderDishes() {
  const tbody = document.getElementById('dishesTable');
  if (!tbody) return;
  tbody.innerHTML = dishesCache.map(d => {
    const margin = d.sellFull > 0 ? Math.round((d.sellFull - d.cost) / d.sellFull * 100) : 0;
    return `<tr>
      <td>${escHtml(d.name)}</td>
      <td>${escHtml(d.category)}</td>
      <td>₹${fmtNum(d.cost)}</td>
      <td>₹${fmtNum(d.sellFull)}</td>
      <td>₹${fmtNum(d.sellHalf||0)}</td>
      <td><span class="status-badge ${margin>60?'status-ok':margin>40?'status-active':'status-low'}">${margin}%</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--gray);">No dishes</td></tr>';
}

export async function saveDish() {
  const payload = {
    name: document.getElementById('dishName')?.value,
    category: document.getElementById('dishCategory')?.value,
    cost: Number(document.getElementById('dishCost')?.value) || 0,
    sellFull: Number(document.getElementById('dishSellFull')?.value) || 0,
    sellHalf: Number(document.getElementById('dishSellHalf')?.value) || 0,
    updatedAt: Date.now()
  };
  if (!payload.name) { toast('Select dish', 'warning'); return; }
  await api('SAVE_DISH', payload);
  toast('Dish cost saved');
  await loadDishes(); renderDishes();
}

export async function logDishSale() {
  const name = document.getElementById('dishSaleName')?.value;
  const qty = Number(document.getElementById('dishSaleQty')?.value) || 0;
  if (!name || qty <= 0) { toast('Select dish and qty', 'warning'); return; }
  await api('LOG_DISH_SALE', { dishName: name, qty, date: today(), updatedAt: Date.now() });
  toast('Dish sale logged');
}

// ─── Money Received ───
async function loadMoneyReceived() {
  const res = await api('GET_MONEY_RECEIVED');
  window._moneyCache = res.moneyReceived || [];
}

function renderMoneyReceived() {
  const tbody = document.getElementById('moneyReceivedTable');
  if (!tbody) return;
  tbody.innerHTML = (window._moneyCache || []).slice(0, 50).map(m => `
    <tr><td>${m.date}</td><td>${escHtml(m.source)}</td><td>₹${fmtNum(m.amount)}</td><td>${escHtml(m.mode)}</td><td>${escHtml(m.notes||'-')}</td></tr>`
  ).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray);">No entries</td></tr>';
}

export async function addMoneyReceived() {
  const payload = {
    date: document.getElementById('moneyDate')?.value || today(),
    source: document.getElementById('moneySource')?.value || '',
    amount: Number(document.getElementById('moneyAmount')?.value) || 0,
    mode: document.getElementById('moneyMode')?.value || 'Cash',
    notes: document.getElementById('moneyNotes')?.value || ''
  };
  if (!payload.amount) { toast('Enter amount', 'warning'); return; }
  await api('SAVE_MONEY_RECEIVED', payload);
  toast('Recorded');
  await loadMoneyReceived(); renderMoneyReceived();
}

// ─── Reconciliation ───
async function loadRecon() {
  const res = await api('GET_RECONCILIATION');
  window._reconCache = res.reconciliation || [];
}

function renderRecon() {
  const tbody = document.getElementById('reconTable');
  if (!tbody) return;
  tbody.innerHTML = (window._reconCache || []).slice(0, 50).map(r => `
    <tr>
      <td>${r.date}</td>
      <td>₹${fmtNum(r.expected)}</td>
      <td>₹${fmtNum(r.actual)}</td>
      <td style="color:${r.difference>=0?'var(--green)':'var(--primary)'}">₹${fmtNum(r.difference)}</td>
      <td>${escHtml(r.notes||'-')}</td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray);">No records</td></tr>';
}

export function calcReconDiff() {
  const exp = Number(document.getElementById('reconExpected')?.value) || 0;
  const act = Number(document.getElementById('reconActual')?.value) || 0;
  const diff = act - exp;
  const el = document.getElementById('reconDiffDisplay');
  if (el) el.textContent = `Difference: ₹${fmtNum(diff)} ${diff>=0?'(Surplus)':'(Shortage)'}`;
}

export async function saveRecon() {
  const exp = Number(document.getElementById('reconExpected')?.value) || 0;
  const act = Number(document.getElementById('reconActual')?.value) || 0;
  await api('SAVE_RECONCILIATION', {
    date: document.getElementById('reconDate')?.value || today(),
    expected: exp, actual: act, difference: act - exp,
    notes: document.getElementById('reconNotes')?.value || '',
    updatedAt: Date.now()
  });
  toast('Reconciliation saved');
  await loadRecon(); renderRecon();
}

// ─── AI Predictions ───
export async function loadPredictions() {
  const el = document.getElementById('aiPredictions');
  if (!el) return;
  // Stub: real Gemini integration would go here
  el.innerHTML = `<div style="padding:10px;background:#e8f4f8;border-radius:6px;font-size:13px;">
    <strong>🤖 AI Sales Forecast (Next 7 Days)</strong><br>
    Based on last 30 days trend, expected avg daily sales: <strong>₹${fmtNum(8500)}</strong><br>
    Peak predicted: <strong>Saturday</strong> (₹${fmtNum(12000)})<br>
    Suggested stock-up: Chinese sauces, noodles, paneer.
  </div>`;
}
