/**
 * Web shim for @capacitor/preferences
 * Uses localStorage as backend
 */

export const Preferences = {
  async get({ key }) {
    const value = localStorage.getItem(key);
    return { value };
  },
  async set({ key, value }) {
    localStorage.setItem(key, value);
  },
  async remove({ key }) {
    localStorage.removeItem(key);
  },
  async clear() {
    localStorage.clear();
  },
  async keys() {
    return { keys: Object.keys(localStorage) };
  }
};

export default Preferences;
