/**
 * billing.js — Complete billing module with all original features
 */

import { db } from '../db.js';
import { api } from '../api.js';
import { getState, setState, getActiveCart, getActiveDiscount, getActiveDiscType } from '../state.js';
import { fmtNum, toast, today, nowTime, generateId, escHtml, deepClone } from '../utils.js';
import { printKOT, printBill } from '../bluetooth-printer.js';

let menuCache = [];
let customersCache = [];
let ordersCache = [];
let modifierPendingItem = null;
const MENU_CATEGORIES = ['🍽️ Dine-in','🛍️ Takeaway','🚚 Delivery'];

export async function onTabFocus() {
  await loadMenu();
  renderMenu();
  renderCart();
  updateTableIndicator();
  loadRecentOrders();
  renderPastBills();
  populateCategorySelects();
  setState('menuCache', menuCache);
}

// ─── MENU ───
async function loadMenu() {
  const res = await api('GET_MENU');
  menuCache = res.menu || [];
  customersCache = (await api('GET_CUSTOMERS')).customers || [];
  ordersCache = (await api('GET_ORDERS')).orders || [];
}

export function renderMenu() {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;
  const filter = document.getElementById('menuFilter')?.value || 'All';
  const q = (document.getElementById('menuSearch')?.value || '').toLowerCase();
  let items = filter === 'All' ? menuCache : menuCache.filter(m => m.category === filter);
  if (q) items = items.filter(m => (m.itemName || '').toLowerCase().includes(q));
  grid.innerHTML = items.map(m => `
    <div class="menu-item-card" onclick="Billing.addToCart('${escHtml(m.itemName)}', 'FULL')">
      <div class="name">${escHtml(m.itemName)}</div>
      <div style="font-size:10px;color:var(--gray);">${escHtml(m.category)}${m.station?' • '+escHtml(m.station):''}</div>
      <div class="fh-btns">
        <button class="fh-btn f-btn" onclick="event.stopPropagation(); Billing.addToCart('${escHtml(m.itemName)}', 'FULL')">FULL ₹${fmtNum(m.fullPrice)}</button>
        ${m.halfPrice ? `<button class="fh-btn h-btn" onclick="event.stopPropagation(); Billing.addToCart('${escHtml(m.itemName)}', 'HALF')">HALF ₹${fmtNum(m.halfPrice)}</button>` : ''}
      </div>
    </div>`).join('');
}

export function addToCart(itemName, size) {
  const item = menuCache.find(m => m.itemName === itemName);
  if (!item) return;
  const hasMods = item.modifiers && item.modifiers.length;
  if (hasMods) { modifierPendingItem = { item, size }; showModifierModal(item); return; }
  doAddToCart(item, size);
}

function showModifierModal(item) {
  const modal = document.getElementById('modifierModal');
  const list = document.getElementById('modifierList');
  if (!modal || !list) { doAddToCart(item, 'FULL'); return; }
  list.innerHTML = (item.modifiers || []).map((m, i) => `
    <label class="mod-chip"><input type="checkbox" value="${escHtml(m)}"> ${escHtml(m)}</label>`).join('');
  modal.classList.add('active');
}

export function confirmModifier() {
  const modal = document.getElementById('modifierModal');
  if (!modal || !modifierPendingItem) return closeModifierModal();
  const checked = Array.from(modal.querySelectorAll('#modifierList input:checked')).map(c => c.value);
  const { item, size } = modifierPendingItem;
  doAddToCart(item, size, checked);
  closeModifierModal();
}

export function closeModifierModal() {
  document.getElementById('modifierModal')?.classList.remove('active');
  modifierPendingItem = null;
}

function doAddToCart(item, size, mods = []) {
  const price = size === 'HALF' ? (item.halfPrice || 0) : (item.fullPrice || 0);
  const cart = getActiveCart();
  const existing = cart.find(c => c.itemName === item.itemName && c.size === size && JSON.stringify(c.mods||[]) === JSON.stringify(mods));
  if (existing) {
    existing.qty += 1;
    existing.total = existing.qty * existing.price;
  } else {
    cart.push({ itemName: item.itemName, size, qty: 1, price, total: price, mods, notes: '' });
  }
  saveCartState();
  renderCart();
  toast(`${item.itemName} (${size}${mods.length? ' +'+mods.join(',') : ''}) added`);
}

