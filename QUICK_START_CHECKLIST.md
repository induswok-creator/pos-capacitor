# ✅ Quick Start Checklist — Fresh Account + Ezo Printer

## 1. Create New Google Sheet
- [ ] Go to [sheets.google.com](https://sheets.google.com) with **new Google account**
- [ ] Create **Blank** spreadsheet → Name: `Indus Wok POS Backend`
- [ ] **Copy the Sheet ID** from URL:
  ```
  https://docs.google.com/spreadsheets/d/1ABC...xyz/edit
                                ^^^^^^^^^^^^^^^^
                                SHEET ID
  ```

## 2. Add Sheet Tabs
Click **+** at bottom. Create these exact tabs. In each, paste the **Row 1 headers**:

| Tab | Row 1 Headers (copy exactly) |
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

## 3. Create Apps Script
- [ ] In Sheet → **Extensions → Apps Script**
- [ ] **Delete** default code
- [ ] Open `apps-script.gs` from this project, **copy all**, **paste** into editor
- [ ] **Replace** `YOUR_SHEET_ID_HERE` (line 2) with your Sheet ID
- [ ] **Save** → name it `IndusWokPOS`
- [ ] **Deploy → New deployment**:
  - Type: **Web app**
  - Execute as: **Me**
  - Who has access: **Anyone**
  - Click **Deploy**
- [ ] **Copy the Web App URL** (looks like `https://script.google.com/macros/s/ABC.../exec`)

## 4. Paste URL Into Code
- [ ] Open `js/api.js` → paste URL on line 10
- [ ] Open `js/sync-engine.js` → paste URL on line 7
- [ ] (Optional) Open `js/modules/ai-chat.js` → add Gemini API key from [makersuite.google.com](https://makersuite.google.com)

## 5. Create First Admin User (Manual)
- [ ] In Sheet → `Settings` tab
- [ ] Row 2:
  - `key`: `users`
  - `value`: `[{"username":"admin","fullName":"Owner","pin":"1234","role":"Owner","createdBy":"setup"}]`
  - `updatedAt`: `=NOW()`

## 6. Push to New GitHub Repo
```bash
cd pos-capacitor-app
git init
git add .
git commit -m "POS v5.0 fresh"
```
- [ ] Create **new repo** on GitHub: `pos-capacitor`
```bash
git remote add origin https://github.com/noamaan/pos-capacitor.git
git branch -M main
git push -u origin main
```
- [ ] **Settings → Pages** → Source: `main` / `root` → Save
- [ ] Web version live at: `https://noamaan.github.io/pos-capacitor/`

## 7. Build APK
```bash
cd pos-capacitor-app
npm install
npx cap add android
npx cap sync
npx cap open android
```
- [ ] In Android Studio: **Build → Build APK(s)**
- [ ] APK located at: `android/app/build/outputs/apk/debug/app-debug.apk`

## 8. Install on Tablet
- [ ] Upload APK to Google Drive
- [ ] On tablet: Download → Install → Allow "Unknown Sources"

## 9. Ezo Printer Setup

| What | How |
|---|---|
| **Turn ON** | Short press power button |
| **Pairing mode** | Hold **Feed** + **Power** together for 3 seconds until LED blinks blue |
| **Print config** | Hold **Feed** for 3 seconds while ON |
| **Paper** | 58mm thermal roll |

- [ ] In app → **Settings tab**
- [ ] Tap **🔍 Scan Printers**
- [ ] Select your Ezo printer (shows as `EZO-Printer` or similar)
- [ ] Tap **🧪 Test Print**
- [ ] If test works → go to Billing → add items → tap **🖨️ KOT**

## 10. First Login
- [ ] Open app on tablet
- [ ] Username: `admin` / PIN: `1234`
- [ ] With **internet ON** → app auto-downloads Menu, Tables, Inventory from your new Sheet
- [ ] Go to **Settings → User Management** to create real staff users
- [ ] From now on → **100% offline capable**

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails | Install Node.js 18+ from [nodejs.org](https://nodejs.org) |
| Apps Script 403 error | Redeploy as **Web app → Access: Anyone** (not just you) |
| White screen | Make sure `index.html`, `css/`, `js/` are in same folder |
| Can't login | Check `Settings` sheet has `users` key with valid JSON |
| Ezo not found | Put printer in pairing mode (Feed + Power 3 sec) |
| KOT prints random text | Printer must support ESC/POS (all Ezo thermal printers do) |
| Sync not working | Double-check Sheet ID and Web App URL are correct |

---

**Done! Your POS is live.**
