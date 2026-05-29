/**
 * Web shim for @capacitor-community/bluetooth-le
 * Provides stubs — BLE printing only works in native app
 */

export const BluetoothLe = {
  async initialize() {
    console.warn('[BLE shim] Bluetooth not available in browser');
    throw new Error('Bluetooth LE is only available in the native app');
  },
  async isEnabled() { return { value: false }; },
  async requestLEScan() { throw new Error('BLE scan not available in browser'); },
  async stopLEScan() {},
  async connect() { throw new Error('BLE not available in browser'); },
  async disconnect() {},
  async isConnected() { return { connected: false }; },
  async write() { throw new Error('BLE write not available in browser'); },
  addListener() { return Promise.resolve({ remove: async () => {} }); },
  removeAllListeners() {}
};

export default BluetoothLe;
