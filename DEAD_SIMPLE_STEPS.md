# 🟢 DEAD SIMPLE STEPS — Follow in Order, Don't Skip

## What You Need
- A computer (Windows/Mac/Linux)
- Your Android tablet
- Your Ezo thermal printer

---

## STEP 1 — Create New Google Account (if you haven't)

**App:** Web browser (Chrome)
**Website:** `accounts.google.com`

1. Open Chrome → go to `accounts.google.com`
2. Click **"Create account"** → **"For my personal use"**
3. Fill in name, birthday, gender
4. Pick a new Gmail address (e.g., `induswokpos@gmail.com`)
5. Create password → **Next** → agree to terms
6. Done. Stay logged in.

---

## STEP 2 — Install Node.js on Your Computer

**App:** Web browser + your computer
**Website:** `nodejs.org`

1. Go to `nodejs.org`
2. Click the big **green "LTS" button** (says "Recommended For Most Users")
3. Download the installer
4. Open the downloaded file → click **Next, Next, Next, Install**
5. Restart your computer
6. Verify: Open **Command Prompt** (Windows) or **Terminal** (Mac)
   - Type: `node -v`
   - Press Enter
   - You should see a number like `v20.x.x`

---

## STEP 3 — Install Android Studio

**App:** Web browser
**Website:** `developer.android.com/studio`

