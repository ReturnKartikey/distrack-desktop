import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { getTopDistractions, formatTime } from '../utils/logic';
import { ResponsiveContainer, BarChart, Bar, Tooltip as RechartsTooltip, Cell } from 'recharts';

export default function Dashboard() {
  const { apps, focusScore, dailyTotals, timeframe, setTimeframe, focusSessions } = useAppContext();

  const screenTimeMinutes = apps.reduce((acc, app) => acc + app.timeSpentMinutes, 0);
  const productiveTimeMinutes = apps.filter(a => a.category === 'productive').reduce((acc, app) => acc + app.timeSpentMinutes, 0);
  const intentionalityScore = screenTimeMinutes > 0 ? Math.round((productiveTimeMinutes / screenTimeMinutes) * 100) : 0;
  const h = Math.floor(screenTimeMinutes / 60);
  const m = Math.floor(screenTimeMinutes % 60);
  const screenTime = screenTimeMinutes > 0 ? `${h}h ${m}m` : '0h 0m';

  const topApps = [...apps]
    .sort((a, b) => b.timeSpentMinutes - a.timeSpentMinutes)
    .slice(0, 5);

  // Use real daily totals — they come from the tracker
  const chartData = dailyTotals.length > 0 ? dailyTotals : [
    { day: 'S', label: 'S', value: 0 }, { day: 'M', label: 'M', value: 0 },
    { day: 'T', label: 'T', value: 0 }, { day: 'W', label: 'W', value: 0 },
    { day: 'T', label: 'T', value: 0 }, { day: 'F', label: 'F', value: 0 },
    { day: 'S', label: 'S', value: 0 },
  ];
  const todayIdx = chartData.length - 1;

  // Compute peak flow period dynamically based on real focus sessions
  const peakFlow = useMemo(() => {
    if (!focusSessions || focusSessions.length === 0) return '—';
    const hours = new Array(24).fill(0);
    for (const s of focusSessions) {
      const h = new Date(s.date).getHours();
      hours[h] += s.durationMinutes;
    }
    const maxHour = hours.indexOf(Math.max(...hours));
    if (hours[maxHour] === 0) return '—';
    const formatHour = (h: number) => {
      if (h === 0 || h === 24) return '12am';
      if (h === 12) return '12pm';
      return h > 12 ? `${h - 12}pm` : `${h}am`;
    };
    return `${formatHour(maxHour)} – ${formatHour(maxHour + 1)}`;
  }, [focusSessions]);

  return (
    <div className="p-6 lg:p-10 w-full max-w-7xl mx-auto pb-24 lg:pb-10 lg:h-full lg:overflow-hidden lg:flex lg:flex-col gap-6 lg:gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-2 gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-serif tracking-tight text-primary mb-1">Overview</h2>
          <p className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">Your digital footprint for {timeframe === 'daily' ? 'today' : 'this week'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeframe('daily')}
            className={`px-4 py-2 border text-[10px] uppercase tracking-widest font-bold transition-colors ${
            timeframe === 'daily'
              ? 'border-outline-variant bg-surface text-primary'
              : 'border-transparent bg-transparent text-on-surface-variant hover:border-outline-variant'
          }`}>Daily</button>
          <button
            onClick={() => setTimeframe('weekly')}
            className={`px-4 py-2 border text-[10px] uppercase tracking-widest font-bold transition-colors ${
            timeframe === 'weekly'
              ? 'border-outline-variant bg-surface text-primary'
              : 'border-transparent bg-transparent text-on-surface-variant hover:border-outline-variant'
          }`}>Weekly</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        <section className="col-span-1 lg:col-span-8 min-w-0 flex flex-col gap-6 lg:gap-8 lg:h-full lg:overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 h-auto lg:h-[210px] flex-shrink-0">
            <div className="glass-card p-6 flex flex-col justify-between h-auto lg:h-full relative overflow-hidden group hover:border-primary/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              
              <div className="flex justify-between items-start z-10">
                <h3 className="font-serif text-xl">Focus Score</h3>
                <span className="text-[10px] bg-primary text-background px-2 py-0.5 font-bold uppercase tracking-tighter">
                   {focusScore > 80 ? 'Excellent' : focusScore > 60 ? 'Good' : focusScore > 0 ? 'Needs Work' : 'Warming Up'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-4 z-10 gap-4">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-mono text-primary">{focusScore}</span>
                    <span className="text-xl opacity-30">/100</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-4 leading-relaxed max-w-[200px]">
                    {apps.length === 0
                      ? 'Distrack is scanning your PC. Data will appear in a few seconds...'
                      : focusScore > 70
                      ? 'Great job maintaining deep focus.'
                      : 'Try reducing time on wasteful apps.'}
                  </p>
                </div>
                
                {/* Circular Gauge Dial */}
                <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" className="stroke-outline-variant" strokeWidth="4" fill="none" />
                    <circle cx="50" cy="50" r="42" stroke="var(--primary)" strokeWidth="6" fill="none"
                      strokeDasharray="263.89"
                      strokeDashoffset={263.89 - (263.89 * focusScore) / 100}
                      className="transition-all duration-1000 ease-out"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xs font-mono opacity-50">{focusScore}%</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 flex flex-col justify-center gap-6">
                <div className="flex justify-between items-start">
                  <h3 className="font-serif text-xl">Usage Metrics</h3>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <h4 className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Screen Time</h4>
                    <span className="text-3xl font-mono text-primary">{screenTime}</span>
                  </div>
                  <div className="w-full h-[1px] bg-outline-variant"></div>
                  <div>
                    <h4 className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Apps Tracked</h4>
                    <span className="text-xl font-mono text-primary">{apps.length} apps</span>
                  </div>
                </div>
            </div>
          </div>

          <div className="glass-card p-6 lg:flex-1 lg:min-h-0 flex flex-col gap-3 lg:gap-4 overflow-hidden">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="font-serif text-xl">Usage Trends</h3>
                  <span className="text-[10px] border border-outline px-2 py-0.5 text-on-surface-variant uppercase">7-Day History</span>
              </div>
              <div className="flex-1 min-h-0 w-full mb-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <RechartsTooltip
                          cursor={{fill: '#262626'}}
                          contentStyle={{backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '0px', color: '#fff', fontFamily: 'monospace', fontSize: '12px'}}
                          formatter={(value: number) => [`${value}h`, 'Screen Time']}
                          labelStyle={{color: '#a3a3a3', marginBottom: '4px'}}
                        />
                        <Bar dataKey="value" radius={[0, 0, 0, 0]}>
                             {chartData.map((_, index) => (
                               <Cell key={`cell-${index}`} fill={index === todayIdx ? 'var(--primary)' : 'var(--outline-variant)'} className="transition-colors duration-500" />
                             ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-on-surface-variant px-2 uppercase opacity-40">
                  {chartData.map((d, i) => (
                    <span key={i} className={i === todayIdx ? 'text-primary opacity-100 font-bold' : ''}>{d.label || d.day}</span>
                  ))}
              </div>
          </div>
        </section>

        <section className="col-span-1 lg:col-span-4 min-w-0 flex flex-col gap-6 lg:gap-8 lg:h-full lg:overflow-hidden">
          <div className="glass-card p-6 lg:flex-1 lg:min-h-0 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                  <h3 className="font-serif text-xl">Top Apps</h3>
                  <span className="text-[10px] border border-outline px-2 py-0.5 text-on-surface-variant uppercase">Live</span>
              </div>
              <div className="flex flex-col gap-3 lg:gap-4 overflow-y-auto pr-1 flex-1">
                  {topApps.length > 0 ? topApps.map((app, index) => (
                      <React.Fragment key={app.id}>
                          <div className={`flex justify-between items-center ${index > 2 ? 'opacity-40' : ''}`}>
                              <div className="flex items-center gap-2">
                                {app.icon && app.icon.startsWith('data:') ? (
                                  <img src={app.icon} className="w-4 h-4 object-contain opacity-80" alt="" />
                                ) : (
                                  <span className="material-symbols-outlined text-sm">{app.icon || 'apps'}</span>
                                )}
                                <span className="text-sm font-light tracking-wide">{app.name}</span>
                              </div>
                              <span className="font-mono text-xs">{formatTime(app.timeSpentMinutes)}</span>
                          </div>
                          {index < topApps.length - 1 && <div className="w-full h-[1px] bg-outline-variant"></div>}
                      </React.Fragment>
                  )) : (
                    <div className="text-center py-8 opacity-50">
                      <span className="material-symbols-outlined text-3xl mb-2 block">monitoring</span>
                      <p className="text-xs font-mono text-on-surface-variant">Scanning your apps...</p>
                    </div>
                  )}
              </div>
          </div>

          <div className="bg-white text-black p-6 lg:h-[240px] flex-shrink-0 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-48 h-48 border border-black opacity-10 rounded-full"></div>
              <div className="z-10">
                  <h3 className="font-serif italic text-2xl mb-1">Intentionality</h3>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Overall Mindful Score</p>
              </div>
              <div className="z-10 flex flex-col items-center py-2">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="4" fill="none" />
                      <circle cx="50" cy="50" r="42" stroke="black" strokeWidth="6" fill="none"
                        strokeDasharray="263.89"
                        strokeDashoffset={apps.length > 0 ? 263.89 - (263.89 * intentionalityScore) / 100 : 263.89}
                        className="transition-all duration-1000 ease-out"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-xl font-mono text-black font-bold">{apps.length > 0 ? `${intentionalityScore}%` : '—'}</span>
                  </div>
              </div>
              <div className="z-10 text-[10px] font-serif italic text-center opacity-60">
                 {apps.length > 0
                   ? peakFlow !== '—' ? `Peak productive hours: ${peakFlow}` : 'Keep working — insights will appear soon.'
                   : 'Use your PC and Distrack learns your habits.'}
              </div>
          </div>
        </section>
      </div>
    </div>
  );
}
