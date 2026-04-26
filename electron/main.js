import { app, BrowserWindow, ipcMain, Tray, Menu, Notification, nativeImage } from 'electron';
import path from 'path';
import { exec, execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { Store } from './store.js';
import { AppTracker } from './tracker.js';
import { AppBlocker } from './blocker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let tray = null;
let store = null;
let tracker = null;
let blocker = null;

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

// ── Store defaults ────────────────────────────────────────────
const STORE_DEFAULTS = {
  usageData: {},
  appCategories: {},
  settings: { theme: 'dark', notifications: true, launchOnStartup: false },
  focusSessions: [],
  blocklist: [],
  onboarded: false,
};

// ── Window creation ───────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0A0A0A',
    show: false,
    icon: path.join(__dirname, '../src/assets/icon.png'),
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Start tracker once window is ready
  tracker = new AppTracker(store, mainWindow);
  blocker = new AppBlocker(store, mainWindow);
  tracker.start();
}

// ── System tray ───────────────────────────────────────────────
function createTray() {
  // Create a simple 16x16 tray icon using nativeImage
  const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAOklEQVQ4T2NkoBAwUqifYdAY8B8bJcYFjAwMDP+xSRDjAob/DAxYXUCMCxj+MzBgdcGgCQNsYUB1LwAAg0kNEX/ylLsAAAAASUVORK5CYII=';
  const icon = nativeImage.createFromDataURL(iconDataUrl);

  tray = new Tray(icon);
  tray.setToolTip('Distrack — Digital Mindfulness');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Distrack',
      click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { app.isQuitting = true; app.quit(); },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
}

