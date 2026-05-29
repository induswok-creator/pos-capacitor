# 🚀 Fresh Start Guide — New Google Account + Ezo Printer + New GitHub Repo

## What You Need (All Free)
- New Google account (Gmail)
- New Google Sheet
- New Apps Script project
- New GitHub repo (e.g., `noamaan/pos-capacitor`)
- Android tablet + Ezo thermal printer (58mm or 80mm)

---

## Step 1: Create New Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) with your **new Google account**.
2. Create a **Blank spreadsheet**.
3. Name it: `Indus Wok POS Backend`
4. **Copy the Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/1ABC123xyz/edit
                          ^^^^^^^^^^^^^^^^
                          THIS IS YOUR SHEET ID
   ```

---

## Step 2: Create Sheet Tabs (Exact Names)

Click the **+** at the bottom and create these tabs (exact names):

| Tab Name | Row 1 Headers (paste these in row 1) |
|---|---|
| `Menu` | `itemName` \| `category` \| `fullPrice` \| `halfPrice` \| `station` \| `isActive` \| `modifiers` \| `updatedAt` |
| `Orders` | `orderId` \| `tableNo` \| `type` \| `items` \| `subtotal` \| `discount` \| `cgst` \| `sgst` \| `total` \| `cash` \| `upi` \| `card` \| `status` \| `customerName` \| `customerPhone` \| `deliveryAddress` \| `createdAt` \| `updatedAt` |
| `KOTs` | `kotId` \| `orderId` \| `tableNo` \| `station` \| `items` \| `status` \| `createdAt` \| `printedAt` \| `updatedAt` |
| `Tables` | `tableNo` \| `area` \| `status` \| `customerName` \| `orderId` \| `occupiedAt` \| `updatedAt` |
| `Inventory` | `itemName` \| `stock` \| `unit` \| `minLevel` \| `category` \| `dailyBurn` \| `updatedAt` |
| `Recipes` | `dishName` \| `category` \| `ingredients` \| `updatedAt` |
| `Sales` | `date` \| `total` \| `cash` \| `upi` \| `card` \| `ordersCount` \| `notes` \| `by` \| `updatedAt` |
| `Expenses` | `date` \| `category` \| `amount` \| `description` \| `vendor` \| `mode` \| `by` \| `updatedAt` |
| `Customers` | `phone` \| `name` \| `address` \| `area` \| `email` \| `platform` \| `notes` \| `orders` \| `totalSpend` \| `lastOrder` \| `updatedAt` |
| `Staff` | `id` \| `name` \| `phone` \| `role` \| `salary` \| `address` \| `joined` \| `updatedAt` |
| `Attendance` | `id` \| `staffId` \| `date` \| `checkIn` \| `checkOut` \| `hours` \| `status` \| `updatedAt` |
| `StaffPayments` | `id` \| `staffId` \| `date` \| `month` \| `type` \| `amount` \| `note` \| `updatedAt` |
| `Tasks` | `id` \| `task` \| `priority` \| `assigned` \| `due` \| `notes` \| `status` \| `updatedAt` |
| `Vendors` | `id` \| `name` \| `category` \| `phone` \| `outstanding` \| `updatedAt` |
| `Targets` | `id` \| `type` \| `date` \| `target` \| `achieved` \| `notes` \| `updatedAt` |
| `Dishes` | `id` \| `name` \| `category` \| `costPrice` \| `sellFull` \| `sellHalf` \| `updatedAt` |
| `MoneyReceived` | `id` \| `date` \| `source` \| `amount` \| `mode` \| `notes` \| `updatedAt` |
| `Reconciliation` | `id` \| `date` \| `expected` \| `actual` \| `difference` \| `notes` \| `updatedAt` |
| `ContentIdeas` | `id` \| `idea` \| `platform` \| `category` \| `status` \| `updatedAt` |
| `Settings` | `key` \| `value` \| `updatedAt` |
| `AuditLog` | `id` \| `time` \| `user` \| `action` \| `role` \| `updatedAt` |
| `ReportsLog` | `id` \| `timestamp` \| `reportType` \| `date` \| `sentTo` \| `status` \| `updatedAt` |

> **Tip:** Type headers in row 1 of each sheet now. The Apps Script will write data starting from row 2.

---

## Step 3: Create Apps Script Project

1. In your Sheet, click **Extensions → Apps Script**.
2. A new script editor opens. **Delete** the default `function myFunction()` code.
3. **Copy-paste the entire code** from `apps-script.gs` (included in this project).
4. **Replace** `YOUR_SHEET_ID_HERE` (line 2 of the code) with your actual Sheet ID from Step 1.
5. Click **Save** (name it `IndusWokPOS`).
6. Click **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**
   - **Copy the Web App URL** (looks like `https://script.google.com/macros/s/.../exec`)

---

## Step 4: Update the Code

Open your `pos-capacitor-app` folder and paste the Web App URL into these 2 files:

**File 1: `js/api.js` (line 10)**
```js
const GAS_URL = 'https://script.google.com/macros/s/YOUR_ACTUAL_SCRIPT_ID/exec';
```

