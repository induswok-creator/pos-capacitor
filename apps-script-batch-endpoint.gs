/**
 * Google Apps Script — BATCH_SYNC & PULL_CHANGES endpoints
 * Add these to your existing .gs file alongside current handlers.
 * 
 * This replaces dozens of individual round-trips with one batched POST.
 */

// ─── CONFIG ───
var SHEET_ID = 'YOUR_GOOGLE_SHEET_ID'; // or SpreadsheetApp.getActive().getId()
var MAX_BATCH = 50;

// ─── doPost router ───
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    
    if (body.action === 'BATCH_SYNC') {
      return jsonResponse(processBatch(body.batch));
    }
    
    // Fallback to your existing single-action handlers
    // (keep backward compatibility during migration)
    return legacyDoPost(e);
    
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

// ─── doGet router ───
function doGet(e) {
  var action = e.parameter.action;
  if (action === 'PULL_CHANGES') {
    var since = parseInt(e.parameter.since || '0');
    return jsonResponse(pullChanges(since));
  }
  return legacyDoGet(e);
}

// ─── BATCH PROCESSOR ───
function processBatch(batch) {
  var results = [];
  if (!batch || !Array.isArray(batch)) return [{ acked: false, message: 'Invalid batch' }];
  if (batch.length > MAX_BATCH) return [{ acked: false, message: 'Batch too large (>50)' }];
  
  var ss = SpreadsheetApp.openById(SHEET_ID);
  
  for (var i = 0; i < batch.length; i++) {
    var op = batch[i];
    var res = { acked: false };
    
    try {
      switch (op.table) {
        case 'orders':
        case 'kots':
          res = syncOrderLike(ss, op.table, op.payload, op.localId, op.clientVersion);
          break;
        case 'tables':
          res = syncTable(ss, op.payload, op.localId, op.clientVersion);
          break;
        case 'inventory':
          res = syncInventory(ss, op.payload, op.localId, op.clientVersion);
          break;
        case 'menu':
          res = syncGeneric(ss, 'Menu', op.payload, 'itemName', op.clientVersion);
          break;
        case 'categories':
          res = syncGeneric(ss, 'Categories', op.payload, 'name', op.clientVersion);
          break;
        case 'sales':
          res = syncGeneric(ss, 'Sales', op.payload, 'date', op.clientVersion);
          break;
        case 'expenses':
          res = syncGeneric(ss, 'Expenses', op.payload, 'date', op.clientVersion);
          break;
        case 'customers':
          res = syncGeneric(ss, 'Customers', op.payload, 'phone', op.clientVersion);
          break;
        case 'staff':
          res = syncGeneric(ss, 'Staff', op.payload, 'name', op.clientVersion);
          break;
        case 'attendance':
          res = syncGeneric(ss, 'Attendance', op.payload, 'id', op.clientVersion);
          break;
        case 'tasks':
          res = syncGeneric(ss, 'Tasks', op.payload, 'id', op.clientVersion);
          break;
        case 'settings':
          res = syncSettings(ss, op.payload, op.clientVersion);
          break;
        default:
          res = { acked: true, warning: 'No custom handler, assumed ok' };
      }
    } catch (err) {
      res = { acked: false, message: err.toString(), retryable: true };
    }
    
    results.push(res);
  }
  return { success: true, results: results };
}

// ─── GENERIC SYNC (Last-Write-Wins) ───
function syncGeneric(ss, sheetName, payload, keyField, clientVersion) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { acked: false, message: 'Sheet not found: ' + sheetName };
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var keyIdx = headers.indexOf(keyField) + 1;
  if (keyIdx === 0) return { acked: false, message: 'Key field missing: ' + keyField };
  
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][keyIdx-1]) === String(payload[keyField])) {
      foundRow = r + 1; // 1-based
      break;
    }
  }
  
  // Conflict check using version / updatedAt if available
  var versionIdx = headers.indexOf('updatedAt') + 1;
  if (foundRow > 1 && versionIdx > 0 && clientVersion) {
    var serverVersion = Number(data[foundRow-1][versionIdx-1]) || 0;
    if (serverVersion > Number(clientVersion)) {
      // Server has newer data — return conflict
      var serverObj = {};
      for (var h = 0; h < headers.length; h++) serverObj[headers[h]] = data[foundRow-1][h];
      return { acked: false, conflict: true, serverData: serverObj, serverVersion: serverVersion };
    }
  }
  
  var rowArr = [];
  for (var h = 0; h < headers.length; h++) {
    rowArr.push(payload[headers[h]] !== undefined ? payload[headers[h]] : '');
  }
  
  if (foundRow > 1) {
    sheet.getRange(foundRow, 1, 1, rowArr.length).setValues([rowArr]);
  } else {
    sheet.appendRow(rowArr);
  }
  
  return { acked: true, serverVersion: Date.now() };
}

