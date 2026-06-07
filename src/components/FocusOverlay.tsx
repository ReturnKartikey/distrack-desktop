import React, { useState, useEffect, useRef } from 'react';

export default function FocusOverlay() {
  const [activeWarningApp, setActiveWarningApp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [blockedAppName, setBlockedAppName] = useState<string | null>(null);
  const [privilegeFailedApp, setPrivilegeFailedApp] = useState<string | null>(null);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const blockedTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    // 1. Listen for app-close-warning
    const unsubWarning = window.electronAPI.onAppCloseWarning((appName) => {
      // Clear any active timers
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);

      setBlockedAppName(null);
      setPrivilegeFailedApp(null);
      setActiveWarningApp(appName);
      setCountdown(10);

      // Start the 10-second countdown
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    // 2. Listen for app-close-warning-cancelled (e.g. user manually soft-closed the app)
    const unsubCancel = window.electronAPI.onAppCloseWarningCancelled((appName) => {
      setActiveWarningApp((current) => {
        if (current?.toLowerCase() === appName.toLowerCase()) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          return null;
        }
        return current;
      });
    });

    // 3. Listen for app-blocked (app successfully force-killed)
    const unsubBlocked = window.electronAPI.onAppBlocked((appName) => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setActiveWarningApp(null);
      setPrivilegeFailedApp(null);
      setBlockedAppName(appName);

      // Show the success banner for 3 seconds
      blockedTimerRef.current = setTimeout(() => {
        setBlockedAppName(null);
      }, 3000);
    });

    // 4. Listen for app-block-failed-privilege (app couldn't be closed due to privileges)
    const unsubPrivilege = window.electronAPI.onAppBlockFailedPrivilege((appName) => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setActiveWarningApp(null);
      setBlockedAppName(null);
      setPrivilegeFailedApp(appName);
    });

    return () => {
      unsubWarning();
      unsubCancel();
      unsubBlocked();
      unsubPrivilege();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
    };
  }, []);

  // Format countdown progress bar width percentage
  const progressPercent = (countdown / 10) * 100;

  if (activeWarningApp) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/90 backdrop-blur-xl transition-all duration-500 text-primary">
        {/* Ambient red glow background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-error/10 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

        <div className="w-full max-w-md bg-surface border border-error/20 p-8 shadow-2xl relative z-10 flex flex-col items-center text-center">
          {/* Warning Icon with pulse */}
          <div className="w-16 h-16 rounded-full bg-error/10 border border-error/30 flex items-center justify-center mb-6 animate-pulse">
            <span className="material-symbols-outlined text-error text-3xl">dangerous</span>
          </div>

          <h2 className="text-2xl font-serif text-error mb-2 tracking-tight">Focus Interruption</h2>
          <p className="text-[10px] font-sans text-on-surface-variant uppercase tracking-widest mb-6">Distraction Detected</p>

          <div className="w-full bg-surface-bright border border-outline-variant p-4 mb-6 rounded-sm">
            <p className="text-sm font-sans font-light leading-relaxed">
              <span className="font-mono font-bold text-error">{activeWarningApp}.exe</span> is currently running and blocked in this focus mode.
            </p>
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed mb-8">
            Please save your progress immediately. This application will be force closed to protect your focus in:
          </p>

          {/* Large countdown text */}
          <div className="text-7xl font-mono text-primary font-bold mb-6 tabular-nums relative">
            {countdown}
            <span className="text-xs font-sans text-on-surface-variant font-normal tracking-wide block mt-1 uppercase">seconds left</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-outline-variant rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-error transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <div className="text-[9px] uppercase font-bold tracking-[0.25em] text-on-surface-variant opacity-60">
            Digital Mindfulness Enforced
          </div>
        </div>
      </div>
    );
  }

  if (blockedAppName) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-surface border border-primary/20 p-5 shadow-2xl flex items-center gap-4 animate-slide-in-right max-w-sm text-primary">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-primary text-xl">verified</span>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Focus Preserved</h4>
          <p className="text-[11px] text-on-surface-variant mt-0.5 leading-normal">
            <span className="font-mono text-primary font-bold">{blockedAppName}</span> was closed. Stay focused!
          </p>
        </div>
      </div>
    );
  }

  if (privilegeFailedApp) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/85 backdrop-blur-lg text-primary">
        <div className="w-full max-w-md bg-surface border border-outline-variant p-8 shadow-2xl text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-primary text-2xl">admin_panel_settings</span>
          </div>

          <h2 className="text-xl font-serif mb-2 tracking-tight text-primary">Privilege Required</h2>
          <p className="text-[10px] font-sans text-on-surface-variant uppercase tracking-widest mb-6">Block Action Failed</p>

          <p className="text-xs leading-relaxed mb-8">
            Distrack lacks the necessary system permissions to force-close <span className="font-mono font-bold text-primary">{privilegeFailedApp}.exe</span>. 
            Please relaunch Distrack as **Administrator** to enable blocking for this application.
          </p>

          <button 
            onClick={() => setPrivilegeFailedApp(null)}
            className="w-full bg-primary text-background py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-bright hover:text-primary border border-outline transition-all"
          >
            Dismiss & Keep Focus
          </button>
        </div>
      </div>
    );
  }

  return null;
}
