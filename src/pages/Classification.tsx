import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { AppUsage, AppCategory } from '../data/mockData';
import { formatTime } from '../utils/logic';

export default function Classification() {
  const { apps, updateAppCategory, scanApps, isElectron } = useAppContext();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedApps, setScannedApps] = useState<AppUsage[]>([]);

  // Merge tracked apps + scanned apps, deduplicating by id
  const allApps = React.useMemo(() => {
    const merged = new Map<string, AppUsage>();
    for (const app of apps) {
      merged.set(app.id, app);
    }
    for (const app of scannedApps) {
      if (!merged.has(app.id)) {
        merged.set(app.id, app);
      }
    }
    return Array.from(merged.values()).sort((a, b) => b.timeSpentMinutes - a.timeSpentMinutes);
  }, [apps, scannedApps]);

  const handleCategoryChange = (id: string, newCategory: AppCategory) => {
    updateAppCategory(id, newCategory);
    // Also update in scanned apps if it exists there
    setScannedApps(prev => prev.map(a => a.id === id ? { ...a, category: newCategory } : a));
    setOpenDropdownId(null);
  };

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const scanned = await scanApps();
      if (scanned.length > 0) {
        setScannedApps(scanned);
      }
    } catch (e) {
      console.error('Scan failed:', e);
    }
    setIsScanning(false);
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto pb-24 lg:pb-10 space-y-6">
      <header className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white mb-2">App Classification</h1>
          <p className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">
            {isElectron ? 'Categorize your tracked apps' : 'Categorize your apps accurately'}
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="px-6 py-3 border border-outline-variant bg-surface text-white text-[10px] uppercase tracking-widest font-bold hover:bg-surface-bright transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[16px] ${isScanning ? 'animate-spin' : ''}`}>sync</span>
          {isScanning ? 'Scanning System...' : 'Scan PC Apps'}
        </button>
      </header>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-6 font-serif text-white font-normal text-lg w-[45%]">Application</th>
                <th className="p-6 font-serif text-white font-normal text-lg w-[25%] hidden sm:table-cell">Time</th>
                <th className="p-6 font-serif text-white font-normal text-lg w-[30%]">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {allApps.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center">
                    <span className="material-symbols-outlined text-4xl mb-3 block opacity-30">search</span>
                    <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                      {isElectron ? 'No apps tracked yet. Click "Scan PC Apps" or use your PC and they\'ll appear here.' : 'Click "Scan PC Apps" to detect running applications.'}
                    </p>
                  </td>
                </tr>
              ) : allApps.map((app) => (
                <tr key={app.id} className="hover:bg-surface-bright transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-surface flex items-center justify-center text-white border border-outline-variant flex-shrink-0">
                        <span className="material-symbols-outlined">{app.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-sans text-white tracking-wide truncate">{app.name}</p>
                        {app.type && <p className="text-[10px] font-mono text-on-surface-variant mt-1">{app.type}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-6 hidden sm:table-cell">
                    <span className="font-mono text-sm text-white">
                      {app.timeSpentMinutes > 0 ? formatTime(app.timeSpentMinutes) : '—'}
                    </span>
                  </td>
                  <td className="p-6 relative">
                    <div
                      className="w-full bg-surface border border-outline-variant px-4 py-3 text-xs uppercase tracking-widest font-bold cursor-pointer flex justify-between items-center transition-colors hover:border-white select-none"
                      onClick={() => setOpenDropdownId(openDropdownId === app.id ? null : app.id)}
                    >
                      <span className={`
                        ${app.category === 'productive' ? 'text-white' : ''}
                        ${app.category === 'wasteful' ? 'text-error' : ''}
                        ${app.category === 'neutral' ? 'text-on-surface-variant' : ''}
                      `}>
                        {app.category}
                      </span>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                        {openDropdownId === app.id ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>

                    {openDropdownId === app.id && (
                      <div className="absolute top-[calc(100%-12px)] left-6 right-6 bg-surface border border-outline-variant shadow-2xl z-50 flex flex-col select-none">
                        <div className="px-4 py-3 text-xs uppercase tracking-widest font-bold cursor-pointer hover:bg-surface-bright text-white transition-colors" onClick={() => handleCategoryChange(app.id, 'productive')}>Productive</div>
                        <div className="px-4 py-3 text-xs uppercase tracking-widest font-bold cursor-pointer hover:bg-surface-bright text-on-surface-variant transition-colors" onClick={() => handleCategoryChange(app.id, 'neutral')}>Neutral</div>
                        <div className="px-4 py-3 text-xs uppercase tracking-widest font-bold cursor-pointer hover:bg-error/10 text-error transition-colors" onClick={() => handleCategoryChange(app.id, 'wasteful')}>Wasteful</div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
