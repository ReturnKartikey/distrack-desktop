import { AppUsage } from '../data/mockData';

export function calculateFocusScore(apps: AppUsage[]): number {
  const total = apps.reduce((sum, app) => sum + app.timeSpentMinutes, 0);
  if (total === 0) return 0;
  const productive = apps.filter(a => a.category === 'productive').reduce((sum, a) => sum + a.timeSpentMinutes, 0);
  const wasteful = apps.filter(a => a.category === 'wasteful').reduce((sum, a) => sum + a.timeSpentMinutes, 0);
  
  let score = 50 + ((productive / total) * 50) - ((wasteful / total) * 30);
  return Math.min(Math.max(Math.round(score), 0), 100);
}

export function getTopDistractions(apps: AppUsage[]): AppUsage[] {
  return apps
    .filter(a => a.category === 'wasteful')
    .sort((a, b) => b.timeSpentMinutes - a.timeSpentMinutes)
    .slice(0, 3);
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getTotalScreenTime(apps: AppUsage[]): string {
  const totalMinutes = apps.reduce((sum, app) => sum + app.timeSpentMinutes, 0);
  return formatTime(totalMinutes);
}

export function classifyApp(appName: string, currentCategory: AppUsage['category']): AppUsage['category'] {
  // Simulating an AI classification mechanism. If user reclassifies, we respect that.
  return currentCategory;
}
