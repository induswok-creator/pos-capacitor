/**
 * utils.js — Shared helpers
 */

export function fmtNum(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('en-IN');
}

export function escJs(s) {
  return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

export function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function escAttr(s) {
  return (s || '').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

let toastTimeout;
export function toast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { if (el.parentNode) el.remove(); }, 3000);
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function nowTime() {
  return new Date().toLocaleTimeString('en-IN');
}

export function generateId(prefix) {
  const now = Date.now();
  const rand = Math.floor(Math.random() * 1000);
  return `${prefix?.toUpperCase()?.slice(0, 3) || 'LOC'}-${now}-${rand}`;
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function sum(arr, key) {
  return arr.reduce((a, i) => a + (Number(i[key]) || 0), 0);
}
