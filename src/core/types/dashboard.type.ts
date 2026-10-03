/** Tabs of the dashboard bottom bar. */
export type DashboardTab = 'home' | 'schedule' | 'projects' | 'profile';

/** Lifecycle of an agenda entry, as shown on the card. */
export type AgendaStatus = 'upcoming' | 'active' | 'complete';

/** A row of the schedule timeline. */
export type ScheduleEntry = {
  /** Merged-entry id, when the row comes from a real record. */
  id?: string;
  title: string;
  time: string;
  hour: number;
  status: AgendaStatus;
  members: readonly string[];
  note?: string;
};

/** A project card on the dashboard: the row plus its task progress. */
export type DashboardProjectCard = {
  id: string;
  name: string;
  description: string;
  status: string;
  done: number;
  total: number;
  /** 0..1 */
  progress: number;
};

/** Counters the dashboard headline cards read. */
export type DashboardSummary = {
  camerasTotal: number;
  camerasOnline: number;
  remindersPending: number;
  projectsActive: number;
  tasksOpen: number;
  /** Security events in the current window and in the one before it. */
  eventsCurrent: number;
  eventsPrevious: number;
};
