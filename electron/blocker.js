import { execFile } from 'child_process';
import { Notification } from 'electron';

export class AppBlocker {
  constructor(store, mainWindow) {
    this.store = store;
    this.mainWindow = mainWindow;
    this.isActive = false;
    this.pollTimer = null;
    this.mode = 'Deep Silence';
    this.recentlyBlocked = new Set(); // avoid spam notifications
    this.pendingCloses = new Map(); // processName -> { warnedAt: number, timer: Timeout }
  }

  start(config = {}) {
    this.isActive = true;
    this.mode = config.mode || 'Deep Silence';
    this.recentlyBlocked.clear();
    this.pendingCloses.clear();
    console.log(`[Blocker] Started in ${this.mode} mode`);

    // Enforce every 8 seconds
    this.enforce();
    this.pollTimer = setInterval(() => this.enforce(), 8000);
  }

  stop() {
    this.isActive = false;
    this.recentlyBlocked.clear();
    this.clearPendingCloses();
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    console.log('[Blocker] Stopped');
  }

  clearPendingCloses() {
    for (const [_, entry] of this.pendingCloses.entries()) {
      if (entry.timer) clearTimeout(entry.timer);
    }
    this.pendingCloses.clear();
  }

  getBlockedProcessNames() {
    const categories = this.store.get('appCategories', {});
    const blocklist = this.store.get('blocklist', []);

    if (this.mode === 'Strict Lock') {
      return Object.entries(categories)
        .filter(([_, cat]) => cat !== 'productive')
        .map(([name]) => name.toLowerCase());
    } else if (this.mode === 'Light Focus') {
      return Object.entries(categories)
        .filter(([_, cat]) => cat === 'wasteful')
        .map(([name]) => name.toLowerCase());
    } else {
      // Deep Silence — use custom blocklist
      return blocklist.map(b => b.toLowerCase());
    }
  }

  enforce() {
    if (!this.isActive) return;

    const blocked = this.getBlockedProcessNames();
    if (blocked.length === 0) {
      this.clearPendingCloses();
      return;
    }

    execFile('tasklist.exe', ['/FO', 'CSV', '/NH'], { windowsHide: true }, (err, stdout) => {
      if (err) return;
      
      const lines = stdout.split('\n');
      const runningBlockedProcs = new Set();
      
      for (const line of lines) {
        const match = line.match(/"([^"]+\.exe)"/i);
        if (!match) continue;
        const procName = match[1].replace(/\.exe$/i, '').toLowerCase();

        if (blocked.includes(procName)) {
          runningBlockedProcs.add(procName);
        }
      }

      // Clean up pending closes for apps that are no longer running
      for (const procName of this.pendingCloses.keys()) {
        if (!runningBlockedProcs.has(procName)) {
          const entry = this.pendingCloses.get(procName);
          if (entry.timer) clearTimeout(entry.timer);
          this.pendingCloses.delete(procName);
          console.log(`[Blocker] ${procName} was closed by user, removed from pending list`);
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            try {
              this.mainWindow.webContents.send('app-close-warning-cancelled', procName);
            } catch (e) { /* ignore */ }
          }
        }
      }

      // Handle running blocked processes
      for (const procName of runningBlockedProcs) {
        this.handleBlockedProcess(procName);
      }
    });
  }

  handleBlockedProcess(procName) {
    if (this.pendingCloses.has(procName)) {
      // Already warned and timer is active
      return;
    }

    console.log(`[Blocker] Detected blocked app: ${procName}. Attempting soft close and warning user.`);

    // Attempt soft close (without /F)
    execFile('taskkill.exe', ['/IM', `${procName}.exe`], { windowsHide: true }, (err) => {
      // Show warning notification regardless of taskkill outcome (it might prompt or stay open)
      const settings = this.store.get('settings', { notifications: true });

      if (settings.notifications && Notification.isSupported()) {
        new Notification({
          title: 'Distrack — Save Your Work',
          body: `"${procName}" will be force-closed in 10 seconds. Please save your progress.`,
        }).show();
      }

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        try {
          this.mainWindow.webContents.send('app-close-warning', procName);
        } catch (e) { /* ignore */ }
      }
    });

    const timer = setTimeout(() => {
      this.forceKillProcess(procName);
    }, 10000);

    this.pendingCloses.set(procName, { warnedAt: Date.now(), timer });
  }

  forceKillProcess(procName) {
    if (!this.isActive) return;

    console.log(`[Blocker] Timer expired. Force killing: ${procName}`);

    execFile('taskkill.exe', ['/IM', `${procName}.exe`, '/F'], { windowsHide: true }, (err, stdout, stderr) => {
      this.pendingCloses.delete(procName);

      if (err) {
        const errorMsg = (stderr || '').toLowerCase() + (err.message || '').toLowerCase();
        if (errorMsg.includes('access is denied') || errorMsg.includes('access denied')) {
          console.error(`[Blocker] Privilege escalation required to kill ${procName}`);

          const settings = this.store.get('settings', { notifications: true });
          if (settings.notifications && Notification.isSupported()) {
            new Notification({
              title: 'Distrack — Permission Required',
              body: `Distrack requires Administrator privileges to block "${procName}". Please restart Distrack as Administrator.`,
            }).show();
          }

          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            try {
              this.mainWindow.webContents.send('app-block-failed-privilege', procName);
            } catch (e) { /* ignore */ }
          }
        }
        return; // process may have already exited
      }

      // Avoid spamming notifications
      if (this.recentlyBlocked.has(procName)) return;
      this.recentlyBlocked.add(procName);
      setTimeout(() => this.recentlyBlocked.delete(procName), 30000);

      console.log(`[Blocker] Force killed: ${procName}`);

      const settings = this.store.get('settings', { notifications: true });

      if (settings.notifications && Notification.isSupported()) {
        new Notification({
          title: 'Distrack — App Closed',
          body: `"${procName}" was force-closed to maintain focus.`,
        }).show();
      }

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        try {
          this.mainWindow.webContents.send('app-blocked', procName);
        } catch (e) { /* ignore */ }
      }
    });
  }
}
