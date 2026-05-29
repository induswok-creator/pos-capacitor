/**
 * Web shim for @capacitor/network
 * Uses navigator.onLine + browser events
 */

const listeners = new Map();

export const Network = {
  async getStatus() {
    return { connected: navigator.onLine, connectionType: navigator.onLine ? 'wifi' : 'none' };
  },

  addListener(eventName, callback) {
    if (eventName === 'networkStatusChange') {
      const online = () => callback({ connected: true, connectionType: 'wifi' });
      const offline = () => callback({ connected: false, connectionType: 'none' });
      window.addEventListener('online', online);
      window.addEventListener('offline', offline);
      const id = Symbol(eventName);
      listeners.set(id, { online, offline, callback });
      return Promise.resolve({ remove: async () => {
        window.removeEventListener('online', online);
        window.removeEventListener('offline', offline);
        listeners.delete(id);
      }});
    }
    return Promise.resolve({ remove: async () => {} });
  },

  removeAllListeners() {
    for (const [, handlers] of listeners) {
      window.removeEventListener('online', handlers.online);
      window.removeEventListener('offline', handlers.offline);
    }
    listeners.clear();
  }
};

export default Network;
