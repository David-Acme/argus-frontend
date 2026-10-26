import type { DashboardSummary } from '@/core/types';

export type FirstStep = 'camera' | 'reminder';

export type FirstStepInput = {
  summary: DashboardSummary;
  addsCameras: boolean;
  addsReminders: boolean;
};

export type SosInput = { panics: boolean; hasSecurityTab: boolean };

export type AgendaReadInput = { productivity: boolean; reminders: boolean; agenda: boolean };

export function isNewHousehold(summary: DashboardSummary): boolean {
  return (
    summary.camerasTotal === 0 &&
    summary.remindersPending === 0 &&
    summary.projectsActive === 0 &&
    summary.tasksOpen === 0
  );
}

export function firstStep({
  summary,
  addsCameras,
  addsReminders,
}: FirstStepInput): FirstStep | null {
  if (!isNewHousehold(summary)) return null;
  if (addsCameras) return 'camera';
  return addsReminders ? 'reminder' : null;
}

export function sosOnInicio({ panics, hasSecurityTab }: SosInput): boolean {
  return panics && !hasSecurityTab;
}

export function agendaOnInicio({ productivity, reminders, agenda }: AgendaReadInput): boolean {
  return productivity && (reminders || agenda);
}
