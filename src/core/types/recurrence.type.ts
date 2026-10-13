export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: number;
};

export type WallTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type ZoneClock = {
  wallOf: (epochMs: number) => WallTime;
  epochOf: (wall: WallTime) => number;
};