export function changeQty(index, delta) {
  const cart = getActiveCart();
  const item = cart[index];
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart.splice(index, 1);
  else item.total = item.qty * item.price;
  saveCartState();
  renderCart();
}

export function setDiscount(type, value) {
  const st = getState();
  if (st.selectedTable && st.tableCarts[st.selectedTable]) {
    st.tableCarts[st.selectedTable].discountType = type;
    st.tableCarts[st.selectedTable].discountValue = value;
  } else {
    setState('discountType', type);
    setState('discountValue', value);
  }
  renderCart();
}

export function applyCustomDiscount() {
  const val = Number(document.getElementById('discountInput')?.value) || 0;
  const type = document.getElementById('discountType')?.value || 'flat';
  if (val > 0) setDiscount(type, val);
}

// ─── CART RENDER ───
function renderCart() {
  const container = document.getElementById('cartItems');
  const cart = getActiveCart();
  if (!container) return;
  container.innerHTML = cart.length ? cart.map((it, i) => `
    <div class="cart-item">
      <div class="info">
        <div class="name">${escHtml(it.itemName)} ${it.size==='HALF'?'(H)':''} ${it.mods?.length?'<span style="color:var(--primary);font-size:10px;">+'+it.mods.join(',')+'</span>':''}</div>
        <div style="font-size:10px;color:var(--gray);">₹${fmtNum(it.price)} each</div>
      </div>
      <div class="qty-control">
        <button onclick="Billing.changeQty(${i}, -1)">−</button>
        <span>${it.qty}</span>
        <button onclick="Billing.changeQty(${i}, 1)">+</button>
      </div>
      <div class="item-total">₹${fmtNum(it.total)}</div>
    </div>`).join('') : '<div style="text-align:center;color:var(--gray);padding:20px;">Select items from menu</div>';

  const subtotal = cart.reduce((a, i) => a + i.total, 0);
  const discType = getActiveDiscType();
  const discVal = getActiveDiscount();
  const discount = discType === 'percent' ? Math.round(subtotal * discVal / 100) : discVal;
  const taxable = Math.max(0, subtotal - discount);
  const cgst = Math.round(taxable * 0.025);
  const sgst = Math.round(taxable * 0.025);
  const total = taxable + cgst + sgst;

  document.getElementById('cartSubtotal')?.textContent && (document.getElementById('cartSubtotal').textContent = '₹' + fmtNum(subtotal));
  document.getElementById('cartCGST')?.textContent && (document.getElementById('cartCGST').textContent = '₹' + fmtNum(cgst));
  document.getElementById('cartSGST')?.textContent && (document.getElementById('cartSGST').textContent = '₹' + fmtNum(sgst));
  document.getElementById('cartDiscount')?.textContent && (document.getElementById('cartDiscount').textContent = '₹' + fmtNum(discount));
  document.getElementById('cartTotal')?.textContent && (document.getElementById('cartTotal').textContent = '₹' + fmtNum(total));
  document.getElementById('cartCount')?.textContent && (document.getElementById('cartCount').textContent = cart.reduce((a,i)=>a+i.qty,0) + ' items');
}

function saveCartState() {
  const st = getState();
  if (st.selectedTable) {
    if (!st.tableCarts[st.selectedTable]) st.tableCarts[st.selectedTable] = { cart: [], discountValue: 0, discountType: 'flat', customerName: '', customerPhone: '', orderType: 'Dine-in', orderId: null };
    st.tableCarts[st.selectedTable].cart = getActiveCart();
    setState('tableCarts', { ...st.tableCarts });
  } else {
    setState('cart', getActiveCart());
  }
}

export function clearCart() {
  const st = getState();
  if (st.selectedTable) {
    if (st.tableCarts[st.selectedTable]) st.tableCarts[st.selectedTable].cart = [];
    setState('tableCarts', { ...st.tableCarts });
  } else {
    setState('cart', []);
  }
  renderCart();
  updateTableIndicator();
}

