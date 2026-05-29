/**
 * api.js — DROP-IN replacement for global api(action, payload)
 * Reads return from IndexedDB instantly. Writes save locally + enqueue sync.
 */

import { db, putLocal, getByKey, getAll, queryByIndex, markSynced } from './db.js';
import { enqueue, triggerBackgroundSync } from './sync-engine.js';
import { Network } from '@capacitor/network';

// ─── CONFIG ───
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzsiF9u9_cL2UprmWnVI5CMficGj3aTNb_uehcdDb1uo0m8whK5GWSXZhE-qEqGd9mkMg/exec';

const ACTION_MAP = {
  // Reads
  GET_MENU: { table: 'menu', type: 'read', index: 'isActive', value: true },
  GET_CATEGORIES:     { table: 'categories',   type: 'read' },
  GET_ORDERS:         { table: 'orders',        type: 'read',  orderBy: 'createdAt', reverse: true },
  GET_KOTS:           { table: 'kots',          type: 'read',  orderBy: 'createdAt', reverse: true },
  GET_TABLES:         { table: 'tables',        type: 'read' },
  GET_INVENTORY:      { table: 'inventory',     type: 'read' },
  GET_RECIPES:        { table: 'recipes',       type: 'read' },
  GET_CUSTOMERS:      { table: 'customers',     type: 'read' },
  GET_STAFF:          { table: 'staff',         type: 'read' },
  GET_ATTENDANCE:     { table: 'attendance',    type: 'read',  orderBy: 'date', reverse: true },
  GET_TASKS:          { table: 'tasks',         type: 'read' },
  GET_REPORTS_LOG:    { table: 'reportsLog',    type: 'read',  orderBy: 'timestamp', reverse: true },
  GET_SMART_STOCK:    { table: 'inventory',     type: 'read' },
  GET_DEDUCTION_LOG:  { table: 'deductionLog',  type: 'read',  limit: 100 },
  GET_PAYMENTS:        { table: "staffPayments", type: "read", orderBy: "date", reverse: true },
  GET_SALES:          { table: 'sales',         type: 'read',  orderBy: 'date', reverse: true },
  GET_EXPENSES:       { table: 'expenses',      type: 'read',  orderBy: 'date', reverse: true },
  GET_PAST_BILLS:     { table: 'pastBills',     type: 'read',  orderBy: 'createdAt', reverse: true },
  GET_SETTINGS:       { table: 'settings',      type: 'read' },
  GET_USERS:          { table: 'settings',      type: 'read',  key: 'users' },
  GET_VENDORS:        { table: 'vendors',       type: 'read' },
  GET_TARGETS:        { table: 'targets',       type: 'read' },
  GET_DISHES:         { table: 'dishes',        type: 'read' },
  GET_MONEY_RECEIVED: { table: 'moneyReceived', type: 'read',  orderBy: 'date', reverse: true },
  GET_RECONCILIATION: { table: 'reconciliation',type: 'read',  orderBy: 'date', reverse: true },
  GET_CONTENT_IDEAS:  { table: 'contentIdeas',  type: 'read' },
  GET_AUDIT_LOG:      { table: 'auditLog',      type: 'read',  orderBy: 'time', reverse: true },

  // Writes
  SAVE_ORDER:          { table: 'orders',        type: 'write', idField: 'orderId' },
  SAVE_KOT:            { table: 'kots',          type: 'write', idField: 'kotId' },
  UPDATE_TABLE:        { table: 'tables',        type: 'write', idField: 'tableNo' },
  SAVE_INVENTORY:      { table: 'inventory',     type: 'write', idField: 'itemName' },
  SAVE_RECIPE:         { table: 'recipes',       type: 'write', idField: 'dishName' },
  SAVE_MENU_ITEM:      { table: "menu", type: "write", idField: "itemName" },
  LOG_DELIVERY:        { table: 'deliveries',    type: 'write' },
  SAVE_SALE:           { table: 'sales',         type: 'write' },
  SAVE_EXPENSE:        { table: 'expenses',      type: 'write' },
  SAVE_CUSTOMER:       { table: 'customers',     type: 'write', idField: 'phone' },
  ADD_STAFF:           { table: 'staff',         type: 'write' },
  MARK_ATTENDANCE:     { table: 'attendance',    type: 'write' },
  RECORD_PAYMENT:      { table: 'staffPayments', type:'write' },
  ADD_TASK:            { table: 'tasks',         type: 'write' },
  UPDATE_TASK:         { table: 'tasks',         type: 'write' },
  SAVE_DISH:           { table: 'dishes',          type: 'write', idField: 'name' },
  LOG_DISH_SALE:       { table: 'dishSales',       type: 'write' },
  SAVE_SETTING:        { table: 'settings',        type: 'write', idField: 'key' },
  ADD_USER:            { table: 'settings',        type: 'write', idField: 'key' },
  UPDATE_USER:         { table: 'settings',        type: 'write', idField: 'key' },
  DELETE_USER:         { table: 'settings',        type: 'write', idField: 'key' },
  SAVE_VENDOR:         { table: 'vendors',         type: 'write', idField: 'name' },
  UPDATE_VENDOR:       { table: 'vendors',         type: 'write', idField: 'name' },
  SET_TARGET:          { table: 'targets',         type: 'write' },
  SAVE_MONEY_RECEIVED: { table: 'moneyReceived',   type: 'write' },
  SAVE_RECONCILIATION: { table: 'reconciliation',  type: 'write' },
  SAVE_CONTENT_IDEA:   { table: 'contentIdeas',    type: 'write' },
  UPDATE_CONTENT_IDEA: { table: 'contentIdeas',    type: 'write' },
  SEND_DAILY_REPORT:   { table: 'reportsLog',      type: 'write' },
  SEND_WEEKLY_REPORT:  { table: 'reportsLog',      type: 'write' },
  SEND_LOW_STOCK_ALERT:{ table: 'reportsLog',      type: 'write' },
  LOG_AUDIT:           { table: 'auditLog',        type: 'write' },
};

