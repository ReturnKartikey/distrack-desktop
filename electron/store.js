import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * Simple JSON file store for persisting app data.
 * Stores data in the Electron userData directory.
 */
export class Store {
  constructor(defaults = {}) {
    this.path = path.join(app.getPath('userData'), 'distrack-data.json');
    this.data = { ...defaults };
    this.saveTimer = null;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.path)) {
        const raw = fs.readFileSync(this.path, 'utf8');
        this.data = { ...this.data, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('[Store] Failed to load:', e.message);
    }
  }

  save() {
    // Debounce saves to avoid excessive disk writes
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        const dir = path.dirname(this.path);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const tmpPath = `${this.path}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
        fs.renameSync(tmpPath, this.path);
      } catch (e) {
        console.error('[Store] Failed to save:', e.message);
      }
    }, 500);
  }

  saveSync() {
    try {
      const dir = path.dirname(this.path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmpPath = `${this.path}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.path);
    } catch (e) {
      console.error('[Store] Failed to save:', e.message);
    }
  }

  /** Get a value by dot-notation key, e.g. "usageData.2026-04-26" */
  get(key, defaultValue) {
    const keys = key.split('.');
    let value = this.data;
    for (const k of keys) {
      if (value === undefined || value === null || typeof value !== 'object') {
        return defaultValue;
      }
      value = value[k];
    }
    return value !== undefined ? value : defaultValue;
  }

  /** Set a value by dot-notation key */
  set(key, value) {
    const keys = key.split('.');
    let obj = this.data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]] || typeof obj[keys[i]] !== 'object') {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this.save();
  }

  /** Delete a key */
  delete(key) {
    const keys = key.split('.');
    let obj = this.data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) return;
      obj = obj[keys[i]];
    }
    delete obj[keys[keys.length - 1]];
    this.save();
  }

  /** Clear all data and reset to empty */
  clear() {
    this.data = {};
    this.saveSync();
  }
}
