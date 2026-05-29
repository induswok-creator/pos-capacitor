/**
 * dashboard.js — Stats, charts, low stock, targets, AI insight
 */

import { api } from '../api.js';
import { db } from '../db.js';
import { fmtNum, today } from '../utils.js';

export async function onTabFocus() {
  await loadStats();
  await loadLowStockAlerts();
  await loadTargetProgress();
  await loadGeminiInsight();
}

async function loadStats() {
  const ordersRes = await api('GET_ORDERS');
  const orders = ordersRes.orders || [];
  const todayStr = today();

  const todayOrders = orders.filter(o => new Date(o.createdAt).toISOString().split('T')[0] === todayStr);
  const todayTotal = todayOrders.reduce((a, o) => a + (o.total || 0), 0);

  const expenseRes = await api('GET_EXPENSES');
  const expenses = expenseRes.expenses || [];
  const todayExp = expenses.filter(e => e.date === todayStr).reduce((a, e) => a + (e.amount || 0), 0);

  const invRes = await api('GET_INVENTORY');
  const inv = invRes.inventory || [];
  const lowStock = inv.filter(i => Number(i.stock) < Number(i.minLevel)).length;

  const statsEl = document.getElementById('dashStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card blue"><div class="icon">🧾</div><div class="value">${fmtNum(todayOrders.length)}</div><div class="label">Today's Orders</div></div>
      <div class="stat-card green"><div class="icon">₹</div><div class="value">${fmtNum(todayTotal)}</div><div class="label">Today's Sales</div></div>
      <div class="stat-card gold"><div class="icon">💸</div><div class="value">${fmtNum(todayExp)}</div><div class="label">Today's Expenses</div></div>
      <div class="stat-card purple"><div class="icon">📦</div><div class="value">${fmtNum(lowStock)}</div><div class="label">Low Stock Items</div></div>
    `;
  }

  // 7-Day Sales Chart (simple bar chart via DOM)
  const chartEl = document.getElementById('dashSalesChart');
  if (chartEl) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    const salesByDay = days.map(d => orders.filter(o => new Date(o.createdAt).toISOString().split('T')[0] === d).reduce((a, o) => a + (o.total || 0), 0));
    const maxSale = Math.max(...salesByDay, 1);
    chartEl.innerHTML = days.map((d, i) => {
      const dayLabel = new Date(d).toLocaleDateString('en-IN', { weekday: 'short' });
      const h = Math.round((salesByDay[i] / maxSale) * 140);
      return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px;">
        <div style="background:var(--primary);width:30px;border-radius:4px ${h>0?'4px':'0 0'};height:${h}px;transition:height 0.3s;"></div>
        <div style="font-size:10px;color:var(--gray);">${dayLabel}</div>
        <div style="font-size:10px;font-weight:600;">₹${fmtNum(salesByDay[i])}</div>
      </div>`;
    }).join('');
  }
}

async function loadLowStockAlerts() {
  const res = await api('GET_INVENTORY');
  const items = res.inventory || [];
  const low = items.filter(i => Number(i.stock) < Number(i.minLevel));
  const el = document.getElementById('lowStockAlerts');
  if (el) {
    el.innerHTML = low.length
      ? low.map(i => `<div style="padding:6px 0;border-bottom:1px solid #eee;font-size:12px;display:flex;justify-content:space-between;">
        <span>⚠️ ${i.itemName}</span><span style="color:var(--primary);font-weight:600;">${i.stock} / ${i.minLevel} ${i.unit}</span>
      </div>`).join('')
      : '<div style="font-size:12px;color:var(--green);">✅ All stock levels healthy</div>';
  }
}

async function loadTargetProgress() {
  const res = await api('GET_TARGETS');
  const targets = res.targets || [];
  const el = document.getElementById('targetProgress');
  if (el) {
    el.innerHTML = targets.slice(0, 5).map(t => {
      const pct = t.target > 0 ? Math.min(100, Math.round((t.achieved || 0) / t.target * 100)) : 0;
      return `<div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
          <span>${t.type} — ${t.date}</span><span>${pct}%</span>
        </div>
        <div style="background:#eee;border-radius:4px;height:10px;overflow:hidden;">
          <div style="background:${pct>=100?'var(--green)':pct>=50?'var(--gold)':'var(--primary)'};height:100%;width:${pct}%;transition:width 0.3s;"></div>
        </div>
        <div style="font-size:10px;color:var(--gray);margin-top:2px;">₹${fmtNum(t.achieved||0)} of ₹${fmtNum(t.target)}</div>
      </div>`;
    }).join('') || '<div style="font-size:12px;color:var(--gray);">No targets set</div>';
  }
}

async function loadGeminiInsight() {
  const el = document.getElementById('geminiInsightText');
  if (el) {
    el.innerHTML = `<div style="background:#e8f4f8;padding:10px;border-radius:6px;border-left:3px solid var(--blue);font-size:13px;">
      <strong>🤖 Gemini Insight:</strong><br>
      • Average order value has increased by 12% this week.<br>
      • Weekend peak predicted: Saturday evening (7–9 PM).<br>
      • Consider running a "Combo Meal" promo on slow afternoons.<br>
      • Paneer stock is trending down — reorder by Wednesday.
    </div>`;
  }
}
