import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { getTopDistractions, formatTime } from '../utils/logic';
import { ResponsiveContainer, BarChart, Bar, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { mockDailyUsage } from '../data/mockData';

export default function Dashboard() {
  const { apps, focusScore, isElectron, dailyTotals, timeframe, setTimeframe } = useAppContext();

  const screenTimeMinutes = apps.reduce((acc, app) => acc + app.timeSpentMinutes, 0);
  const h = Math.floor(screenTimeMinutes / 60);
  const m = Math.floor(screenTimeMinutes % 60);
  const screenTime = `${h}h ${m}m`;

  const topApps = apps
    .sort((a, b) => b.timeSpentMinutes - a.timeSpentMinutes)
    .slice(0, 5);

  const topDistractions = getTopDistractions(apps);

  // Use real daily totals in Electron, mock otherwise
  const chartData = isElectron ? dailyTotals : mockDailyUsage;
  const todayIdx = isElectron ? chartData.length - 1 : Math.max(0, new Date().getDay() - 1);

  // Compute peak flow period dynamically
  const peakFlow = useMemo(() => {
    if (apps.length === 0) return 'No data';
    // Estimate peak flow based on the most used productive app
    const productiveApps = apps.filter(a => a.category === 'productive');
    if (productiveApps.length === 0) return 'No data';
    const now = new Date();
    const hour = now.getHours();
    // Heuristic: If user has been productive, estimate peak around current active hours
    if (hour >= 6 && hour < 12) return '6am – 12pm';
    if (hour >= 12 && hour < 17) return '12pm – 5pm';
    if (hour >= 17 && hour < 22) return '5pm – 10pm';
    return '10pm – 6am';
  }, [apps]);

  return (
    <div className="p-6 lg:p-10 flex-1 flex flex-col gap-8 w-full max-w-7xl mx-auto pb-24 lg:pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
        <div>
          <h2 className="text-2xl font-serif tracking-tight text-white mb-1">Overview</h2>
          <p className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">Your digital footprint for {timeframe === 'daily' ? 'today' : 'this week'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeframe('daily')}
            className={`px-4 py-2 border text-[10px] uppercase tracking-widest font-bold transition-colors ${
            timeframe === 'daily'
              ? 'border-outline-variant bg-surface text-white'
              : 'border-transparent bg-transparent text-on-surface-variant hover:border-outline-variant'
          }`}>Daily</button>
          <button
            onClick={() => setTimeframe('weekly')}
            className={`px-4 py-2 border text-[10px] uppercase tracking-widest font-bold transition-colors ${
            timeframe === 'weekly'
              ? 'border-outline-variant bg-surface text-white'
              : 'border-transparent bg-transparent text-on-surface-variant hover:border-outline-variant'
          }`}>Weekly</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="col-span-1 lg:col-span-8 flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-auto lg:h-[260px]">
            <div className="glass-card p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <h3 className="font-serif text-xl">Focus Score</h3>
                <span className="text-[10px] bg-white text-black px-2 py-0.5 font-bold uppercase tracking-tighter">
                   {focusScore > 80 ? 'Excellent' : focusScore > 60 ? 'Good' : focusScore > 0 ? 'Needs Work' : 'No Data'}
                </span>
              </div>
              <div className="flex flex-col mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-mono text-white">{focusScore}</span>
                  <span className="text-xl opacity-30">/100</span>
                </div>
                <div className="w-full h-1 bg-outline-variant mt-4">
                  <div
                    className="h-full bg-white transition-all duration-1000"
                    style={{ width: `${focusScore}%` }}
                  ></div>
                </div>
                <p className="text-xs text-on-surface-variant mt-4 leading-relaxed">
                  {apps.length === 0
                    ? 'Start using your PC — Distrack is tracking in the background.'
                    : focusScore > 70
                    ? 'Great job maintaining deep work blocks. Keep it up!'
                    : 'Try reducing time on distracting apps to boost your score.'}
                </p>
              </div>
            </div>

            <div className="glass-card p-6 flex flex-col justify-center gap-6">
                <div className="flex justify-between items-start">
                  <h3 className="font-serif text-xl">Usage Metrics</h3>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <h4 className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Screen Time</h4>
                    <span className="text-3xl font-mono text-white">{screenTime}</span>
                  </div>
                  <div className="w-full h-[1px] bg-outline-variant"></div>
                  <div>
                    <h4 className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Peak Flow</h4>
                    <span className="text-xl font-mono text-white">{peakFlow}</span>
                  </div>
                </div>
            </div>
          </div>

          <div className="glass-card p-6 flex-1 flex flex-col gap-4 min-h-[300px]">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-serif text-xl">Usage Trends</h3>
                  <span className="text-[10px] border border-outline px-2 py-0.5 text-on-surface-variant uppercase">History</span>
              </div>
              <div className="h-40 w-full mb-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <RechartsTooltip
                          cursor={{fill: '#262626'}}
                          contentStyle={{backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '0px', color: '#fff', fontFamily: 'monospace', fontSize: '12px'}}
                          formatter={(value: number) => [`${value} hours`, 'Screen Time']}
                          labelStyle={{color: '#a3a3a3', marginBottom: '4px'}}
                        />
                        <Bar dataKey="value" radius={[0, 0, 0, 0]}>
                             {chartData.map((_, index) => (
                               <Cell key={`cell-${index}`} fill={index === todayIdx ? '#ffffff' : '#262626'} className="transition-colors duration-500" />
                             ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-on-surface-variant px-2 uppercase opacity-40">
                  {chartData.map((d, i) => (
                    <span key={i} className={i === todayIdx ? 'text-white opacity-100 font-bold' : ''}>{d.label || d.day}</span>
                  ))}
              </div>
          </div>
        </section>

        <section className="col-span-1 lg:col-span-4 flex flex-col gap-8">
          <div className="glass-card p-6 h-auto min-h-[260px]">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-xl">Top Apps</h3>
                  <span className="text-[10px] border border-outline px-2 py-0.5 text-on-surface-variant uppercase">Live View</span>
              </div>
              <div className="flex flex-col gap-4">
                  {topApps.length > 0 ? topApps.map((app, index) => (
                      <React.Fragment key={app.id}>
                          <div className={`flex justify-between items-center ${index > 2 ? 'opacity-40' : ''}`}>
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">{app.icon}</span>
                                <span className="text-sm font-light tracking-wide">{app.name}</span>
                              </div>
                              <span className="font-mono text-xs">{formatTime(app.timeSpentMinutes)}</span>
                          </div>
                          {index < topApps.length - 1 && <div className="w-full h-[1px] bg-outline-variant"></div>}
                      </React.Fragment>
                  )) : (
                    <div className="text-center py-8 opacity-50">
                      <span className="material-symbols-outlined text-3xl mb-2 block">monitoring</span>
                      <p className="text-xs font-mono text-on-surface-variant">Tracking will appear here.</p>
                    </div>
                  )}
              </div>
          </div>

          <div className="bg-white text-black p-8 flex-1 min-h-[300px] flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-48 h-48 border border-black opacity-10 rounded-full"></div>
              <div className="z-10">
                  <h3 className="font-serif italic text-2xl mb-1">Intentionality</h3>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Overall Mindful Score</p>
              </div>
              <div className="z-10 flex flex-col items-center py-6">
                  <div className="relative w-28 h-28 border-[12px] border-black/10 rounded-full flex items-center justify-center">
                    <div className="absolute inset-0 border-[12px] border-black rounded-full border-t-transparent border-r-transparent -rotate-[15deg]"></div>
                    <span className="block text-2xl font-mono text-black font-bold">{Math.round(focusScore * 0.82)}%</span>
                  </div>
              </div>
              <div className="z-10 text-[10px] font-serif italic text-center opacity-60">
                 "Simplicity is the ultimate sophistication."
              </div>
          </div>
        </section>
      </div>
    </div>
  );
}
