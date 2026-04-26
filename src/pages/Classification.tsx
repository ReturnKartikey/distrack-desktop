import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { AppUsage, AppCategory } from '../data/mockData';
import { formatTime } from '../utils/logic';

export default function Classification() {
  const { apps, updateAppCategory, scanApps, isElectron } = useAppContext();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedApps, setScannedApps] = useState<AppUsage[]>([]);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

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
    setScannedApps(prev => prev.map(a => a.id === id ? { ...a, category: newCategory } : a));
    setOpenDropdownId(null);
  };

  const handleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanFeedback(null);

    try {
      const scanned = await scanApps();
      if (scanned && scanned.length > 0) {
        setScannedApps(scanned);
        // Count how many are truly new
        const newCount = scanned.filter(s => !apps.find(a => a.id === s.id)).length;
        setScanFeedback(`Found ${scanned.length} running apps${newCount > 0 ? ` (${newCount} new)` : ''}`);
      } else {
        setScanFeedback('No windowed apps found. Try opening some applications first.');
      }
    } catch (e) {
      console.error('Scan failed:', e);
      setScanFeedback('Scan failed — ensure you are running the desktop app.');
    }

    setIsScanning(false);

    // Auto-hide feedback after 5 seconds
    setTimeout(() => setScanFeedback(null), 5000);
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto pb-24 lg:pb-10 space-y-6">
      <header className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white mb-2">App Classification</h1>
          <p className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">
            Categorize your apps to calculate focus scores accurately
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="px-6 py-3 border border-outline-variant bg-white text-black text-[10px] uppercase tracking-widest font-bold hover:bg-surface-bright hover:text-white hover:border-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-wait min-w-[180px]"
        >
          {isScanning ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
              </svg>
              Scanning...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">radar</span>
              Scan PC Apps
            </>
          )}
        </button>
      </header>

      {/* Scan Feedback Banner */}
      {scanFeedback && (
        <div className="flex items-center gap-3 px-5 py-3 border border-outline-variant bg-surface-bright text-white text-xs font-mono animate-fadeIn">
          <span className="material-symbols-outlined text-[16px] text-green-400">check_circle</span>
          {scanFeedback}
        </div>
      )}

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
              {/* Loading skeleton rows */}
              {isScanning && allApps.length === 0 && (
                <>
                  {[1,2,3,4,5].map(i => (
                    <tr key={`skel-${i}`}>
                      <td className="p-6"><div className="h-5 w-32 bg-outline-variant animate-pulse rounded"></div></td>
                      <td className="p-6 hidden sm:table-cell"><div className="h-5 w-16 bg-outline-variant animate-pulse rounded"></div></td>
                      <td className="p-6"><div className="h-5 w-24 bg-outline-variant animate-pulse rounded"></div></td>
                    </tr>
                  ))}
                </>
              )}

              {!isScanning && allApps.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-12 text-center">
                    <span className="material-symbols-outlined text-4xl mb-3 block opacity-30">search</span>
                    <p className="text-sm text-on-surface-variant mb-2">No apps detected yet</p>
                    <p className="text-xs text-on-surface-variant opacity-60">
                      Click <strong>"Scan PC Apps"</strong> to detect all currently running applications on your system.
                    </p>
                  </td>
                </tr>
              )}

              {allApps.map((app) => (
                <tr key={app.id} className="hover:bg-surface-bright transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-surface flex items-center justify-center text-white border border-outline-variant flex-shrink-0">
                        <span className="material-symbols-outlined">{app.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-sans text-white tracking-wide truncate">{app.name}</p>
                        {app.windowTitle && (
                          <p className="text-[10px] font-mono text-on-surface-variant mt-1 truncate max-w-[250px]">{app.windowTitle}</p>
                        )}
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
                        <div className="px-4 py-3 text-xs uppercase tracking-widest font-bold cursor-pointer hover:bg-surface-bright text-white transition-colors flex items-center gap-2" onClick={() => handleCategoryChange(app.id, 'productive')}>
                          <span className="w-2 h-2 bg-white rounded-full"></span> Productive
                        </div>
                        <div className="px-4 py-3 text-xs uppercase tracking-widest font-bold cursor-pointer hover:bg-surface-bright text-on-surface-variant transition-colors flex items-center gap-2" onClick={() => handleCategoryChange(app.id, 'neutral')}>
                          <span className="w-2 h-2 bg-on-surface-variant rounded-full"></span> Neutral
                        </div>
                        <div className="px-4 py-3 text-xs uppercase tracking-widest font-bold cursor-pointer hover:bg-error/10 text-error transition-colors flex items-center gap-2" onClick={() => handleCategoryChange(app.id, 'wasteful')}>
                          <span className="w-2 h-2 bg-error rounded-full"></span> Wasteful
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary bar */}
      {allApps.length > 0 && (
        <div className="flex flex-wrap gap-6 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant px-2">
          <span>Total: <span className="text-white">{allApps.length}</span></span>
          <span>Productive: <span className="text-white">{allApps.filter(a => a.category === 'productive').length}</span></span>
          <span>Neutral: <span className="text-on-surface-variant">{allApps.filter(a => a.category === 'neutral').length}</span></span>
          <span>Wasteful: <span className="text-error">{allApps.filter(a => a.category === 'wasteful').length}</span></span>
        </div>
      )}
    </div>
  );
}
