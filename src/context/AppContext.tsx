import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { initialApps, AppUsage, AppCategory } from '../data/mockData';
import { calculateFocusScore } from '../utils/logic';
import type { FocusSession, AppSettings, DailyTotal } from '../types/electron';

const isElectron = !!window.electronAPI;

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
}

const DEFAULT_SETTINGS: AppSettings = { theme: 'dark', notifications: true, launchOnStartup: false };

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [apps, setApps] = useState<AppUsage[]>(isElectron ? [] : initialApps);
  const [focusScore, setFocusScore] = useState(0);
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([]);
  const [isOnboarded, setIsOnboardedState] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');
  const cleanupRef = useRef<(() => void) | null>(null);

  // ── Initial data load ──
  useEffect(() => {
    if (!isElectron) {
      setFocusScore(calculateFocusScore(initialApps));
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
      if (trackedApps.length > 0) setApps(trackedApps);
      setBlocklist(bl);
      setFocusSessions(sessions);
      setSettings(sett);
      setDailyTotals(totals);
      setIsOnboardedState(onboarded);
      setIsFocusModeActive(focusActive);
      if (trackedApps.length > 0) setFocusScore(calculateFocusScore(trackedApps));
    }).catch(console.error);

    // Listen for live tracking updates
    const unsub = api.onTrackingUpdate((data) => {
      setApps(data.apps);
      setFocusScore(calculateFocusScore(data.apps));
    });
    cleanupRef.current = unsub;

    return () => { if (cleanupRef.current) cleanupRef.current(); };
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

  // ── Non-electron: recalculate score when apps change ──
  useEffect(() => {
    if (!isElectron) setFocusScore(calculateFocusScore(apps));
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
      return window.electronAPI!.scanRunningApps();
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
