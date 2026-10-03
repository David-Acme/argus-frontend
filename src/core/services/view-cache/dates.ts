export const DAY_MS = 86_400_000;

export const startOfDay = (value: Date): number =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

export const endOfDay = (value: Date): number => startOfDay(value) + DAY_MS - 1;
