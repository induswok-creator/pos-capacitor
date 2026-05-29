/**
 * Auto-Setup Script for Indus Wok POS v5.0
 * 
 * INSTRUCTIONS:
 * 1. Go to https://script.google.com (with your NEW Google account)
 * 2. Create a new project
 * 3. Delete ALL default code
 * 4. Copy-paste EVERYTHING below
 * 5. Click "Save" (name: IndusWokSetup)
 * 6. Click "Run" → select "createPosSheet" → Authorize
 * 7. After it runs, check your Google Drive → "Indus Wok POS Backend" spreadsheet
 * 8. Open the spreadsheet → copy the Sheet ID from URL
 * 9. Come back to this script → replace YOUR_SHEET_ID_HERE with real ID
 * 10. Deploy as Web App (Deploy → New deployment → Web app → Anyone)
 * 11. Copy the Web App URL → paste into js/api.js and js/sync-engine.js
 */

// ─── STEP 1: RUN THIS FIRST ───
function createPosSheet() {
  var ss = SpreadsheetApp.create('Indus Wok POS Backend');
  var id = ss.getId();
  Logger.log('✅ Sheet created! ID: ' + id);
  Logger.log('🔗 URL: https://docs.google.com/spreadsheets/d/' + id + '/edit');
  
  // Delete default "Sheet1"
  ss.deleteSheet(ss.getSheets()[0]);
  
  // Define all tabs and their headers
  var sheetsConfig = {
    'Menu':           ['itemName','category','fullPrice','halfPrice','station','isActive','modifiers','updatedAt'],
    'Orders':         ['orderId','tableNo','type','items','subtotal','discount','cgst','sgst','total','cash','upi','card','status','customerName','customerPhone','deliveryAddress','createdAt','updatedAt'],
    'KOTs':           ['kotId','orderId','tableNo','station','items','status','createdAt','printedAt','updatedAt'],
    'Tables':         ['tableNo','area','status','customerName','orderId','occupiedAt','updatedAt'],
    'Inventory':      ['itemName','stock','unit','minLevel','category','dailyBurn','updatedAt'],
    'Recipes':        ['dishName','category','ingredients','updatedAt'],
    'Deliveries':     ['date','vendor','item','qty','unit','invoiceNo','amount','updatedAt'],
    'Wastage':        ['date','item','qty','reason','updatedAt'],
    'Sales':          ['date','total','cash','upi','card','ordersCount','notes','by','updatedAt'],
    'Expenses':       ['date','category','amount','description','vendor','mode','by','updatedAt'],
    'Customers':      ['phone','name','address','area','email','platform','notes','orders','totalSpend','lastOrder','updatedAt'],
    'Staff':          ['id','name','phone','role','salary','address','joined','updatedAt'],
    'Attendance':     ['id','staffId','date','checkIn','checkOut','hours','status','updatedAt'],
    'StaffPayments':  ['id','staffId','date','month','type','amount','note','updatedAt'],
    'Tasks':          ['id','task','priority','assigned','due','notes','status','updatedAt'],
    'Vendors':        ['id','name','category','phone','outstanding','updatedAt'],
    'Targets':        ['id','type','date','target','achieved','notes','updatedAt'],
    'Dishes':         ['id','name','category','costPrice','sellFull','sellHalf','updatedAt'],
    'DishSales':      ['id','dishName','date','qty','updatedAt'],
    'MoneyReceived':  ['id','date','source','amount','mode','notes','updatedAt'],
    'Reconciliation': ['id','date','expected','actual','difference','notes','updatedAt'],
    'ContentIdeas':   ['id','idea','platform','category','status','updatedAt'],
    'Settings':       ['key','value','updatedAt'],
    'AuditLog':       ['id','time','user','action','role','updatedAt'],
    'ReportsLog':     ['id','timestamp','reportType','date','sentTo','status','updatedAt'],
    'DeductionLog':   ['id','date','kotId','dishName','ingredient','qtyDeducted','unit','updatedAt']
  };
  
  // Create each sheet with headers
  for (var name in sheetsConfig) {
    var sheet = ss.insertSheet(name);
    sheet.appendRow(sheetsConfig[name]);
    sheet.getRange(1, 1, 1, sheetsConfig[name].length)
      .setBackground('#2c3e50')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
  }
  
  // ─── ADD DEFAULT DATA ───
  
  // Default admin user in Settings
  var settingsSheet = ss.getSheetByName('Settings');
  settingsSheet.appendRow(['users', JSON.stringify([{username:'admin',fullName:'Owner',pin:'1234',role:'Owner',createdBy:'setup'}]), Date.now()]);
  settingsSheet.appendRow(['restaurantInfo', JSON.stringify({name:'The Flavours of Indus Wok',tagline:'Pan-Asian Restaurant',phone:'',address1:'',address2:'',gstin:'',upiId:'',thanks:'Thank you! Visit again.'}), Date.now()]);
  settingsSheet.appendRow(['adminEmail', '', Date.now()]);
  
  // Sample menu items
  var menuSheet = ss.getSheetByName('Menu');
  var sampleMenu = [
    ['Veg Hakka Noodles','Chinese',120,70,'Chinese',true,'Extra spicy,No onion',Date.now()],
    ['Schezwan Fried Rice','Chinese',140,80,'Chinese',true,'Extra spicy',Date.now()],
    ['Veg Manchurian','Chinese',160,90,'Chinese',true,'Gravy,Dry',Date.now()],
    ['Paneer Chilli','Chinese',180,100,'Chinese',true,'Gravy,Dry',Date.now()],
    ['Chicken Hakka Noodles','Chinese',180,100,'Chinese',true,'Extra spicy',Date.now()],
    ['Dal Tadka','Indian',120,70,'Indian',true,'',Date.now()],
    ['Butter Naan','Indian',40,25,'Tandoor',true,'Butter,Garlic',Date.now()],
    ['Paneer Tikka','Indian',220,120,'Tandoor',true,'',Date.now()],
    ['Veg Biryani','Indian',160,90,'Indian',true,'',Date.now()],
    ['Cold Coffee','Beverages',80,50,'Beverages',true,'',Date.now()],
    ['Masala Chai','Beverages',30,20,'Beverages',true,'',Date.now()],
    ['Veg Spring Roll','Chinese',100,60,'Chinese',true,'',Date.now()],
    ['Sweet Corn Soup','Chinese',80,50,'Chinese',true,'',Date.now()],
    ['Gobi Manchurian','Chinese',150,85,'Chinese',true,'Gravy,Dry',Date.now()],
    ['Mushroom Chilli','Chinese',170,95,'Chinese',true,'',Date.now()]
  ];
  sampleMenu.forEach(function(row){ menuSheet.appendRow(row); });
  
  // Sample tables
  var tablesSheet = ss.getSheetByName('Tables');
  var tableAreas = ['Ground Floor','Ground Floor','Ground Floor','Ground Floor','Ground Floor','Ground Floor',
                  'First Floor','First Floor','First Floor','First Floor','First Floor','First Floor'];
  for (var t = 1; t <= 12; t++) {
    tablesSheet.appendRow(['T' + t, tableAreas[t-1], 'Available', '', '', '', Date.now()]);
  }
  
  // Sample inventory
  var invSheet = ss.getSheetByName('Inventory');
  var sampleInv = [
    ['Rice (Basmati)','50','kg','10','Raw Materials','5',Date.now()],
    ['Paneer','20','kg','5','Raw Materials','3',Date.now()],
    ['Soy Sauce','10','L','2','Raw Materials','1',Date.now()],
    ['Chilli Sauce','8','L','2','Raw Materials','1',Date.now()],
    ['Noodles','30','kg','5','Raw Materials','4',Date.now()],
    ['Vegetable Oil','15','L','3','Raw Materials','2',Date.now()],
    ['Onion','25','kg','5','Vegetables','5',Date.now()],
    ['Tomato','20','kg','5','Vegetables','4',Date.now()],
    ['Capsicum','15','kg','3','Vegetables','3',Date.now()],
    ['Cabbage','18','kg','4','Vegetables','3',Date.now()],
    ['Carrot','12','kg','3','Vegetables','2',Date.now()],
    ['Takeaway Boxes','200','pcs','50','Packaging','30',Date.now()],
    ['Plastic Spoons','500','pcs','100','Packaging','50',Date.now()],
    ['Milk','10','L','2','Dairy','2',Date.now()],
    ['Cream','5','L','1','Dairy','1',Date.now()]
  ];
  sampleInv.forEach(function(row){ invSheet.appendRow(row); });
  
  // Sample staff
  var staffSheet = ss.getSheetByName('Staff');
  staffSheet.appendRow([generateId(),'Rajesh Kumar','9876543210','Chef',25000,'Mumbai','2024-01-15',Date.now()]);
  staffSheet.appendRow([generateId(),'Priya Sharma','9876543211','Waiter',15000,'Mumbai','2024-02-01',Date.now()]);
  staffSheet.appendRow([generateId(),'Amit Patel','9876543212','Helper',12000,'Mumbai','2024-03-10',Date.now()]);
  staffSheet.appendRow([generateId(),'Sunita Devi','9876543213','Cleaner',10000,'Mumbai','2024-01-20',Date.now()]);
  
  // Sample categories for dropdowns (in Settings)
  settingsSheet.appendRow(['categories', JSON.stringify(['Chinese','Indian','Tandoor','Beverages','Desserts']), Date.now()]);
  
  Logger.log('✅ All tabs, headers, and sample data created!');
  Logger.log('📋 Next steps:');
  Logger.log('   1. Open the spreadsheet from your Google Drive');
  Logger.log('   2. Copy the Sheet ID from the URL');
  Logger.log('   3. Come back to this script and replace YOUR_SHEET_ID_HERE on line 87 with: ' + id);
  Logger.log('   4. Run "doPostSetup()" to verify the sheet ID is set');
  Logger.log('   5. Deploy as Web App (Deploy → New deployment → Web app → Anyone)');
  Logger.log('   6. Copy Web App URL into your POS code');
}

