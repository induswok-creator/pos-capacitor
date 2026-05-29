# 🚀 Indus Wok POS v5.0 — Build Instructions

## 1. Prerequisites
- Node.js 18+
- Android Studio (for APK build)
- A Google Apps Script Web App URL (your existing backend)
- (Optional) A BLE thermal printer for instant KOT printing

## 2. Setup
```bash
cd /path/to/pos-capacitor-app
npm install
```

## 3. Configure
1. Open `js/api.js` and replace `YOUR_SCRIPT_ID` with your actual Apps Script ID.
2. Open `js/sync-engine.js` and replace `YOUR_SCRIPT_ID` with the same ID.
3. Open `js/modules/ai-chat.js` and replace `YOUR_GEMINI_API_KEY` if using AI chat.

## 4. Add Android Platform
```bash
npx cap add android
npx cap sync
```

## 5. Build APK
```bash
npx cap build android
# Or open Android Studio:
npx cap open android
```
In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

## 6. Permissions (Android)
The following permissions are auto-declared in `capacitor.config.json`:
- `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` — for thermal printer
- `ACCESS_FINE_LOCATION` — BLE scan requires this on Android 12+

## 7. First Run
1. Install APK on tablet.
2. Login with existing username/PIN (data comes from Apps Script users list).
3. On first run with internet, the app will **warm-cache** Menu, Tables, Categories, Inventory from Google Sheets.
4. Once cached, all billing, KOT, and table operations work **offline**.
5. When internet returns, background sync pushes changes to Google Sheets.

## 8. Bluetooth Printer Pairing
1. Go to **Settings** tab → **Bluetooth Printer**.
2. Tap **🔍 Scan Printers**.
3. Select your thermal printer (58mm or 80mm).
4. Tap **🧪 Test Print** to verify.

## 9. Google Apps Script Update
Paste the contents of `apps-script-batch-endpoint.gs` into your existing `.gs` file **in addition to** your current handlers. It adds `BATCH_SYNC` and `PULL_CHANGES` endpoints while keeping backward compatibility.

## 10. Multi-Tablet Sync
- All tablets share the same Google Sheet backend.
- `BATCH_SYNC` handles conflicts:
  - **Tables**: Optimistic lock (prevents double-occupancy)
  - **Inventory**: Server-side arithmetic merge
  - **Orders/KOTs**: Last-write-wins (immutable logs)

## Troubleshooting
| Issue | Fix |
|-------|-----|
| White screen on launch | Ensure `index.html`, `css/`, `js/` are all in same folder as Capacitor `webDir` |
| `BluetoothLe` not found | Run `npm install` and `npx cap sync` again |
| Apps Script URL 403 | Publish script as **Web app** with access "Anyone" |
| IndexedDB not opening | Tablet browser may block 3rd-party storage — use Capacitor WebView |
| KOT prints gibberish | Ensure printer supports ESC/POS and is 58mm or 80mm |

---
**Made by Noamaan Shaikh** · The Flavours of Indus Wok
