import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const quotes = [
  "Simplicity is the ultimate sophistication.",
  "Focus is a matter of deciding what things you're not going to do.",
  "The successful warrior is the average man, with laser-like focus.",
  "Starve your distractions, feed your focus.",
  "Where your attention goes, your time goes."
];

export default function FocusMode() {
  const {
    apps, isFocusModeActive, startFocusSession, stopFocusSession,
    blocklist, toggleBlockApp, addFocusSession, isElectron,
  } = useAppContext();

  const [timerMode, setTimerMode] = useState<'classic' | 'pomodoro'>('classic');
  const [pomodoroState, setPomodoroState] = useState<'work' | 'break'>('work');

  const [workTime, setWorkTime] = useState(25 * 60);
  const [breakTime, setBreakTime] = useState(5 * 60);

  const [timeLeft, setTimeLeft] = useState(workTime);
  const [customInput, setCustomInput] = useState('');
  const [customItems, setCustomItems] = useState<{id: string, name: string}[]>([]);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [tempTimeInput, setTempTimeInput] = useState('');

  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [initialDuration, setInitialDuration] = useState(defaultWorkTime);
  const [selectedMode, setSelectedMode] = useState('Deep Silence');

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 10000);
    return () => clearInterval(quoteInterval);
  }, []);

  useEffect(() => {
    let interval: number | undefined;

    if (isFocusModeActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isFocusModeActive) {
      // Record completed session
      addFocusSession({
        durationMinutes: Math.round(initialDuration / 60),
        date: new Date().toISOString(),
        mode: timerMode === 'pomodoro' ? `Pomodoro (${pomodoroState})` : selectedMode
      });

      if (timerMode === 'pomodoro') {
        if (pomodoroState === 'work') {
          setPomodoroState('break');
          setTimeLeft(breakTime);
          setInitialDuration(breakTime);
        } else {
          setPomodoroState('work');
          setTimeLeft(workTime);
          setInitialDuration(workTime);
          stopFocusSession();
        }
      } else {
        stopFocusSession();
      }
    }

    return () => { if (interval) clearInterval(interval); };
  }, [isFocusModeActive, timeLeft, timerMode, pomodoroState, initialDuration, selectedMode, addFocusSession, stopFocusSession]);

  const handleStartStop = () => {
    if (!isFocusModeActive) {
      setInitialDuration(timeLeft);
      startFocusSession({ mode: selectedMode });
    } else {
      stopFocusSession();
    }
  };

  const resetTimer = () => {
    if (isFocusModeActive) stopFocusSession();
    if (timerMode === 'pomodoro') {
      setPomodoroState('work');
      setTimeLeft(workTime);
    } else {
      setTimeLeft(25 * 60);
    }
  };

  const adjustTime = (minutes: number) => {
    if (isFocusModeActive) return;
    setTimeLeft(prev => Math.max(60, prev + minutes * 60));
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimeInputSubmit = () => {
    setIsEditingTime(false);
    const parts = tempTimeInput.split(':');
    let mins = 0, secs = 0;
    if (parts.length === 2) { mins = parseInt(parts[0]) || 0; secs = parseInt(parts[1]) || 0; }
    else if (parts.length === 1) { mins = parseInt(parts[0]) || 0; }
    if (mins >= 0 && secs >= 0 && secs < 60) {
      const newTime = mins * 60 + secs;
      setTimeLeft(newTime);
      if (timerMode === 'pomodoro') {
        if (pomodoroState === 'work') setWorkTime(newTime);
        else setBreakTime(newTime);
      }
    }
  };

  const handleTimeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleTimeInputSubmit();
    else if (e.key === 'Escape') setIsEditingTime(false);
  };

  const blockCandidates = apps.filter(app => app.category !== 'productive');

  const addCustomItem = () => {
    if (customInput.trim()) {
      const id = customInput.trim().toLowerCase();
      setCustomItems(prev => [{id, name: customInput.trim()}, ...prev]);
      toggleBlockApp(id);
      setCustomInput('');
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto pb-24 lg:pb-10 space-y-8">
      <header className="mb-4">
        <h1 className="text-2xl font-serif tracking-tight text-white mb-2">Deep Work Session</h1>
        <p className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">
          {isElectron ? 'Block distractions — apps will be killed if opened' : 'Block distractions and immerse yourself'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Timer Panel (White) ── */}
        <div className="lg:col-span-2 bg-white text-black p-8 lg:p-10 flex flex-col items-center justify-between min-h-[520px] relative overflow-hidden shadow-2xl">
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 border border-black opacity-10 rounded-full"></div>

          <div className="relative z-10 flex flex-col items-center w-full flex-1 justify-center">
            {/* Title */}
            <h3 className="font-serif italic text-2xl mb-6">Focus Session</h3>

            {/* Mode Tabs */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => { if (isFocusModeActive) return; setTimerMode('classic'); setTimeLeft(25 * 60); }}
                className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 border transition-colors ${timerMode === 'classic' ? 'border-black bg-black text-white' : 'border-transparent text-black/40 hover:text-black hover:border-black/20'}`}
              >Classic</button>
              <button
                onClick={() => { if (isFocusModeActive) return; setTimerMode('pomodoro'); setPomodoroState('work'); setTimeLeft(workTime); }}
                className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 border transition-colors ${timerMode === 'pomodoro' ? 'border-black bg-black text-white' : 'border-transparent text-black/40 hover:text-black hover:border-black/20'}`}
              >Pomodoro</button>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
                {timerMode === 'pomodoro' ? `Phase: ${pomodoroState.toUpperCase()}` : 'Mode:'}
              </span>
              {timerMode === 'classic' && !isFocusModeActive ? (
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="bg-transparent border-b border-black text-[10px] font-bold uppercase tracking-[0.2em] outline-none cursor-pointer text-center"
                  style={{ MozAppearance: 'none', WebkitAppearance: 'none' } as React.CSSProperties}
                >
                  <option value="Deep Silence">DEEP SILENCE</option>
                  <option value="Light Focus">LIGHT FOCUS</option>
                  <option value="Strict Lock">STRICT LOCK</option>
                </select>
              ) : timerMode === 'classic' ? (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{selectedMode}</span>
              ) : null}
            </div>

            {timerMode === 'classic' && (
              <p className="text-[9px] uppercase tracking-widest opacity-40 max-w-[280px] text-center mb-8 leading-relaxed">
                {selectedMode === 'Deep Silence' && (isElectron ? "Uses your custom blocklist. Blocked apps will be killed if opened." : "Uses your custom blocklist. A balanced approach for everyday work.")}
                {selectedMode === 'Light Focus' && (isElectron ? "Kills only wasteful-categorized apps. Neutral apps stay open." : "Blocks only wasteful apps. Neutral apps remain accessible.")}
                {selectedMode === 'Strict Lock' && (isElectron ? "Kills ALL non-productive apps automatically. No exceptions." : "Blocks ALL non-productive apps automatically. No exceptions.")}
              </p>
            )}

            {timerMode === 'pomodoro' && (
              <div className="flex items-center gap-8 mb-8">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Work</span>
                  <div className="flex items-center gap-2">
                    {!isFocusModeActive && <button onClick={() => { setWorkTime(prev => Math.max(60, prev - 60 * 5)); if (pomodoroState === 'work') setTimeLeft(prev => Math.max(60, prev - 60 * 5)); }} className="opacity-30 hover:opacity-100"><span className="material-symbols-outlined text-[14px]">remove</span></button>}
                    <span className="font-mono text-sm">{formatTimer(workTime)}</span>
                    {!isFocusModeActive && <button onClick={() => { setWorkTime(prev => prev + 60 * 5); if (pomodoroState === 'work') setTimeLeft(prev => prev + 60 * 5); }} className="opacity-30 hover:opacity-100"><span className="material-symbols-outlined text-[14px]">add</span></button>}
                  </div>
                </div>
                <div className="w-px h-8 bg-black/10"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Break</span>
                  <div className="flex items-center gap-2">
                    {!isFocusModeActive && <button onClick={() => { setBreakTime(prev => Math.max(60, prev - 60)); if (pomodoroState === 'break') setTimeLeft(prev => Math.max(60, prev - 60)); }} className="opacity-30 hover:opacity-100"><span className="material-symbols-outlined text-[14px]">remove</span></button>}
                    <span className="font-mono text-sm">{formatTimer(breakTime)}</span>
                    {!isFocusModeActive && <button onClick={() => { setBreakTime(prev => prev + 60); if (pomodoroState === 'break') setTimeLeft(prev => prev + 60); }} className="opacity-30 hover:opacity-100"><span className="material-symbols-outlined text-[14px]">add</span></button>}
                  </div>
                </div>
              </div>
            )}

            {/* Timer Display */}
            <div className="flex items-center justify-center mb-10 relative w-full">
              {!isFocusModeActive && (
                <button onClick={() => adjustTime(-5)} className="absolute left-4 sm:left-12 p-3 opacity-30 hover:opacity-100 hover:text-black transition-opacity" title="Decrease Time">
                  <span className="material-symbols-outlined text-4xl">remove</span>
                </button>
              )}
              {isEditingTime ? (
                <input type="text" autoFocus value={tempTimeInput}
                  onChange={(e) => setTempTimeInput(e.target.value)}
                  onBlur={handleTimeInputSubmit}
                  onKeyDown={handleTimeInputKeyDown}
                  className="text-7xl lg:text-8xl font-mono tracking-tighter text-center bg-transparent border-b-4 border-black outline-none w-64"
                />
              ) : (
                <span
                  onClick={() => { if (isFocusModeActive) return; setTempTimeInput(formatTimer(timeLeft)); setIsEditingTime(true); }}
                  className={`text-7xl lg:text-8xl font-mono tracking-tighter transition-opacity duration-300 ${!isFocusModeActive ? 'cursor-pointer hover:opacity-100' : ''} ${isFocusModeActive ? 'opacity-100' : 'opacity-80'}`}
                >
                  {formatTimer(timeLeft)}
                </span>
              )}
              {!isFocusModeActive && (
                <button onClick={() => adjustTime(5)} className="absolute right-4 sm:right-12 p-3 opacity-30 hover:opacity-100 hover:text-black transition-opacity" title="Increase Time">
                  <span className="material-symbols-outlined text-4xl">add</span>
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
              <button onClick={handleStartStop}
                className="border-2 border-black px-12 py-4 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-3 min-w-[180px]"
              >
                {isFocusModeActive ? 'Pause' : 'Engage'}
              </button>
              <button onClick={resetTimer} className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 hover:opacity-100 transition-opacity">Reset</button>
            </div>
          </div>

          {/* Quote at bottom */}
          <div className="w-full text-center mt-6">
            <p className="text-xs font-serif italic opacity-50 transition-opacity duration-1000 ease-in-out">
              "{quotes[currentQuoteIndex]}"
            </p>
          </div>
        </div>

        {/* ── Blocklist Panel (Dark) ── */}
        <div className="col-span-1 glass-card p-6 flex flex-col h-[520px]">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-xl">Blocklist</h3>
              <span className="text-[10px] border border-outline px-2 py-0.5 text-on-surface-variant uppercase">Restricted</span>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text" placeholder="Add process name..."
              value={customInput} onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
              className="flex-1 bg-surface border border-outline-variant px-3 py-2 text-xs font-mono text-white outline-none focus:border-white transition-colors min-w-0"
            />
            <button onClick={addCustomItem}
              className="bg-white text-black px-4 flex items-center justify-center hover:bg-surface-bright hover:text-white border-2 border-transparent transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 pr-2 custom-scrollbar border-t border-outline-variant pt-2 mt-2">
            {[...customItems, ...blockCandidates].map(app => {
              const appIcon = 'icon' in app ? (app as any).icon : 'public';

              let isBlocked = blocklist.includes(app.id);
              let isForced = false;

              if (timerMode === 'classic') {
                if (selectedMode === 'Strict Lock') { isBlocked = true; isForced = true; }
                else if (selectedMode === 'Light Focus') {
                  if ('category' in app && (app as any).category === 'neutral') { isBlocked = false; isForced = true; }
                  else { isBlocked = true; isForced = true; }
                }
              }

              return (
                <div key={app.id}
                  className={`flex items-center justify-between p-4 transition-colors ${isForced ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${isBlocked ? 'bg-error/10' : 'hover:bg-surface-bright'}`}
                  onClick={() => { if (!isForced) toggleBlockApp(app.id); }}
                >
                  <div className="flex items-center gap-4 truncate">
                    <span className={`material-symbols-outlined text-lg flex-shrink-0 ${isBlocked ? 'text-error' : 'text-on-surface-variant'}`}>{appIcon}</span>
                    <span className={`font-sans tracking-wide truncate ${isBlocked ? 'text-white' : 'text-white/60'}`}>{app.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isForced && <span className="material-symbols-outlined text-[14px] text-on-surface-variant opacity-60" title="Locked by current mode">lock</span>}
                    <div className={`w-3 h-3 rounded-none border border-outline transition-colors ${isBlocked ? 'bg-error border-error' : 'bg-transparent'} ${isForced ? 'opacity-50' : ''}`}></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-outline-variant flex items-start gap-4">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant leading-relaxed">
              {isElectron
                ? 'When a session starts, Distrack will kill blocked apps if they are opened.'
                : 'When a session starts, Distrack simulates a system-level block on the selected apps.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
