/**
 * customers.js — Customer database with auto-fill, stats, add modal
 */

import { api } from '../api.js';
import { escHtml, fmtNum, toast, today } from '../utils.js';

let customersCache = [];

export async function onTabFocus() {
  await loadCustomers();
  renderCustomers();
}

async function loadCustomers() {
  const res = await api('GET_CUSTOMERS');
  customersCache = res.customers || [];
}

function renderCustomers() {
  const filter = document.getElementById('customerPlatformFilter')?.value || 'All';
  const q = (document.getElementById('customerSearchBox')?.value || '').toLowerCase();
  let list = filter === 'All' ? customersCache : customersCache.filter(c => c.platform === filter);
  if (q) list = list.filter(c => (c.name||'').toLowerCase().includes(q) || (c.phone||'').includes(q));

  const tbody = document.getElementById('customersTable');
  if (!tbody) return;
  tbody.innerHTML = list.map(c => `
    <tr>
      <td>${escHtml(c.name)}</td>
      <td>${escHtml(c.phone)}</td>
      <td>${escHtml(c.address||'-')}</td>
      <td><span class="status-badge ${c.platform==='Zomato'?'status-critical':c.platform==='Swiggy'?'status-low':c.platform==='Takeaway'?'status-active':'status-ok'}">${escHtml(c.platform||'-')}</span></td>
      <td>${fmtNum(c.orders||0)}</td>
      <td>₹${fmtNum(c.totalSpend||0)}</td>
      <td>${c.lastOrder ? new Date(c.lastOrder).toLocaleDateString('en-IN') : '-'}</td>
      <td><button class="btn btn-sm btn-outline" onclick="Customers.viewCustomer('${escHtml(c.phone)}')">👁️</button></td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--gray);">No customers</td></tr>';

  const statsEl = document.getElementById('customerStats');
  if (statsEl) {
    const totalSpend = list.reduce((a, c) => a + (c.totalSpend || 0), 0);
    statsEl.textContent = `Showing ${list.length} customers | Total spend: ₹${fmtNum(totalSpend)}`;
  }
}

export async function addCustomerModal() {
  const payload = {
    name: document.getElementById('custModalName')?.value?.trim(),
    phone: document.getElementById('custModalPhone')?.value?.trim(),
    email: document.getElementById('custModalEmail')?.value?.trim() || '',
    address: document.getElementById('custModalAddress')?.value?.trim() || '',
    area: document.getElementById('custModalArea')?.value?.trim() || '',
    platform: document.getElementById('custModalPlatform')?.value || 'Dine-in',
    notes: document.getElementById('custModalNotes')?.value || '',
    orders: 0, totalSpend: 0,
    updatedAt: Date.now()
  };
  if (!payload.name || !payload.phone) { toast('Enter name and phone', 'warning'); return; }
  await api('SAVE_CUSTOMER', payload);
  closeModal('addCustomerModal');
  document.getElementById('custModalName').value = '';
  document.getElementById('custModalPhone').value = '';
  await loadCustomers(); renderCustomers();
  toast('Customer saved');
}

export function viewCustomer(phone) {
  const c = customersCache.find(x => x.phone === phone);
  if (!c) return;
  alert(`Customer: ${c.name}\nPhone: ${c.phone}\nAddress: ${c.address || '-'}\nPlatform: ${c.platform || '-'}\nOrders: ${c.orders || 0}\nTotal Spend: ₹${fmtNum(c.totalSpend || 0)}\nLast Order: ${c.lastOrder ? new Date(c.lastOrder).toLocaleDateString('en-IN') : '-'}`);
}

function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }
