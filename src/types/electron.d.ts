import type { AppUsage, AppCategory } from '../data/mockData';

export interface ElectronAPI {
  // Tracking
  getTrackedApps: (timeframe?: 'daily' | 'weekly') => Promise<AppUsage[]>;
  getDailyTotals: () => Promise<DailyTotal[]>;
  onTrackingUpdate: (callback: (data: TrackingUpdate) => void) => () => void;

  // App categories
  getAppCategories: () => Promise<Record<string, AppCategory>>;
  updateAppCategory: (processName: string, category: AppCategory) => Promise<boolean>;

  // Scan
  scanRunningApps: () => Promise<AppUsage[]>;

  // Focus
  getFocusSessions: () => Promise<FocusSession[]>;
  addFocusSession: (session: Omit<FocusSession, 'id'>) => Promise<boolean>;
  startFocusSession: (config: { mode: string }) => Promise<boolean>;
  stopFocusSession: () => Promise<boolean>;
  getFocusActive: () => Promise<boolean>;
  onAppBlocked: (callback: (name: string) => void) => () => void;

  // Blocklist
  getBlocklist: () => Promise<string[]>;
  toggleBlockApp: (appId: string) => Promise<string[]>;

  // Settings
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;

  // Data
  clearData: () => Promise<boolean>;

  // Onboarding
  isOnboarded: () => Promise<boolean>;
  setOnboarded: () => Promise<boolean>;

  // User Profile
  getUserProfile: () => Promise<UserProfile>;
  setUserProfile: (profile: UserProfile) => Promise<boolean>;
  googleSignIn: () => Promise<UserProfile>;

  // Process control
  killProcess: (processName: string) => Promise<boolean>;
}

export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}

export interface DailyTotal {
  day: string;
  label: string;
  value: number;
  date: string;
}

export interface TrackingUpdate {
  dateKey: string;
  apps: AppUsage[];
}

export interface FocusSession {
  id: string;
  durationMinutes: number;
  date: string;
  mode: string;
}

export interface AppSettings {
  theme: string;
  notifications: boolean;
  launchOnStartup: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
