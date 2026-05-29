/**
 * bluetooth-printer.js — Capacitor BLE → ESC/POS thermal printer
 */

import { BluetoothLe } from '@capacitor-community/bluetooth-le';
import { db } from './db.js';

let PRINTER_ID = null;
const PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHARACTERISTIC = '00002af1-0000-1000-8000-00805f9b34fb';

export function setPrinterId(id) { PRINTER_ID = id; }
export function getPrinterId() { return PRINTER_ID; }

export async function loadSavedPrinter() {
  const s = await db.settings.get('btPrinterId');
  if (s && s.value) PRINTER_ID = s.value;
}

export async function scanAndPair() {
  await BluetoothLe.initialize();
  const isEnabled = await BluetoothLe.isEnabled();
  if (!isEnabled.value) await BluetoothLe.enable();
  await BluetoothLe.requestLEScan({ allowDuplicates: false });
  return new Promise((resolve, reject) => {
    const found = [];
    const timeout = setTimeout(async () => {
      await BluetoothLe.stopLEScan();
      reject(new Error('Scan timeout'));
    }, 8000);
    BluetoothLe.addListener('onScanResult', (result) => {
      const name = result.device?.name || result.localName || '';
      if (/printer|pos|thermal/i.test(name)) found.push(result.device);
    });
    setTimeout(async () => {
      await BluetoothLe.stopLEScan();
      clearTimeout(timeout);
      resolve(found);
    }, 4500);
  });
}

export async function connectPrinter(deviceId) {
  await BluetoothLe.connect({ deviceId, timeout: 10000 });
  PRINTER_ID = deviceId;
  await db.settings.put({ key: 'btPrinterId', value: deviceId, syncStatus: 'readonly', updatedAt: Date.now() });
  return true;
}

export async function disconnectPrinter() {
  if (!PRINTER_ID) return;
  await BluetoothLe.disconnect({ deviceId: PRINTER_ID });
}

export async function printKOT(kot) {
  if (!PRINTER_ID) {
    await db.pendingPrints.add({ type: 'kot', payload: kot, printerId: null, retries: 0, createdAt: Date.now() });
    throw new Error('No printer — KOT queued');
  }
  await writePrinter(encodeKOT(kot));
  const localKot = await db.kots.where('kotId').equals(kot.kotId).first();
  if (localKot) { localKot.printedAt = Date.now(); localKot.status = 'preparing'; await db.kots.put(localKot); }
}

export async function printBill(bill) {
  if (!PRINTER_ID) {
    await db.pendingPrints.add({ type: 'bill', payload: bill, printerId: null, retries: 0, createdAt: Date.now() });
    throw new Error('No printer — Bill queued');
  }
  await writePrinter(encodeBill(bill));
}

export async function retryPendingPrints() {
  if (!PRINTER_ID) return;
  const pending = await db.pendingPrints.where('retries').below(3).toArray();
  for (const p of pending) {
    try {
      if (p.type === 'kot') await writePrinter(encodeKOT(p.payload));
      else await writePrinter(encodeBill(p.payload));
      await db.pendingPrints.delete(p.id);
    } catch {
      await db.pendingPrints.update(p.id, { retries: p.retries + 1 });
    }
  }
}

async function writePrinter(byteArray) {
  if (!PRINTER_ID) throw new Error('Printer not connected');
  const connected = await BluetoothLe.isConnected({ deviceId: PRINTER_ID });
  if (!connected.connected) await BluetoothLe.connect({ deviceId: PRINTER_ID });
  const base64 = uint8ToBase64(new Uint8Array(byteArray));
  await BluetoothLe.write({ deviceId: PRINTER_ID, service: PRINTER_SERVICE, characteristic: PRINTER_CHARACTERISTIC, value: base64 });
}

