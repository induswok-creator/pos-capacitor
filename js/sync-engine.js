/**
 * sync-engine.js — Background queue processor + conflict resolution
 */

import { db, markSynced, markConflict, bulkPut } from './db.js';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzsiF9u9_cL2UprmWnVI5CMficGj3aTNb_uehcdDb1uo0m8whK5GWSXZhE-qEqGd9mkMg/exec';
const BATCH_SIZE = 25;
const RETRY_LIMIT = 5;
const POLL_INTERVAL_MS = 30000;

let isProcessing = false;
let intervalId = null;

export async function enqueue({ action, payload, table, localId }) {
  await db.syncQueue.add({
    action, payload, table, localId: localId || null,
    retries: 0, error: null, createdAt: Date.now(), status: 'queued'
  });
}

export function triggerBackgroundSync() {
  if (isProcessing) return;
  processQueue();
}

export function startSyncListener() {
  Network.addListener('networkStatusChange', async (status) => {
    if (status.connected) { console.log('[Sync] Online → flushing'); processQueue(); }
  });
  intervalId = setInterval(async () => {
    const state = await App.getState();
    if (state.isActive) processQueue();
  }, POLL_INTERVAL_MS);
  processQueue();
}

export function stopSyncListener() {
  if (intervalId) clearInterval(intervalId);
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const net = await Network.getStatus();
    if (!net.connected) { isProcessing = false; return; }

    const pending = await db.syncQueue
      .where('retries').below(RETRY_LIMIT)
      .and(q => q.status !== 'done')
      .sortBy('createdAt');
    if (!pending.length) { isProcessing = false; return; }

    const batch = pending.slice(0, BATCH_SIZE);
    const payload = batch.map(q => ({
      action: q.action, payload: q.payload, table: q.table,
      localId: q.localId, clientVersion: q.payload.updatedAt || q.createdAt
    }));

    const result = await pushToCloud(payload);

    for (let i = 0; i < batch.length; i++) {
      const q = batch[i];
      const r = result[i];
      if (r && r.acked) {
        await db.syncQueue.update(q.id, { status: 'done' });
        if (q.table && q.localId) await markSynced(q.table, q.localId, r.serverVersion);
      } else if (r && r.conflict) {
        await db.syncQueue.update(q.id, { status: 'conflict', error: JSON.stringify(r.serverData) });
        if (q.table && q.localId) await markConflict(q.table, q.localId, r.serverData);
      } else {
        await db.syncQueue.update(q.id, { retries: q.retries + 1, error: r?.message || 'Unknown' });
      }
    }

    await db.syncQueue.where('status').equals('done').delete();
    const remaining = await db.syncQueue.where('retries').below(RETRY_LIMIT).and(q => q.status !== 'done').count();
    if (remaining > 0) setTimeout(processQueue, 500);
  } catch (err) {
    console.error('[Sync] Processor error', err);
  } finally {
    isProcessing = false;
  }
}

async function pushToCloud(batch) {
  try {
    const resp = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'BATCH_SYNC', batch }),
      headers: { 'Content-Type': 'text/plain' }
    });
    const text = await resp.text();
    try {
      const json = JSON.parse(text);
      return json.results || batch.map(() => ({ acked: false, message: 'No results array' }));
    } catch {
      return batch.map(() => ({ acked: false, message: text.slice(0,200) }));
    }
  } catch (err) {
    return batch.map(() => ({ acked: false, message: err.message }));
  }
}

export async function resolveConflict(table, localId, choice, mergedPayload = null) {
  const rec = await db[table].get(localId);
  if (!rec || rec.syncStatus !== 'conflict') return;
  if (choice === 'server') {
    const server = rec._serverData;
    delete server._serverData;
    server.syncStatus = 'synced';
    await db[table].put(server);
  } else if (choice === 'local') {
    delete rec._serverData;
    rec.syncStatus = 'pending';
    rec.updatedAt = Date.now();
    await db[table].put(rec);
    await enqueue({ action: 'FORCE_SAVE', payload: rec, table, localId });
    triggerBackgroundSync();
  } else if (choice === 'merge') {
    delete mergedPayload._serverData;
    mergedPayload.syncStatus = 'pending';
    mergedPayload.updatedAt = Date.now();
    await db[table].put(mergedPayload);
    await enqueue({ action: 'FORCE_SAVE', payload: mergedPayload, table, localId });
    triggerBackgroundSync();
  }
}

export async function pullAllFromCloud(sinceTimestamp = 0) {
  try {
    const resp = await fetch(`${GAS_URL}?action=PULL_CHANGES&since=${sinceTimestamp}`);
    const data = await resp.json();
    if (!data.success) return;
    for (const [table, rows] of Object.entries(data.changes || {})) {
      if (db[table]) await bulkPut(table, rows);
    }
  } catch (err) {
    console.error('[Sync] Pull failed', err);
  }
}

export async function getSyncSummary() {
  const pending = await db.syncQueue.where('status').equals('queued').count();
  const conflicts = await db.syncQueue.where('status').equals('conflict').count();
  const failed = await db.syncQueue.where('retries').aboveOrEqual(RETRY_LIMIT).count();
  return { pending, conflicts, failed, clean: pending === 0 && conflicts === 0 };
}
