/**
 * Web shim for @capacitor/app
 * No-op for browser — app is always "active"
 */

export const App = {
  async getState() {
    return { isActive: true };
  },
  addListener() {
    return Promise.resolve({ remove: async () => {} });
  },
  removeAllListeners() {},
  exitApp() {
    // Can't close browser tab programmatically in most cases
    console.log('[App shim] exitApp called');
  },
  getLaunchUrl() {
    return Promise.resolve({ url: window.location.href });
  }
};

export default App;
