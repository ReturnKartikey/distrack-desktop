import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppUsage, AppCategory } from '../data/mockData';
import { calculateFocusScore } from '../utils/logic';
import type { FocusSession, AppSettings, DailyTotal } from '../types/electron';

const isElectron = !!window.electronAPI;

interface UserProfile {
  name: string;
  email: string;
}

interface AppContextType {
  apps: AppUsage[];
  focusScore: number;
  updateAppCategory: (id: string, newCategory: AppCategory) => void;
  isFocusModeActive: boolean;
  startFocusSession: (config: { mode: string }) => void;
  stopFocusSession: () => void;
  blocklist: string[];
  toggleBlockApp: (id: string) => void;
  focusSessions: FocusSession[];
  addFocusSession: (session: Omit<FocusSession, 'id'>) => void;
  scanApps: () => Promise<AppUsage[]>;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  clearData: () => void;
  isElectron: boolean;
  dailyTotals: DailyTotal[];
  isOnboarded: boolean;
  setOnboarded: () => void;
  timeframe: 'daily' | 'weekly';
  setTimeframe: (t: 'daily' | 'weekly') => void;
  userProfile: UserProfile;
  setUserProfile: (p: UserProfile) => void;
}

const DEFAULT_SETTINGS: AppSettings = { theme: 'dark', notifications: true, launchOnStartup: false };

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Start with empty — real data will stream in from the tracker
  const [apps, setApps] = useState<AppUsage[]>([]);
  const [focusScore, setFocusScore] = useState(0);
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([]);
  const [isOnboarded, setIsOnboardedState] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');
  const [userProfile, setUserProfileState] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('distrack_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { name: '', email: '' };
  });
  const cleanupRef = useRef<(() => void) | null>(null);

  const setUserProfile = useCallback((p: UserProfile) => {
    setUserProfileState(p);
    try { localStorage.setItem('distrack_user', JSON.stringify(p)); } catch {}
  }, []);

  // ── Initial data load ──
  useEffect(() => {
    if (!isElectron) {
      // In browser mode, do an initial scan to show something immediately
      // (won't actually work without Electron, but keeps the interface consistent)
      return;
    }

    const api = window.electronAPI!;

    // Load all initial data in parallel
    Promise.all([
      api.getTrackedApps('daily'),
      api.getBlocklist(),
      api.getFocusSessions(),
      api.getSettings(),
      api.getDailyTotals(),
      api.isOnboarded(),
      api.getFocusActive(),
    ]).then(([trackedApps, bl, sessions, sett, totals, onboarded, focusActive]) => {
      if (trackedApps.length > 0) {
        setApps(trackedApps);
        setFocusScore(calculateFocusScore(trackedApps));
      }
      setBlocklist(bl);
      setFocusSessions(sessions);
      setSettings(sett);
      setDailyTotals(totals);
      setIsOnboardedState(onboarded);
      setIsFocusModeActive(focusActive);
    }).catch(console.error);

    // Listen for live tracking updates from the tracker
    const unsub = api.onTrackingUpdate((data) => {
      setApps(data.apps);
      setFocusScore(calculateFocusScore(data.apps));
    });
    cleanupRef.current = unsub;

    // Also poll for daily totals every 30 seconds to keep the chart fresh
    const totalsTimer = setInterval(() => {
      api.getDailyTotals().then(setDailyTotals);
    }, 30000);

    return () => {
      if (cleanupRef.current) cleanupRef.current();
      clearInterval(totalsTimer);
    };
  }, []);

  // Refresh data when timeframe changes
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI!.getTrackedApps(timeframe).then((trackedApps) => {
      if (trackedApps.length > 0) {
        setApps(trackedApps);
        setFocusScore(calculateFocusScore(trackedApps));
      }
    });
    window.electronAPI!.getDailyTotals().then(setDailyTotals);
  }, [timeframe]);

  // ── Recalculate score when apps change ──
  useEffect(() => {
    setFocusScore(calculateFocusScore(apps));
  }, [apps]);

  // ── Handlers ──
  const updateAppCategory = useCallback((id: string, newCategory: AppCategory) => {
    if (isElectron) {
      window.electronAPI!.updateAppCategory(id, newCategory).then(() => {
        setApps(prev => prev.map(a => a.id === id ? { ...a, category: newCategory } : a));
      });
    } else {
      setApps(prev => prev.map(a => a.id === id ? { ...a, category: newCategory } : a));
    }
  }, []);

  const startFocusSession = useCallback((config: { mode: string }) => {
    if (isElectron) {
      window.electronAPI!.startFocusSession(config);
    }
    setIsFocusModeActive(true);
  }, []);

  const stopFocusSession = useCallback(() => {
    if (isElectron) {
      window.electronAPI!.stopFocusSession();
    }
    setIsFocusModeActive(false);
  }, []);

  const toggleBlockApp = useCallback((id: string) => {
    if (isElectron) {
      window.electronAPI!.toggleBlockApp(id).then(setBlocklist);
    } else {
      setBlocklist(prev =>
        prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
      );
    }
  }, []);

  const addFocusSession = useCallback((session: Omit<FocusSession, 'id'>) => {
    const newSession = { ...session, id: Date.now().toString() };
    if (isElectron) {
      window.electronAPI!.addFocusSession(session).then(() => {
        window.electronAPI!.getFocusSessions().then(setFocusSessions);
      });
    } else {
      setFocusSessions(prev => [newSession, ...prev]);
    }
  }, []);

  const scanApps = useCallback(async (): Promise<AppUsage[]> => {
    if (isElectron) {
      const scanned = await window.electronAPI!.scanRunningApps();
      // Merge scanned apps into existing apps list
      setApps(prev => {
        const merged = [...prev];
        for (const app of scanned) {
          if (!merged.find(a => a.id === app.id)) {
            merged.push(app);
          }
        }
        return merged;
      });
      return scanned;
    }
    return [];
  }, []);

  const updateSettingsFn = useCallback((s: Partial<AppSettings>) => {
    if (isElectron) {
      window.electronAPI!.updateSettings(s).then(setSettings);
    } else {
      setSettings(prev => ({ ...prev, ...s }));
    }
  }, []);

  const clearData = useCallback(() => {
    if (isElectron) {
      window.electronAPI!.clearData().then(() => {
        setApps([]);
        setFocusSessions([]);
        setDailyTotals([]);
      });
    }
  }, []);

  const setOnboarded = useCallback(() => {
    if (isElectron) {
      window.electronAPI!.setOnboarded();
    }
    setIsOnboardedState(true);
  }, []);

  return (
    <AppContext.Provider value={{
      apps, focusScore, updateAppCategory,
      isFocusModeActive, startFocusSession, stopFocusSession,
      blocklist, toggleBlockApp,
      focusSessions, addFocusSession,
      scanApps, settings, updateSettings: updateSettingsFn,
      clearData, isElectron, dailyTotals,
      isOnboarded, setOnboarded,
      timeframe, setTimeframe,
      userProfile, setUserProfile,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
