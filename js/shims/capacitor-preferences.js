/**
 * Smart shim for @capacitor/preferences
 * Uses native Capacitor plugin when available, falls back to localStorage on web
 */

const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const getNative = () => window.Capacitor?.Plugins?.Preferences || null;

export const Preferences = {
  async get({ key }) {
    if (isNative()) {
      try { const p = getNative(); if (p) return await p.get({ key }); } catch(e) { console.warn('[Preferences native]', e); }
    }
    const value = localStorage.getItem(key);
    return { value };
  },
  async set({ key, value }) {
    if (isNative()) {
      try { const p = getNative(); if (p) { await p.set({ key, value }); return; } } catch(e) { console.warn('[Preferences native]', e); }
    }
    localStorage.setItem(key, value);
  },
  async remove({ key }) {
    if (isNative()) {
      try { const p = getNative(); if (p) { await p.remove({ key }); return; } } catch(e) {}
    }
    localStorage.removeItem(key);
  },
  async clear() {
    if (isNative()) {
      try { const p = getNative(); if (p) { await p.clear(); return; } } catch(e) {}
    }
    localStorage.clear();
  },
  async keys() {
    if (isNative()) {
      try { const p = getNative(); if (p) return await p.keys(); } catch(e) {}
    }
    return { keys: Object.keys(localStorage) };
  }
};

export default Preferences;