// ─── CUSTOMER AUTO-FILL ───
export function searchCustomerUI() {
  const q = (document.getElementById('customerName')?.value || '').toLowerCase();
  const results = document.getElementById('customerSearchResults');
  if (!q || q.length < 2 || !results) { if (results) results.style.display = 'none'; return; }
  const matches = customersCache.filter(c => (c.name||'').toLowerCase().includes(q) || (c.phone||'').includes(q)).slice(0, 5);
  results.innerHTML = matches.map(c => `<div style="padding:6px 8px;cursor:pointer;font-size:12px;border-bottom:1px solid #f0f0f0;" onclick="Billing.fillCustomer('${escHtml(c.name)}','${escHtml(c.phone)}','${escHtml(c.address||'')}', '${escHtml(c.platform||'')}')">${escHtml(c.name)} — ${escHtml(c.phone)}</div>`).join('');
  results.style.display = 'block';
}

export function fillCustomer(name, phone, address, platform) {
  const n = document.getElementById('customerName');
  const p = document.getElementById('customerPhone');
  const a = document.getElementById('deliveryAddress');
  if (n) n.value = name;
  if (p) p.value = phone;
  if (a) a.value = address;
  const r = document.getElementById('customerSearchResults');
  if (r) r.style.display = 'none';
  const badge = document.getElementById('customerInfoBadge');
  if (badge) badge.textContent = `✅ ${platform || 'Existing'} customer loaded`;
}

// ─── KOT ───
export async function sendKOT() {
  const st = getState();
  const cart = getActiveCart();
  if (!cart.length) { toast('Cart is empty', 'warning'); return; }

  const kotId = generateId('KOT');
  const orderId = st.selectedTable && st.tableCarts[st.selectedTable]?.orderId ? st.tableCarts[st.selectedTable].orderId : generateId('ORD');
  const kotPayload = {
    kotId, orderId,
    tableNo: st.selectedTable || 'TAKEAWAY',
    station: 'All',
    items: cart.map(c => ({ name: c.itemName, qty: c.qty, size: c.size, notes: (c.mods||[]).join(', ') + (c.notes||'') })),
    status: 'new',
    createdAt: Date.now(),
    printedAt: null
  };
  await api('SAVE_KOT', kotPayload);

  try {
    await printKOT({ restaurant: 'The Flavours of Indus Wok', kotId, table: kotPayload.tableNo, station: kotPayload.station, time: nowTime(), items: kotPayload.items });
    toast('✅ KOT printed!');
  } catch (err) { toast('KOT saved — printer offline, queued', 'warning'); }

  if (st.selectedTable) {
    if (!st.tableCarts[st.selectedTable]) st.tableCarts[st.selectedTable] = {};
    st.tableCarts[st.selectedTable].orderId = orderId;
    setState('tableCarts', { ...st.tableCarts });
  }
  updateTableIndicator();
}

// ─── BILL ───
export async function printBillNow() {
  const st = getState();
  const cart = getActiveCart();
  if (!cart.length) { toast('Cart is empty', 'warning'); return; }

  const subtotal = cart.reduce((a, i) => a + i.total, 0);
  const discType = getActiveDiscType();
  const discVal = getActiveDiscount();
  const discount = discType === 'percent' ? Math.round(subtotal * discVal / 100) : discVal;
  const taxable = Math.max(0, subtotal - discount);
  const cgst = Math.round(taxable * 0.025);
  const sgst = Math.round(taxable * 0.025);
  const total = taxable + cgst + sgst;

  const billId = generateId('BILL');
  const bill = {
    billId,
    restaurantName: 'The Flavours of Indus Wok',
    tagline: 'Pan-Asian Restaurant',
    phone: '', address: '', gstin: '', upiId: '',
    thanks: 'Thank you! Visit again.',
    table: st.selectedTable || 'TAKEAWAY',
    type: st.selectedTable ? 'Dine-in' : 'Takeaway',
    date: today(), time: nowTime(),
    items: deepClone(cart),
    subtotal, discount, cgst, sgst, total
  };
  try { await printBill(bill); toast('✅ Bill printed!'); }
  catch (err) { toast('Bill saved — printer offline, queued', 'warning'); }
  await db.pastBills.put({ orderId: billId, bill, createdAt: Date.now() });
  renderPastBills();
}

