export type ClockWheels = { hour: number; minute: number; afternoon: boolean };

const DAY_MINUTES = 24 * 60;

const HOUR = 60;

const HALF_DAY = 12;

export const minuteSteps = (step: number): number[] =>
  Array.from({ length: Math.ceil(HOUR / step) }, (_, index) => index * step);

export const hourSteps = (hour12: boolean): number[] =>
  hour12
    ? Array.from({ length: HALF_DAY }, (_, index) => (index === 0 ? HALF_DAY : index))
    : Array.from({ length: 24 }, (_, index) => index);

export function snapMinutes(minutes: number, step: number): number {
  const snapped = Math.round(minutes / step) * step;
  return ((snapped % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

export function toWheels(minutes: number, hour12: boolean): ClockWheels {
  const hour = Math.floor(minutes / HOUR) % 24;
  const minute = minutes % HOUR;
  if (!hour12) return { hour, minute, afternoon: hour >= HALF_DAY };
  const shown = hour % HALF_DAY;
  return { hour: shown === 0 ? HALF_DAY : shown, minute, afternoon: hour >= HALF_DAY };
}

export function fromWheels({ hour, minute, afternoon }: ClockWheels, hour12: boolean): number {
  if (!hour12) return hour * HOUR + minute;
  const base = hour % HALF_DAY;
  return (base + (afternoon ? HALF_DAY : 0)) * HOUR + minute;
}

export const timeSlots = (step: number): number[] =>
  Array.from({ length: Math.ceil(DAY_MINUTES / step) }, (_, index) => index * step);

export const nearestSlot = (minutes: number, step: number): number =>
  Math.floor(snapMinutes(minutes, step) / step);
