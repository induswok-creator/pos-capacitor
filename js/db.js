/**
 * db.js — Dexie IndexedDB Schema (complete)
 */

import Dexie from 'dexie';

export const db = new Dexie('IndusWokPOS');

db.version(1).stores({
  menu: '++id, itemName, category, station, isActive, syncStatus, updatedAt',
  categories: '++id, name, sortOrder, syncStatus, updatedAt',
  orders: '++id, orderId, tableNo, status, type, createdAt, syncStatus, updatedAt',
  kots: '++id, kotId, orderId, station, status, createdAt, printedAt, syncStatus, updatedAt',
  tables: 'tableNo, area, status, occupiedAt, syncStatus, updatedAt',
  inventory: '++id, itemName, category, unit, syncStatus, updatedAt',
  recipes: '++id, dishName, category, syncStatus, updatedAt',
  deliveries: '++id, date, item, vendor, syncStatus, updatedAt',
  deductionLog: '++id, date, kotId, dishName, ingredient, syncStatus, updatedAt',
  wastage: '++id, date, item, qty, reason, syncStatus, updatedAt',
  sales: '++id, date, syncStatus, updatedAt',
  expenses: '++id, date, category, syncStatus, updatedAt',
  moneyReceived: '++id, date, syncStatus, updatedAt',
  reconciliation: '++id, date, syncStatus, updatedAt',
  customers: 'phone, name, platform, lastOrder, syncStatus, updatedAt',
  customerOrders: '++id, phone, orderId, date, syncStatus, updatedAt',
  staff: '++id, name, phone, role, syncStatus, updatedAt',
  attendance: '++id, staffId, date, syncStatus, updatedAt',
  staffPayments: '++id, staffId, date, month, syncStatus, updatedAt',
  tasks: '++id, task, assigned, status, due, syncStatus, updatedAt',
  contentIdeas: '++id, idea, platform, category, status, syncStatus, updatedAt',
  auditLog: '++id, time, user, action, role',
  settings: 'key, syncStatus, updatedAt',
  syncQueue: '++id, table, action, retries, createdAt, [table+retries]',
  reportsLog: '++id, timestamp, reportType, status',
  pendingPrints: '++id, type, payload, printerId, retries, createdAt',
  pastBills: '++id, orderId, createdAt',
  vendors: '++id, name, category, syncStatus, updatedAt',
  targets: '++id, type, date, syncStatus, updatedAt',
  dishes: '++id, name, category, syncStatus, updatedAt',
  dishSales: '++id, dishName, date, syncStatus, updatedAt'
});

export async function initDatabase() {
  try {
    await db.open();
    console.log('[DB] IndusWokPOS opened, version', db.verno);
  } catch (err) {
    console.error('[DB] Open failed — trying reset', err);
    await db.delete();
    await db.open();
  }
}

export async function putLocal(table, data) {
  data.updatedAt = Date.now();
  data.syncStatus = data.syncStatus || 'pending';
  await db[table].put(data);
}

export async function getByKey(table, key) { return db[table].get(key); }

export async function getAll(table, opts = {}) {
  let coll = db[table].orderBy(opts.orderBy || 'updatedAt');
  if (opts.reverse) coll = coll.reverse();
  if (opts.limit) coll = coll.limit(opts.limit);
  return coll.toArray();
}

export async function queryByIndex(table, index, value) {
  return db[table].where(index).equals(value).toArray();
}

export async function markSynced(table, key, serverVersion) {
  const rec = await db[table].get(key);
  if (!rec) return;
  rec.syncStatus = 'synced';
  rec.version = serverVersion || rec.version;
  rec.updatedAt = Date.now();
  await db[table].put(rec);
}

export async function markConflict(table, key, serverData) {
  const rec = await db[table].get(key);
  if (!rec) return;
  rec.syncStatus = 'conflict';
  rec._serverData = serverData;
  await db[table].put(rec);
}

export async function bulkPut(table, rows) {
  const ts = Date.now();
  rows.forEach(r => { r.syncStatus = 'synced'; r.updatedAt = r.updatedAt || ts; });
  await db[table].bulkPut(rows);
}

export function livePendingKots() {
  return db.kots.where('status').anyOf(['new','preparing']).sortBy('createdAt');
}

export default db;
