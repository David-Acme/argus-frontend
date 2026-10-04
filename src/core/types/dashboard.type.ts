export type DashboardTab = 'home' | 'schedule' | 'projects' | 'people' | 'settings' | 'profile';

export type AgendaStatus = 'upcoming' | 'active' | 'complete';

export type DashboardProjectCard = {
  id: string;
  name: string;
  description: string;
  status: string;
  done: number;
  total: number;
  progress: number;
};

export type DashboardSummary = {
  camerasTotal: number;
  camerasOnline: number;
  remindersPending: number;
  projectsActive: number;
  tasksOpen: number;
  eventsCurrent: number;
  eventsPrevious: number;
};
