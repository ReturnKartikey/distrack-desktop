export type AppCategory = 'productive' | 'neutral' | 'wasteful';

export interface AppUsage {
  id: string;
  name: string;
  timeSpentMinutes: number;
  category: AppCategory;
  type: string;
  icon: string;
}

export const initialApps: AppUsage[] = [
  { id: "1", name: "Figma", timeSpentMinutes: 252, category: "productive", type: "Design", icon: "draw" },
  { id: "2", name: "VS Code", timeSpentMinutes: 330, category: "productive", type: "Development", icon: "code" },
  { id: "3", name: "Instagram", timeSpentMinutes: 165, category: "wasteful", type: "Social", icon: "photo_camera" },
  { id: "4", name: "Twitter / X", timeSpentMinutes: 120, category: "wasteful", type: "Social", icon: "chat" },
  { id: "5", name: "Spotify", timeSpentMinutes: 75, category: "neutral", type: "Entertainment", icon: "music_note" },
  { id: "6", name: "YouTube", timeSpentMinutes: 90, category: "wasteful", type: "Entertainment", icon: "play_circle" },
  { id: "7", name: "Slack", timeSpentMinutes: 180, category: "productive", type: "Communication", icon: "forum" },
];

export const mockDailyUsage = [
  { day: 'M', value: 3.5 },
  { day: 'T', value: 4.2 },
  { day: 'W', value: 2.8 },
  { day: 'T', value: 5.1 },
  { day: 'F', value: 3.0 },
  { day: 'S', value: 1.1 },
  { day: 'S', value: 1.0 },
];