// ─── TABLE SYNC (Optimistic Lock — prevent double occupancy) ───
function syncTable(ss, payload, localId, clientVersion) {
  var sheet = ss.getSheetByName('Tables');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var keyIdx = headers.indexOf('tableNo') + 1;
  var data = sheet.getDataRange().getValues();
  
  var foundRow = -1;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][keyIdx-1]) === String(payload.tableNo)) { foundRow = r + 1; break; }
  }
  
  // Conflict: if server status is occupied and client is trying to occupy
  if (foundRow > 1) {
    var serverStatus = String(data[foundRow-1][headers.indexOf('status')] || 'Available');
    var clientPrevStatus = payload._prevStatus || 'Available'; // client should send this
    if (serverStatus === 'Occupied' && payload.status === 'Occupied' && clientPrevStatus !== 'Occupied') {
      var serverObj = {};
      for (var h = 0; h < headers.length; h++) serverObj[headers[h]] = data[foundRow-1][h];
      return { acked: false, conflict: true, serverData: serverObj, reason: 'Table already occupied' };
    }
  }
  
  return syncGeneric(ss, 'Tables', payload, 'tableNo', clientVersion);
}

// ─── INVENTORY SYNC (Arithmetic Merge) ───
function syncInventory(ss, payload, localId, clientVersion) {
  var sheet = ss.getSheetByName('Inventory');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var keyIdx = headers.indexOf('itemName') + 1;
  var stockIdx = headers.indexOf('stock') + 1;
  var data = sheet.getDataRange().getValues();
  
  var foundRow = -1;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][keyIdx-1]) === String(payload.itemName)) { foundRow = r + 1; break; }
  }
  
  if (foundRow > 1) {
    var serverStock = Number(data[foundRow-1][stockIdx-1]) || 0;
    var clientDelta = Number(payload._stockDelta) || 0; // client sends delta, not absolute
    if (clientDelta !== 0) {
      payload.stock = serverStock + clientDelta;
      delete payload._stockDelta;
    }
  }
  
  return syncGeneric(ss, 'Inventory', payload, 'itemName', clientVersion);
}

// ─── ORDER / KOT SYNC ───
function syncOrderLike(ss, tableName, payload, localId, clientVersion) {
  var idField = tableName === 'orders' ? 'orderId' : 'kotId';
  return syncGeneric(ss, capitalize(tableName), payload, idField, clientVersion);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── SETTINGS SYNC ───
function syncSettings(ss, payload, clientVersion) {
  var sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    // Settings may be a single-row config sheet
    sheet = ss.insertSheet('Settings');
    sheet.appendRow(['key','value','updatedAt']);
  }
  return syncGeneric(ss, 'Settings', payload, 'key', clientVersion);
}

// ─── PULL CHANGES (server → client) ───
function pullChanges(since) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheets = ['Menu','Categories','Tables','Orders','Kots','Inventory',
                'Sales','Expenses','Customers','Staff','Attendance','Tasks','Settings'];
  var changes = {};
  
  for (var s = 0; s < sheets.length; s++) {
    var sheet = ss.getSheetByName(sheets[s]);
    if (!sheet) continue;
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var updatedIdx = headers.indexOf('updatedAt');
    if (updatedIdx === -1) continue; // skip sheets without timestamp
    
    var data = sheet.getDataRange().getValues();
    var rows = [];
    for (var r = 1; r < data.length; r++) {
      var ts = Number(data[r][updatedIdx]) || 0;
      if (ts > since) {
        var obj = {};
        for (var h = 0; h < headers.length; h++) obj[headers[h]] = data[r][h];
        rows.push(obj);
      }
    }
    if (rows.length) changes[sheets[s]] = rows;
  }
  
  return { success: true, changes: changes, serverTime: Date.now() };
}

// ─── UTILS ───
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── LEGACY HANDLERS (keep during transition) ───
function legacyDoPost(e) {
  // Paste your existing doPost code here, or route to current action handlers
  var body = JSON.parse(e.postData.contents);
  // Example fallback:
  return jsonResponse({ success: false, message: 'Unknown action: ' + body.action });
}

function legacyDoGet(e) {
  return jsonResponse({ success: false, message: 'Unknown GET action' });
}
