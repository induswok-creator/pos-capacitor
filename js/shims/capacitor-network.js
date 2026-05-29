/**
 * Smart shim for @capacitor/network
 * Uses native Capacitor plugin when available, falls back to navigator.onLine on web
 */

const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const getNative = () => window.Capacitor?.Plugins?.Network || null;

const webListeners = new Map();
let nativeListenerRegistered = false;

export const Network = {
  async getStatus() {
    if (isNative()) {
      try {
        const p = getNative();
        if (p) return await p.getStatus();
      } catch(e) { console.warn('[Network native]', e); }
    }
    return { connected: navigator.onLine, connectionType: navigator.onLine ? 'wifi' : 'none' };
  },

  addListener(eventName, callback) {
    if (isNative()) {
      try {
        const p = getNative();
        if (p) {
          return p.addListener(eventName, callback);
        }
      } catch(e) { console.warn('[Network native listener]', e); }
    }
    // Web fallback
    if (eventName === 'networkStatusChange') {
      const online = () => callback({ connected: true, connectionType: 'wifi' });
      const offline = () => callback({ connected: false, connectionType: 'none' });
      window.addEventListener('online', online);
      window.addEventListener('offline', offline);
      const id = Symbol(eventName);
      webListeners.set(id, { online, offline, callback });
      return Promise.resolve({ remove: async () => {
        window.removeEventListener('online', online);
        window.removeEventListener('offline', offline);
        webListeners.delete(id);
      }});
    }
    return Promise.resolve({ remove: async () => {} });
  },

  removeAllListeners() {
    if (isNative()) {
      try {
        const p = getNative();
        if (p) { p.removeAllListeners(); return; }
      } catch(e) {}
    }
    // Web fallback
    for (const [, handlers] of webListeners) {
      window.removeEventListener('online', handlers.online);
      window.removeEventListener('offline', handlers.offline);
    }
    webListeners.clear();
  }
};

export default Network;
