export type HoursWindow = {
  days: readonly number[];
  start: string;
  end: string;
};

export const WEEK_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

const DAY_NAMES: readonly string[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const CLOCK_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;

export function isClock(value: string): boolean {
  return CLOCK_RE.test(value);
}

function clockMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function parseDays(text: string): number[] | null {
  const [first, last] = text.split('-');
  const from = DAY_NAMES.indexOf(first ?? '');
  if (from < 0) return null;
  if (last === undefined) return [from];
  const to = DAY_NAMES.indexOf(last);
  if (to < 0) return null;
  const days: number[] = [];
  for (let day = from; ; day = (day + 1) % 7) {
    days.push(day);
    if (day === to) break;
  }
  return days;
}

function parseWindow(part: string): HoursWindow | null {
  const tokens = part.trim().split(/\s+/);
  const range = tokens.length === 2 ? tokens[1] : tokens[0];
  const days = tokens.length === 2 ? parseDays(tokens[0] ?? '') : [];
  if (days === null || tokens.length > 2 || range === undefined) return null;
  const [start, end] = range.split('-');
  if (start === undefined || end === undefined || !isClock(start) || !isClock(end) || start === end)
    return null;
  return { days: days.length === 7 ? [] : days, start, end };
}

export function parseHours(spec: string): HoursWindow[] {
  const merged: HoursWindow[] = [];
  for (const part of spec.split(',')) {
    if (part.trim().length === 0) continue;
    const window = parseWindow(part);
    if (window === null) continue;
    const index = merged.findIndex((existing) => existing.start === window.start && existing.end === window.end);
    const existing = merged[index];
    if (index < 0 || existing === undefined) {
      merged.push(window);
      continue;
    }
    const days =
      existing.days.length === 0 || window.days.length === 0
        ? []
        : [...new Set([...existing.days, ...window.days])];
    merged[index] = { ...existing, days: days.length === 7 ? [] : days };
  }
  return merged;
}

export function validHours(spec: string): boolean {
  return spec
    .split(',')
    .filter((part) => part.trim().length > 0)
    .every((part) => parseWindow(part) !== null);
}

function dayRuns(days: readonly number[]): number[][] {
  const runs: number[][] = [];
  let current: number[] = [];
  for (const day of WEEK_ORDER) {
    if (days.includes(day)) {
      current.push(day);
      continue;
    }
    if (current.length > 0) runs.push(current);
    current = [];
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

function runLabel(run: readonly number[]): string {
  const first = DAY_NAMES[run[0] ?? 0] ?? 'mon';
  const last = DAY_NAMES[run[run.length - 1] ?? 0] ?? first;
  return run.length === 1 ? first : `${first}-${last}`;
}

export function formatHours(windows: readonly HoursWindow[]): string {
  const parts: string[] = [];
  for (const window of windows) {
    const range = `${window.start}-${window.end}`;
    if (window.days.length === 0 || window.days.length === 7) {
      parts.push(range);
      continue;
    }
    for (const run of dayRuns(window.days)) parts.push(`${runLabel(run)} ${range}`);
  }
  return parts.join(', ');
}

export type HoursSummaryLabels = {
  day: (day: number) => string;
  everyDay: string;
};

export function summarizeHours(windows: readonly HoursWindow[], labels: HoursSummaryLabels): string {
  return windows
    .map((window) => {
      const range = `${window.start}–${window.end}`;
      if (window.days.length === 0) return `${labels.everyDay} ${range}`;
      const days = dayRuns(window.days)
        .map((run) =>
          run.length === 1
            ? labels.day(run[0] ?? 0)
            : `${labels.day(run[0] ?? 0)}–${labels.day(run[run.length - 1] ?? 0)}`
        )
        .join(', ');
      return `${days} ${range}`;
    })
    .join(' · ');
}

export function crossesMidnight(window: HoursWindow): boolean {
  return clockMinutes(window.end) <= clockMinutes(window.start);
}

export const HALF_HOURS: readonly string[] = Array.from({ length: 49 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? '00' : '30';
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}).filter((clock) => isClock(clock));
