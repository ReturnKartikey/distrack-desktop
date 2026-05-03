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
  }

  start(config = {}) {
    this.isActive = true;
    this.mode = config.mode || 'Deep Silence';
    this.recentlyBlocked.clear();
    console.log(`[Blocker] Started in ${this.mode} mode`);

    // Enforce every 8 seconds
    this.enforce();
    this.pollTimer = setInterval(() => this.enforce(), 8000);
  }

  stop() {
    this.isActive = false;
    this.recentlyBlocked.clear();
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    console.log('[Blocker] Stopped');
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
    if (blocked.length === 0) return;

    execFile('tasklist.exe', ['/FO', 'CSV', '/NH'], { windowsHide: true }, (err, stdout) => {
      if (err) return;
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/"([^"]+\.exe)"/i);
        if (!match) continue;
        const procName = match[1].replace(/\.exe$/i, '').toLowerCase();

        if (blocked.includes(procName)) {
          this.killProcess(procName);
        }
      }
    });
  }

  killProcess(processName) {
    execFile('taskkill.exe', ['/IM', `${processName}.exe`, '/F'], { windowsHide: true }, (err) => {
      if (err) return; // process may have already exited

      // Avoid spamming the same app
      if (this.recentlyBlocked.has(processName)) return;
      this.recentlyBlocked.add(processName);
      setTimeout(() => this.recentlyBlocked.delete(processName), 30000);

      console.log(`[Blocker] Killed: ${processName}`);

      if (Notification.isSupported()) {
        new Notification({
          title: 'Distrack — App Blocked',
          body: `"${processName}" was closed during your focus session.`,
        }).show();
      }

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        try {
          this.mainWindow.webContents.send('app-blocked', processName);
        } catch (e) { /* ignore */ }
      }
    });
  }
}