// ── IPC Handlers ──────────────────────────────────────────────
function setupIPC() {
  // -- Tracking data --
  ipcMain.handle('get-tracked-apps', (_, timeframe) => {
    if (timeframe === 'weekly') return tracker.getWeekApps();
    return tracker.getTodayApps();
  });

  ipcMain.handle('get-daily-totals', () => tracker.getDailyTotals());

  // -- App categories --
  ipcMain.handle('get-app-categories', () => store.get('appCategories', {}));

  ipcMain.handle('update-app-category', (_, processName, category) => {
    const cats = store.get('appCategories', {});
    cats[processName.toLowerCase()] = category;
    store.set('appCategories', cats);
    // Also update today's usage data category
    const dateKey = new Date().toISOString().split('T')[0];
    const usage = store.get(`usageData.${dateKey}`, {});
    const key = processName.toLowerCase();
    if (usage[key]) { usage[key].category = category; store.set(`usageData.${dateKey}`, usage); }
    return true;
  });

  // -- Scan running apps --
  ipcMain.handle('scan-running-apps', () => {
    return new Promise((resolve) => {
      const psScript = `Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object ProcessName, MainWindowTitle, Id | ConvertTo-Json`;
      execFile('powershell.exe', [
        '-NoProfile', '-NoLogo', '-NonInteractive', '-Command', psScript
      ], { windowsHide: true, timeout: 10000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('[Scan] PowerShell error:', err.message);
          console.error('[Scan] stderr:', stderr);
          return resolve([]);
        }
        if (!stdout || !stdout.trim()) {
          console.log('[Scan] No output from PowerShell');
          return resolve([]);
        }
        try {
          let data = JSON.parse(stdout.trim());
          if (!Array.isArray(data)) data = [data];
          const categories = store.get('appCategories', {});
          const ICON_MAP = {
            code: 'code', devenv: 'code', idea64: 'code', webstorm64: 'code',
            chrome: 'public', firefox: 'public', msedge: 'public', brave: 'public',
            discord: 'chat', telegram: 'chat', whatsapp: 'chat', slack: 'forum',
            spotify: 'music_note', vlc: 'play_circle', figma: 'draw', explorer: 'folder',
            outlook: 'mail', winword: 'description', excel: 'table', powerpnt: 'slideshow',
            notion: 'edit_note', obsidian: 'edit_note', notepad: 'edit_note',
            windowsterminal: 'terminal', powershell: 'terminal', cmd: 'terminal',
          };
          const DEFAULT_CATS = {
            code: 'productive', devenv: 'productive', figma: 'productive', slack: 'productive',
            teams: 'productive', outlook: 'productive', winword: 'productive', excel: 'productive',
            notion: 'productive', obsidian: 'productive', windowsterminal: 'productive',
            chrome: 'neutral', firefox: 'neutral', msedge: 'neutral', brave: 'neutral',
            explorer: 'neutral', spotify: 'neutral', notepad: 'neutral',
            discord: 'wasteful', telegram: 'wasteful', whatsapp: 'wasteful',
          };
          const result = data
            .filter(p => p && p.ProcessName && !['electron', 'distrack', 'systemsettings', 'textinputhost', 'applicationframehost'].includes(p.ProcessName.toLowerCase()))
            .map(p => {
              const key = p.ProcessName.toLowerCase();
              return {
                id: key,
                name: p.ProcessName,
                windowTitle: p.MainWindowTitle || '',
                timeSpentMinutes: 0,
                category: categories[key] || DEFAULT_CATS[key] || 'neutral',
                type: 'application',
                icon: ICON_MAP[key] || 'apps',
              };
            });
          // Deduplicate by id
          const unique = [...new Map(result.map(r => [r.id, r])).values()];
          console.log(`[Scan] Found ${unique.length} apps`);
          resolve(unique);
        } catch (e) {
          console.error('[Scan] JSON parse error:', e.message, 'raw:', stdout.substring(0, 200));
          resolve([]);
        }
      });
    });
  });

  // -- Focus sessions --
  ipcMain.handle('get-focus-sessions', () => store.get('focusSessions', []));

  ipcMain.handle('add-focus-session', (_, session) => {
    const sessions = store.get('focusSessions', []);
    sessions.unshift({ ...session, id: Date.now().toString() });
    // Keep last 100 sessions
    if (sessions.length > 100) sessions.length = 100;
    store.set('focusSessions', sessions);
    return true;
  });

  ipcMain.handle('start-focus-session', (_, config) => {
    blocker.start(config);
    return true;
  });

  ipcMain.handle('stop-focus-session', () => {
    blocker.stop();
    return true;
  });

  ipcMain.handle('get-focus-active', () => blocker.isActive);

  // -- Blocklist --
  ipcMain.handle('get-blocklist', () => store.get('blocklist', []));

  ipcMain.handle('toggle-block-app', (_, appId) => {
    const list = store.get('blocklist', []);
    const idx = list.indexOf(appId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(appId);
    store.set('blocklist', list);
    return list;
  });

  // -- Settings --
  ipcMain.handle('get-settings', () => store.get('settings', STORE_DEFAULTS.settings));

  ipcMain.handle('update-settings', (_, newSettings) => {
    const current = store.get('settings', STORE_DEFAULTS.settings);
    const merged = { ...current, ...newSettings };
    store.set('settings', merged);

    // Apply launch on startup
    if (newSettings.launchOnStartup !== undefined) {
      app.setLoginItemSettings({ openAtLogin: merged.launchOnStartup });
    }

    return merged;
  });

  // -- Clear data --
  ipcMain.handle('clear-data', () => {
    store.set('usageData', {});
    store.set('focusSessions', []);
    return true;
  });

  // -- Onboarding --
  ipcMain.handle('is-onboarded', () => store.get('onboarded', false));
  ipcMain.handle('set-onboarded', () => { store.set('onboarded', true); return true; });

  // -- Kill process --
  ipcMain.handle('kill-process', (_, processName) => {
    return new Promise((resolve) => {
      exec(`taskkill /IM "${processName}.exe" /F`, { windowsHide: true }, (err) => {
        resolve(!err);
      });
    });
  });
}

// ── App lifecycle ─────────────────────────────────────────────
app.whenReady().then(() => {
  store = new Store(STORE_DEFAULTS);
  setupIPC();
  createWindow();
  createTray();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  // On macOS, keep running. On Windows, keep running (we have tray).
  // App only quits via tray > Quit.
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (tracker) tracker.stop();
  if (blocker) blocker.stop();
  if (store) store.saveSync();
});