export async function api(action, payload = {}) {
  const meta = ACTION_MAP[action];
  if (!meta) {
    console.warn('[API] Unmapped action', action, '→ falling back to network');
    return fetchGas(action, payload);
  }
  if (meta.type === 'read') {
    const local = await handleRead(meta, payload);
    if (local && (Array.isArray(local) ? local.length > 0 : true)) {
      return wrapSuccess(local, meta.table, action);
    }
    const net = await Network.getStatus();
    if (net.connected) {
      const cloud = await fetchGas(action, payload);
      if (cloud.success) await cacheCloudResponse(meta, cloud);
      return cloud;
    }
    return wrapSuccess(local || [], meta.table, action);
  }
  if (meta.type === 'write') {
    const localId = await handleWrite(meta, payload);
    await enqueue({ action, payload, table: meta.table, localId });
    const net = await Network.getStatus();
    if (net.connected) triggerBackgroundSync();
    return { success: true, localId, message: 'Saved locally. Will sync.' };
  }
  return { success: false, message: 'Unknown operation type' };
}

async function handleRead(meta, payload) {
  const tbl = meta.table;
  if (meta.key) return getByKey(tbl, meta.key);
  if (meta.index && meta.value !== undefined) return queryByIndex(tbl, meta.index, meta.value);
  return getAll(tbl, { orderBy: meta.orderBy, reverse: meta.reverse, limit: meta.limit });
}

async function handleWrite(meta, payload) {
  const data = { ...payload };
  data.syncStatus = 'pending';
  data.updatedAt = Date.now();
  if (meta.idField && !data[meta.idField]) {
    data[meta.idField] = generateLocalId(meta.table);
  }
  let pk;
  if (meta.idField) pk = data[meta.idField];
  else if (meta.table === 'settings') pk = data.key;
  else pk = undefined;
  await putLocal(meta.table, pk ? { ...data, [getPkName(meta.table)]: pk } : data);
  return pk || data.id;
}

function getPkName(table) {
  const map = {
    menu:'id', categories:'id', orders:'id', kots:'id', tables:'tableNo',
    inventory:'id', recipes:'id', deliveries:'id', deductionLog:'id',
    sales:'id', expenses:'id', moneyReceived:'id', reconciliation:'id',
    customers:'phone', customerOrders:'id', staff:'id', attendance:'id',
    staffPayments:'id', tasks:'id', contentIdeas:'id', auditLog:'id',
    settings:'key', syncQueue:'id', reportsLog:'id', pendingPrints:'id',
    pastBills:'id', vendors:'id', targets:'id', dishes:'id', dishSales:'id'
  };
  return map[table] || 'id';
}

function generateLocalId(prefix) {
  const now = Date.now();
  const rand = Math.floor(Math.random() * 1000);
  return `${prefix?.toUpperCase()?.slice(0,3)||'LOC'}-${now}-${rand}`;
}

async function fetchGas(action, payload) {
  try {
    const body = JSON.stringify({ action, ...payload });
    const resp = await fetch(GAS_URL, { method: 'POST', body, headers:{'Content-Type':'text/plain'} });
    const text = await resp.text();
    try { return JSON.parse(text); } catch { return { success:false, message:text }; }
  } catch (err) {
    return { success:false, message: err.message };
  }
}

async function cacheCloudResponse(meta, cloud) {
  if (!cloud.success) return;
  const data = cloud[meta.table] || cloud.data || cloud;
  if (!data) return;
  if (Array.isArray(data)) {
    for (const row of data) {
      row.syncStatus = 'synced';
      row.updatedAt = Date.now();
      await putLocal(meta.table, row);
    }
  } else {
    data.syncStatus = 'synced';
    data.updatedAt = Date.now();
    await putLocal(meta.table, data);
  }
}

function wrapSuccess(data, table, action) {
  const out = { success: true };
  const keyMap = {
    menu:'menu', orders:'orders', kots:'kots', tables:'tables',
    inventory:'inventory', customers:'customers', staff:'staff',
    attendance:'attendance', tasks:'tasks', sales:'sales',
    expenses:'expenses', reportsLog:'reportsLog', deductionLog:'deductionLog',
    categories:'categories', recipes:'recipes', vendors:'vendors',
    targets:'targets', dishes:'dishes', moneyReceived:'moneyReceived',
    reconciliation:'reconciliation', contentIdeas:'contentIdeas',
    auditLog:'auditLog'
  };
  if (Array.isArray(data)) {
    const k = keyMap[table];
    if (k) out[k] = data;
    out[table] = data;
  } else {
    out[table] = data;
  }
  if (action === 'GET_MENU') out.menu = out.menu || data;
  if (action === 'GET_ORDERS') out.orders = out.orders || data;
  if (action === 'GET_TABLES') out.tables = out.tables || data;
  if (action === 'GET_USERS') out.users = out.users || data;
  return out;
}

export async function warmCacheFromCloud(actions = ['GET_MENU','GET_TABLES','GET_CATEGORIES','GET_INVENTORY']) {
  const net = await Network.getStatus();
  if (!net.connected) return;
  for (const action of actions) {
    const cloud = await fetchGas(action, {});
    if (cloud.success) {
      const meta = ACTION_MAP[action];
      if (meta) await cacheCloudResponse(meta, cloud);
    }
  }
}
