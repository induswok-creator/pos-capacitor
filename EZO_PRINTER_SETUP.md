# 🖨️ Ezo Thermal Printer Setup

## Compatible Models
- Ezo 58mm Bluetooth Thermal Printer (PT-210, P58D, etc.)
- Ezo 80mm Bluetooth Thermal Printer
- Any Ezo printer with **ESC/POS** command support

## Power & Pairing

| Action | Button Combo | LED Indicator |
|---|---|---|
| **Turn ON/OFF** | Short press **Power** | Blue LED on |
| **Pairing Mode** | Hold **Feed** + **Power** for **3 seconds** | LED blinks blue |
| **Print Self-Test** | Hold **Feed** for 3 seconds while ON | Prints config page |
| **Factory Reset** | Hold **Feed** + **Power** for **5 seconds** | LED blinks fast |

## Paper
- **58mm (2-inch)** thermal paper roll
- No ink required (thermal paper)

## In-App Pairing

1. **Turn ON** Ezo printer
2. Hold **Feed + Power** for 3 seconds → LED blinks blue
3. In app → **Settings tab** → **🔍 Scan Printers**
4. Select printer name (usually shows as `PT-210`, `EZO-Printer`, or `Printer001`)
5. Tap **🧪 Test Print**

## Bluetooth Settings (Already Configured in Code)

Your Ezo printer uses **standard ESC/POS** protocol. The code is pre-configured:

```javascript
const PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHARACTERISTIC = '00002af1-0000-1000-8000-00805f9b34fb';
```

These UUIDs work for **most Ezo 58mm/80mm BLE thermal printers**.

## If Test Print Fails

| Issue | Solution |
|---|---|
| Printer not found | Make sure LED is **blinking blue** (pairing mode). Try factory reset. |
| "No printers found" | Grant Bluetooth permissions in Android Settings → Apps → Indus Wok POS → Permissions → Allow Bluetooth |
| Prints blank/gibberish | Ezo printer is ESC/POS compatible. Try printing self-test page first. |
| Disconnects after 1 print | Ezo printers auto-sleep. Just tap print again — it auto-reconnects. |
| Very faint print | Replace thermal paper or check battery level |

## Ezo KOT Format (58mm)

Your KOT prints as:
```
     INDUS WOK
  KITCHEN ORDER TICKET
------------------------------
KOT: KOT-123456
Table: T5
Station: Chinese
Time: 2:35 PM
------------------------------
ITEM              QTY  SIZE
------------------------------
Veg Hakka Noodles  2   FULL
  > Extra spicy, no onion
Schezwan Rice      1   HALF
------------------------------
```

**Print speed:** < 100ms from tap to paper

## Battery
- Ezo 58mm printers typically have **1500mAh battery**
- Lasts ~4-6 hours of heavy printing
- Charge via micro-USB or USB-C (depending on model)

## Android Permissions (Auto-Granted)

The `capacitor.config.json` already requests:
- `BLUETOOTH_SCAN`
- `BLUETOOTH_CONNECT`
- `ACCESS_FINE_LOCATION` (required for BLE scanning on Android 12+)

If prompted on first launch, tap **Allow**.

---

**Ready to print KOTs instantly!**
