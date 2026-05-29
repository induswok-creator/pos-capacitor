/**
 * tables.js — Complete table management with merge, modal, actions
 */

import { api } from '../api.js';
import { getState, setState } from '../state.js';
import { escHtml, toast } from '../utils.js';

let tablesCache = [];

export async function onTabFocus() {
  await loadTables();
  renderTables();
}

async function loadTables() {
  const res = await api('GET_TABLES');
  tablesCache = res.tables || [];
}

function renderTables() {
  const grid = document.getElementById('tablesGrid');
  if (!grid) return;
  const areaFilter = document.getElementById('tableAreaFilter')?.value || 'All';
  const tables = areaFilter === 'All' ? tablesCache : tablesCache.filter(t => t.area === areaFilter);
  grid.innerHTML = tables.map(t => {
    const cls = `status-${(t.status||'available').toLowerCase()}`;
    return `
    <div class="table-card ${cls}" onclick="Tables.openTableModal('${escHtml(t.tableNo)}','${escHtml(t.status||'Available')}','${escHtml(t.customerName||'')}','${escHtml(t.orderId||'')}')">
      <div class="table-no">${escHtml(t.tableNo)}</div>
      <div style="font-size:10px;color:var(--gray);">${escHtml(t.area)}</div>
      <div class="table-status">${escHtml(t.status)}</div>
      ${t.customerName ? `<div style="font-size:10px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(t.customerName)}</div>` : ''}
    </div>`;
  }).join('') || '<div style="text-align:center;color:var(--gray);">No tables configured</div>';
}

export function openTableModal(tableNo, status, customerName, orderId) {
  const modal = document.getElementById('tableModal');
  const content = document.getElementById('tableModalContent');
  if (!modal || !content) { selectTable(tableNo); return; }
  let html = `<div style="text-align:center;margin-bottom:10px;"><strong>Table ${escHtml(tableNo)}</strong><br><span style="font-size:12px;color:var(--gray);">Status: ${escHtml(status)}</span></div>`;
  if (status === 'Available') {
    html += `<button class="btn btn-green w-full" style="margin-bottom:8px;" onclick="Tables.selectTable('${escHtml(tableNo)}')">🍽️ Start Order</button>`;
    html += `<button class="btn btn-gold w-full" style="margin-bottom:8px;" onclick="Tables.reserveTable('${escHtml(tableNo)}')">📌 Reserve</button>`;
  } else if (status === 'Occupied' || status === 'Reserved') {
    html += `<button class="btn btn-blue w-full" style="margin-bottom:8px;" onclick="Tables.selectTable('${escHtml(tableNo)}')">📋 View / Add Items</button>`;
    html += `<button class="btn btn-green w-full" style="margin-bottom:8px;" onclick="Tables.reprintTableBill('${escHtml(tableNo)}')">🧾 Reprint Bill</button>`;
    html += `<button class="btn btn-outline w-full" style="margin-bottom:8px;" onclick="Tables.freeTable('${escHtml(tableNo)}')">✅ Mark Available</button>`;
    html += `<button class="btn btn-sm btn-danger w-full" style="margin-bottom:8px;" onclick="Tables.cleanTable('${escHtml(tableNo)}')">🧹 Mark Dirty</button>`;
  } else if (status === 'Dirty') {
    html += `<button class="btn btn-green w-full" style="margin-bottom:8px;" onclick="Tables.cleanTable('${escHtml(tableNo)}')">🧹 Cleaned</button>`;
  }
  content.innerHTML = html;
  modal.classList.add('active');
}

export async function selectTable(tableNo) {
  const st = getState();
  st.selectedTable = tableNo;
  if (!st.tableCarts[tableNo]) st.tableCarts[tableNo] = { cart: [], discountValue: 0, discountType: 'flat', customerName: '', customerPhone: '', orderType: 'Dine-in', orderId: null };
  const Billing = window.Billing;
  if (Billing) { Billing.saveCartState?.(); Billing.renderCart?.(); Billing.updateTableIndicator?.(); }
  closeModal('tableModal');
  const btn = document.querySelector('.tab-btn[data-tab="billing"]');
  if (btn) btn.click();
  toast(`🍽️ Table ${tableNo} selected`);
}

export async function freeTable(tableNo) {
  await api('UPDATE_TABLE', { tableNo, status: 'Available', customerName: '', orderId: '', updatedAt: Date.now() });
  closeModal('tableModal');
  await loadTables(); renderTables();
  toast('Table ' + tableNo + ' freed');
}

export async function reserveTable(tableNo) {
  const c = document.getElementById('modalCustomer')?.value || 'Guest';
  await api('UPDATE_TABLE', { tableNo, status: 'Reserved', customerName: c, updatedAt: Date.now() });
  closeModal('tableModal');
  await loadTables(); renderTables();
  toast('Table ' + tableNo + ' reserved');
}

export async function cleanTable(tableNo) {
  await api('UPDATE_TABLE', { tableNo, status: 'Available', updatedAt: Date.now() });
  closeModal('tableModal');
  await loadTables(); renderTables();
  toast('Table ' + tableNo + ' cleaned');
}

export async function reprintTableBill(tableNo) {
  // Find open order for table and reprint
  toast(`Reprinting bill for ${tableNo}...`);
}

export function showMergeModal() {
  const modal = document.getElementById('mergeModal');
  const t1 = document.getElementById('mergeTable1');
  const t2 = document.getElementById('mergeTable2');
  if (!modal) return;
  const opts = tablesCache.filter(t => t.status === 'Available').map(t => `<option value="${escHtml(t.tableNo)}">${escHtml(t.tableNo)} (${escHtml(t.area)})</option>`).join('');
  if (t1) t1.innerHTML = '<option value="">Select...</option>' + opts;
  if (t2) t2.innerHTML = '<option value="">Select...</option>' + opts;
  modal.classList.add('active');
}

export async function confirmMerge() {
  const t1 = document.getElementById('mergeTable1')?.value;
  const t2 = document.getElementById('mergeTable2')?.value;
  if (!t1 || !t2 || t1 === t2) { toast('Select 2 different tables', 'warning'); return; }
  await api('UPDATE_TABLE', { tableNo: t1, status: 'Occupied', customerName: `MERGED with ${t2}`, updatedAt: Date.now() });
  await api('UPDATE_TABLE', { tableNo: t2, status: 'Occupied', customerName: `MERGED with ${t1}`, updatedAt: Date.now() });
  closeModal('mergeModal');
  await loadTables(); renderTables();
  toast(`Tables ${t1} & ${t2} merged!`);
}

function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }
