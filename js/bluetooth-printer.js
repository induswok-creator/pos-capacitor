/**
 * bluetooth-printer.js — Capacitor BLE → ESC/POS thermal printer
 * With browser print fallback for web (GitHub Pages)
 */

import { db } from './db.js';
import { toast } from './utils.js';

let PRINTER_ID = null;
const PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHARACTERISTIC = '00002af1-0000-1000-8000-00805f9b34fb';

// Detect if we're running in native Capacitor or web browser
const isNative = (() => {
  try {
    // If the Capacitor shim is loaded (web), BluetoothLe.initialize throws
    // If native, it works. We check for the native bridge.
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  } catch { return false; }
})();

// Lazy-load BLE only on native
let BluetoothLe = null;
async function getBLE() {
  if (BluetoothLe) return BluetoothLe;
  if (isNative) {
    const mod = await import('@capacitor-community/bluetooth-le');
    BluetoothLe = mod.BluetoothLe;
    return BluetoothLe;
  }
  return null; // Web — no BLE
}

export function setPrinterId(id) { PRINTER_ID = id; }
export function getPrinterId() { return PRINTER_ID; }
export function isPrinterConnected() { return !!PRINTER_ID; }
export function isNativeApp() { return isNative; }

export async function loadSavedPrinter() {
  try {
    const s = await db.settings.get('btPrinterId');
    if (s && s.value) PRINTER_ID = s.value;
  } catch(e) {}
}

// ─── SCAN & PAIR ───
export async function scanAndPair() {
  const ble = await getBLE();

  if (!ble) {
    // Web browser — no BLE scanning, but offer info
    return null; // signal to caller that BLE is not available
  }

  // Native path
  await ble.initialize();
  const isEnabled = await ble.isEnabled();
  if (!isEnabled.value) await ble.enable();
  await ble.requestLEScan({ allowDuplicates: false });

  return new Promise((resolve, reject) => {
    const found = [];
    const timeout = setTimeout(async () => {
      await ble.stopLEScan();
      reject(new Error('Scan timeout'));
    }, 8000);
    ble.addListener('onScanResult', (result) => {
      const name = result.device?.name || result.localName || '';
      if (/printer|pos|thermal/i.test(name)) found.push(result.device);
    });
    setTimeout(async () => {
      await ble.stopLEScan();
      clearTimeout(timeout);
      resolve(found);
    }, 4500);
  });
}

export async function connectPrinter(deviceId) {
  const ble = await getBLE();
  if (!ble) throw new Error('Bluetooth not available in browser');
  await ble.connect({ deviceId, timeout: 10000 });
  PRINTER_ID = deviceId;
  await db.settings.put({ key: 'btPrinterId', value: deviceId, syncStatus: 'readonly', updatedAt: Date.now() });
  return true;
}

export async function disconnectPrinter() {
  if (!PRINTER_ID) return;
  const ble = await getBLE();
  if (ble) await ble.disconnect({ deviceId: PRINTER_ID });
  PRINTER_ID = null;
}

// ─── PRINT KOT ───
export async function printKOT(kot) {
  if (!isNative || !PRINTER_ID) {
    // Browser fallback — print via browser print dialog
    browserPrintKOT(kot);
    return;
  }
  const ble = await getBLE();
  if (!ble) { browserPrintKOT(kot); return; }
  await writePrinter(encodeKOT(kot));
  const localKot = await db.kots.where('kotId').equals(kot.kotId).first();
  if (localKot) { localKot.printedAt = Date.now(); localKot.status = 'preparing'; await db.kots.put(localKot); }
}

// ─── PRINT BILL ───
export async function printBill(bill) {
  if (!isNative || !PRINTER_ID) {
    browserPrintBill(bill);
    return;
  }
  const ble = await getBLE();
  if (!ble) { browserPrintBill(bill); return; }
  await writePrinter(encodeBill(bill));
}

// ─── RETRY PENDING ───
export async function retryPendingPrints() {
  if (!PRINTER_ID || !isNative) return;
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

// ─── BROWSER PRINT FALLBACKS ───
function browserPrintKOT(kot) {
  const items = (kot.items || []).map(it =>
    `<tr><td>${it.name||''}</td><td style="text-align:center;">${it.qty||1}</td><td style="text-align:center;">${it.size||'F'}</td>${it.notes ? `<td style="font-size:11px;color:#666;">${it.notes}</td>` : ''}</tr>`
  ).join('');

  const html = `
    <div style="font-family:monospace;max-width:300px;margin:auto;padding:10px;">
      <h2 style="text-align:center;margin:0;">🍳 KITCHEN ORDER</h2>
      <hr>
      <div><strong>KOT:</strong> ${kot.kotId || ''}</div>
      <div><strong>Table:</strong> ${kot.table || 'TAKEAWAY'}</div>
      <div><strong>Station:</strong> ${kot.station || 'All'}</div>
      <div><strong>Time:</strong> ${kot.time || new Date().toLocaleTimeString('en-IN')}</div>
      <hr>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="border-bottom:1px solid #000;"><th style="text-align:left;">Item</th><th>Qty</th><th>Size</th></tr>
        ${items}
      </table>
      <hr>
      <div style="text-align:center;font-size:11px;">${new Date().toLocaleString('en-IN')}</div>
    </div>`;
  openPrintWindow(html, 'KOT - ' + (kot.kotId || ''));
}

function browserPrintBill(bill) {
  const items = (bill.items || []).map(it =>
    `<tr><td>${it.itemName||it.name||''} ${it.size==='HALF'?'(H)':''}</td><td style="text-align:center;">${it.qty||0}</td><td style="text-align:right;">₹${Math.round(it.total||0)}</td></tr>`
  ).join('');

  const html = `
    <div style="font-family:monospace;max-width:300px;margin:auto;padding:10px;">
      <h2 style="text-align:center;margin:5px 0;">${bill.restaurantName || 'The Flavours of Indus Wok'}</h2>
      <div style="text-align:center;font-size:12px;">${bill.tagline || ''}</div>
      ${bill.address ? `<div style="text-align:center;font-size:12px;">${bill.address}</div>` : ''}
      ${bill.phone ? `<div style="text-align:center;font-size:12px;">Ph: ${bill.phone}</div>` : ''}
      ${bill.gstin ? `<div style="text-align:center;font-size:12px;">GSTIN: ${bill.gstin}</div>` : ''}
      <hr>
      <div><strong>${bill.type === 'Dine-in' ? 'Table: ' + bill.table : bill.type || 'Takeaway'}</strong></div>
      <div>Bill #: ${bill.billId || ''}</div>
      <div>Date: ${bill.date || ''} &nbsp; Time: ${bill.time || ''}</div>
      <hr>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr style="border-bottom:1px solid #000;"><th style="text-align:left;">Item</th><th>Qty</th><th style="text-align:right;">Amount</th></tr>
        ${items}
      </table>
      <hr>
      <table style="width:100%;font-size:12px;">
        <tr><td>Subtotal</td><td style="text-align:right;">₹${Math.round(bill.subtotal||0)}</td></tr>
        <tr><td>CGST (2.5%)</td><td style="text-align:right;">₹${Math.round(bill.cgst||0)}</td></tr>
        <tr><td>SGST (2.5%)</td><td style="text-align:right;">₹${Math.round(bill.sgst||0)}</td></tr>
        ${bill.discount > 0 ? `<tr><td>Discount</td><td style="text-align:right;">-₹${Math.round(bill.discount)}</td></tr>` : ''}
      </table>
      <hr>
      <div style="font-size:18px;font-weight:bold;text-align:center;">TOTAL: ₹${Math.round(bill.total||0)}</div>
      <hr>
      ${bill.upiId ? `<div style="text-align:center;font-size:11px;">UPI: ${bill.upiId}</div>` : ''}
      <div style="text-align:center;font-size:12px;margin-top:8px;">${bill.thanks || 'Thank you! Visit again.'}</div>
    </div>`;
  openPrintWindow(html, 'Bill - ' + (bill.billId || ''));
}

function openPrintWindow(html, title) {
  const printArea = document.getElementById('printArea');
  if (printArea) {
    printArea.innerHTML = html;
    printArea.style.display = 'block';
    window.print();
    setTimeout(() => { printArea.style.display = 'none'; }, 1000);
  } else {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{margin:0;font-family:monospace;}@media print{body{margin:0;}}</style></head><body>${html}<script>setTimeout(()=>{window.print();window.close();},500);<\/script></body></html>`);
      w.document.close();
    }
  }
}

// ─── NATIVE BLE WRITE ───
async function writePrinter(byteArray) {
  if (!PRINTER_ID) throw new Error('Printer not connected');
  const ble = await getBLE();
  if (!ble) throw new Error('BLE not available');
  const connected = await ble.isConnected({ deviceId: PRINTER_ID });
  if (!connected.connected) await ble.connect({ deviceId: PRINTER_ID });
  const base64 = uint8ToBase64(new Uint8Array(byteArray));
  await ble.write({ deviceId: PRINTER_ID, service: PRINTER_SERVICE, characteristic: PRINTER_CHARACTERISTIC, value: base64 });
}

// ─── ESC/POS ENCODERS (for native BLE) ───
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
