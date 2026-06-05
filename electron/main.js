import { app, BrowserWindow, ipcMain, Tray, Menu, Notification, nativeImage, shell } from 'electron';
import path from 'path';
import { exec, execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { Store } from './store.js';
import { AppTracker } from './tracker.js';
import { AppBlocker } from './blocker.js';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import fs from 'fs';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local or .env
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const envPath = path.join(__dirname, '..', file);
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const parts = trimmed.split('=');
            if (parts.length >= 2) {
              const key = parts[0].trim();
              let val = parts.slice(1).join('=').trim();
              if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
              if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
              process.env[key] = val;
            }
          }
        });
        console.log(`[Main] Loaded environment from ${file}`);
        break;
      } catch (err) {
        console.error(`[Main] Failed to load ${file}:`, err.message);
      }
    }
  }
}
loadEnv();

let mainWindow = null;
let tray = null;
let store = null;
let tracker = null;
let blocker = null;

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

// ── Global Error Handlers ─────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled Rejection:', reason);
});

// ── Single Instance Lock ──────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  // Exit early, but app.quit() is asynchronous, so we use process.exit to be safe, though return is enough in top-level, but this is top-level.
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ── Store defaults ────────────────────────────────────────────
const STORE_DEFAULTS = {
  usageData: {},
  appCategories: {},
  settings: { theme: 'dark', notifications: true, launchOnStartup: false },
  focusSessions: [],
  blocklist: [],
  onboarded: false,
  userProfile: { name: '', email: '', picture: '' },
};

