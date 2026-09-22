import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Utility script to reset cached user authentication,
 * registered profiles, and session storage in Distrack.
 */
const appDataDir = path.join(os.homedir(), 'AppData', 'Roaming', 'distrack');
const dataFilePath = path.join(appDataDir, 'distrack-data.json');

console.log(`[Distrack Auth Reset] Target directory: ${appDataDir}`);

// 1. Reset userProfile and onboarded in distrack-data.json
if (fs.existsSync(dataFilePath)) {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf8');
    const data = JSON.parse(raw);
    const previousEmail = data.userProfile?.email || 'none';
    console.log(`[Distrack Auth Reset] Found active profile: ${previousEmail}`);

    data.userProfile = {
      name: '',
      email: '',
      picture: '',
      emailVerified: false
    };
    data.onboarded = false;

    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[Distrack Auth Reset] Successfully cleared userProfile & set onboarded=false`);
  } catch (err) {
    console.error(`[Distrack Auth Reset] Error updating distrack-data.json:`, err.message);
  }
} else {
  console.log(`[Distrack Auth Reset] distrack-data.json does not exist yet.`);
}

// 2. Clear IndexedDB, Local Storage, Session Storage
const cachesToClear = ['IndexedDB', 'Local Storage', 'Session Storage'];
for (const dirName of cachesToClear) {
  const targetDir = path.join(appDataDir, dirName);
  if (fs.existsSync(targetDir)) {
    try {
      fs.rmSync(targetDir, { recursive: true, force: true });
      console.log(`[Distrack Auth Reset] Cleared cached session store: ${dirName}`);
    } catch (err) {
      console.error(`[Distrack Auth Reset] Failed to remove ${dirName}:`, err.message);
    }
  }
}

console.log(`[Distrack Auth Reset] Done! App will launch cleanly at the Sign In / Sign Up screen.`);
