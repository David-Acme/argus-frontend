import type { DashboardSummary } from '@/core/types';

export type FirstStep = 'camera' | 'reminder';

export type FirstStepInput = {
  summary: DashboardSummary;
  addsCameras: boolean;
  asksReminders: boolean;
};

export type SosInput = { panics: boolean; hasSecurityTab: boolean };

export type AgendaReadInput = { productivity: boolean; agenda: boolean };

export function isNewHousehold(summary: DashboardSummary): boolean {
  return summary.camerasTotal === 0 && summary.projectsActive === 0 && summary.tasksOpen === 0;
}

export function firstStep({
  summary,
  addsCameras,
  asksReminders,
}: FirstStepInput): FirstStep | null {
  if (!isNewHousehold(summary)) return null;
  if (addsCameras) return 'camera';
  return asksReminders ? 'reminder' : null;
}

export function sosOnInicio({ panics, hasSecurityTab }: SosInput): boolean {
  return panics && !hasSecurityTab;
}

export function agendaOnInicio({ productivity, agenda }: AgendaReadInput): boolean {
  return productivity && agenda;
}
