/**
 * Smart shim for @capacitor-community/bluetooth-le
 * Uses native Capacitor BLE plugin when available, graceful fallback on web
 */

const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const getNative = () => window.Capacitor?.Plugins?.BluetoothLe || null;

export const BluetoothLe = {
  async initialize() {
    if (isNative()) {
      try {
        const p = getNative();
        if (p) return await p.initialize();
      } catch(e) { console.warn('[BLE native init]', e); throw e; }
    }
    console.warn('[BLE shim] Bluetooth not available in browser');
    throw new Error('Bluetooth LE is only available in the native app');
  },
  async isEnabled() {
    if (isNative()) {
      try { const p = getNative(); if (p) return await p.isEnabled(); } catch(e) {}
    }
    return { value: false };
  },
  async requestLEScan(opts) {
    if (isNative()) {
      try { const p = getNative(); if (p) return await p.requestLEScan(opts); } catch(e) { throw e; }
    }
    throw new Error('BLE scan not available in browser');
  },
  async stopLEScan() {
    if (isNative()) {
      try { const p = getNative(); if (p) return await p.stopLEScan(); } catch(e) {}
    }
  },
  async connect(opts) {
    if (isNative()) {
      try { const p = getNative(); if (p) return await p.connect(opts); } catch(e) { throw e; }
    }
    throw new Error('BLE not available in browser');
  },
  async disconnect(opts) {
    if (isNative()) {
      try { const p = getNative(); if (p) return await p.disconnect(opts); } catch(e) {}
    }
  },
  async isConnected(opts) {
    if (isNative()) {
      try { const p = getNative(); if (p) return await p.isConnected(opts); } catch(e) {}
    }
    return { connected: false };
  },
  async write(opts) {
    if (isNative()) {
      try { const p = getNative(); if (p) return await p.write(opts); } catch(e) { throw e; }
    }
    throw new Error('BLE write not available in browser');
  },
  addListener(eventName, callback) {
    if (isNative()) {
      try { const p = getNative(); if (p) return p.addListener(eventName, callback); } catch(e) {}
    }
    return Promise.resolve({ remove: async () => {} });
  },
  removeAllListeners() {
    if (isNative()) {
      try { const p = getNative(); if (p) p.removeAllListeners(); } catch(e) {}
    }
  }
};

export default BluetoothLe;