function encodeKOT(kot) {
  const ESC = 0x1B, GS = 0x1D;
  const cmds = [];
  const pushText = (text, opts = {}) => {
    if (opts.bold) cmds.push(ESC, 0x45, 0x01);
    if (opts.wide) cmds.push(ESC, 0x21, 0x30);
    if (opts.tall) cmds.push(ESC, 0x21, 0x10);
    if (opts.center) cmds.push(ESC, 0x61, 0x01);
    for (let i = 0; i < text.length; i++) cmds.push(text.charCodeAt(i));
    if (opts.bold || opts.wide || opts.tall || opts.center) {
      cmds.push(ESC, 0x45, 0x00, ESC, 0x21, 0x00, ESC, 0x61, 0x00);
    }
    cmds.push(0x0A);
  };
  const sep = () => pushText('------------------------------');
  const lf = (n=1) => { for(let i=0;i<n;i++) cmds.push(0x0A); };
  cmds.push(ESC, 0x40);
  pushText(kot.restaurant || 'INDUS WOK', { bold: true, center: true, wide: true });
  lf(1); pushText('KITCHEN ORDER TICKET', { center: true, tall: true }); sep();
  pushText(`KOT: ${kot.kotId}`, { bold: true });
  pushText(`Table: ${kot.table || 'TAKEAWAY'}`);
  pushText(`Station: ${kot.station || 'All'}`);
  pushText(`Time: ${kot.time}`); sep();
  pushText('ITEM              QTY  SIZE'); sep();
  (kot.items||[]).forEach(it => {
    const name = (it.name||'').substring(0,16).padEnd(16,' ');
    const qty = String(it.qty||1).padStart(3,' ');
    const size = (it.size||'F').padStart(4,' ');
    pushText(`${name} ${qty} ${size}`);
    if (it.notes) pushText(`  > ${it.notes}`);
  });
  sep(); lf(2); cmds.push(0x1D, 0x56, 0x01);
  return cmds;
}

function encodeBill(bill) {
  const ESC = 0x1B, GS = 0x1D;
  const cmds = [];
  const pushText = (text, opts = {}) => {
    if (opts.bold) cmds.push(ESC, 0x45, 0x01);
    if (opts.wide) cmds.push(ESC, 0x21, 0x20);
    if (opts.center) cmds.push(ESC, 0x61, 0x01);
    for (let i = 0; i < text.length; i++) cmds.push(text.charCodeAt(i));
    if (opts.bold || opts.wide || opts.center) cmds.push(ESC, 0x45, 0x00, ESC, 0x21, 0x00, ESC, 0x61, 0x00);
    cmds.push(0x0A);
  };
  cmds.push(ESC, 0x40);
  pushText(bill.restaurantName || 'The Flavours of Indus Wok', { bold: true, center: true, wide: true });
  pushText(bill.tagline || 'Pan-Asian Restaurant', { center: true });
  if (bill.address) pushText(bill.address, { center: true });
  if (bill.phone) pushText(`Ph: ${bill.phone}`, { center: true });
  if (bill.gstin) pushText(`GSTIN: ${bill.gstin}`, { center: true });
  pushText('------------------------------');
  pushText(bill.type === 'Dine-in' ? `Table: ${bill.table}` : bill.type);
  pushText(`Bill #: ${bill.billId}`);
  pushText(`Date: ${bill.date}  Time: ${bill.time}`);
  pushText('------------------------------');
  pushText('ITEM              QTY   AMT');
  pushText('------------------------------');
  (bill.items||[]).forEach(it => {
    const name = (it.name||'').substring(0,16).padEnd(16,' ');
    const qty = String(it.qty||0).padStart(3,' ');
    const amt = String(Math.round(it.total||0)).padStart(5,' ');
    pushText(`${name} ${qty} ${amt}`);
  });
  pushText('------------------------------');
  pushText(`Subtotal:           ${String(Math.round(bill.subtotal||0)).padStart(10,' ')}`);
  pushText(`CGST (2.5%):        ${String(Math.round(bill.cgst||0)).padStart(10,' ')}`);
  pushText(`SGST (2.5%):        ${String(Math.round(bill.sgst||0)).padStart(10,' ')}`);
  if (bill.discount > 0) pushText(`Discount:          -${String(Math.round(bill.discount)).padStart(9,' ')}`);
  pushText('------------------------------');
  pushText(`TOTAL:              Rs.${String(Math.round(bill.total||0)).padStart(8,' ')}`, { bold: true, wide: true });
  pushText('------------------------------');
  if (bill.upiId) { pushText('Scan to pay via UPI', { center: true }); pushText(bill.upiId, { center: true }); }
  pushText(bill.thanks || 'Thank you! Visit again.', { center: true });
  pushText('------------------------------');
  cmds.push(0x1D, 0x56, 0x01);
  return cmds;
}

function uint8ToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function testPrintPage() {
  return printKOT({
    restaurant: 'Indus Wok', kotId: 'TEST-001', table: 'T3', station: 'Chinese',
    time: new Date().toLocaleTimeString('en-IN'),
    items: [
      { name: 'Veg Hakka Noodles', qty: 2, size: 'FULL', notes: 'Extra spicy, no onion' },
      { name: 'Schezwan Rice', qty: 1, size: 'HALF' },
    ]
  });
}
