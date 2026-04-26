import { contextBridge, ipcRenderer } from 'electron';

/**
 * Secure bridge between Electron main process and the React renderer.
 * All communication goes through IPC — no direct Node.js access in renderer.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // -- Tracking --
  getTrackedApps: (timeframe) => ipcRenderer.invoke('get-tracked-apps', timeframe),
  getDailyTotals: () => ipcRenderer.invoke('get-daily-totals'),
  onTrackingUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('tracking-update', handler);
    return () => ipcRenderer.removeListener('tracking-update', handler);
  },

  // -- App categories --
  getAppCategories: () => ipcRenderer.invoke('get-app-categories'),
  updateAppCategory: (processName, category) => ipcRenderer.invoke('update-app-category', processName, category),

  // -- Scan running apps --
  scanRunningApps: () => ipcRenderer.invoke('scan-running-apps'),

  // -- Focus sessions --
  getFocusSessions: () => ipcRenderer.invoke('get-focus-sessions'),
  addFocusSession: (session) => ipcRenderer.invoke('add-focus-session', session),
  startFocusSession: (config) => ipcRenderer.invoke('start-focus-session', config),
  stopFocusSession: () => ipcRenderer.invoke('stop-focus-session'),
  getFocusActive: () => ipcRenderer.invoke('get-focus-active'),
  onAppBlocked: (callback) => {
    const handler = (_event, name) => callback(name);
    ipcRenderer.on('app-blocked', handler);
    return () => ipcRenderer.removeListener('app-blocked', handler);
  },

  // -- Blocklist --
  getBlocklist: () => ipcRenderer.invoke('get-blocklist'),
  toggleBlockApp: (appId) => ipcRenderer.invoke('toggle-block-app', appId),

  // -- Settings --
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),

  // -- Data management --
  clearData: () => ipcRenderer.invoke('clear-data'),

  // -- Onboarding --
  isOnboarded: () => ipcRenderer.invoke('is-onboarded'),
  setOnboarded: () => ipcRenderer.invoke('set-onboarded'),

  // -- Process control --
  killProcess: (processName) => ipcRenderer.invoke('kill-process', processName),
});