// ─── SETTLE ───
export function showSettleModal() {
  const cart = getActiveCart();
  if (!cart.length) { toast('Cart is empty', 'warning'); return; }
  const subtotal = cart.reduce((a, i) => a + i.total, 0);
  const discType = getActiveDiscType();
  const discVal = getActiveDiscount();
  const discount = discType === 'percent' ? Math.round(subtotal * discVal / 100) : discVal;
  const taxable = Math.max(0, subtotal - discount);
  const total = taxable + Math.round(taxable * 0.05);
  const summary = document.getElementById('settleSummary');
  if (summary) summary.innerHTML = `<div style="background:#f8f9fa;padding:8px;border-radius:6px;font-size:13px;">
    <div><strong>Items:</strong> ${cart.reduce((a,i)=>a+i.qty,0)}</div>
    <div><strong>Subtotal:</strong> ₹${fmtNum(subtotal)}</div>
    <div><strong>Discount:</strong> ₹${fmtNum(discount)}</div>
    <div><strong>Total:</strong> ₹${fmtNum(total)}</div>
  </div>`;
  document.getElementById('settleCash') && (document.getElementById('settleCash').value = total);
  document.getElementById('settleUPI') && (document.getElementById('settleUPI').value = 0);
  document.getElementById('settleCard') && (document.getElementById('settleCard').value = 0);
  updateSettleSplit();
  document.getElementById('settleModal')?.classList.add('active');
}

export function updateSettleSplit() {
  const cash = Number(document.getElementById('settleCash')?.value) || 0;
  const upi = Number(document.getElementById('settleUPI')?.value) || 0;
  const card = Number(document.getElementById('settleCard')?.value) || 0;
  const cart = getActiveCart();
  const subtotal = cart.reduce((a, i) => a + i.total, 0);
  const discType = getActiveDiscType();
  const discVal = getActiveDiscount();
  const discount = discType === 'percent' ? Math.round(subtotal * discVal / 100) : discVal;
  const taxable = Math.max(0, subtotal - discount);
  const total = taxable + Math.round(taxable * 0.05);
  const diff = (cash + upi + card) - total;
  const el = document.getElementById('settleDiff');
  if (el) el.innerHTML = `<span style="color:${Math.abs(diff)<1?'var(--green)':'var(--primary)'}">${diff>=0?`Balance: ₹${fmtNum(diff)} (Return)`:`Short: ₹${fmtNum(Math.abs(diff))}`}</span>`;
}

export async function confirmSettle() {
  const st = getState();
  const cart = getActiveCart();
  if (!cart.length) { toast('Cart is empty', 'warning'); return; }
  const subtotal = cart.reduce((a, i) => a + i.total, 0);
  const discType = getActiveDiscType();
  const discVal = getActiveDiscount();
  const discount = discType === 'percent' ? Math.round(subtotal * discVal / 100) : discVal;
  const taxable = Math.max(0, subtotal - discount);
  const cgst = Math.round(taxable * 0.025);
  const sgst = Math.round(taxable * 0.025);
  const total = taxable + cgst + sgst;
  const cash = Number(document.getElementById('settleCash')?.value) || 0;
  const upi = Number(document.getElementById('settleUPI')?.value) || 0;
  const card = Number(document.getElementById('settleCard')?.value) || 0;

  const orderId = st.selectedTable && st.tableCarts[st.selectedTable]?.orderId ? st.tableCarts[st.selectedTable].orderId : generateId('ORD');
  const order = {
    orderId, tableNo: st.selectedTable || 'TAKEAWAY',
    type: st.selectedTable ? 'Dine-in' : 'Takeaway',
    items: deepClone(cart),
    subtotal, discount, cgst, sgst, total,
    cash, upi, card,
    customerName: document.getElementById('customerName')?.value || '',
    customerPhone: document.getElementById('customerPhone')?.value || '',
    deliveryAddress: document.getElementById('deliveryAddress')?.value || '',
    status: 'settled',
    createdAt: Date.now()
  };
  await api('SAVE_ORDER', order);

  // Save to customers DB if takeaway/delivery
  if (!st.selectedTable && order.customerPhone) {
    await api('SAVE_CUSTOMER', {
      phone: order.customerPhone,
      name: order.customerName,
      address: order.deliveryAddress,
      platform: order.type,
      orders: 1,
      totalSpend: total,
      lastOrder: Date.now(),
      updatedAt: Date.now()
    });
  }

  if (st.selectedTable) {
    await api('UPDATE_TABLE', { tableNo: st.selectedTable, status: 'Available', customerName: '', orderId: '', updatedAt: Date.now() });
  }
  closeModal('settleModal');
  clearCart();
  toast('✅ Order settled & synced');
}