// ─── STEP 2: AFTER YOU HAVE THE SHEET ID, REPLACE IT HERE ───
// Replace the line below with your real Sheet ID from the URL
var SHEET_ID = 'YOUR_SHEET_ID_HERE';

// ─── STEP 3: VERIFY SHEET ID IS SET ───
function doPostSetup() {
  if (SHEET_ID === 'YOUR_SHEET_ID_HERE' || !SHEET_ID) {
    Logger.log('❌ ERROR: You must replace YOUR_SHEET_ID_HERE with your actual Sheet ID!');
    Logger.log('   Run createPosSheet() first to create the sheet.');
    Logger.log('   Then copy the Sheet ID from the URL and paste it on line 87.');
    return;
  }
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    Logger.log('✅ Sheet ID is valid! Connected to: ' + ss.getName());
    Logger.log('📊 Sheets found: ' + ss.getSheets().map(function(s){ return s.getName(); }).join(', '));
  } catch(e) {
    Logger.log('❌ ERROR: Could not open sheet. ID may be wrong or you lack permission.');
  }
}

// ─── STEP 4: DEPLOY THIS AS WEB APP ───
// After setting SHEET_ID, deploy as Web App (Execute as: Me, Access: Anyone)

function doPost(e) {
  if (SHEET_ID === 'YOUR_SHEET_ID_HERE') {
    return jsonResponse({ success: false, message: 'Sheet ID not configured. Run setup first.' });
  }
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    
    if (action === 'BATCH_SYNC') {
      return jsonResponse(processBatch(body.batch));
    }
    
    // Legacy single-action handlers
    if (action === 'SAVE_ORDER')        return jsonResponse(saveToSheet('Orders', body, 'orderId'));
    if (action === 'SAVE_KOT')          return jsonResponse(saveToSheet('KOTs', body, 'kotId'));
    if (action === 'UPDATE_TABLE')      return jsonResponse(saveToSheet('Tables', body, 'tableNo'));
    if (action === 'SAVE_INVENTORY')    return jsonResponse(saveToSheet('Inventory', body, 'itemName'));
    if (action === 'SAVE_RECIPE')       return jsonResponse(saveToSheet('Recipes', body, 'dishName'));
    if (action === 'LOG_DELIVERY')      return jsonResponse(appendToSheet('Deliveries', body));
    if (action === 'SAVE_SALE')         return jsonResponse(appendToSheet('Sales', body));
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
    if (action === 'SAVE_VENDOR')       return jsonResponse(saveToSheet('Vendors', body, 'name'));
    if (action === 'UPDATE_VENDOR')     return jsonResponse(saveToSheet('Vendors', body, 'name'));
    if (action === 'SET_TARGET')        return jsonResponse(appendToSheet('Targets', body));
    if (action === 'SAVE_MONEY_RECEIVED') return jsonResponse(appendToSheet('MoneyReceived', body));
    if (action === 'SAVE_RECONCILIATION') return jsonResponse(appendToSheet('Reconciliation', body));
    if (action === 'SAVE_CONTENT_IDEA')   return jsonResponse(appendToSheet('ContentIdeas', body));
    if (action === 'UPDATE_CONTENT_IDEA') return jsonResponse(saveToSheet('ContentIdeas', body, 'id'));
    if (action === 'SAVE_MENU_ITEM')    return jsonResponse(saveToSheet('Menu', body, 'itemName'));
    if (action === 'LOG_AUDIT')         return jsonResponse(appendToSheet('AuditLog', body));
    
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
    
    if (action === 'SEND_DAILY_REPORT' || action === 'SEND_WEEKLY_REPORT' || action === 'SEND_LOW_STOCK_ALERT') {
      appendToSheet('ReportsLog', { timestamp: Date.now(), reportType: action.replace('SEND_',''), date: new Date().toISOString().split('T')[0], sentTo: body.email || getSetting('adminEmail') || '', status: 'SENT', updatedAt: Date.now() });
      return jsonResponse({ success: true, message: 'Report logged. Configure MailApp.sendEmail for real email delivery.' });
    }
    
    return jsonResponse({ success: false, message: 'Unknown action: ' + action });
    
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

function doGet(e) {
  if (SHEET_ID === 'YOUR_SHEET_ID_HERE') {
    return jsonResponse({ success: false, message: 'Sheet ID not configured. Run setup first.' });
  }
  var action = e.parameter.action;
  if (action === 'PULL_CHANGES') {
    var since = parseInt(e.parameter.since || '0');
    return jsonResponse(pullChanges(since));
  }
  try {
    if (action === 'GET_MENU')            return jsonResponse({ success: true, menu: getSheetData('Menu') });
    if (action === 'GET_ORDERS')          return jsonResponse({ success: true, orders: getSheetData('Orders') });
    if (action === 'GET_KOTS')            return jsonResponse({ success: true, kots: getSheetData('KOTs') });
    if (action === 'GET_TABLES')          return jsonResponse({ success: true, tables: getSheetData('Tables') });
    if (action === 'GET_INVENTORY')       return jsonResponse({ success: true, inventory: getSheetData('Inventory') });
    if (action === 'GET_RECIPES')         return jsonResponse({ success: true, recipes: getSheetData('Recipes') });
    if (action === 'GET_SALES')           return jsonResponse({ success: true, sales: getSheetData('Sales') });
    if (action === 'GET_EXPENSES')        return jsonResponse({ success: true, expenses: getSheetData('Expenses') });
    if (action === 'GET_CUSTOMERS')       return jsonResponse({ success: true, customers: getSheetData('Customers') });
    if (action === 'GET_STAFF')           return jsonResponse({ success: true, staff: getSheetData('Staff') });
    if (action === 'GET_ATTENDANCE')      return jsonResponse({ success: true, attendance: getSheetData('Attendance') });
    if (action === 'GET_TASKS')           return jsonResponse({ success: true, tasks: getSheetData('Tasks') });
    if (action === 'GET_VENDORS')         return jsonResponse({ success: true, vendors: getSheetData('Vendors') });
    if (action === 'GET_TARGETS')         return jsonResponse({ success: true, targets: getSheetData('Targets') });
    if (action === 'GET_DISHES')          return jsonResponse({ success: true, dishes: getSheetData('Dishes') });
    if (action === 'GET_MONEY_RECEIVED')  return jsonResponse({ success: true, moneyReceived: getSheetData('MoneyReceived') });
    if (action === 'GET_RECONCILIATION')  return jsonResponse({ success: true, reconciliation: getSheetData('Reconciliation') });
    if (action === 'GET_CONTENT_IDEAS')   return jsonResponse({ success: true, contentIdeas: getSheetData('ContentIdeas') });
    if (action === 'GET_REPORTS_LOG')     return jsonResponse({ success: true, reportsLog: getSheetData('ReportsLog') });
    if (action === 'GET_DEDUCTION_LOG')    return jsonResponse({ success: true, deductionLog: getSheetData('DeductionLog') || [] });
    if (action === 'GET_SETTINGS') {
      var s = {};
      var rows = getSheetData('Settings');
      rows.forEach(function(r){ s[r.key] = r.value; });
      return jsonResponse({ success: true, settings: s });
    }
    if (action === 'GET_USERS') {
      return jsonResponse({ success: true, users: getSetting('users') || [] });
    }
    if (action === 'GET_SMART_STOCK') {
      var inv = getSheetData('Inventory');
      var smart = inv.map(function(i){
        var burn = parseFloat(i.dailyBurn) || 0;
        var stock = parseFloat(i.stock) || 0;
        var min = parseFloat(i.minLevel) || 0;
        var dl = burn > 0 ? Math.floor(stock / burn) : 'N/A';
        return {
          item: i.itemName,
          stock: stock,
          unit: i.unit,
          status: stock < min ? 'CRITICAL' : stock < min * 1.5 ? 'LOW' : 'OK',
          dailyBurn: burn,
          daysLeft: dl,
          reorder: stock < min ? '⚠️ REORDER NOW' : stock < min * 1.5 ? '📦 Reorder soon' : '✅ OK'
        };
      });
      return jsonResponse({ success: true, smartStock: smart });
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
        default: res = { success: true, acked: true, warning: 'No handler' }; break;
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

function generateId() {
  return 'ID-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}
