export type RangeUnit = 'weeks' | 'months';

export interface DateRange {
  start: Date;
  end: Date;
}

export const RANGE_PRESETS: Record<RangeUnit, number[]> = {
  weeks: [1, 2, 4, 12],
  months: [1, 3, 6, 12],
};

/** Inclusive range ending at `now`, spanning `count` weeks or months back. */
export function resolveRange(unit: RangeUnit, count: number, now: Date = new Date()): DateRange {
  const start = new Date(now.getTime());
  if (unit === 'weeks') {
    start.setDate(start.getDate() - count * 7);
  } else {
    start.setMonth(start.getMonth() - count);
  }
  return { start, end: now };
}

export function isWithinRange(iso: string, range: DateRange): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export function rangeLabel(unit: RangeUnit, count: number): string {
  const noun = unit === 'weeks' ? 'week' : 'month';
  return count === 1 ? `Last ${noun}` : `Last ${count} ${noun}s`;
}
