import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Default app category guesses based on common process names */
const DEFAULT_CATEGORIES = {
  code: 'productive', devenv: 'productive', idea64: 'productive', webstorm64: 'productive',
  pycharm64: 'productive', figma: 'productive', slack: 'productive', teams: 'productive',
  outlook: 'productive', winword: 'productive', excel: 'productive', powerpnt: 'productive',
  onenote: 'productive', notion: 'productive', obsidian: 'productive', terminal: 'productive',
  windowsterminal: 'productive', powershell: 'productive', cmd: 'productive',
  postman: 'productive', gitkraken: 'productive', sourcetree: 'productive',

  chrome: 'neutral', firefox: 'neutral', msedge: 'neutral', brave: 'neutral',
  opera: 'neutral', explorer: 'neutral', spotify: 'neutral', vlc: 'neutral',
  notepad: 'neutral', 'notepad++': 'neutral', calc: 'neutral',

  discord: 'wasteful', telegram: 'wasteful', whatsapp: 'wasteful',
  instagram: 'wasteful', twitter: 'wasteful',
};

const ICON_MAP = {
  code: 'code', devenv: 'code', idea64: 'code', webstorm64: 'code', pycharm64: 'code',
  chrome: 'public', firefox: 'public', msedge: 'public', brave: 'public', opera: 'public',
  discord: 'chat', telegram: 'chat', whatsapp: 'chat', slack: 'forum', teams: 'group',
  spotify: 'music_note', vlc: 'play_circle', figma: 'draw', explorer: 'folder',
  outlook: 'mail', winword: 'description', excel: 'table', powerpnt: 'slideshow',
  notion: 'edit_note', obsidian: 'edit_note', notepad: 'edit_note',
  terminal: 'terminal', windowsterminal: 'terminal', powershell: 'terminal', cmd: 'terminal',
};

// PowerShell script to get the foreground window info
const PS_SCRIPT = `
Add-Type -MemberDefinition '
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
' -Name 'U' -Namespace 'W' -ErrorAction SilentlyContinue
$h=[W.U]::GetForegroundWindow()
$p=[uint32]0
[W.U]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null
$pr=Get-Process -Id $p -ErrorAction SilentlyContinue
if($pr){@{n=$pr.ProcessName;t=$pr.MainWindowTitle;p=[int]$p}|ConvertTo-Json -Compress}
`;

export class AppTracker {
  constructor(store, mainWindow) {
    this.store = store;
    this.mainWindow = mainWindow;
    this.pollTimer = null;
    this.lastPollTime = null;
    this.isTracking = false;
  }

  start() {
    if (this.isTracking) return;
    this.isTracking = true;
    this.lastPollTime = Date.now();
    console.log('[Tracker] Started');
    // Poll every 5 seconds
    this.poll(); // first poll immediately
    this.pollTimer = setInterval(() => this.poll(), 5000);
  }

  poll() {
    if (!this.isTracking) return;

    execFile('powershell', [
      '-NoProfile', '-NoLogo', '-NonInteractive', '-Command', PS_SCRIPT
    ], { timeout: 4000, windowsHide: true }, (err, stdout) => {
      if (err || !stdout.trim()) return;
      try {
        const info = JSON.parse(stdout.trim());
        if (info && info.n) {
          this.recordActivity(info.n, info.t);
        }
      } catch (e) {
        // ignore parse errors
      }
    });
  }

  recordActivity(processName, windowTitle) {
    const now = Date.now();
    const elapsed = this.lastPollTime ? Math.round((now - this.lastPollTime) / 1000) : 5;
    this.lastPollTime = now;

    // Cap at 30s to avoid huge jumps from sleep/suspend
    const seconds = Math.min(elapsed, 30);
    const dateKey = new Date().toISOString().split('T')[0];
    const appKey = processName.toLowerCase();

    // Skip tracking ourselves
    if (appKey === 'electron' || appKey === 'distrack') return;

    const usageData = this.store.get(`usageData.${dateKey}`, {});

    if (!usageData[appKey]) {
      usageData[appKey] = {
        processName,
        windowTitle,
        totalSeconds: 0,
        category: this.getCategory(appKey),
        lastActive: now,
      };
    }

    usageData[appKey].totalSeconds += seconds;
    usageData[appKey].windowTitle = windowTitle;
    usageData[appKey].lastActive = now;

    this.store.set(`usageData.${dateKey}`, usageData);

    // Send update to renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      try {
        this.mainWindow.webContents.send('tracking-update', {
          dateKey,
          apps: this.formatApps(usageData),
        });
      } catch (e) { /* window may be closing */ }
    }
  }

  getCategory(appKey) {
    const userCats = this.store.get('appCategories', {});
    if (userCats[appKey]) return userCats[appKey];
    return DEFAULT_CATEGORIES[appKey] || 'neutral';
  }

  formatApps(usageData) {
    return Object.entries(usageData)
      .map(([key, d]) => ({
        id: key,
        name: d.processName,
        windowTitle: d.windowTitle,
        timeSpentMinutes: Math.ceil(d.totalSeconds / 60),
        category: this.getCategory(key),
        type: 'application',
        icon: ICON_MAP[key] || 'apps',
      }))
      .filter(a => a.timeSpentMinutes > 0)
      .sort((a, b) => b.timeSpentMinutes - a.timeSpentMinutes);
  }

  getTodayApps() {
    const dateKey = new Date().toISOString().split('T')[0];
    return this.formatApps(this.store.get(`usageData.${dateKey}`, {}));
  }

  getWeekApps() {
    const merged = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dayData = this.store.get(`usageData.${d.toISOString().split('T')[0]}`, {});
      for (const [key, data] of Object.entries(dayData)) {
        if (!merged[key]) merged[key] = { ...data, totalSeconds: 0 };
        merged[key].totalSeconds += data.totalSeconds;
      }
    }
    return this.formatApps(merged);
  }

  getDailyTotals() {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const totals = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayData = this.store.get(`usageData.${dateKey}`, {});
      const totalHours = Object.values(dayData).reduce((s, a) => s + (a.totalSeconds || 0), 0) / 3600;
      totals.push({ day: days[d.getDay()], label: days[d.getDay()], value: Math.round(totalHours * 10) / 10, date: dateKey });
    }
    return totals;
  }

  stop() {
    this.isTracking = false;
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    console.log('[Tracker] Stopped');
  }
}
