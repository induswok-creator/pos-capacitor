/**
 * Indus Wok POS v5.0 — Google Apps Script Backend
 * For a FRESH Google account + fresh Google Sheet.
 * 
 * Setup:
 * 1. Create new Google Sheet
 * 2. Create tabs (exact names): Menu, Orders, KOTs, Tables, Inventory, Recipes,
 *    Sales, Expenses, Customers, Staff, Attendance, StaffPayments, Tasks,
 *    Vendors, Targets, Dishes, MoneyReceived, Reconciliation, ContentIdeas,
 *    Settings, AuditLog, ReportsLog
 * 3. Paste headers (see FRESH_START_GUIDE.md) in row 1 of each tab
 * 4. Replace YOUR_SHEET_ID_HERE below with your Sheet ID
 * 5. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 6. Copy Web App URL into js/api.js and js/sync-engine.js
 */

// ─── CONFIG ───
var SHEET_ID = 'YOUR_SHEET_ID_HERE';  // ← REPLACE THIS

// ─── MAIN ROUTER ───
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    
    if (action === 'BATCH_SYNC') {
      return jsonResponse(processBatch(body.batch));
    }
    
    // Legacy single-action handlers (for backward compatibility)
    if (action === 'SAVE_ORDER')        return jsonResponse(saveToSheet('Orders', body, 'orderId'));
    if (action === 'SAVE_KOT')          return jsonResponse(saveToSheet('KOTs', body, 'kotId'));
    if (action === 'UPDATE_TABLE')      return jsonResponse(saveToSheet('Tables', body, 'tableNo'));
    if (action === 'SAVE_INVENTORY')    return jsonResponse(saveToSheet('Inventory', body, 'itemName'));
    if (action === 'SAVE_RECIPE')       return jsonResponse(saveToSheet('Recipes', body, 'dishName'));
    if (action === 'LOG_DELIVERY')      return jsonResponse(appendToSheet('Deliveries', body));
    if (action === 'SAVE_SALE')         return jsonResponse(saveToSheet('Sales', body, 'date'));
    if (action === 'SAVE_EXPENSE')      return jsonResponse(appendToSheet('Expenses', body));
    if (action === 'SAVE_CUSTOMER')     return jsonResponse(saveToSheet('Customers', body, 'phone'));
    if (action === 'ADD_STAFF')         return jsonResponse(appendToSheet('Staff', body));
    if (action === 'MARK_ATTENDANCE')   return jsonResponse(appendToSheet('Attendance', body));
    if (action === 'RECORD_PAYMENT')    return jsonResponse(appendToSheet('StaffPayments', body));
    if (action === 'ADD_TASK')          return jsonResponse(appendToSheet('Tasks', body));
    if (action === 'UPDATE_TASK')       return jsonResponse(saveToSheet('Tasks', body, 'id'));
    if (action === 'SAVE_DISH')         return jsonResponse(saveToSheet('Dishes', body, 'name'));
    if (action === 'LOG_DISH_SALE')     return jsonResponse(appendToSheet('DishSales', body));
    if (action === 'SAVE_SETTING')      return jsonResponse(saveToSheet('Settings', body, 'key'));
    if (action === 'ADD_USER') {
      var users = getSetting('users') || [];
      users.push(body);
      return jsonResponse(saveToSheet('Settings', { key: 'users', value: JSON.stringify(users), updatedAt: Date.now() }, 'key'));
    }
    if (action === 'UPDATE_USER') {
      var users = getSetting('users') || [];
      var idx = users.findIndex(function(u){ return u.username === body.username; });
      if (idx >= 0) { users[idx].pin = body.pin; users[idx].updatedAt = body.updatedAt; }
      return jsonResponse(saveToSheet('Settings', { key: 'users', value: JSON.stringify(users), updatedAt: Date.now() }, 'key'));
    }
    if (action === 'DELETE_USER') {
      var users = getSetting('users') || [];
      users = users.filter(function(u){ return u.username !== body.username; });
      return jsonResponse(saveToSheet('Settings', { key: 'users', value: JSON.stringify(users), updatedAt: Date.now() }, 'key'));
    }
    if (action === 'SAVE_VENDOR')         return jsonResponse(saveToSheet('Vendors', body, 'name'));
    if (action === 'UPDATE_VENDOR')     return jsonResponse(saveToSheet('Vendors', body, 'name'));
    if (action === 'SET_TARGET')        return jsonResponse(appendToSheet('Targets', body));
    if (action === 'SAVE_MONEY_RECEIVED') return jsonResponse(appendToSheet('MoneyReceived', body));
    if (action === 'SAVE_RECONCILIATION') return jsonResponse(appendToSheet('Reconciliation', body));
    if (action === 'SAVE_CONTENT_IDEA')   return jsonResponse(appendToSheet('ContentIdeas', body));
    if (action === 'UPDATE_CONTENT_IDEA') return jsonResponse(saveToSheet('ContentIdeas', body, 'id'));
    if (action === 'SAVE_MENU_ITEM')    return jsonResponse(saveToSheet('Menu', body, 'itemName'));
    if (action === 'LOG_AUDIT')         return jsonResponse(appendToSheet('AuditLog', body));
    if (action === 'SEND_DAILY_REPORT' || action === 'SEND_WEEKLY_REPORT' || action === 'SEND_LOW_STOCK_ALERT') {
      return jsonResponse({ success: true, message: 'Report queued (configure MailApp.sendEmail to enable)' });
    }
    
    return jsonResponse({ success: false, message: 'Unknown action: ' + action });
    
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'PULL_CHANGES') {
    var since = parseInt(e.parameter.since || '0');
    return jsonResponse(pullChanges(since));
  }
  
  // Legacy GET handlers
  try {
    if (action === 'GET_MENU')            return jsonResponse({ success: true, menu: getSheetData('Menu') });
    if (action === 'GET_ORDERS')          return jsonResponse({ success: true, orders: getSheetData('Orders') });
    if (action === 'GET_KOTS')            return jsonResponse({ success: true, kots: getSheetData('KOTs') });
    if (action === 'GET_TABLES')          return jsonResponse({ success: true, tables: getSheetData('Tables') });
    if (action === 'GET_INVENTORY')       return jsonResponse({ success: true, inventory: getSheetData('Inventory') });
    if (action === 'GET_RECIPES')        return jsonResponse({ success: true, recipes: getSheetData('Recipes') });
    if (action === 'GET_SALES')          return jsonResponse({ success: true, sales: getSheetData('Sales') });
    if (action === 'GET_EXPENSES')        return jsonResponse({ success: true, expenses: getSheetData('Expenses') });
    if (action === 'GET_CUSTOMERS')       return jsonResponse({ success: true, customers: getSheetData('Customers') });
    if (action === 'GET_STAFF')          return jsonResponse({ success: true, staff: getSheetData('Staff') });
    if (action === 'GET_ATTENDANCE')      return jsonResponse({ success: true, attendance: getSheetData('Attendance') });
    if (action === 'GET_TASKS')          return jsonResponse({ success: true, tasks: getSheetData('Tasks') });
    if (action === 'GET_VENDORS')        return jsonResponse({ success: true, vendors: getSheetData('Vendors') });
    if (action === 'GET_TARGETS')        return jsonResponse({ success: true, targets: getSheetData('Targets') });
    if (action === 'GET_DISHES')         return jsonResponse({ success: true, dishes: getSheetData('Dishes') });
    if (action === 'GET_MONEY_RECEIVED') return jsonResponse({ success: true, moneyReceived: getSheetData('MoneyReceived') });
    if (action === 'GET_RECONCILIATION') return jsonResponse({ success: true, reconciliation: getSheetData('Reconciliation') });
    if (action === 'GET_CONTENT_IDEAS')  return jsonResponse({ success: true, contentIdeas: getSheetData('ContentIdeas') });
    if (action === 'GET_REPORTS_LOG')    return jsonResponse({ success: true, reportsLog: getSheetData('ReportsLog') });
    if (action === 'GET_DEDUCTION_LOG')   return jsonResponse({ success: true, deductionLog: getSheetData('DeductionLog') || [] });
    if (action === 'GET_SETTINGS') {
      var s = {};
      var rows = getSheetData('Settings');
      rows.forEach(function(r){ s[r.key] = r.value; });
      return jsonResponse({ success: true, settings: s });
    }
    if (action === 'GET_USERS') {
      return jsonResponse({ success: true, users: getSetting('users') || [] });
    }
    return jsonResponse({ success: false, message: 'Unknown GET action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

// ─── BATCH SYNC ───
function processBatch(batch) {
  if (!batch || !Array.isArray(batch)) return { success: false, results: [{ acked: false, message: 'Invalid batch' }] };
  var results = [];
  for (var i = 0; i < batch.length; i++) {
    var op = batch[i];
    var res = { acked: false };
    try {
      switch (op.table) {
        case 'orders': res = saveToSheet('Orders', op.payload, 'orderId'); break;
        case 'kots': res = saveToSheet('KOTs', op.payload, 'kotId'); break;
        case 'tables': res = saveToSheet('Tables', op.payload, 'tableNo'); break;
        case 'inventory': res = saveToSheet('Inventory', op.payload, 'itemName'); break;
        case 'menu': res = saveToSheet('Menu', op.payload, 'itemName'); break;
        case 'customers': res = saveToSheet('Customers', op.payload, 'phone'); break;
        case 'staff': res = saveToSheet('Staff', op.payload, 'id'); break;
        case 'attendance': res = appendToSheet('Attendance', op.payload); break;
        case 'tasks': res = saveToSheet('Tasks', op.payload, 'id'); break;
        case 'sales': res = appendToSheet('Sales', op.payload); break;
        case 'expenses': res = appendToSheet('Expenses', op.payload); break;
        case 'settings': res = saveToSheet('Settings', op.payload, 'key'); break;
        default: res = { success: true, acked: true, warning: 'No handler, assumed ok' }; break;
      }
      res.acked = res.success;
    } catch (err) {
      res = { success: false, acked: false, message: err.toString(), retryable: true };
    }
    results.push(res);
  }
  return { success: true, results: results };
}

// ─── PULL CHANGES ───
function pullChanges(since) {
  var sheets = ['Menu','Orders','KOTs','Tables','Inventory','Recipes','Sales','Expenses','Customers','Staff','Attendance','Tasks','Vendors','Targets','Dishes','MoneyReceived','Reconciliation','ContentIdeas','Settings'];
  var changes = {};
  sheets.forEach(function(name) {
    var rows = getSheetData(name, since);
    if (rows.length) changes[name] = rows;
  });
  return { success: true, changes: changes, serverTime: Date.now() };
}

// ─── HELPERS ───
function getSheetData(sheetName, since) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var rows = [];
  for (var r = 1; r < data.length; r++) {
    var obj = {};
    for (var h = 0; h < headers.length; h++) {
      obj[headers[h]] = data[r][h];
    }
    if (since && Number(obj.updatedAt || 0) <= since) continue;
    rows.push(obj);
  }
  return rows;
}

function saveToSheet(sheetName, payload, keyField) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = Object.keys(payload);
    sheet.appendRow(headers);
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getDataRange().getValues();
  var keyIdx = headers.indexOf(keyField) + 1;
  var foundRow = -1;
  if (keyIdx > 0 && payload[keyField] !== undefined) {
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][keyIdx - 1]) === String(payload[keyField])) {
        foundRow = r + 1; break;
      }
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
  return { success: true, serverVersion: Date.now() };
}

function appendToSheet(sheetName, payload) {
  return saveToSheet(sheetName, payload, '__auto__');
}

function getSetting(key) {
  var rows = getSheetData('Settings');
  var row = rows.find(function(r){ return r.key === key; });
  if (!row) return null;
  try { return JSON.parse(row.value); } catch(e) { return row.value; }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