1. Go to `developer.android.com/studio`
2. Click **"Download Android Studio"**
3. Download → open installer
4. Click **Next** through everything (keep all defaults checked)
5. Wait for download (it's big, ~1GB)
6. When it says "Setup Wizard" → click **Next, Next, Finish**
7. Let it download components (may take 10-15 minutes)
8. When you see "Welcome to Android Studio" → close it

---

## STEP 4 — Download This Project

**App:** Your web browser (logged into Arena)

1. In Arena, find the **"Download"** or **export** button for this workspace
2. Download the `pos-capacitor-app` folder as a ZIP file
3. Unzip it to your **Desktop**
4. You should now have a folder on Desktop called `pos-capacitor-app`

---

## STEP 5 — Run the Setup Script (Creates Your Google Sheet)

**App:** Google Apps Script (in browser)
**Website:** `script.google.com`

1. Stay logged into your **new Google account**
2. Open new tab → go to `script.google.com`
3. Click **"New project"**
4. You see a code editor with a function called `myFunction()`
5. **Select ALL** that code (Ctrl+A) → **Delete** it
6. Open the file `apps-script-create-sheet.gs` from your downloaded `pos-capacitor-app` folder
   - Use Notepad (Windows) or TextEdit (Mac) to open it
7. **Copy ALL** the text in that file (Ctrl+A, Ctrl+C)
8. Go back to the Apps Script tab → **Paste** into the empty editor (Ctrl+V)
9. Click the **floppy disk icon** (Save) → name it `IndusWokSetup`
10. Click the **function dropdown** (currently says `myFunction`) → select `createPosSheet`
11. Click the **▶️ Run button** (triangle play button)
12. It will ask for permission:
    - Click **"Review permissions"**
    - Choose your new Google account
    - Click **"Advanced"** (bottom left, small link)
    - Click **"Go to IndusWokSetup (unsafe)"**
    - Check both boxes → click **"Allow"**
13. Wait 5 seconds
14. At the top, click **"Execution log"** (icon looks like a document)
15. You should see:
    ```
    ✅ Sheet created! ID: 1ABC...xyz
    🔗 URL: https://docs.google.com/spreadsheets/d/...
    ✅ All tabs, headers, and sample data created!
    ```

---

## STEP 6 — Copy Your Sheet ID

**App:** Google Drive
**Website:** `drive.google.com`

1. Open new tab → `drive.google.com`
2. Find the spreadsheet named **"Indus Wok POS Backend"**
3. Double-click to open it
4. Look at the browser address bar:
   ```
   https://docs.google.com/spreadsheets/d/1ABC123xyzDEF456/edit
                              ^^^^^^^^^^^^^^^^^^^^^^^^
                              THIS IS YOUR SHEET ID
   ```
5. **Copy** that long string of letters and numbers (between `/d/` and `/edit`)
6. Keep it in a Notepad file for a moment — you'll paste it twice

---

## STEP 7 — Put Sheet ID Into the Script

**App:** Back to the same Apps Script tab (`script.google.com`)

1. In the code editor, scroll to **line 87**
2. Find this exact text:
   ```javascript
   var SHEET_ID = 'YOUR_SHEET_ID_HERE';
   ```
3. **Select** `YOUR_SHEET_ID_HERE` (including the quotes)
4. **Paste** your real Sheet ID (from Step 6)
   - Should look like:
     ```javascript
     var SHEET_ID = '1ABC123xyzDEF456';
     ```
5. Click **Save** (floppy disk icon)
6. Click the **function dropdown** → select `doPostSetup`
7. Click **▶️ Run**
8. Check Execution log → should say:
   ```
   ✅ Sheet ID is valid! Connected to: Indus Wok POS Backend
   📊 Sheets found: Menu, Orders, KOTs, Tables, ...
   ```

---

## STEP 8 — Deploy as Web App

**App:** Still in Apps Script

1. Click **"Deploy"** (top right, blue button)
2. Click **"New deployment"**
3. Click the **gear icon ⚙️** → select **"Web app"**
4. Fill in:
   - Description: `POS version 5`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**
6. It will ask for permissions again → click **Authorize** → same process as before (Advanced → unsafe → Allow)
7. You will see a popup with a long URL:
   ```
   https://script.google.com/macros/s/AKfycbxxxxxxxx/exec
   ```
8. **Copy that entire URL** — this is your API endpoint
9. Keep it in Notepad

---

## STEP 9 — Edit Two Files on Your Computer

**App:** VS Code (or Notepad on Windows, TextEdit on Mac)

1. Open the `pos-capacitor-app` folder on your Desktop
2. Navigate to `js` folder
3. Open file: **`api.js`**
4. Find line 10:
   ```javascript
   const GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
   ```
5. **Replace the entire URL** (between the quotes) with your Web App URL from Step 8
6. **Save** the file (Ctrl+S)
7. In the same `js` folder, open file: **`sync-engine.js`**
8. Find line 7:
   ```javascript
   const GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
   ```
9. **Replace** with the same URL from Step 8
10. **Save** the file (Ctrl+S)

---

## STEP 10 — Build the Android App (APK)

**App:** Command Prompt (Windows) or Terminal (Mac)

1. Open **Command Prompt** (Windows: search "cmd" in Start menu)
2. Type this and press Enter:
   ```
   cd Desktop\pos-capacitor-app
   ```
3. Type this and press Enter (wait 1-2 minutes):
   ```
   npm install
   ```
4. Type this and press Enter:
   ```
   npx cap add android
   ```
5. Type this and press Enter:
   ```
   npx cap sync
   ```
6. Type this and press Enter (Android Studio will open):
   ```
   npx cap open android
   ```

---

## STEP 11 — Build the APK File

**App:** Android Studio (just opened)

1. Wait for the bottom bar to say **"Gradle build finished"** or turn green
2. At the top menu, click: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Wait for "Build Analyzer" popup → click **"Locate"**
4. A folder opens showing `app-debug.apk`
5. **Copy** this APK file to your **Desktop**

---

## STEP 12 — Install on Your Tablet

**App:** Google Drive (on your computer + tablet)

**On your computer:**
1. Go to `drive.google.com` (logged into the same new Google account)
2. Click **"New" → "File upload"**
3. Select the `app-debug.apk` from your Desktop
4. Wait for upload

**On your Android tablet:**
1. Open **Google Drive app** (or Chrome → `drive.google.com`)
2. Find `app-debug.apk`
3. Tap it → tap **"Download"**
4. When download finishes, tap **"Open"**
5. Android will say **"Install unknown apps?"**
6. Tap **"Settings"** → turn on **"Allow from this source"** → tap back
7. Tap **"Install"**
8. Open the app → you see a **login screen** with PIN pad

---

## STEP 13 — Login for the First Time

**App:** Indus Wok POS app (on tablet)

1. In the login screen:
   - Username: `admin`
   - PIN: **1, 2, 3, 4** on the number pad
   - Tap the **→ arrow button**
2. You are logged in!
3. Make sure tablet has **WiFi ON** for this first run
4. The app will silently download menu, tables, and inventory from your new Google Sheet

---

## STEP 14 — Pair Your Ezo Printer

**App:** Indus Wok POS app (on tablet)

**On the Ezo printer:**
1. Load **58mm thermal paper roll**
2. Turn ON the printer (short press **Power**)
3. Put it in pairing mode: Hold **Feed + Power** together for **3 seconds**
4. LED starts **blinking blue**

**On the tablet (in the POS app):**
1. Tap **Settings** tab (bottom menu)
2. Scroll to **"Bluetooth Printer"**
3. Tap **🔍 Scan Printers**
4. Wait 5 seconds → your printer appears (name like `PT-210` or `EZO-Printer`)
5. Tap the printer name
6. Tap **🧪 Test Print**
7. A test KOT should print instantly!

---

## STEP 15 — Try Your First Offline Order

**App:** Indus Wok POS app (on tablet)

1. Tap **Billing** tab
2. Tap a menu item (e.g., "Veg Hakka Noodles") → tap **FULL**
3. Tap **🖨️ KOT** → **instant print** (< 1 second!)
4. Now **turn OFF WiFi** on the tablet
5. Add another item to cart
6. Tap **🖨️ KOT** → still prints instantly!
7. Tap **✅ Settle** → enter cash amount → Confirm
8. Order saved locally, works fully offline
9. Turn **WiFi back ON** → app auto-syncs to Google Sheet in background

---

## STEP 16 — Check Your Google Sheet (Verify Sync)

**App:** Web browser
**Website:** Google Drive

1. On your computer, open `drive.google.com`
2. Open **"Indus Wok POS Backend"** spreadsheet
3. Click the **Orders** tab → you should see the order you just settled
4. Click **KOTs** tab → you should see the KOTs printed
5. Data is flowing! ✅

---

## STEP 17 — Create Real Staff Users

**App:** Indus Wok POS app (on tablet)

1. In the app, tap **Settings** tab
2. Scroll to **User Management**
3. Enter:
   - Username: `manager1`
   - Full Name: `Rahul`
   - 4-Digit PIN: `5678`
   - Role: **Manager**
4. Tap **➕ Add User**
5. Logout (top right "Exit" button)
6. Login with `manager1` / `5678`

---

## STEP 18 — Upload to GitHub (Optional but Recommended)

**App:** Web browser
**Website:** `github.com`

1. Go to `github.com` → create **new account** (or login to new one)
2. Click **"+"** (top right) → **"New repository"**
3. Repository name: `pos-capacitor`
4. Click **"Create repository"**
5. You see a page with commands
6. On your computer, open **Command Prompt** again
7. Type:
   ```
   cd Desktop\pos-capacitor-app
   git init
   git add .
   git commit -m "first commit"
   ```
8. Back on GitHub, copy the line that says:
   ```
   git remote add origin https://github.com/YOURNAME/pos-capacitor.git
   ```
9. Paste it in Command Prompt → Enter
10. Type:
    ```
    git branch -M main
    git push -u origin main
    ```
11. Refresh GitHub page → all your code is there

---

## STEP 19 — Enable GitHub Pages (Free Website Backup)

**App:** Web browser (GitHub)

1. On your `pos-capacitor` repo page
2. Click **Settings** (tab near top)
3. On left sidebar, click **Pages**
4. Under "Source", select **"Deploy from a branch"**
5. Branch: **main** / Folder: **root**
6. Click **Save**
7. Wait 2 minutes
8. Your POS is now also at:
   ```
   https://noamaan.github.io/pos-capacitor/
   ```

---

## ✅ YOU ARE DONE

| What | Where |
|---|---|
| **Your Google Sheet backend** | Google Drive → "Indus Wok POS Backend" |
| **Your Apps Script API** | `script.google.com` (deployment URL) |
| **Your APK** | `Desktop\app-debug.apk` |
| **Your code backup** | `github.com/noamaan/pos-capacitor` |
| **Your web version** | `https://noamaan.github.io/pos-capacitor/` |
| **Admin login** | `admin` / `1234` |

---

## 🔥 What Happens Next (Daily Use)

| Situation | What You Do |
|---|---|
| **Take an order** | Billing tab → tap items → 🖨️ KOT (prints in <1 sec) |
| **No internet** | Works exactly the same! All data saves locally |
| **Internet returns** | App silently syncs everything to Google Sheet |
| **Add new menu item** | Billing tab → ➕ Add Item → saves instantly |
| **Check sales** | Reports tab or open Sheet on computer |
| **Low stock alert** | Dashboard shows ⚠️ automatically |
| **Add staff** | Settings tab → User Management |
| **Reprint bill** | Past Bills → tap 🖨️ |

---

## 🆘 If Something Breaks

| Problem | Fix |
|---|---|
| "npm not found" | Reinstall Node.js from `nodejs.org` |
| "Sheet ID invalid" | Check you pasted the ID correctly (no spaces) |
| "403 error" in app | Redeploy Apps Script with access "Anyone" |
| APK won't install | Enable "Unknown sources" in tablet Settings |
| Ezo won't pair | Hold Feed+Power 3 sec until LED blinks blue |
| KOT prints random chars | Ezo is ESC/POS — the code is correct, try test print again |
| Can't login as admin | Check Settings tab in Sheet has `users` key with `"pin":"1234"` |
| App stays white | Make sure `index.html` and `js/` folder are inside `pos-capacitor-app` |

---

**Start at Step 1. Don't skip steps. Each one takes 1-5 minutes.**