// ─── RECENT ORDERS ───
async function loadRecentOrders() {
  const tbody = document.getElementById('recentOrdersTable');
  if (!tbody) return;
  const res = await api('GET_ORDERS');
  const orders = (res.orders || []).slice(0, 20);
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td style="font-size:11px;">${escHtml(o.orderId||'')}</td>
      <td>${escHtml(o.tableNo||'-')}</td>
      <td>₹${fmtNum(o.total||0)}</td>
      <td><span class="status-badge ${o.status==='settled'?'status-done':'status-active'}">${o.status||'Active'}</span></td>
      <td>${escHtml(o.type||'-')}</td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray);">No recent orders</td></tr>';
}

// ─── PAST BILLS / REPRINT ───
export async function renderPastBills() {
  const tbody = document.getElementById('pastBillsTable');
  if (!tbody) return;
  const bills = await db.pastBills.reverse().limit(20).toArray();
  tbody.innerHTML = bills.map((b, i) => `
    <tr>
      <td style="font-size:11px;">${escHtml(b.bill?.billId||b.orderId)}</td>
      <td>${escHtml(b.bill?.table||'-')}</td>
      <td>₹${fmtNum(b.bill?.total||0)}</td>
      <td style="font-size:11px;">${new Date(b.createdAt).toLocaleTimeString('en-IN')}</td>
      <td><button class="btn btn-sm btn-blue" onclick="Billing.reprintPastBill(${b.id})">🖨️</button></td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray);">No past bills</td></tr>';
}

export async function reprintPastBill(id) {
  const rec = await db.pastBills.get(id);
  if (!rec || !rec.bill) { toast('Bill not found', 'warning'); return; }
  try { await printBill(rec.bill); toast('Bill reprinted'); }
  catch (e) { toast('Printer unavailable', 'warning'); }
}

// ─── ADD MENU ITEM ───
export async function addMenuItem() {
  const name = document.getElementById('addMenuName')?.value?.trim();
  const category = document.getElementById('addMenuCategory')?.value;
  const price = Number(document.getElementById('addMenuPrice')?.value) || 0;
  const halfPrice = Number(document.getElementById('addMenuHalfPrice')?.value) || 0;
  const station = document.getElementById('addMenuStation')?.value || 'Main';
  if (!name || !price) { toast('Enter item name and price', 'warning'); return; }
  await api('SAVE_MENU_ITEM', { itemName: name, category, fullPrice: price, halfPrice, station, isActive: true, updatedAt: Date.now() });
  document.getElementById('addMenuName').value = '';
  document.getElementById('addMenuPrice').value = '';
  document.getElementById('addMenuHalfPrice').value = '';
  closeModal('addMenuItemModal');
  await loadMenu(); renderMenu();
  populateCategorySelects();
  toast('Menu item added');
}

function populateCategorySelects() {
  const cats = [...new Set(menuCache.map(m => m.category).filter(Boolean))];
  const sel = document.getElementById('menuFilter');
  if (sel) sel.innerHTML = '<option value="All">All</option>' + cats.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('') + '<option value="__new__">➕ New Category</option>';
  const addSel = document.getElementById('addMenuCategory');
  if (addSel) addSel.innerHTML = cats.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('') + '<option value="__new__">➕ New Category</option>';
}

// ─── TABLE INDICATOR ───
export function updateTableIndicator() {
  const bar = document.getElementById('orderInfoBar');
  const st = getState();
  if (!st.selectedTable) { if (bar) bar.style.display = 'none'; return; }
  const tc = st.tableCarts[st.selectedTable];
  const cnt = tc ? tc.cart.reduce((a, i) => a + i.qty, 0) : 0;
  const hasKot = tc && tc.orderId;
  if (bar) {
    bar.style.display = 'block';
    bar.style.background = cnt > 0 ? '#e8f5e9' : '#f8f9fa';
    bar.innerHTML = `🍽️ <strong>Table ${st.selectedTable}</strong>${cnt > 0 ? ' — ' + cnt + ' items' : ' — Empty'}${hasKot ? ' <span style="background:#27ae60;color:#fff;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:6px;">KOT Sent ✓</span>' : ''}`;
  }
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}
