import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function Settings() {
  const { settings, updateSettings, clearData, isElectron } = useAppContext();

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto pb-24 lg:pb-10 space-y-8">
      <header className="mb-8">
        <h1 className="text-2xl font-serif tracking-tight text-white mb-2">Settings</h1>
        <p className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">Configure your experience</p>
      </header>

      <div className="space-y-6">
        {/* General Settings */}
        <section className="glass-card p-6 sm:p-8">
          <h2 className="font-serif text-xl mb-6 text-white">General</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-sans tracking-wide text-white">Appearance</p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Select your preferred theme</p>
              </div>
              <select
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value })}
                className="bg-surface border border-outline-variant px-4 py-2 text-xs uppercase tracking-widest font-bold text-white outline-none cursor-pointer"
              >
                <option value="system">System</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div className="w-full h-[1px] bg-outline-variant"></div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-sans tracking-wide text-white">Launch on Startup</p>
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
          <h2 className="font-serif text-xl mb-6 text-white">Notifications</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-sans tracking-wide text-white">Push Notifications</p>
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
                <p className="text-sm font-sans tracking-wide text-white">Delete Data</p>
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
          <h2 className="font-serif text-xl mb-4 text-white">About</h2>
          <div className="text-xs text-on-surface-variant space-y-2">
            <p><span className="font-bold text-white">Distrack</span> — Digital Mindfulness</p>
            <p>Version 1.0.0</p>
            <p className="text-[10px] uppercase tracking-widest mt-4 opacity-60">Built with Electron + React + Vite</p>
          </div>
        </section>
      </div>
    </div>
  );
}
