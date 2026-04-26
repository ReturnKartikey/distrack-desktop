import React from 'react';
import { useAppContext } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatTime } from '../utils/logic';

export default function Insights() {
  const { apps, focusSessions } = useAppContext();

  const COLORS = {
    productive: '#ffffff',
    neutral: '#6b7280',
    wasteful: '#ff4444',
  };

  const usageByCategory = apps.reduce((acc, app) => {
    acc[app.category] += app.timeSpentMinutes;
    return acc;
  }, { productive: 0, neutral: 0, wasteful: 0 });

  const pieData = [
    { name: 'Productive', value: usageByCategory.productive, color: COLORS.productive },
    { name: 'Neutral', value: usageByCategory.neutral, color: COLORS.neutral },
    { name: 'Distraction', value: usageByCategory.wasteful, color: COLORS.wasteful },
  ].filter(item => item.value > 0);

  const productiveApps = apps
    .filter(a => a.category === 'productive')
    .sort((a, b) => b.timeSpentMinutes - a.timeSpentMinutes)
    .slice(0, 3);

  const distractingApps = apps
    .filter(a => a.category === 'wasteful')
    .sort((a, b) => b.timeSpentMinutes - a.timeSpentMinutes)
    .slice(0, 3);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto pb-24 lg:pb-10 space-y-8">
      <header className="mb-4">
        <h1 className="text-2xl font-serif tracking-tight text-white mb-2">Deep Insights</h1>
        <p className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">Analyze your digital habits</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 col-span-1">
          <h3 className="font-serif text-xl mb-6">Time Distribution</h3>
          {pieData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatTime(value)}
                    contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', borderRadius: '0', color: '#fff' }}
                    itemStyle={{ color: '#fff', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="square"
                    formatter={(value) => <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center opacity-40">
              <div className="text-center">
                <span className="material-symbols-outlined text-4xl mb-3 block">pie_chart</span>
                <p className="text-[10px] uppercase tracking-widest">No data yet</p>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-1 flex flex-col gap-8">
          <div className="glass-card p-8 flex-1">
            <h3 className="font-serif text-xl mb-6">Top Productive Pillars</h3>
            <div className="flex flex-col gap-4">
              {productiveApps.length > 0 ? productiveApps.map((app, index) => (
                <React.Fragment key={app.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs opacity-40">0{index + 1}</span>
                      <span className="material-symbols-outlined text-white text-lg">{app.icon}</span>
                      <span className="font-sans text-white tracking-wide">{app.name}</span>
                    </div>
                    <span className="font-mono text-xs">{formatTime(app.timeSpentMinutes)}</span>
                  </div>
                  {index < productiveApps.length - 1 && <div className="w-full h-[1px] bg-outline-variant"></div>}
                </React.Fragment>
              )) : (
                 <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">No productive apps recorded yet.</p>
              )}
            </div>
          </div>

          <div className="glass-card p-8 flex-1 border-error/50 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 blur-3xl rounded-full"></div>
            <h3 className="font-serif text-xl mb-6 text-error">Major Distractions</h3>
            <div className="flex flex-col gap-4 relative z-10">
              {distractingApps.length > 0 ? distractingApps.map((app, index) => (
                <React.Fragment key={app.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs opacity-40 text-error">0{index + 1}</span>
                      <span className="material-symbols-outlined text-error text-lg">{app.icon}</span>
                      <span className="font-sans text-white tracking-wide">{app.name}</span>
                    </div>
                    <span className="font-mono text-xs text-error">{formatTime(app.timeSpentMinutes)}</span>
                  </div>
                  {index < distractingApps.length - 1 && <div className="w-full h-[1px] bg-outline-variant"></div>}
                </React.Fragment>
              )) : (
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">No distractions recorded. Great job!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Session History Section */}
      <div className="glass-card p-6 sm:p-8 mt-8">
        <h3 className="font-serif text-xl mb-6">Focus Session History</h3>

        {!focusSessions || focusSessions.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            <span className="material-symbols-outlined text-4xl mb-3 block">history</span>
            <p className="text-[10px] font-sans uppercase tracking-widest">No sessions recorded yet. Start a focus session to see history here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono">Date</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono text-center">Mode</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {focusSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-surface-bright transition-colors">
                    <td className="py-4 text-sm font-sans text-white">
                      {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">
                      {session.mode}
                    </td>
                    <td className="py-4 text-sm font-sans text-white font-mono text-right">
                      {session.durationMinutes} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
