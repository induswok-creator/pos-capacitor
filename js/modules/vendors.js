/**
 * vendors.js — Vendor management + outstanding payments
 */

import { api } from '../api.js';
import { escHtml, fmtNum, toast, today } from '../utils.js';

let vendorsCache = [];

export async function onTabFocus() {
  await loadVendors();
  renderVendors();
}

async function loadVendors() {
  const res = await api('GET_VENDORS');
  vendorsCache = res.vendors || [];
}

function renderVendors() {
  const tbody = document.getElementById('vendorTable');
  if (!tbody) return;
  tbody.innerHTML = vendorsCache.map(v => `
    <tr>
      <td>${escHtml(v.name)}</td>
      <td>${escHtml(v.category)}</td>
      <td>${escHtml(v.phone||'-')}</td>
      <td>₹${fmtNum(v.outstanding||0)}</td>
      <td><button class="btn btn-sm btn-primary" onclick="Vendors.payVendor('${escHtml(v.name)}')">💰 Pay</button></td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray);">No vendors</td></tr>';
}

export async function addVendor() {
  const name = document.getElementById('vendorName')?.value?.trim();
  const category = document.getElementById('vendorCategory')?.value;
  const phone = document.getElementById('vendorPhone')?.value?.trim();
  if (!name) { toast('Enter vendor name', 'warning'); return; }
  await api('SAVE_VENDOR', { name, category, phone, outstanding: 0, updatedAt: Date.now() });
  document.getElementById('vendorName').value = '';
  document.getElementById('vendorPhone').value = '';
  await loadVendors(); renderVendors();
  toast('Vendor added');
}

export async function payVendor(name) {
  const amt = prompt(`Enter payment amount for ${name}:`);
  if (!amt || isNaN(amt)) return;
  await api('UPDATE_VENDOR', { name, payment: Number(amt), updatedAt: Date.now() });
  await loadVendors(); renderVendors();
  toast(`Payment of ₹${amt} recorded for ${name}`);
}
