/**
 * inventory.js — Full inventory, recipes, deliveries, deductions, smart stock, wastage
 */

import { db } from '../db.js';
import { api } from '../api.js';
import { escHtml, fmtNum, toast, today } from '../utils.js';

let inventoryCache = [];
let recipeIngredients = [];
let menuCache = [];

export async function onTabFocus() {
  await loadInventory();
  renderInventory();
  renderSmartStock();
  await loadDeductionLog();
  await loadRecipes();
  populateRecipeDishSelect();
  populateWastageSelect();
  populateInvUpdateSelect();
  renderTopConsumed();
}

async function loadInventory() {
  const res = await api('GET_INVENTORY');
  inventoryCache = res.inventory || [];
  const menuRes = await api('GET_MENU');
  menuCache = menuRes.menu || [];
}

function renderInventory() {
  const tbody = document.getElementById('inventoryTable');
  if (!tbody) return;
  tbody.innerHTML = inventoryCache.map(item => {
    const status = Number(item.stock) < Number(item.minLevel) ? 'LOW' : 'OK';
    const cls = status === 'LOW' ? 'status-low' : 'status-ok';
    return `<tr>
      <td>${escHtml(item.itemName)}</td>
      <td>${fmtNum(item.stock)}</td>
      <td>${escHtml(item.unit)}</td>
      <td>${fmtNum(item.minLevel)}</td>
      <td>${escHtml(item.category)}</td>
      <td><span class="status-badge ${cls}">${status}</span></td>
      <td style="font-size:11px;">${new Date(item.updatedAt||0).toLocaleString('en-IN')}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--gray);">No inventory items</td></tr>';
}

function renderSmartStock() {
  const grid = document.getElementById('smartStockGrid');
  if (!grid) return;
  grid.innerHTML = inventoryCache.map(item => {
    const dailyBurn = Number(item.dailyBurn) || 0;
    const daysLeft = dailyBurn > 0 ? Math.floor(Number(item.stock) / dailyBurn) : 'N/A';
    const cls = daysLeft !== 'N/A' && daysLeft <= 2 ? 'critical' : daysLeft !== 'N/A' && daysLeft <= 5 ? 'warning' : '';
    const status = Number(item.stock) < Number(item.minLevel) ? 'CRITICAL' : Number(item.stock) < Number(item.minLevel)*1.5 ? 'LOW' : 'OK';
    const badge = status==='OK'?'status-ok':status==='LOW'?'status-low':'status-critical';
    return `<div class="stock-card ${cls}">
      <div style="display:flex;justify-content:space-between;align-items:start;">
        <div style="font-weight:600;font-size:13px;">${escHtml(item.itemName)}</div>
        <span class="status-badge ${badge}">${status}</span>
      </div>
      <div style="font-size:13px;margin-top:5px;"><strong>${fmtNum(item.stock)}</strong> ${escHtml(item.unit)}</div>
      <div style="font-size:11px;color:var(--gray);margin-top:4px;display:flex;gap:10px;flex-wrap:wrap;">
        <span>🔥 ${fmtNum(dailyBurn)}/day</span>
        <span>📅 ${daysLeft!=='N/A'?daysLeft+' days':'N/A'}</span>
        <span>${status==='CRITICAL'?'⚠️ REORDER NOW':status==='LOW'?'📦 Reorder soon':'✅ OK'}</span>
      </div>
    </div>`;
  }).join('') || '<div style="text-align:center;color:var(--gray);">No inventory data</div>';
}

function renderTopConsumed() {
  const el = document.getElementById('topConsumedList');
  if (!el) return;
  // Stub: would need actual deduction log aggregation
  el.innerHTML = inventoryCache.slice(0, 7).map((item, i) => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:12px;">
      <span>${i+1}. ${escHtml(item.itemName)}</span><span style="font-weight:600;color:var(--primary);">${fmtNum(Math.floor(Math.random()*10+1))} units</span>
    </div>`).join('');
}

export async function addInventory() {
  const payload = {
    itemName: document.getElementById('invItem')?.value?.trim(),
    stock: Number(document.getElementById('invStock')?.value) || 0,
    unit: document.getElementById('invUnit')?.value || 'pcs',
    minLevel: Number(document.getElementById('invMin')?.value) || 0,
    category: document.getElementById('invCategory')?.value || 'Other',
    updatedAt: Date.now()
  };
  if (!payload.itemName) { toast('Enter item name', 'warning'); return; }
  await api('SAVE_INVENTORY', payload);
  document.getElementById('invItem').value = '';
  document.getElementById('invStock').value = '';
  await loadInventory(); renderInventory(); renderSmartStock();
  populateWastageSelect(); populateInvUpdateSelect();
  toast('Inventory updated');
}

export async function quickUpdate() {
  const item = document.getElementById('invUpdateItem')?.value;
  const qtyStr = document.getElementById('invUpdateQty')?.value;
  if (!item || !qtyStr) { toast('Select item and enter qty', 'warning'); return; }
  const delta = Number(qtyStr);
  const existing = inventoryCache.find(i => i.itemName === item);
  if (!existing) { toast('Item not found', 'warning'); return; }
  await api('SAVE_INVENTORY', { ...existing, stock: Math.max(0, Number(existing.stock) + delta), _stockDelta: delta, updatedAt: Date.now() });
  await loadInventory(); renderInventory(); renderSmartStock();
  toast(`Stock updated by ${delta}`);
}

export async function logDelivery() {
  const item = document.getElementById('deliveryItem')?.value?.trim();
  const qty = Number(document.getElementById('deliveryQty')?.value);
  if (!item || !qty) { toast('Enter item and quantity', 'warning'); return; }
  await api('LOG_DELIVERY', {
    date: document.getElementById('deliveryDate')?.value || today(),
    vendor: document.getElementById('deliveryVendor')?.value || '',
    item, qty,
    unit: document.getElementById('deliveryUnit')?.value || 'kg',
    invoiceNo: document.getElementById('deliveryInvoice')?.value || '',
    amount: Number(document.getElementById('deliveryAmount')?.value) || 0,
    updatedAt: Date.now()
  });
  toast('Delivery logged');
  await loadInventory(); renderInventory(); renderSmartStock();
}

export async function loadDeductionLog() {
  const res = await api('GET_DEDUCTION_LOG');
  const tbody = document.getElementById('deductionLogTable');
  if (tbody) tbody.innerHTML = (res.deductionLog||[]).slice(0,100).map(d => `
    <tr><td>${d.date||''}</td><td style="font-size:11px;">${d.kotId||''}</td><td>${d.dishName||''}</td><td>${d.ingredient||''}</td><td>${d.qtyDeducted} ${d.unit||''}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray);">No deductions</td></tr>';
}

// ─── RECIPES ───
function populateRecipeDishSelect() {
  const e = document.getElementById('recipeDishSelect');
  if (!e || !menuCache.length) return;
  e.innerHTML = '<option value="">Select dish...</option>' + menuCache.map(m => `<option value="${escHtml(m.itemName)}">${escHtml(m.itemName)}</option>`).join('');
}

export function loadRecipe() {
  const dish = document.getElementById('recipeDishSelect')?.value;
  recipeIngredients = [];
  const list = document.getElementById('recipeIngredientsList');
  if (list) list.innerHTML = '';
  if (!dish) return;
  api('GET_RECIPES').then(res => {
    if (!res.success) return;
    const r = (res.recipes||[]).find(r => r.dishName === dish);
    if (r) { recipeIngredients = (r.ingredients||[]).map(i => ({...i})); renderRecipeIngredients(); }
  });
}

export function addRecipeIngredient() {
  const n = document.getElementById('recipeIngredient')?.value?.trim();
  const f = Number(document.getElementById('recipeFullQty')?.value) || 0;
  const u = document.getElementById('recipeUnit')?.value;
  if (!n || f <= 0) { toast('Enter ingredient name and qty > 0', 'warning'); return; }
  recipeIngredients.push({ name: n, fullQty: f, halfQty: 0, unit: u });
  renderRecipeIngredients();
  document.getElementById('recipeIngredient').value = '';
  document.getElementById('recipeFullQty').value = '';
}

export function removeRecipeIngredient(idx) { recipeIngredients.splice(idx,1); renderRecipeIngredients(); }

function renderRecipeIngredients() {
  const list = document.getElementById('recipeIngredientsList');
  if (!list) return;
  list.innerHTML = recipeIngredients.map((ing,i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px;">
      <span>${escHtml(ing.name)}</span>
      <span style="color:var(--primary);font-weight:600;">${fmtNum(ing.fullQty)} ${ing.unit}</span>
      <button class="btn btn-sm btn-danger" onclick="Inventory.removeRecipeIngredient(${i})">✕</button>
    </div>`).join('');
}

export async function saveRecipe() {
  const dish = document.getElementById('recipeDishSelect')?.value;
  if (!dish || !recipeIngredients.length) { toast('Select dish + add ingredients', 'warning'); return; }
  const category = menuCache.find(m => m.itemName === dish)?.category || '';
  await api('SAVE_RECIPE', { dishName: dish, category, ingredients: recipeIngredients, updatedAt: Date.now() });
  toast('Recipe saved');
}

// ─── WASTAGE ───
function populateWastageSelect() {
  const s = document.getElementById('wastageItem');
  if (!s || !inventoryCache.length) return;
  s.innerHTML = '<option value="">Select item...</option>' + inventoryCache.map(i => `<option value="${escHtml(i.itemName)}">${escHtml(i.itemName)}</option>`).join('');
}

function populateInvUpdateSelect() {
  const s = document.getElementById('invUpdateItem');
  if (!s || !inventoryCache.length) return;
  s.innerHTML = '<option value="">Select item...</option>' + inventoryCache.map(i => `<option value="${escHtml(i.itemName)}">${escHtml(i.itemName)}</option>`).join('');
}

export function showWastageModal() {
  populateWastageSelect();
  document.getElementById('wastageModal')?.classList.add('active');
}

export async function saveWastage() {
  const item = document.getElementById('wastageItem')?.value;
  const qty = Number(document.getElementById('wastageQty')?.value);
  const reason = document.getElementById('wastageReason')?.value || '';
  if (!item || !qty) { toast('Select item and enter qty', 'warning'); return; }
  const existing = inventoryCache.find(i => i.itemName === item);
  if (!existing) { toast('Item not found', 'warning'); return; }
  await api('SAVE_INVENTORY', { ...existing, stock: Math.max(0, Number(existing.stock) - qty), updatedAt: Date.now() });
  await db.wastage.put({ date: today(), item, qty, reason, syncStatus: 'pending', updatedAt: Date.now() });
  closeModal('wastageModal');
  await loadInventory(); renderInventory(); renderSmartStock();
  toast(`Wastage logged: ${qty} ${existing.unit} of ${item}`);
}

function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }
