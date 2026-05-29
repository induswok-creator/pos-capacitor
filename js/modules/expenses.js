/**
 * expenses.js — Expense tracking + split visualization
 */

import { api } from '../api.js';
import { escHtml, fmtNum, toast, today } from '../utils.js';

let expensesCache = [];

export async function onTabFocus() {
  await loadExpenses();
  renderExpenses();
  renderExpenseSplit();
}

async function loadExpenses() {
  const res = await api('GET_EXPENSES');
  expensesCache = res.expenses || [];
}

function renderExpenses() {
  const tbody = document.getElementById('expensesTable');
  if (!tbody) return;
  tbody.innerHTML = expensesCache.slice(0, 100).map(e => `
    <tr>
      <td>${e.date}</td>
      <td>${escHtml(e.category)}</td>
      <td>₹${fmtNum(e.amount)}</td>
      <td>${escHtml(e.description||'-')}</td>
      <td>${escHtml(e.vendor||'-')}</td>
      <td>${escHtml(e.mode)}</td>
      <td>${escHtml(e.by||'-')}</td>
    </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--gray);">No expenses</td></tr>';
}

function renderExpenseSplit() {
  const el = document.getElementById('expenseSplitTab');
  if (!el) return;
  const todayStr = today();
  const todayExp = expensesCache.filter(e => e.date === todayStr);
  if (!todayExp.length) { el.innerHTML = '<div style="text-align:center;color:var(--gray);">No expenses today</div>'; return; }
  const byCat = {};
  todayExp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
  const total = Object.values(byCat).reduce((a, b) => a + b, 0);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const colors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#7f8c8d'];
  el.innerHTML = cats.map((c, i) => {
    const pct = Math.round(c[1] / total * 100);
    return `<div style="display:flex;align-items:center;gap:6px;margin:4px 0;font-size:12px;">
      <div style="width:10px;height:10px;border-radius:50%;background:${colors[i%colors.length]};"></div>
      <div style="flex:1;">${escHtml(c[0])}</div>
      <div style="font-weight:600;">₹${fmtNum(c[1])} (${pct}%)</div>
    </div>`;
  }).join('');
}

export async function addExpense() {
  const payload = {
    date: document.getElementById('expDate')?.value || today(),
    category: document.getElementById('expCategory')?.value || 'Other',
    amount: Number(document.getElementById('expAmount')?.value) || 0,
    description: document.getElementById('expDesc')?.value || '',
    vendor: document.getElementById('expVendor')?.value || '',
    mode: document.getElementById('expMode')?.value || 'Cash',
    by: window.App?.currentUser?.username || 'Staff',
    updatedAt: Date.now()
  };
  if (!payload.amount) { toast('Enter amount', 'warning'); return; }
  await api('SAVE_EXPENSE', payload);
  toast('Expense saved');
  await loadExpenses(); renderExpenses(); renderExpenseSplit();
}
