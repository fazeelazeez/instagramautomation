export type Preset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export const PRESET_LABELS: Record<Preset, string> = {
  today: 'Today',
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  custom: 'Custom Range',
};

export function getDateRange(preset: Preset, customFrom?: string, customTo?: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === 'today') {
    const s = fmt(now);
    return { from: s + 'T00:00:00', to: s + 'T23:59:59' };
  }
  if (preset === 'this_week') {
    const day = now.getDay(); // 0=Sun
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    return { from: fmt(start) + 'T00:00:00', to: fmt(now) + 'T23:59:59' };
  }
  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start) + 'T00:00:00', to: fmt(now) + 'T23:59:59' };
  }
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(start) + 'T00:00:00', to: fmt(end) + 'T23:59:59' };
  }
  if (preset === 'custom' && customFrom && customTo) {
    return { from: customFrom + 'T00:00:00', to: customTo + 'T23:59:59' };
  }
  // fallback — all time (large range)
  return { from: '2024-01-01T00:00:00', to: fmt(now) + 'T23:59:59' };
}
