import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function Settings() {
  const { settings, updateSettings, clearData, isElectron } = useAppContext();
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = React.useState(false);
  const themeDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto w-full lg:h-full lg:overflow-hidden lg:flex lg:flex-col pb-24 lg:pb-10 space-y-6">
      <header className="mb-2 flex-shrink-0">
        <h1 className="text-2xl font-serif tracking-tight text-primary mb-2">Settings</h1>
        <p className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">Configure your experience</p>
      </header>

      <div className="space-y-6 overflow-y-auto pr-1 flex-1">
        {/* General Settings */}
        <section className="glass-card p-6 sm:p-8">
          <h2 className="font-serif text-xl mb-6 text-primary">General</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-sans tracking-wide text-primary">Appearance</p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Select your preferred theme</p>
              </div>
              <div className="relative inline-block text-left" ref={themeDropdownRef}>
                <button
                  onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                  className="flex items-center justify-between gap-3 bg-surface border border-outline-variant px-4 py-2 text-xs uppercase tracking-widest font-bold text-primary outline-none cursor-pointer min-w-[120px]"
                >
                  <span className="capitalize">{settings.theme}</span>
                  <span className={`material-symbols-outlined text-[14px] transition-transform duration-300 ${isThemeDropdownOpen ? 'rotate-180' : ''}`}>
                    keyboard_arrow_down
                  </span>
                </button>

                {isThemeDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-full bg-surface border border-outline-variant shadow-xl z-50 py-1 rounded-none animate-fadeIn">
                    <button
                      onClick={() => { updateSettings({ theme: 'system' }); setIsThemeDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-surface-bright ${settings.theme === 'system' ? 'text-primary bg-surface-bright/50' : 'text-primary/60 hover:text-primary'}`}
                    >
                      System
                    </button>
                    <button
                      onClick={() => { updateSettings({ theme: 'dark' }); setIsThemeDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-surface-bright ${settings.theme === 'dark' ? 'text-primary bg-surface-bright/50' : 'text-primary/60 hover:text-primary'}`}
                    >
                      Dark
                    </button>
                    <button
                      onClick={() => { updateSettings({ theme: 'light' }); setIsThemeDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-surface-bright ${settings.theme === 'light' ? 'text-primary bg-surface-bright/50' : 'text-primary/60 hover:text-primary'}`}
                    >
                      Light
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full h-[1px] bg-outline-variant"></div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-sans tracking-wide text-primary">Launch on Startup</p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                  {isElectron ? 'Start Distrack automatically when you log in' : 'Start Distrack automatically (requires desktop app)'}
                </p>
              </div>
              <button
                onClick={() => updateSettings({ launchOnStartup: !settings.launchOnStartup })}
                className={`w-10 h-6 border transition-colors relative ${settings.launchOnStartup ? 'bg-white border-white' : 'bg-transparent border-outline-variant'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${settings.launchOnStartup ? 'left-5 bg-black' : 'left-0.5'}`}></div>
              </button>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="glass-card p-6 sm:p-8">
          <h2 className="font-serif text-xl mb-6 text-primary">Notifications</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-sans tracking-wide text-primary">Push Notifications</p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                  {isElectron ? 'Get notified when focus sessions end or apps are blocked' : 'Receive alerts for focus sessions'}
                </p>
              </div>
              <button
                onClick={() => updateSettings({ notifications: !settings.notifications })}
                className={`w-10 h-6 border transition-colors relative ${settings.notifications ? 'bg-white border-white' : 'bg-transparent border-outline-variant'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${settings.notifications ? 'left-5 bg-black' : 'left-0.5'}`}></div>
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="glass-card p-6 sm:p-8 border-error/20">
          <h2 className="font-serif text-xl mb-6 text-error">Danger Zone</h2>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-sans tracking-wide text-primary">Delete Data</p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Clear all usage history and focus sessions</p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure? This will permanently delete all your tracking data and session history.')) {
                    clearData();
                  }
                }}
                className="px-6 py-2 border border-error text-error text-[10px] uppercase tracking-widest font-bold hover:bg-error/10 transition-colors"
              >
                Clear Data
              </button>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="glass-card p-6 sm:p-8">
          <h2 className="font-serif text-xl mb-4 text-primary">About</h2>
          <div className="text-xs text-on-surface-variant space-y-2">
            <p><span className="font-bold text-primary">Distrack</span> — Digital Mindfulness</p>
            <p>Version 1.0.0</p>
            <p className="text-[10px] uppercase tracking-widest mt-4 opacity-60">Built with Electron + React + Vite</p>
          </div>
        </section>
      </div>
    </div>
  );
}
