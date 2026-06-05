import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppUsage, AppCategory, initialApps } from '../data/mockData';
import { calculateFocusScore } from '../utils/logic';
import type { FocusSession, AppSettings, DailyTotal } from '../types/electron';

const isElectron = !!window.electronAPI;

interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}

interface AppContextType {
  apps: AppUsage[];
  focusScore: number;
  updateAppCategory: (id: string, newCategory: AppCategory) => void;
  isFocusModeActive: boolean;
  startFocusSession: (config: { mode: string }, bypassBackend?: boolean) => void;
  stopFocusSession: (bypassBackend?: boolean) => void;
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
  const timeframeRef = useRef(timeframe);

  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

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
    localStorage.setItem('distrack_user', JSON.stringify(p));
    if (isElectron) {
      window.electronAPI!.setUserProfile(p);
    }
  }, []);

  useEffect(() => {
    (window as any).setUserProfile = setUserProfile;
    return () => {
      delete (window as any).setUserProfile;
    };
  }, [setUserProfile]);

  // ── Initial data load ──
  useEffect(() => {
    if (!isElectron) {
      // Seed mock data for browser presentation mode
      setApps(initialApps);
      
      const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const mockValues = [1.0, 3.5, 4.2, 2.8, 5.1, 3.0, 1.1];
      const totals: DailyTotal[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const val = mockValues[d.getDay() % mockValues.length];
        totals.push({
          day: days[d.getDay()],
          label: days[d.getDay()],
          value: val,
          date: dateKey
        });
      }
      setDailyTotals(totals);

      setFocusSessions([
        { id: '1', durationMinutes: 25, date: new Date(Date.now() - 3600000 * 2).toISOString(), mode: 'Deep Silence' },
        { id: '2', durationMinutes: 50, date: new Date(Date.now() - 3600000 * 24).toISOString(), mode: 'Strict Lock' },
        { id: '3', durationMinutes: 15, date: new Date(Date.now() - 3600000 * 48).toISOString(), mode: 'Light Focus' }
      ]);
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
      api.getUserProfile(),
    ]).then(([trackedApps, bl, sessions, sett, totals, onboarded, focusActive, profile]) => {
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
      if (profile && profile.name) setUserProfileState(profile);
    }).catch(console.error);

    // Listen for live tracking updates from the tracker
    const unsub = api.onTrackingUpdate((data) => {
      if (timeframeRef.current === 'weekly') {
        api.getTrackedApps('weekly').then((trackedApps) => {
          setApps(trackedApps);
          setFocusScore(calculateFocusScore(trackedApps));
        });
      } else {
        setApps(data.apps);
        setFocusScore(calculateFocusScore(data.apps));
      }
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

  const startFocusSession = useCallback((config: { mode: string }, bypassBackend?: boolean) => {
    if (isElectron && !bypassBackend) {
      window.electronAPI!.startFocusSession(config);
    }
    setIsFocusModeActive(true);
  }, []);

  const stopFocusSession = useCallback((bypassBackend?: boolean) => {
    if (isElectron && !bypassBackend) {
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
    } else {
      // Simulate scan in browser mode
      const mockScanned: AppUsage[] = [
        { id: "chrome", name: "Google Chrome", timeSpentMinutes: 0, category: "neutral", type: "application", icon: "public" },
        { id: "notion", name: "Notion", timeSpentMinutes: 0, category: "productive", type: "application", icon: "edit_note" },
        { id: "spotify", name: "Spotify", timeSpentMinutes: 0, category: "neutral", type: "application", icon: "music_note" },
        { id: "discord", name: "Discord", timeSpentMinutes: 0, category: "wasteful", type: "application", icon: "chat" }
      ];
      setApps(prev => {
        const merged = [...prev];
        for (const app of mockScanned) {
          if (!merged.find(a => a.id === app.id)) {
            merged.push(app);
          }
        }
        return merged;
      });
      return mockScanned;
    }
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