// ── Window creation ───────────────────────────────────────────
function createWindow() {
  const iconPath = path.join(__dirname, '../src/assets/icon.png');
  const winIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0A0A0A',
    show: false,
    icon: winIcon,
  });

  const startHidden = process.argv.includes('--hidden');

  mainWindow.once('ready-to-show', () => {
    if (!startHidden) {
      mainWindow.show();
    }
  });

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

  const takeScreenshots = process.argv.includes('--screenshot');
  if (takeScreenshots) {
    mainWindow.webContents.once('did-finish-load', async () => {
      const fs = await import('fs');
      const screenshotDir = path.join(__dirname, '../screenshots');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      await delay(3000); // Wait for React to fully load and mount

      const capture = async (route, filename) => {
        console.log(`[Screenshot] Navigating to ${route}...`);
        await mainWindow.webContents.executeJavaScript(`window.location.hash = '${route}'`);
        await delay(3000); // Wait for charts and components to settle
        console.log(`[Screenshot] Capturing ${filename}...`);
        const img = await mainWindow.webContents.capturePage();
        fs.writeFileSync(path.join(screenshotDir, filename), img.toPNG());
        console.log(`[Screenshot] Saved ${filename}`);
      };

      try {
        // Ensure user is logged in
        await mainWindow.webContents.executeJavaScript(`
          if (window.setUserProfile) {
            window.setUserProfile({ name: 'Kartikey', email: 'kartikey@gmail.com' });
          } else {
            localStorage.setItem('distrack_user', JSON.stringify({ name: 'Kartikey', email: 'kartikey@gmail.com' }));
          }
        `);
        await delay(2000); // Wait for state update

        // 1. Capture Dashboard
        await capture('#/', 'dashboard.png');

        // 2. Capture Classification
        await capture('#/classification', 'classification.png');

        // 3. Capture Focus/Flow
        await capture('#/focus', 'focus.png');

        // 4. Capture Insights
        await capture('#/insights', 'insights.png');

        // 5. Capture Settings
        await capture('#/settings', 'settings.png');

        // 6. Capture Login Page
        console.log('[Screenshot] Preparing to capture login page...');
        store.set('userProfile', { name: '', email: '' });
        await mainWindow.webContents.executeJavaScript(`
          if (window.setUserProfile) {
            window.setUserProfile({ name: '', email: '' });
          } else {
            localStorage.removeItem('distrack_user');
          }
          window.location.hash = '#/auth';
        `);
        await delay(3000); // Wait for route transition
        console.log('[Screenshot] Capturing login.png...');
        const loginImg = await mainWindow.webContents.capturePage();
        fs.writeFileSync(path.join(screenshotDir, 'login.png'), loginImg.toPNG());
        console.log('[Screenshot] Saved login.png');

        // Restore user
        store.set('userProfile', { name: 'Kartikey', email: 'kartikey@gmail.com' });
        await mainWindow.webContents.executeJavaScript(`
          localStorage.setItem('distrack_user', JSON.stringify({ name: 'Kartikey', email: 'kartikey@gmail.com' }));
        `);
        
        console.log('[Screenshot] All screenshots captured successfully!');
      } catch (e) {
        console.error('[Screenshot] Capture failed:', e);
      } finally {
        app.isQuitting = true;
        app.quit();
      }
    });
  }
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
      const psScript = `Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object ProcessName, MainWindowTitle, Id, Path | ConvertTo-Json -Compress`;
      execFile('powershell.exe', [
        '-NoProfile', '-NoLogo', '-NonInteractive', '-Command', psScript
      ], { windowsHide: true, timeout: 10000 }, async (err, stdout, stderr) => {
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
          const resultPromises = data
            .filter(p => p && p.ProcessName && !['electron', 'distrack', 'systemsettings', 'textinputhost', 'applicationframehost', 'shellexperiencehost', 'awcc', 'explorer', 'searchapp', 'startmenuexperiencehost', 'widgets', 'ctfmon', 'searchhost', 'taskmgr', 'dwm', 'svchost', 'lockapp', 'runtimebroker', 'nvidia share', 'nvspcaps64', 'nvcontainer', 'nvspcaps', 'nvidia web helper', 'powertoys.quickaccess', 'powertoys', 'powertoys.awake', 'powertoys.fancyzones', 'antigravity', 'conhost', 'wslhost', 'wsl'].includes(p.ProcessName.toLowerCase()))
            .map(async (p) => {
              const key = p.ProcessName.toLowerCase();
              let iconDataUrl = null;
              if (p.Path) {
                try {
                  const img = await app.getFileIcon(p.Path, { size: 'normal' });
                  iconDataUrl = img.toDataURL();
                } catch (e) {
                  // ignore
                }
              }
              return {
                id: key,
                name: p.ProcessName,
                windowTitle: p.MainWindowTitle || '',
                timeSpentMinutes: 0,
                category: categories[key] || DEFAULT_CATS[key] || 'neutral',
                type: 'application',
                icon: iconDataUrl || ICON_MAP[key] || 'apps',
              };
            });
          const result = await Promise.all(resultPromises);
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

  ipcMain.handle('set-focus-sessions', (_, sessions) => {
    store.set('focusSessions', sessions || []);
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

  ipcMain.handle('set-blocklist', (_, newList) => {
    store.set('blocklist', newList || []);
    return newList || [];
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

  // -- User Profile --
  ipcMain.handle('get-user-profile', () => store.get('userProfile', { name: '', email: '', picture: '' }));
  ipcMain.handle('set-user-profile', (_, profile) => {
    store.set('userProfile', profile);
    return true;
  });

  // -- Kill process --
  ipcMain.handle('kill-process', (_, processName) => {
    return new Promise((resolve) => {
      execFile('taskkill.exe', ['/IM', `${processName}.exe`, '/F'], { windowsHide: true }, (err) => {
        if (err) {
          console.error(`[Main] Failed to kill ${processName}:`, err.message);
        }
        resolve(!err);
      });
    });
  });

  // -- Google Sign-In --
  ipcMain.handle('google-sign-in', async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId) {
      throw new Error('Google Client ID is not configured. Please add GOOGLE_CLIENT_ID to .env.local.');
    }

    return new Promise((resolve, reject) => {
      let port = 0;
      const server = http.createServer(async (req, res) => {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(getAuthResponsePage(false, `Authentication error: ${error}`));
          reject(new Error(error));
          server.close();
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(getAuthResponsePage(false, 'Authorization code not found.'));
          reject(new Error('No authorization code returned'));
          server.close();
          return;
        }

        // Send a pretty success page immediately
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getAuthResponsePage(true));

        // Exchange authorization code for tokens
        try {
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret || '',
              redirect_uri: `http://localhost:${port}`,
              grant_type: 'authorization_code',
            }),
          });

          if (!tokenResponse.ok) {
            const errData = await tokenResponse.json();
            throw new Error(errData.error_description || errData.error || 'Failed to exchange authorization code');
          }

          const tokenData = await tokenResponse.json();
          const accessToken = tokenData.access_token;
          const idToken = tokenData.id_token;

          // Fetch user profile info
          const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!userResponse.ok) {
            throw new Error('Failed to fetch user profile details from Google');
          }

          const userData = await userResponse.json();

          const profile = {
            name: userData.name || userData.given_name || 'Google User',
            email: userData.email,
            picture: userData.picture || '',
          };

          // Save profile in store
          store.set('userProfile', profile);
          resolve({ ...profile, idToken });
        } catch (err) {
          reject(err);
        } finally {
          server.close();
        }
      });

      // Bind to 127.0.0.1 on port 0 to let the OS assign any free port
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        console.log(`[Auth] Google OAuth loopback server listening on port ${port}`);

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
          client_id: clientId,
          redirect_uri: `http://localhost:${port}`,
          response_type: 'code',
          scope: 'openid profile email',
          prompt: 'select_account'
        }).toString();

        shell.openExternal(authUrl).catch(err => {
          reject(new Error(`Failed to open default web browser: ${err.message}`));
          server.close();
        });
      });

      server.on('error', (err) => {
        reject(err);
      });
    });
  });

  // -- Send OTP Email via Resend --
  ipcMain.handle('send-otp-email', async (_, email, otpCode) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('Resend API Key is not configured. Please add RESEND_API_KEY to your .env.local file.');
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'Distrack <onboarding@resend.dev>', // default free tier sandbox sender
          to: email,
          subject: 'Verify your Distrack Account',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #0A0A0A; color: #E2E8F0; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
              <div style="text-align: center; margin-bottom: 25px;">
                <h1 style="font-family: Georgia, serif; font-style: italic; font-weight: normal; font-size: 28px; margin: 0; color: #E2E8F0; letter-spacing: -0.01em;">Distrack</h1>
                <p style="text-transform: uppercase; font-size: 8px; letter-spacing: 0.25em; color: #94A3B8; margin: 5px 0 0 0; font-weight: bold; opacity: 0.65;">Digital Mindfulness</p>
              </div>
              <h2 style="font-size: 18px; font-weight: normal; margin-bottom: 15px; color: #E2E8F0; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;">Verify Your Email Address</h2>
              <p style="font-size: 13px; line-height: 1.6; color: #94A3B8;">Welcome to Distrack. To complete your registration, please enter the following 6-digit verification code in the application:</p>
              <div style="background-color: #121212; border: 1px solid rgba(255,255,255,0.08); padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #D4AF37; margin: 25px 0; font-family: monospace;">
                ${otpCode}
              </div>
              <p style="color: #64748B; font-size: 11px; line-height: 1.5; margin-top: 25px;">This verification code is valid for 10 minutes. If you did not request this code, you can safely ignore this email.</p>
              <div style="margin-top: 35px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 15px; text-align: center; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3em; color: #64748B; font-weight: bold;">
                Digital Mindfulness
              </div>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to send email (Status ${response.status})`);
      }

      return true;
    } catch (err) {
      console.error('[Resend] Email sending failed:', err);
      throw err;
    }
  });
}

// ── App lifecycle ─────────────────────────────────────────────
app.whenReady().then(() => {
  store = new Store(STORE_DEFAULTS);
  setupIPC();
  createWindow();
  createTray();

  // Check for updates and notify user dynamically
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('[Main] Update check error:', err);
  });
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

// Helper function to return a beautiful HTML page for Google Sign-in feedback
function getAuthResponsePage(success, errorMessage = '') {
  const title = success ? 'Sign In Successful' : 'Sign In Failed';
  const subtitle = success 
    ? 'You have successfully signed in to Distrack. You can safely close this tab and return to the desktop app.' 
    : `An error occurred: ${errorMessage}. Please close this tab and try again in the app.`;
  const icon = success 
    ? `<div class="success-icon">✓</div>` 
    : `<div class="error-icon">✗</div>`;
  const iconColor = success ? '#10B981' : '#EF4444';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Playfair+Display:ital,wght@1,400;1,700&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          background-color: #0A0A0A;
          color: #E2E8F0;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          overflow: hidden;
        }

        .ambient-bg {
          position: absolute;
          top: 25%;
          left: 25%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 70%);
          filter: blur(50px);
          pointer-events: none;
          z-index: 1;
        }

        .card {
          background-color: #121212;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 3rem;
          max-width: 450px;
          width: 90%;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          position: relative;
          z-index: 10;
        }

        .logo-text {
          font-family: 'Playfair Display', serif;
          font-style: italic;
          font-size: 2.25rem;
          margin-bottom: 2rem;
          color: #E2E8F0;
          letter-spacing: -0.02em;
        }

        .icon-wrapper {
          width: 64px;
          height: 64px;
          margin: 0 auto 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 2rem;
          font-weight: bold;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .success-icon {
          color: ${iconColor};
        }

        .error-icon {
          color: ${iconColor};
        }

        h1 {
          font-family: 'Playfair Display', serif;
          font-weight: 400;
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: #E2E8F0;
        }

        p {
          font-size: 0.875rem;
          line-height: 1.6;
          color: #94A3B8;
          margin-bottom: 2rem;
        }

        .footer {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          color: #64748B;
          font-weight: 700;
        }
      </style>
    </head>
    <body>
      <div class="ambient-bg"></div>
      <div class="card">
        <div class="logo-text">Distrack</div>
        <div class="icon-wrapper">
          ${icon}
        </div>
        <h1>${title}</h1>
        <p>${subtitle}</p>
        <div class="footer">Digital Mindfulness</div>
      </div>
      <script>
        if (${success}) {
          setTimeout(() => {
            window.close();
          }, 5000);
        }
      </script>
    </body>
    </html>
  `;
}
