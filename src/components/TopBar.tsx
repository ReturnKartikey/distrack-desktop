import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { formatTime } from '../utils/logic';

export default function TopBar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const { apps } = useAppContext();
  
  const totalScreenTime = apps.reduce((acc, app) => acc + app.timeSpentMinutes, 0);

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-outline-variant px-6 lg:px-10 flex items-center justify-between bg-background/80 backdrop-blur-md">
      <div className="flex items-center">
        <h1 className="text-xl lg:text-2xl font-serif italic tracking-tight text-white flex items-center">
          Distrack  
          <span className="hidden sm:inline-block text-[10px] uppercase font-sans font-bold tracking-[0.3em] ml-3 opacity-40 text-on-surface">Digital Mindfulness</span>
        </h1>
      </div>
      <div className="flex items-center gap-6 text-on-surface">
        <div className="hidden lg:flex flex-col items-end">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">Screen Time</span>
          <span className="text-base font-mono text-white">{formatTime(totalScreenTime)}</span>
        </div>
        <div className="relative">
          <div 
            className="w-10 h-10 flex items-center justify-center rounded-full border border-outline-variant bg-surface hover:bg-surface-bright cursor-pointer transition-colors"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <span className="material-symbols-outlined text-white text-[20px]">person</span>
          </div>
          {profileOpen && (
            <div className="absolute right-0 top-14 w-48 bg-surface border border-outline-variant shadow-2xl flex flex-col z-50">
              <div className="px-4 py-3 border-b border-outline-variant">
                <p className="text-sm text-white font-serif tracking-wide">Minimal User</p>
                <p className="text-[10px] text-on-surface-variant font-mono mt-1">Free Plan</p>
              </div>
              <button 
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/settings');
                }}
                className="text-left px-4 py-3 text-[10px] uppercase tracking-widest hover:bg-surface-bright border-b border-outline-variant transition-colors text-on-surface hover:text-white flex items-center justify-between w-full"
              >
                Settings
                <span className="material-symbols-outlined text-[16px]">settings</span>
              </button>
              <button 
                onClick={() => { setProfileOpen(false); navigate('/auth'); }}
                className="text-left px-4 py-3 text-[10px] uppercase tracking-widest hover:bg-error/10 hover:text-error transition-colors text-on-surface flex items-center justify-between w-full"
              >
                Logout
                <span className="material-symbols-outlined text-[16px]">logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