**File 2: `js/sync-engine.js` (line 7)**
```js
const GAS_URL = 'https://script.google.com/macros/s/YOUR_ACTUAL_SCRIPT_ID/exec';
```

**File 3 (optional): `js/modules/ai-chat.js` (line 5)**
```js
const GEMINI_API_KEY = 'YOUR_GEMINI_KEY_HERE';  // get from makersuite.google.com
```

---

## Step 5: Push to New GitHub Repo

```bash
cd pos-capacitor-app
git init
git add .
git commit -m "POS v5.0 Capacitor + IndexedDB + Ezo Bluetooth"
```

Then create a **new repo** on GitHub (e.g., `pos-capacitor`):

```bash
git remote add origin https://github.com/noamaan/pos-capacitor.git
git branch -M main
git push -u origin main
```

Enable **GitHub Pages**:
1. Repo → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `root`
4. Save. Your web version will be at `https://noamaan.github.io/pos-capacitor/`

---

## Step 6: Build APK

```bash
cd pos-capacitor-app
npm install
npx cap add android
npx cap sync
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync.
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Find APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Step 7: Ezo Printer Pairing

| Ezo Model | BLE Service UUID | Write Characteristic |
|---|---|---|
| **Ezo 58mm/80mm Thermal** | `000018f0-0000-1000-8000-00805f9b34fb` | `00002af1-0000-1000-8000-00805f9b34fb` |

**In the app:**
1. Go to **Settings** tab.
2. Turn ON your Ezo printer (hold power until blue LED blinks).
3. Tap **🔍 Scan Printers**.
4. Select your printer (usually shows as "EZO-Printer" or similar).
5. Tap **🧪 Test Print** — a test KOT should print instantly.

If the printer doesn't show:
- Make sure printer is in **pairing mode** (hold feed button + power for 3 seconds).
- Try scanning again.
- Ezo printers use the **standard ESC/POS** protocol — the code is already configured for this.

---

## Step 8: First Login & Data Seed

1. Open the app on your tablet.
2. Since it's a fresh Google account, **no users exist yet**.
3. Open the Sheet → `Settings` tab → add this manually:
   - Row 2: `users` | `[{"username":"admin","fullName":"Owner","pin":"1234","role":"Owner","createdBy":"setup"}]` | (today's timestamp)
4. Login with **admin** / **1234**.
5. Go to **Settings → User Management** to create real staff users.
6. With internet ON, go to **Billing** — the app will auto-download Menu, Tables, and Inventory.
7. From now on, everything works **offline**.

---

## File Map (28 files in this project)

```
pos-capacitor-app/
├── index.html                      ← Main app shell
├── css/
│   ├── base.css                    ← Login, top bar, tabs, buttons
│   ├── modules.css                 ← Billing, KDS, tables, cards
│   └── print.css                   ← Thermal print preview
├── js/
│   ├── app.js                      ← Bootstrap, auth, tab router
│   ├── state.js                      ← Central reactive state
│   ├── utils.js                      ← fmtNum, toast, generateId
│   ├── db.js                         ← Dexie IndexedDB schema (22 tables)
│   ├── api.js                        ← Local-first API wrapper
│   ├── sync-engine.js                ← Background sync + conflict resolver
│   └── bluetooth-printer.js          ← Ezo ESC/POS encoder + BLE writer
│   └── modules/
│       ├── auth.js
│       ├── billing.js                ← Cart, KOT, Bill, Settle, modifiers
│       ├── kds.js                    ← Kitchen Display
│       ├── tables.js                 ← Table management + merge
│       ├── inventory.js              ← Stock, recipes, delivery, wastage
│       ├── vendors.js                ← Vendor list + payments
│       ├── sales.js                  ← Daily sales, targets, dish cost
│       ├── expenses.js               ← Expense tracking + charts
│       ├── staff.js                  ← Staff, attendance, payments
│       ├── tasks.js                  ← Task management
│       ├── content.js                ← Social media ideas + AI
│       ├── customers.js              ← Customer DB + auto-fill
│       ├── ai-chat.js                ← Gemini integration
│       ├── reports.js                ← Email reports + logs
│       ├── settings.js               ← Restaurant info, users, audit
│       └── dashboard.js              ← Stats, charts, AI insights
├── package.json                      ← npm dependencies
├── capacitor.config.json             ← Android/iOS config
├── apps-script.gs                    ← PASTE INTO NEW APPS SCRIPT
└── FRESH_START_GUIDE.md              ← This file
```

---

## Ezo Printer Quick Reference

| Button Combo | Action |
|---|---|
| Power (short press) | Turn on/off |
| Feed (single press) | Feed paper |
| Feed (hold 3 sec while ON) | Print config page (shows BLE name) |
| Power + Feed (hold 5 sec) | Factory reset / pairing mode |
| LED blinking blue | Ready to pair |
| LED solid blue | Connected |

**Paper:** 58mm (2-inch) or 80mm (3-inch) thermal paper roll.

---

**Done!** Your POS is now fully offline-capable with instant Ezo KOT printing and auto-sync to your fresh Google backend.
