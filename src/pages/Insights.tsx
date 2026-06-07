import React from 'react';
import { useAppContext } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatTime } from '../utils/logic';

export default function Insights() {
  const { apps, focusSessions } = useAppContext();

  const COLORS = {
    productive: 'var(--primary)',
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
    <div className="p-6 lg:p-10 w-full max-w-7xl mx-auto pb-24 lg:pb-10 lg:h-full lg:overflow-hidden lg:flex lg:flex-col gap-6 lg:gap-8">
      <header className="mb-2 flex-shrink-0">
        <h1 className="text-2xl font-serif tracking-tight text-primary mb-2">Deep Insights</h1>
        <p className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">Analyze your digital habits</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* Left Column: Time Distribution & Session History */}
        <div className="col-span-1 min-w-0 flex flex-col gap-6 lg:gap-8 lg:h-full lg:overflow-hidden">
          <div className="glass-card p-6 flex flex-col lg:flex-[3] lg:min-h-0">
            <h3 className="font-serif text-xl mb-2">Time Distribution</h3>
            {pieData.length > 0 ? (
              <div className="flex-1 flex flex-col justify-between min-h-0">
                <div className="flex-1 min-h-[200px] w-full">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={2} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatTime(value)}
                        contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--outline-variant)', borderRadius: '0', color: 'var(--on-surface)' }}
                        itemStyle={{ color: 'var(--on-surface)', fontFamily: 'monospace', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-2 pb-1 flex-shrink-0 select-none">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center opacity-40 py-8">
                <div className="text-center">
                  <span className="material-symbols-outlined text-3xl mb-2 block">pie_chart</span>
                  <p className="text-[10px] uppercase tracking-widest">No data yet</p>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card p-6 lg:flex-[4] lg:min-h-0 flex flex-col overflow-hidden">
            <h3 className="font-serif text-xl mb-4">Focus Session History</h3>
            {!focusSessions || focusSessions.length === 0 ? (
              <div className="text-center py-6 opacity-50 flex-1 flex flex-col justify-center">
                <span className="material-symbols-outlined text-3xl mb-2 block">history</span>
                <p className="text-[10px] font-sans uppercase tracking-widest">No sessions recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto flex-1 pr-2 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-surface-dim z-10">
                    <tr className="border-b border-outline-variant">
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono">Date</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono text-center">Mode</th>
                      <th className="pb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {focusSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-surface-bright transition-colors">
                        <td className="py-3 text-xs font-sans text-primary">
                          {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">
                          {session.mode}
                        </td>
                        <td className="py-3 text-xs font-sans text-primary font-mono text-right">
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

        {/* Right Column: Top Productive Pillars & Major Distractions */}
        <div className="col-span-1 min-w-0 flex flex-col gap-6 lg:gap-8 lg:h-full lg:overflow-hidden">
          <div className="glass-card p-6 lg:flex-1 lg:min-h-0 flex flex-col overflow-hidden">
            <h3 className="font-serif text-xl mb-4">Top Productive Pillars</h3>
            <div className="flex flex-col gap-3 lg:gap-4 overflow-y-auto pr-1 flex-1">
              {productiveApps.length > 0 ? productiveApps.map((app, index) => (
                <React.Fragment key={app.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs opacity-40">0{index + 1}</span>
                      {app.icon && app.icon.startsWith('data:') ? (
                        <img src={app.icon} className="w-5 h-5 object-contain" alt="" />
                      ) : (
                        <span className="material-symbols-outlined text-primary text-lg">{app.icon || 'apps'}</span>
                      )}
                      <span className="font-sans text-primary tracking-wide">{app.name}</span>
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

          <div className="glass-card p-6 lg:flex-1 lg:min-h-0 border-error/50 relative overflow-hidden flex flex-col">
             <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 blur-3xl rounded-full pointer-events-none"></div>
            <h3 className="font-serif text-xl mb-4 text-error flex-shrink-0">Major Distractions</h3>
            <div className="flex flex-col gap-3 lg:gap-4 overflow-y-auto pr-1 flex-1 relative z-10">
              {distractingApps.length > 0 ? distractingApps.map((app, index) => (
                <React.Fragment key={app.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs opacity-40 text-error">0{index + 1}</span>
                      {app.icon && app.icon.startsWith('data:') ? (
                        <img src={app.icon} className="w-5 h-5 object-contain" alt="" />
                      ) : (
                        <span className="material-symbols-outlined text-error text-lg">{app.icon || 'apps'}</span>
                      )}
                      <span className="font-sans text-primary tracking-wide">{app.name}</span>
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
    </div>
  );
}
