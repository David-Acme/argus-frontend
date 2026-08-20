/** Tabs of the dashboard bottom bar. */
export type DashboardTab = 'home' | 'insights' | 'messages' | 'profile';

/** Lifecycle of an agenda entry, as shown on the card. */
export type AgendaStatus = 'upcoming' | 'active' | 'complete';

/** Which visual a project card renders in its panel. */
export type ProjectVisual = 'chart' | 'tiles';

/**
 * One column of the trend chart. `bar` is the period total and `line` is the
 * rate — two different quantities, which is why the line is not the bar top.
 */
export type TrendPoint = {
  label: string;
  bar: number;
  line: number;
};

/** A row of the schedule timeline. */
export type ScheduleEntry = {
  title: string;
  time: string;
  hour: number;
  status: AgendaStatus;
  members: readonly string[];
  note?: string;
};
