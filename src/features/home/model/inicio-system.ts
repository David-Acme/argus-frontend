import type { DashboardSummary } from '@/core/types';

export type SystemInput = {
  modules: readonly string[] | null;
  cameras: Pick<DashboardSummary, 'camerasOnline' | 'camerasTotal'> | null;
};

export type SystemRow =
  | { kind: 'modules'; names: readonly string[] }
  | { kind: 'cameras'; online: number; total: number }
  | { kind: 'no-cameras' };

export function systemRows({ modules, cameras }: SystemInput): SystemRow[] {
  const rows: SystemRow[] = [];
  if (modules !== null && modules.length > 0) rows.push({ kind: 'modules', names: modules });
  if (cameras !== null)
    rows.push(
      cameras.camerasTotal > 0
        ? { kind: 'cameras', online: cameras.camerasOnline, total: cameras.camerasTotal }
        : { kind: 'no-cameras' }
    );
  return rows;
}

export function isSparse(summary: DashboardSummary): boolean {
  return summary.remindersPending + summary.tasksOpen + summary.projectsActive === 0;
}
