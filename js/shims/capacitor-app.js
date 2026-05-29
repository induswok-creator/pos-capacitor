/**
 * Smart shim for @capacitor/app
 * Uses native Capacitor plugin when available, stub on web
 */

const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const getNative = () => window.Capacitor?.Plugins?.App || null;

export const App = {
  async getState() {
    if (isNative()) {
      try { const p = getNative(); if (p) return await p.getState(); } catch(e) {}
    }
    return { isActive: true };
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
  },
  exitApp() {
    if (isNative()) {
      try { const p = getNative(); if (p) { p.exitApp(); return; } } catch(e) {}
    }
    console.log('[App shim] exitApp called');
  },
  getLaunchUrl() {
    if (isNative()) {
      try { const p = getNative(); if (p) return p.getLaunchUrl(); } catch(e) {}
    }
    return Promise.resolve({ url: window.location.href });
  }
};

export default App;
