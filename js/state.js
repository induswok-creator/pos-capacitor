/**
 * state.js — Central reactive state manager
 * Minimal pub/sub so any module can listen to changes.
 */

const listeners = new Map();
const state = {
  currentUser: null,
  cart: [],
  discountValue: 0,
  discountType: 'flat',
  selectedTable: null,
  tableCarts: {},
  menuCache: [],
  categoriesCache: [],
  ordersCache: [],
  kotsCache: [],
  tablesCache: [],
  customersCache: [],
  staffCache: [],
  inventoryCache: [],
  syncStatus: { pending: 0, conflicts: 0, clean: true },
  printerConnected: false,
  online: navigator.onLine
};

export function getState() { return state; }

export function setState(key, value) {
  const old = state[key];
  state[key] = value;
  if (old !== value) emit(key, value);
}

export function updateState(updates) {
  for (const [k, v] of Object.entries(updates)) setState(k, v);
}

export function subscribe(key, callback) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(callback);
  return () => listeners.get(key).delete(callback);
}

function emit(key, value) {
  const set = listeners.get(key);
  if (set) set.forEach(cb => cb(value, key));
}

// Derived helpers
export function getActiveCart() {
  if (state.selectedTable && state.tableCarts[state.selectedTable]) {
    return state.tableCarts[state.selectedTable].cart || [];
  }
  return state.cart;
}

export function getActiveDiscount() {
  if (state.selectedTable && state.tableCarts[state.selectedTable]) {
    return state.tableCarts[state.selectedTable].discountValue || 0;
  }
  return state.discountValue;
}

export function getActiveDiscType() {
  if (state.selectedTable && state.tableCarts[state.selectedTable]) {
    return state.tableCarts[state.selectedTable].discountType || 'flat';
  }
  return state.discountType;
}
